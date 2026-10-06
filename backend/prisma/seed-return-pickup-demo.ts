import 'dotenv/config';
import { OrderStatus, PrismaClient, ReturnReason, ReturnRequestStatus, UserRole } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

// This fixture is intentionally restricted to the isolated local demo database.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || process.env.RETURN_PICKUP_DEMO_SEED !== '1') {
  throw new Error('Set DATABASE_URL and RETURN_PICKUP_DEMO_SEED=1 to seed the pickup demo');
}
const target = new URL(databaseUrl);
if (!['127.0.0.1', 'localhost', '::1'].includes(target.hostname) || target.port !== '55432') {
  throw new Error('Pickup demo seed only accepts a local PostgreSQL database on port 55432');
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const passwordHash = bcrypt.hashSync('Password@123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'return.customer@scanms.test' },
    update: {},
    create: { email: 'return.customer@scanms.test', passwordHash, fullName: 'Khách Demo Đổi Trả',
      phoneNumber: '0912345678', role: UserRole.CUSTOMER },
  });
  const shopOwner = await prisma.user.upsert({
    where: { email: 'return.shop@scanms.test' },
    update: {},
    create: { email: 'return.shop@scanms.test', passwordHash, fullName: 'Chủ Shop Demo Đổi Trả',
      phoneNumber: '0901234567', role: UserRole.SHOP_MANAGER },
  });
  const store = await prisma.store.upsert({
    where: { slug: 'scanms-return-pickup-demo' },
    update: {},
    create: { ownerId: shopOwner.id, slug: 'scanms-return-pickup-demo', name: 'Gian hàng Demo Đổi Trả',
      description: 'Gian hàng thử luồng shipper lấy hàng trả tại nhà.' },
  });
  let product = await prisma.product.findFirst({ where: { storeId: store.id, sku: 'RETURN-PICKUP-DEMO' } });
  product ??= await prisma.product.create({ data: {
    storeId: store.id, sku: 'RETURN-PICKUP-DEMO', title: 'Sữa rửa mặt demo đổi trả',
    categoryName: 'Chăm sóc da', price: 120000, stockQuantity: 10,
    imageUrl: 'http://localhost:5173/assets/cica-mask-product.jpg',
  } });
  let order = await prisma.order.findFirst({ where: { storeId: store.id, externalOrderSn: 'DEMO-RETURN-PICKUP-001' } });
  order ??= await prisma.order.create({ data: {
    storeId: store.id, customerId: customer.id, externalOrderSn: 'DEMO-RETURN-PICKUP-001',
    customerName: customer.fullName, customerPhone: customer.phoneNumber,
    customerEmail: customer.email,
    shippingAddress: '15 Đường số 8, Phường Linh Trung, Thành phố Hồ Chí Minh',
    subtotalAmount: 120000, finalAmount: 120000, status: OrderStatus.RETURN_REQUESTED,
    deliveredAt: new Date(Date.now() - 86_400_000),
  } });
  let item = await prisma.orderItem.findFirst({ where: { orderId: order.id, productId: product.id } });
  item ??= await prisma.orderItem.create({ data: {
    orderId: order.id, productId: product.id, quantity: 1, unitPrice: 120000,
    appliedCommissionRate: 0, calculatedCommissionAmount: 0,
  } });
  const request = await prisma.returnRequest.upsert({
    where: { orderId: order.id },
    update: {}, // Re-running the seed must not reset progress made while testing.
    create: {
      orderId: order.id, customerId: customer.id, reason: ReturnReason.WRONG_ITEM,
      details: 'Hồ sơ demo: Shop đã duyệt, chờ cấu hình kho nhận hàng trả.',
      imageUrls: ['http://localhost:5173/assets/cica-mask-product.jpg'],
      unboxingVideoUrl: 'http://localhost:5173/assets/sample-video.mp4',
      status: ReturnRequestStatus.SHOP_APPROVED,
      originalOrderStatus: OrderStatus.DELIVERED,
      deadlineAt: new Date(Date.now() + 13 * 86_400_000),
      shopResponse: 'Shop đã duyệt yêu cầu demo. Vui lòng đặt shipper lấy hàng tại nhà.',
      shopRespondedAt: new Date(),
      items: { create: [{ orderItemId: item.id, quantity: 1, unitPrice: 120000 }] },
    },
  });
  console.log(JSON.stringify({
    customer: customer.email, shop: shopOwner.email, password: 'Password@123',
    order: order.externalOrderSn, returnRequestId: request.id,
    customerUrl: `http://localhost:5173/customer/returns/${request.id}`,
    shopUrl: `http://localhost:5173/merchant/returns/${request.id}`,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
