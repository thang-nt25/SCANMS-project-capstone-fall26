import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { ClickQueueService } from '../src/modules/referral-links/click-queue.service';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';

require('dotenv').config();

const cookieParser = require('cookie-parser');

jest.setTimeout(60_000);

describe('FR-16 — Guest Checkout (Đặt Hàng Nhanh) E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testStore1Id = '16161616-1616-4000-8000-000000000001';
  const testStore2Id = '16161616-1616-4000-8000-000000000002';
  const testOwner1Id = '26262626-1616-4000-8000-000000000001';
  const testOwner2Id = '26262626-1616-4000-8000-000000000002';

  const testProduct1Id = '36363636-1616-4000-8000-000000000001';
  const testProduct2Id = '36363636-1616-4000-8000-000000000002';
  const testProductStore2Id = '36363636-1616-4000-8000-000000000003';
  const testVariantId = '46464646-1616-4000-8000-000000000001';

  async function cleanupData() {
    if (!prisma) return;
    const storeIds = [testStore1Id, testStore2Id];
    const userIds = [testOwner1Id, testOwner2Id];
    const storeSlugs = ['store-1-fr16', 'store-2-fr16'];
    const userEmails = ['store1-owner-fr16@test.com', 'store2-owner-fr16@test.com'];
    const productIds = [testProduct1Id, testProduct2Id, testProductStore2Id];

    try {
      if ((prisma as any).paymentTransaction) {
        await (prisma as any).paymentTransaction.deleteMany({
          where: { order: { storeId: { in: storeIds } } },
        }).catch(() => {});
      }
      if (prisma.orderItem) {
        await prisma.orderItem.deleteMany({
          where: { order: { storeId: { in: storeIds } } },
        }).catch(() => {});
      }
      if (prisma.productVariant) {
        await prisma.productVariant.deleteMany({
          where: { OR: [{ id: testVariantId }, { sku: 'SP-FR16-01-V50' }] },
        }).catch(() => {});
      }
      if (prisma.couponRedemption) {
        await prisma.couponRedemption.deleteMany({
          where: { storeId: { in: storeIds } },
        }).catch(() => {});
      }
      if (prisma.order) {
        await prisma.order.deleteMany({
          where: { storeId: { in: storeIds } },
        }).catch(() => {});
      }
      if (prisma.product) {
        await prisma.product.deleteMany({
          where: { OR: [{ id: { in: productIds } }, { storeId: { in: storeIds } }] },
        }).catch(() => {});
      }
      if (prisma.store) {
        await prisma.store.deleteMany({
          where: { OR: [{ id: { in: storeIds } }, { slug: { in: storeSlugs } }] },
        }).catch(() => {});
      }
      if (prisma.user) {
        await prisma.user.deleteMany({
          where: { OR: [{ id: { in: userIds } }, { email: { in: userEmails } }] },
        }).catch(() => {});
      }
    } catch {
      // Ignore
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    const schedulerRegistry = app.get(SchedulerRegistry, { strict: false });
    if (schedulerRegistry) {
      const intervals = schedulerRegistry.getIntervals();
      intervals.forEach((i) => schedulerRegistry.deleteInterval(i));
    }

    const clickQueue = app.get(ClickQueueService, { strict: false });
    if (clickQueue && typeof clickQueue.onModuleDestroy === 'function') {
      clickQueue.onModuleDestroy();
    }

    await app.init();
    prisma = app.get(PrismaService);

    await cleanupData();

    // Setup test users idempotently (upsert chống duplicate email/pkey)
    await prisma.user.upsert({
      where: { email: 'store1-owner-fr16@test.com' },
      update: { fullName: 'Chủ Shop 1', role: 'SHOP_MANAGER', passwordHash: 'hash123' },
      create: {
        id: testOwner1Id,
        email: 'store1-owner-fr16@test.com',
        passwordHash: 'hash123',
        fullName: 'Chủ Shop 1',
        role: 'SHOP_MANAGER',
      },
    });
    await prisma.user.upsert({
      where: { email: 'store2-owner-fr16@test.com' },
      update: { fullName: 'Chủ Shop 2', role: 'SHOP_MANAGER', passwordHash: 'hash123' },
      create: {
        id: testOwner2Id,
        email: 'store2-owner-fr16@test.com',
        passwordHash: 'hash123',
        fullName: 'Chủ Shop 2',
        role: 'SHOP_MANAGER',
      },
    });

    // Setup test stores idempotently (upsert chống duplicate slug)
    await prisma.store.upsert({
      where: { slug: 'store-1-fr16' },
      update: { name: 'Store 1 FR16', isActive: true, ownerId: testOwner1Id },
      create: {
        id: testStore1Id,
        ownerId: testOwner1Id,
        name: 'Store 1 FR16',
        slug: 'store-1-fr16',
        isActive: true,
      },
    });
    await prisma.store.upsert({
      where: { slug: 'store-2-fr16' },
      update: { name: 'Store 2 FR16', isActive: true, ownerId: testOwner2Id },
      create: {
        id: testStore2Id,
        ownerId: testOwner2Id,
        name: 'Store 2 FR16',
        slug: 'store-2-fr16',
        isActive: true,
      },
    });

    // Setup test products idempotently
    await prisma.product.upsert({
      where: { id: testProduct1Id },
      update: { title: 'Serum Vitamin C 30ml', price: 250000, stockQuantity: 10, isActive: true },
      create: {
        id: testProduct1Id,
        storeId: testStore1Id,
        sku: 'SP-FR16-01',
        title: 'Serum Vitamin C 30ml',
        price: 250000,
        stockQuantity: 10,
        isActive: true,
      },
    });
    await prisma.product.upsert({
      where: { id: testProduct2Id },
      update: { title: 'Kem Chống Nắng 50ml', price: 320000, stockQuantity: 2, isActive: true },
      create: {
        id: testProduct2Id,
        storeId: testStore1Id,
        sku: 'SP-FR16-02',
        title: 'Kem Chống Nắng 50ml',
        price: 320000,
        stockQuantity: 2,
        isActive: true,
      },
    });
    await prisma.product.upsert({
      where: { id: testProductStore2Id },
      update: { title: 'Sản phẩm của Shop 2', price: 150000, stockQuantity: 20, isActive: true },
      create: {
        id: testProductStore2Id,
        storeId: testStore2Id,
        sku: 'SP-FR16-SHOP2',
        title: 'Sản phẩm của Shop 2',
        price: 150000,
        stockQuantity: 20,
        isActive: true,
      },
    });

    // Setup test product variant idempotently
    await prisma.productVariant.upsert({
      where: { sku: 'SP-FR16-01-VAR-L' },
      update: { name: 'Phân loại Size L 50ml', price: 350000, stockQuantity: 5, isActive: true },
      create: {
        id: testVariantId,
        productId: testProduct1Id,
        sku: 'SP-FR16-01-VAR-L',
        name: 'Phân loại Size L 50ml',
        price: 350000,
        stockQuantity: 5,
        isActive: true,
      },
    });
  });


  afterAll(async () => {
    await cleanupData();
    if (app) await app.close();
  });

  describe('1. Đặt hàng thành công không cần đăng nhập (Mục 1, 5, 8, 27)', () => {
    it('Khách vãng lai đặt hàng COD thành công với thông tin hợp lệ và nhận mã đơn + token', async () => {
      const idempotencyKey = randomUUID();
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Nguyễn Văn Khách',
          customerPhone: '0987654321',
          shippingAddress: 'Số 123 Đường Cầu Giấy, Hà Nội',
          orderNotes: 'Giao giờ hành chính',
          paymentMethod: 'COD',
          idempotencyKey,
          items: [
            {
              productId: testProduct1Id,
              quantity: 2,
              unitPrice: 1000, // Thử sửa giá giả mạo từ client
            },
          ],
        })
        .expect(201);

      expect(res.body.publicOrderCode).toMatch(/^DH-\d{4}-[0-9A-F]{8}$/);
      expect(res.body.cancellationToken).toBeDefined();
      expect(res.body.status).toBe('PENDING');
      expect(res.body.paymentMethod).toBe('COD');
      // Giá phải lấy từ backend (250.000 * 2 = 500.000), bỏ qua 1.000 client gửi
      expect(res.body.finalAmount).toBe(500000);
      expect(res.body.subtotalAmount).toBe(500000);

      // Kiểm tra tồn kho đã bị trừ đúng 2 sản phẩm (10 - 2 = 8)
      const p1 = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      expect(p1?.stockQuantity).toBe(8);
    });
  });

  describe('2. Kiểm tra xác thực thông tin bắt buộc (Mục 8, 9, 10, 11, 13)', () => {
    it('Chặn khi thiếu họ tên người nhận', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: '',
          customerPhone: '0987654321',
          shippingAddress: 'Số 123 Đường Cầu Giấy, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(400);
    });

    it('Chặn họ tên chứa mã độc script XSS', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: '<script>alert(1)</script>',
          customerPhone: '0987654321',
          shippingAddress: 'Số 123 Đường Cầu Giấy, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(400);
    });

    it('Chặn số điện thoại sai định dạng', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Trần Văn A',
          customerPhone: '12345678', // Không đủ 10 chữ số
          shippingAddress: 'Số 123 Đường Cầu Giấy, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(400);
    });

    it('Chặn số lượng nhỏ hơn 1 hoặc không phải số nguyên', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Trần Văn A',
          customerPhone: '0987654321',
          shippingAddress: 'Số 123 Đường Cầu Giấy, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 0 }],
        })
        .expect(400);
    });

    it('Chặn khi thiếu idempotencyKey', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Trần Văn A',
          customerPhone: '0987654321',
          shippingAddress: 'Số 123 Đường Cầu Giấy, Hà Nội',
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(400);
    });
  });

  describe('3. Ranh giới Multi-merchant — Đơn hàng 1 Shop (Mục 18, 34)', () => {
    it('Chặn khi giỏ hàng chứa sản phẩm từ 2 Shop khác nhau', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Lê Khách Mua',
          customerPhone: '0977888999',
          shippingAddress: 'Quận 1, TP Hồ Chí Minh',
          idempotencyKey: randomUUID(),
          items: [
            { productId: testProduct1Id, quantity: 1 }, // Thuộc Shop 1
            { productId: testProductStore2Id, quantity: 1 }, // Thuộc Shop 2
          ],
        })
        .expect(400);

      expect(res.body.message).toContain('MULTI_STORE_ORDER_NOT_ALLOWED');
    });
  });

  describe('4. Trừ kho an toàn & Chống Oversell / Tồn kho âm (Mục 24 & Quyết định 10)', () => {
    it('Chặn khi đặt số lượng vượt quá tồn kho thực tế', async () => {
      // testProduct2Id có stock = 2, khách đặt 5 -> Bị từ chối
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách Đặt Nhiều',
          customerPhone: '0912345678',
          shippingAddress: 'Hà Đông, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct2Id, quantity: 5 }],
        })
        .expect(400);

      expect(res.body.message).toContain('PRODUCT_OUT_OF_STOCK');

      // Tồn kho vẫn phải giữ nguyên là 2
      const p2 = await prisma.product.findUnique({
        where: { id: testProduct2Id },
      });
      expect(p2?.stockQuantity).toBe(2);
    });

    it('Khách mua hết tồn kho (2 cái) thành công, khách tiếp theo đặt 1 cái bị từ chối và kho không bao giờ âm', async () => {
      // Khách A mua đúng 2 cái còn lại
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách A',
          customerPhone: '0912345678',
          shippingAddress: 'Hà Đông, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct2Id, quantity: 2 }],
        })
        .expect(201);

      // Kho trở về 0
      let p2 = await prisma.product.findUnique({
        where: { id: testProduct2Id },
      });
      expect(p2?.stockQuantity).toBe(0);

      // Khách B cố mua 1 cái -> Bị chặn
      const resB = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách B',
          customerPhone: '0933333333',
          shippingAddress: 'Cầu Giấy, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct2Id, quantity: 1 }],
        })
        .expect(400);

      expect(resB.body.message).toContain('PRODUCT_OUT_OF_STOCK');

      // Tồn kho vẫn là 0, TUYỆT ĐỐI KHÔNG BỊ ÂM (-1)
      p2 = await prisma.product.findUnique({
        where: { id: testProduct2Id },
      });
      expect(p2?.stockQuantity).toBe(0);
    });
  });

  describe('5. Idempotency — Chống tạo đơn trùng khi bấm nút nhiều lần (Mục 21, 22)', () => {
    it('Gửi lại cùng idempotencyKey trả về đơn đã tạo trước đó mà không trừ kho lần hai', async () => {
      const sameKey = randomUUID();
      const payload = {
        customerName: 'Khách Nhấn Đúp',
        customerPhone: '0988776655',
        shippingAddress: 'Hoàn Kiếm, Hà Nội',
        paymentMethod: 'COD',
        idempotencyKey: sameKey,
        items: [{ productId: testProduct1Id, quantity: 1 }],
      };

      // Kho ban đầu là 8
      const pBefore = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      const stockBefore = pBefore!.stockQuantity;

      // Lần 1
      const res1 = await request(app.getHttpServer())
        .post('/orders')
        .send(payload)
        .expect(201);

      // Lần 2 (Double click cùng key)
      const res2 = await request(app.getHttpServer())
        .post('/orders')
        .send(payload)
        .expect(201);

      expect(res2.body.publicOrderCode).toBe(res1.body.publicOrderCode);
      expect(res2.body.orderId).toBe(res1.body.orderId);

      // Tồn kho chỉ bị trừ đúng 1 lần
      const pAfter = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      expect(pAfter!.stockQuantity).toBe(stockBefore - 1);
    });

    it('Gửi cùng idempotencyKey nhưng thay đổi nội dung đơn bị từ chối 409 Conflict', async () => {
      const sameKey = randomUUID();
      await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách A',
          customerPhone: '0988776655',
          shippingAddress: 'Hoàn Kiếm, Hà Nội',
          idempotencyKey: sameKey,
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(201);

      // Thử dùng lại key đó với số lượng khác
      const resConflict = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách A',
          customerPhone: '0988776655',
          shippingAddress: 'Hoàn Kiếm, Hà Nội',
          idempotencyKey: sameKey,
          items: [{ productId: testProduct1Id, quantity: 2 }],
        })
        .expect(409);

      expect(resConflict.body.message).toContain('IDEMPOTENCY_CONFLICT');
    });
  });

  describe('6. Phương thức thanh toán VIETQR (Mục 20 & Quyết định 11, 12)', () => {
    it('Tạo đơn VIETQR thành công trả về thông tin chuyển khoản và trạng thái WAITING_PAYMENT', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách Chuyển Khoản QR',
          customerPhone: '0966554433',
          shippingAddress: 'Hai Bà Trưng, Hà Nội',
          paymentMethod: 'VIETQR',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(201);

      expect(res.body.paymentMethod).toBe('VIETQR');
      expect(res.body.paymentStatus).toBe('WAITING_PAYMENT');
      expect(res.body.vietqr).toBeDefined();
      expect(res.body.vietqr.bankCode).toBe('MB');
      expect(res.body.vietqr.accountNumber).toBe('0383344696');
      expect(res.body.vietqr.memo).toBe(res.body.publicOrderCode);
      expect(res.body.vietqr.qrUrl).toContain('img.vietqr.io');
    });
  });

  describe('7. Tra cứu đơn hàng công khai & Bảo vệ PII (Mục 27, 28, 32)', () => {
    it('Tra cứu chi tiết bằng mã đơn + đúng SĐT hiển thị thông tin và che SĐT PII', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách Tra Cứu',
          customerPhone: '0987111222',
          shippingAddress: 'Tây Hồ, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(201);

      const code = createRes.body.publicOrderCode;

      const trackRes = await request(app.getHttpServer())
        .get(`/orders/public/${code}`)
        .query({ phone: '0987111222' })
        .expect(200);

      expect(trackRes.body.publicOrderCode).toBe(code);
      expect(trackRes.body.customerName).toBe('Khách Tra Cứu');
      // SĐT phải được che PII: 098****222
      expect(trackRes.body.customerPhoneMasked).toBe('098****222');
      // Không được lộ commission hoặc thông tin nội bộ
      expect(trackRes.body.commissions).toBeUndefined();
      expect(trackRes.body.attributedCollaboratorId).toBeUndefined();
    });

    it('Tra cứu với sai số điện thoại và không có token bị từ chối 403', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách Tra Cứu Sai SĐT',
          customerPhone: '0987111333',
          shippingAddress: 'Tây Hồ, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(201);

      const code = createRes.body.publicOrderCode;

      await request(app.getHttpServer())
        .get(`/orders/public/${code}`)
        .query({ phone: '0987999999' }) // Sai SĐT
        .expect(403);
    });
  });

  describe('8. Hủy đơn hàng công khai & Hoàn lại tồn kho (Mục 28, 31 & Quyết định 17)', () => {
    it('Hủy đơn với Cancellation Token và SĐT thành công, tồn kho được hoàn lại đầy đủ', async () => {
      const pBefore = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      const stockBefore = pBefore!.stockQuantity;

      // Tạo đơn mua 2 cái
      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách Cần Hủy Đơn',
          customerPhone: '0944556677',
          shippingAddress: 'Thanh Xuân, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 2 }],
        })
        .expect(201);

      const code = createRes.body.publicOrderCode;
      const cancellationToken = createRes.body.cancellationToken;

      // Kiểm tra kho bị trừ 2
      let pCurrent = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      expect(pCurrent!.stockQuantity).toBe(stockBefore - 2);

      // Khách gọi API hủy đơn công khai
      const cancelRes = await request(app.getHttpServer())
        .post(`/orders/public/${code}/cancel`)
        .send({
          cancellationToken,
          customerPhone: '0944556677',
          reason: 'Đổi ý không mua nữa',
        })
        .expect(200);

      expect(cancelRes.body.message).toContain('thành công');

      // Tồn kho phải được hoàn lại đúng 2 cái ban đầu
      const pAfter = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      expect(pAfter!.stockQuantity).toBe(stockBefore);

      // Thao tác hủy lần 2 là Idempotent (không hoàn kho lần 2)
      await request(app.getHttpServer())
        .post(`/orders/public/${code}/cancel`)
        .send({
          cancellationToken,
          customerPhone: '0944556677',
          reason: 'Bấm hủy lại lần 2',
        })
        .expect(200);

      const pFinal = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      expect(pFinal!.stockQuantity).toBe(stockBefore);
    });

    it('Hủy đơn với sai cancellationToken bị từ chối 403', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách Hủy Sai Token',
          customerPhone: '0944556688',
          shippingAddress: 'Thanh Xuân, Hà Nội',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(201);

      const code = createRes.body.publicOrderCode;

      await request(app.getHttpServer())
        .post(`/orders/public/${code}/cancel`)
        .send({
          cancellationToken: randomUUID(), // Token sai
          customerPhone: '0944556688',
        })
        .expect(403);
    });
  });

  describe('9. Đặt hàng với Phân loại sản phẩm (Variant / SKU) & Trừ / Hoàn kho Variant', () => {
    it('Đặt hàng kèm variantId thành công: chốt giá theo variant và trừ tồn kho variant chính xác', async () => {
      const vBefore = await prisma.productVariant.findUnique({
        where: { id: testVariantId },
      });
      expect(vBefore?.stockQuantity).toBe(5);

      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách Mua Variant',
          customerPhone: '0977112233',
          shippingAddress: 'Quận 1, TP. Hồ Chí Minh',
          paymentMethod: 'COD',
          idempotencyKey: randomUUID(),
          items: [
            {
              productId: testProduct1Id,
              variantId: testVariantId,
              quantity: 2,
            },
          ],
        })
        .expect(201);

      // Giá theo variant: 350.000 * 2 = 700.000 (khác giá gốc sản phẩm là 250.000)
      expect(res.body.finalAmount).toBe(700000);
      expect(res.body.items[0].variantId).toBe(testVariantId);

      // Tồn kho variant bị trừ: 5 - 2 = 3
      const vAfter = await prisma.productVariant.findUnique({
        where: { id: testVariantId },
      });
      expect(vAfter?.stockQuantity).toBe(3);

      // Hủy đơn: tồn kho variant được hoàn lại: 3 + 2 = 5
      const code = res.body.publicOrderCode;
      const cancellationToken = res.body.cancellationToken;
      await request(app.getHttpServer())
        .post(`/orders/public/${code}/cancel`)
        .send({
          cancellationToken,
          customerPhone: '0977112233',
          reason: 'Khách muốn đổi size',
        })
        .expect(200);

      const vRestored = await prisma.productVariant.findUnique({
        where: { id: testVariantId },
      });
      expect(vRestored?.stockQuantity).toBe(5);
    });
  });

  describe('10. Khôi phục quyền hủy đơn qua mã xác thực OTP (Lỗi 2)', () => {
    it('Khách làm mất cancellationToken có thể yêu cầu OTP qua SĐT và hủy đơn thành công', async () => {
      const pBefore = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      const stockBefore = pBefore!.stockQuantity;

      // 1. Tạo đơn COD
      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách Mất Token',
          customerPhone: '0966778899',
          shippingAddress: 'Ba Đình, Hà Nội',
          paymentMethod: 'COD',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(201);

      const code = createRes.body.publicOrderCode;

      // 2. Yêu cầu mã OTP hủy đơn
      const otpRes = await request(app.getHttpServer())
        .post(`/orders/public/${code}/request-cancellation-otp`)
        .send({ customerPhone: '0966778899' })
        .expect(200);

      expect(otpRes.body.expiresIn).toBe(300);
      const devOtp = otpRes.body.devOtp;
      expect(devOtp).toBeDefined();

      // 3. Hủy đơn bằng OTP nhận được
      await request(app.getHttpServer())
        .post(`/orders/public/${code}/cancel`)
        .send({
          otp: devOtp,
          customerPhone: '0966778899',
          reason: 'Khách dùng OTP để hủy đơn',
        })
        .expect(200);

      // Đơn hàng sang CANCELLED và tồn kho được hoàn lại
      const orderInDb = await prisma.order.findFirst({
        where: { externalOrderSn: code },
      });
      expect(orderInDb?.status).toBe('CANCELLED');

      const pAfter = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      expect(pAfter!.stockQuantity).toBe(stockBefore);
    });
  });

  describe('11. Chống Race Condition — Concurrent Cancellation (Lỗi 4)', () => {
    it('Hai yêu cầu hủy đơn gửi song song chỉ hoàn kho 1 lần duy nhất, không nhân đôi tồn kho', async () => {
      const pBefore = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      const stockBefore = pBefore!.stockQuantity;

      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách Race Condition Cancel',
          customerPhone: '0911223344',
          shippingAddress: 'Hoàng Mai, Hà Nội',
          paymentMethod: 'COD',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 2 }],
        })
        .expect(201);

      const code = createRes.body.publicOrderCode;
      const cancellationToken = createRes.body.cancellationToken;

      // Gửi 2 request hủy song song
      const [req1, req2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/orders/public/${code}/cancel`)
          .send({ cancellationToken, customerPhone: '0911223344' }),
        request(app.getHttpServer())
          .post(`/orders/public/${code}/cancel`)
          .send({ cancellationToken, customerPhone: '0911223344' }),
      ]);

      expect(req1.status).toBe(200);
      expect(req2.status).toBe(200);

      // Tồn kho chỉ được hoàn đúng 2 cái, trở về đúng bằng stockBefore
      const pAfter = await prisma.product.findUnique({
        where: { id: testProduct1Id },
      });
      expect(pAfter!.stockQuantity).toBe(stockBefore);
    });
  });

  describe('12. Webhook Đối Soát Thanh Toán VietQR & Chữ Ký HMAC (Lỗi 3, 4)', () => {
    it('Đối soát thành công với chữ ký HMAC-SHA256 hợp lệ, cập nhật trạng thái PAID', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách VietQR Webhook',
          customerPhone: '0988001122',
          shippingAddress: 'Long Biên, Hà Nội',
          paymentMethod: 'VIETQR',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(201);

      const code = createRes.body.publicOrderCode;
      const amount = createRes.body.finalAmount;
      const transactionId = `TXN-${randomUUID().slice(0, 8)}`;

      const webhookPayload = {
        orderCode: code,
        amount,
        transactionId,
        currency: 'VND',
      };

      const webhookSecret =
        process.env.PAYMENT_WEBHOOK_SECRET ||
        'scanms_payment_webhook_secret_prod_secure_fa26se032';
      const hmacSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(webhookPayload))
        .digest('hex');

      // Gửi webhook thành công
      const hookRes = await request(app.getHttpServer())
        .post('/orders/payment-webhook')
        .set('x-webhook-signature', `sha256=${hmacSignature}`)
        .send(webhookPayload)
        .expect(200);

      expect(hookRes.body.status).toBe('PAID');

      // Replay lại webhook đó là Idempotent
      const replayRes = await request(app.getHttpServer())
        .post('/orders/payment-webhook')
        .set('x-webhook-signature', `sha256=${hmacSignature}`)
        .send(webhookPayload)
        .expect(200);

      expect(replayRes.body.message).toContain('Idempotent');

      // Gửi webhook với sai chữ ký bị từ chối 403
      await request(app.getHttpServer())
        .post('/orders/payment-webhook')
        .set('x-webhook-signature', 'sha256=invalid_signature_hash_0000000000000000000000000000000000000000')
        .send(webhookPayload)
        .expect(403);
    });
  });

  describe('13. Bảo Mật Dữ Liệu & Không Làm Lộ PII / Internal Entity (Lỗi 1)', () => {
    it('Phản hồi tạo đơn không chứa object order nội bộ, không lộ UUID, không lộ attribution snapshot', async () => {
      const res = await request(app.getHttpServer())
        .post('/orders')
        .send({
          customerName: 'Khách Kiểm Tra PII',
          customerPhone: '0988776655',
          shippingAddress: 'Cầu Giấy, Hà Nội',
          paymentMethod: 'COD',
          idempotencyKey: randomUUID(),
          items: [{ productId: testProduct1Id, quantity: 1 }],
        })
        .expect(201);

      // Tuyệt đối không được chứa trường `order` thực thể Prisma nội bộ
      expect(res.body.order).toBeUndefined();
      expect(res.body.commissions).toBeUndefined();
      expect(res.body.attributedCollaboratorId).toBeUndefined();
      expect(res.body.attributionSnapshot).toBeUndefined();
      expect(res.body.rawPayload).toBeUndefined();

      // Phải có DTO công khai an toàn
      expect(res.body.publicOrderCode).toMatch(/^DH-\d{4}-[0-9A-F]{8}$/);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.finalAmount).toBeDefined();
    });
  });
});

