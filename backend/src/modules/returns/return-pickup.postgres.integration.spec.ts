import { NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  PrismaClient,
  ReturnReason,
  ReturnRequestStatus,
  UserRole,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaService } from '../../core/database/prisma.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { PickupGateway } from './pickup.gateway';
import { ReturnService } from './return.service';

const testUrl = process.env.TEST_DATABASE_URL;
const isLocal = (() => {
  try {
    return Boolean(testUrl && ['localhost', '127.0.0.1', '::1'].includes(new URL(testUrl).hostname));
  } catch {
    return false;
  }
})();

(isLocal ? describe : describe.skip)('Reverse pickup on isolated PostgreSQL', () => {
  const suffix = randomUUID();
  const warehouse = {
    name: 'Kho Shop Test', phone: '0901234567', address: '12 Test Street, Ho Chi Minh City',
    wardName: 'Test Ward', provinceName: 'Ho Chi Minh City',
  };
  const pickup = {
    name: 'Test Customer', phone: '0912345678', address: '15 Test Street, Ho Chi Minh City',
    wardName: 'Test Ward', provinceName: 'Ho Chi Minh City',
    weight: 500, length: 20, width: 15, height: 10,
  };
  let pool: Pool;
  let prisma: PrismaClient;
  let service: ReturnService;
  let customerId: string;
  let shopId: string;
  let otherShopId: string;
  let storeId: string;
  let productId: string;
  let orderId: string;
  let requestId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: testUrl, max: 2 });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    await prisma.$connect();

    const [customer, shop, otherShop] = await Promise.all([
      prisma.user.create({ data: { email: `pickup-customer-${suffix}@example.test`, passwordHash: 'test-only', fullName: 'Test Customer', role: UserRole.CUSTOMER } }),
      prisma.user.create({ data: { email: `pickup-shop-${suffix}@example.test`, passwordHash: 'test-only', fullName: 'Test Shop Owner', role: UserRole.SHOP_MANAGER } }),
      prisma.user.create({ data: { email: `pickup-other-${suffix}@example.test`, passwordHash: 'test-only', fullName: 'Other Shop Owner', role: UserRole.SHOP_MANAGER } }),
    ]);
    customerId = customer.id;
    shopId = shop.id;
    otherShopId = otherShop.id;
    const store = await prisma.store.create({ data: { ownerId: shopId, name: 'Pickup Test Shop', slug: `pickup-test-${suffix}`, returnWarehouse: warehouse } });
    storeId = store.id;
    const product = await prisma.product.create({ data: { storeId, sku: `PICKUP-${suffix}`, title: 'Pickup Test Product', price: 100000 } });
    productId = product.id;
    const order = await prisma.order.create({ data: {
      storeId, customerId, externalOrderSn: `PICKUP-${suffix}`, subtotalAmount: 100000, finalAmount: 100000,
      status: OrderStatus.RETURN_REQUESTED, deliveredAt: new Date(Date.now() - 86_400_000),
      customerName: pickup.name, customerPhone: pickup.phone, shippingAddress: pickup.address,
    } });
    orderId = order.id;
    const orderItem = await prisma.orderItem.create({ data: {
      orderId, productId, quantity: 1, unitPrice: 100000, appliedCommissionRate: 0, calculatedCommissionAmount: 0,
    } });
    const request = await prisma.returnRequest.create({ data: {
      orderId, customerId, reason: ReturnReason.WRONG_ITEM,
      imageUrls: ['https://example.test/evidence.jpg'], unboxingVideoUrl: 'https://example.test/unboxing.mp4',
      deadlineAt: new Date(Date.now() + 13 * 86_400_000), originalOrderStatus: OrderStatus.DELIVERED,
      status: ReturnRequestStatus.SHOP_APPROVED, shipByAt: new Date(Date.now() + 7 * 86_400_000),
      returnAddress: warehouse.address, returnInstructions: 'Await courier pickup',
      items: { create: [{ orderItemId: orderItem.id, quantity: 1, unitPrice: 100000 }] },
    } });
    requestId = request.id;
    const gateway = {
      mode: jest.fn().mockReturnValue('mock'),
      book: jest.fn().mockImplementation(async ({ clientOrderCode }: { clientOrderCode: string }) => ({
        provider: 'MOCK', carrierName: 'SCANMS Demo',
        trackingNumber: `SIM${clientOrderCode.slice(-15)}`, providerStatus: 'ready_to_pick', feeAmount: null,
      })),
    } as unknown as PickupGateway;
    service = new ReturnService(prisma as unknown as PrismaService, {} as CloudinaryService, gateway);
  });

  afterAll(async () => {
    if (!prisma) return;
    try {
      if (requestId) await prisma.returnRequest.delete({ where: { id: requestId } });
      if (orderId) {
        await prisma.orderItem.deleteMany({ where: { orderId } });
        await prisma.order.delete({ where: { id: orderId } });
      }
      if (productId) await prisma.product.delete({ where: { id: productId } });
      if (storeId) await prisma.store.delete({ where: { id: storeId } });
      await prisma.user.deleteMany({ where: { email: { in: [
        `pickup-customer-${suffix}@example.test`, `pickup-shop-${suffix}@example.test`, `pickup-other-${suffix}@example.test`,
      ] } } });
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  });

  it('stores one pickup, isolates shops and advances only after carrier events', async () => {
    await expect(service.getOne(otherShopId, UserRole.SHOP_MANAGER, requestId)).rejects.toThrow(NotFoundException);
    await service.bookPickup(customerId, UserRole.CUSTOMER, requestId, pickup);
    await service.bookPickup(customerId, UserRole.CUSTOMER, requestId, pickup);
    expect(await prisma.returnShipment.count({ where: { returnRequestId: requestId } })).toBe(1);
    expect((await prisma.returnRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe(ReturnRequestStatus.PICKUP_BOOKED);

    await service.simulatePickup(shopId, UserRole.SHOP_MANAGER, requestId, 'picked');
    expect((await prisma.returnRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe(ReturnRequestStatus.RETURN_SHIPPED);

    await service.simulatePickup(shopId, UserRole.SHOP_MANAGER, requestId, 'delivered');
    const saved = await prisma.returnRequest.findUniqueOrThrow({ where: { id: requestId }, include: { shipments: true } });
    expect(saved.status).toBe(ReturnRequestStatus.RETURN_RECEIVED);
    expect(saved.receivedAt).toBeTruthy();
    expect(saved.shipments[0].providerStatus).toBe('delivered');
  });
});
