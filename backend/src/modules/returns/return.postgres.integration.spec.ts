import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  OrderStatus,
  PrismaClient,
  ReturnReason,
  ReturnRequestStatus,
  UserRole,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { ReturnService } from './return.service';

// This suite is opt-in. Never allow it to mutate a remote or shared database.
const testUrl = process.env.TEST_DATABASE_URL;
const isLocal = (() => {
  try {
    return (
      testUrl !== undefined &&
      ['localhost', '127.0.0.1', '::1'].includes(new URL(testUrl).hostname)
    );
  } catch {
    return false;
  }
})();

(isLocal ? describe : describe.skip)(
  'Return fulfillment on isolated PostgreSQL',
  () => {
    const suffix = randomUUID();
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
      const cloudinary = {
        uploadImage: jest.fn().mockResolvedValue({
          secureUrl: 'https://example.test/return-receipt.jpg',
          publicId: `return-test-${suffix}`,
        }),
        deleteFile: jest.fn().mockResolvedValue(undefined),
      } as unknown as CloudinaryService;
      service = new ReturnService(
        prisma as unknown as PrismaService,
        cloudinary,
      );

      const [customer, shop, otherShop] = await Promise.all([
        prisma.user.create({
          data: {
            email: `return-customer-${suffix}@example.test`,
            passwordHash: 'test-only',
            fullName: 'Return Test Customer',
            role: UserRole.CUSTOMER,
          },
        }),
        prisma.user.create({
          data: {
            email: `return-shop-${suffix}@example.test`,
            passwordHash: 'test-only',
            fullName: 'Return Test Shop',
            role: UserRole.SHOP_MANAGER,
          },
        }),
        prisma.user.create({
          data: {
            email: `return-other-shop-${suffix}@example.test`,
            passwordHash: 'test-only',
            fullName: 'Other Return Test Shop',
            role: UserRole.SHOP_MANAGER,
          },
        }),
      ]);
      customerId = customer.id;
      shopId = shop.id;
      otherShopId = otherShop.id;
      const store = await prisma.store.create({
        data: {
          ownerId: shopId,
          name: 'Return Test Store',
          slug: `return-test-${suffix}`,
        },
      });
      storeId = store.id;
      const product = await prisma.product.create({
        data: {
          storeId,
          sku: `RETURN-${suffix}`,
          title: 'Return Test Product',
          price: 100000,
        },
      });
      productId = product.id;
      const order = await prisma.order.create({
        data: {
          storeId,
          customerId,
          externalOrderSn: `RETURN-${suffix}`,
          subtotalAmount: 100000,
          finalAmount: 100000,
          status: OrderStatus.RETURN_REQUESTED,
          deliveredAt: new Date(Date.now() - 86400000),
        },
      });
      orderId = order.id;
      const line = await prisma.orderItem.create({
        data: {
          orderId,
          productId,
          quantity: 1,
          unitPrice: 100000,
          appliedCommissionRate: 0,
          calculatedCommissionAmount: 0,
        },
      });
      const returnRequest = await prisma.returnRequest.create({
        data: {
          orderId,
          customerId,
          reason: ReturnReason.WRONG_ITEM,
          imageUrls: ['https://example.test/evidence.jpg'],
          unboxingVideoUrl: 'https://example.test/unboxing.mp4',
          deadlineAt: new Date(Date.now() + 13 * 86400000),
          originalOrderStatus: OrderStatus.DELIVERED,
          status: ReturnRequestStatus.SHOP_APPROVED,
          items: {
            create: [{ orderItemId: line.id, quantity: 1, unitPrice: 100000 }],
          },
        },
      });
      requestId = returnRequest.id;
    });

    afterAll(async () => {
      if (!prisma) return;
      try {
        if (requestId) {
          await prisma.refund.deleteMany({
            where: { returnRequestId: requestId },
          });
          await prisma.returnRequest.deleteMany({ where: { id: requestId } });
        }
        if (orderId) {
          await prisma.orderItem.deleteMany({ where: { orderId } });
          await prisma.order.deleteMany({ where: { id: orderId } });
        }
        if (productId)
          await prisma.product.deleteMany({ where: { id: productId } });
        if (storeId) await prisma.store.deleteMany({ where: { id: storeId } });
        await prisma.user.deleteMany({
          where: {
            email: {
              in: [
                `return-customer-${suffix}@example.test`,
                `return-shop-${suffix}@example.test`,
                `return-other-shop-${suffix}@example.test`,
              ],
            },
          },
        });
      } finally {
        await prisma.$disconnect();
        await pool.end();
      }
    });

    it('persists shipment, inspection and a PENDING refund without falsely moving money', async () => {
      await expect(
        service.getOne(otherShopId, UserRole.SHOP_MANAGER, requestId),
      ).rejects.toThrow(NotFoundException);
      const instructions = await service.setInstructions(
        shopId,
        UserRole.SHOP_MANAGER,
        requestId,
        {
          returnAddress: 'SCANMS Test Shop, 123 Test Street',
          returnInstructions:
            'Bọc hàng cẩn thận và ghi mã đơn bên ngoài kiện hàng.',
        },
      );
      expect(instructions.shipByAt).toBeTruthy();

      const receipt = {
        size: 12,
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]),
      } as Express.Multer.File;
      await service.submitShipment(
        customerId,
        UserRole.CUSTOMER,
        requestId,
        { carrierName: 'GHTK', trackingNumber: 'GHTK12345' },
        receipt,
      );
      await expect(
        service.submitShipment(
          customerId,
          UserRole.CUSTOMER,
          requestId,
          { carrierName: 'GHTK', trackingNumber: 'GHTK12345' },
          receipt,
        ),
      ).rejects.toThrow(ConflictException);
      expect(
        await prisma.returnShipment.count({
          where: { returnRequestId: requestId },
        }),
      ).toBe(1);

      await service.confirmReceipt(shopId, UserRole.SHOP_MANAGER, requestId);
      await service.startInspection(shopId, UserRole.SHOP_MANAGER, requestId);
      const result = await service.inspect(
        shopId,
        UserRole.SHOP_MANAGER,
        requestId,
        {
          resolution: 'REFUND',
          notes: 'Hàng trả đúng sản phẩm và đầy đủ bằng chứng.',
        },
      );
      expect(result.status).toBe(ReturnRequestStatus.REFUND_PENDING);
      expect(result.refund?.status).toBe('PENDING');
      expect(
        (
          await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
        ).refundedAmount.toNumber(),
      ).toBe(0);
      await expect(
        service.confirmCompletion(customerId, UserRole.CUSTOMER, requestId),
      ).rejects.toThrow(ConflictException);
    });
  },
);
