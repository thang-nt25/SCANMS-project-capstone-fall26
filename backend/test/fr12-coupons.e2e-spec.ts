import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import {
  UserRole,
  CouponStatus,
  DiscountType,
  CouponFundingSource,
  CouponRedemptionStatus,
  OrderStatus,
  CommissionStatus,
  AttributionMethod,
  StoreCollaboratorStatus,
  Prisma,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { CacheService } from '../src/core/cache/cache.service';
import { ClickQueueService } from '../src/modules/referral-links/click-queue.service';
import { ChatGateway } from '../src/modules/chat/chat.gateway';

const cookieParser = require('cookie-parser');

jest.setTimeout(90_000);

describe('FR-12 — Coupon Attribution & Redemption E2E Suite (Real PostgreSQL & Redis)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cacheService: CacheService;

  const adminId = 'aaaaaaaa-1212-4000-8000-000000000012';
  const shopOwnerId = 'bbbbbbbb-1212-4000-8000-000000000012';
  const otherShopOwnerId = 'cccccccc-1212-4000-8000-000000000012';
  const kolAId = 'dddddddd-1212-4000-8000-000000000012';
  const kolBId = 'eeeeeeee-1212-4000-8000-000000000012';
  const storeId = 'ffffffff-1212-4000-8000-000000000012';
  const otherStoreId = '11111111-1212-4000-8000-000000000012';
  const prod1Id = '22222222-1212-4000-8000-000000000012';
  const prod2Id = '33333333-1212-4000-8000-000000000012';
  const refLinkId = '44444444-1212-4000-8000-000000000012';

  let tokenAdmin: string;
  let tokenShop: string;
  let tokenOtherShop: string;
  let tokenKolA: string;
  let tokenKolB: string;

  async function cleanup() {
    try {
      const testEmails = [
        'admin-fr12@scanms.test',
        'shop-fr12@scanms.test',
        'othershop-fr12@scanms.test',
        'kola-fr12@scanms.test',
        'kolb-fr12@scanms.test',
      ];
      const baseUserIds = [adminId, shopOwnerId, otherShopOwnerId, kolAId, kolBId];
      const baseStoreIds = [storeId, otherStoreId];

      // 0. Tìm tất cả users & stores liên quan (theo cả ID, email, và slug)
      const existingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: baseUserIds } },
            { email: { in: testEmails } },
          ],
        },
        select: { id: true },
      });
      const allUserIds = Array.from(
        new Set([...baseUserIds, ...existingUsers.map((u) => u.id)]),
      );

      const existingStores = await prisma.store.findMany({
        where: {
          OR: [
            { id: { in: baseStoreIds } },
            { slug: { in: ['fr12-demo-store', 'fr12-other-store'] } },
            { ownerId: { in: allUserIds } },
          ],
        },
        select: { id: true },
      });
      const allStoreIds = Array.from(
        new Set([...baseStoreIds, ...existingStores.map((s) => s.id)]),
      );

      // Tìm tất cả orders & coupons & products
      const existingOrders = await prisma.order.findMany({
        where: {
          OR: [
            { storeId: { in: allStoreIds } },
            { attributedCollaboratorId: { in: allUserIds } },
          ],
        },
        select: { id: true },
      });
      const allOrderIds = existingOrders.map((o) => o.id);

      const existingCoupons = await prisma.coupon.findMany({
        where: {
          OR: [
            { storeId: { in: allStoreIds } },
            { collaboratorId: { in: allUserIds } },
            { codeNormalized: { in: ['THANGVIP10', 'MIN500K', 'RACEQUOTA1'] } },
          ],
        },
        select: { id: true },
      });
      const allCouponIds = existingCoupons.map((c) => c.id);

      const existingProducts = await prisma.product.findMany({
        where: {
          OR: [
            { id: { in: [prod1Id, prod2Id] } },
            { storeId: { in: allStoreIds } },
          ],
        },
        select: { id: true },
      });
      const allProductIds = Array.from(
        new Set([prod1Id, prod2Id, ...existingProducts.map((p) => p.id)]),
      );

      const existingRefLinks = await prisma.referralLink.findMany({
        where: {
          OR: [
            { id: refLinkId },
            { storeId: { in: allStoreIds } },
            { collaboratorId: { in: allUserIds } },
          ],
        },
        select: { id: true },
      });
      const allRefLinkIds = Array.from(
        new Set([refLinkId, ...existingRefLinks.map((r) => r.id)]),
      );

      const existingWallets = await prisma.wallet.findMany({
        where: { collaboratorId: { in: allUserIds } },
        select: { id: true },
      });
      const allWalletIds = existingWallets.map((w) => w.id);

      // 1. Xóa BonusAdjustments & Refunds
      if (allStoreIds.length > 0) {
        await prisma.bonusAdjustment
          .deleteMany({ where: { storeId: { in: allStoreIds } } })
          .catch(() => {});
      }
      if (allOrderIds.length > 0) {
        await prisma.orderRefund
          .deleteMany({ where: { orderId: { in: allOrderIds } } })
          .catch(() => {});
        await prisma.couponRedemption
          .deleteMany({ where: { orderId: { in: allOrderIds } } })
          .catch(() => {});
        await prisma.commission
          .deleteMany({ where: { orderId: { in: allOrderIds } } })
          .catch(() => {});
        await prisma.orderItem
          .deleteMany({ where: { orderId: { in: allOrderIds } } })
          .catch(() => {});
        await prisma.productReview
          .deleteMany({ where: { orderId: { in: allOrderIds } } })
          .catch(() => {});
      }

      // 2. Xóa Coupon Redemptions & Relations
      if (allCouponIds.length > 0) {
        await prisma.couponRedemption
          .deleteMany({ where: { couponId: { in: allCouponIds } } })
          .catch(() => {});
        await prisma.couponProduct
          .deleteMany({ where: { couponId: { in: allCouponIds } } })
          .catch(() => {});
        await prisma.couponCategory
          .deleteMany({ where: { couponId: { in: allCouponIds } } })
          .catch(() => {});
      }
      if (allStoreIds.length > 0) {
        await prisma.couponRedemption
          .deleteMany({ where: { storeId: { in: allStoreIds } } })
          .catch(() => {});
      }

      // 3. Xóa Orders & Coupons
      if (allOrderIds.length > 0) {
        await prisma.order
          .deleteMany({ where: { id: { in: allOrderIds } } })
          .catch(() => {});
      }
      if (allCouponIds.length > 0) {
        await prisma.coupon
          .deleteMany({ where: { id: { in: allCouponIds } } })
          .catch(() => {});
      }

      // 4. Xóa Referral Links & Traffic Logs
      if (allRefLinkIds.length > 0) {
        await prisma.clickTrafficLog
          .deleteMany({ where: { referralLinkId: { in: allRefLinkIds } } })
          .catch(() => {});
        await prisma.referralLink
          .deleteMany({ where: { id: { in: allRefLinkIds } } })
          .catch(() => {});
      }

      // 5. Xóa Products & Campaign/Media
      if (allProductIds.length > 0) {
        await prisma.campaignProduct
          .deleteMany({ where: { productId: { in: allProductIds } } })
          .catch(() => {});
        await prisma.sampleProductRequest
          .deleteMany({ where: { productId: { in: allProductIds } } })
          .catch(() => {});
        await prisma.mediaAsset
          .deleteMany({ where: { productId: { in: allProductIds } } })
          .catch(() => {});
        await prisma.productReview
          .deleteMany({ where: { productId: { in: allProductIds } } })
          .catch(() => {});
        await prisma.product
          .deleteMany({ where: { id: { in: allProductIds } } })
          .catch(() => {});
      }

      // 6. Xóa Store Relations
      if (allStoreIds.length > 0) {
        await prisma.mediaAsset
          .deleteMany({ where: { storeId: { in: allStoreIds } } })
          .catch(() => {});
        await prisma.campaign
          .deleteMany({ where: { storeId: { in: allStoreIds } } })
          .catch(() => {});
        await prisma.commissionRule
          .deleteMany({ where: { storeId: { in: allStoreIds } } })
          .catch(() => {});
        await prisma.monthlyBonusResult
          .deleteMany({ where: { storeId: { in: allStoreIds } } })
          .catch(() => {});
        await prisma.conversation
          .deleteMany({ where: { storeId: { in: allStoreIds } } })
          .catch(() => {});
        await prisma.storeCollaborator
          .deleteMany({ where: { storeId: { in: allStoreIds } } })
          .catch(() => {});
      }

      // 7. Xóa Financial / Wallet
      if (allWalletIds.length > 0) {
        await prisma.financialLedger
          .deleteMany({ where: { walletId: { in: allWalletIds } } })
          .catch(() => {});
      }

      // 8. Xóa User Relations & Notifications
      if (allUserIds.length > 0) {
        await prisma.wallet
          .deleteMany({ where: { collaboratorId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.payoutRequest
          .deleteMany({ where: { collaboratorId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.monthlyBonusResult
          .deleteMany({ where: { collaboratorId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.campaignParticipant
          .deleteMany({ where: { collaboratorId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.sampleProductRequest
          .deleteMany({ where: { collaboratorId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.storeCollaborator
          .deleteMany({ where: { collaboratorId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.collaboratorSocialChannel
          .deleteMany({ where: { collaboratorId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.collaboratorProfile
          .deleteMany({ where: { userId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.notification
          .deleteMany({ where: { userId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.chatMessage
          .deleteMany({ where: { senderId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.conversation
          .deleteMany({ where: { collaboratorId: { in: allUserIds } } })
          .catch(() => {});
        await prisma.auditLog
          .deleteMany({ where: { userId: { in: allUserIds } } })
          .catch(() => {});
      }

      // 9. Xóa Stores
      if (allStoreIds.length > 0) {
        await prisma.store
          .deleteMany({ where: { id: { in: allStoreIds } } })
          .catch(() => {});
      }

      // 10. Xóa Users
      if (allUserIds.length > 0) {
        await prisma.user
          .deleteMany({
            where: {
              OR: [
                { id: { in: allUserIds } },
                { email: { in: testEmails } },
              ],
            },
          })
          .catch(() => {});
      }
    } catch {
      // Suppress any cleanup errors during shutdown
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    cacheService = app.get(CacheService);

    await cleanup();

    const passwordHash = await bcrypt.hash('Password@123', 10);

    // 1. Tạo Users an toàn (upsert chống lỗi trùng lặp khi chạy lại)
    const testUsers = [
      {
        id: adminId,
        email: 'admin-fr12@scanms.test',
        fullName: 'System Admin FR12',
        role: UserRole.SYSTEM_ADMIN,
      },
      {
        id: shopOwnerId,
        email: 'shop-fr12@scanms.test',
        fullName: 'Shop Owner FR12',
        role: UserRole.SHOP_MANAGER,
      },
      {
        id: otherShopOwnerId,
        email: 'othershop-fr12@scanms.test',
        fullName: 'Other Shop Owner FR12',
        role: UserRole.SHOP_MANAGER,
      },
      {
        id: kolAId,
        email: 'kola-fr12@scanms.test',
        fullName: 'KOL Thang FR12',
        role: UserRole.COLLABORATOR,
      },
      {
        id: kolBId,
        email: 'kolb-fr12@scanms.test',
        fullName: 'KOL B FR12',
        role: UserRole.COLLABORATOR,
      },
    ];

    for (const u of testUsers) {
      await prisma.user.upsert({
        where: { id: u.id },
        create: { ...u, passwordHash },
        update: { ...u, passwordHash },
      });
    }

    // 2. Tạo Stores an toàn (upsert)
    const testStores = [
      {
        id: storeId,
        ownerId: shopOwnerId,
        name: 'FR12 Demo Store',
        slug: 'fr12-demo-store',
        defaultCommissionRate: new Prisma.Decimal(10.0),
      },
      {
        id: otherStoreId,
        ownerId: otherShopOwnerId,
        name: 'FR12 Other Store',
        slug: 'fr12-other-store',
        defaultCommissionRate: new Prisma.Decimal(10.0),
      },
    ];

    for (const s of testStores) {
      await prisma.store.upsert({
        where: { id: s.id },
        create: s,
        update: s,
      });
    }

    // 3. Liên kết KOL A với Store (APPROVED)
    await prisma.storeCollaborator.upsert({
      where: {
        storeId_collaboratorId: {
          storeId,
          collaboratorId: kolAId,
        },
      },
      create: {
        storeId,
        collaboratorId: kolAId,
        status: StoreCollaboratorStatus.APPROVED,
      },
      update: {
        status: StoreCollaboratorStatus.APPROVED,
      },
    });

    // 4. Tạo sản phẩm an toàn (upsert)
    const testProducts = [
      {
        id: prod1Id,
        storeId,
        sku: 'FR12-CREAM-01',
        title: 'Kem dưỡng cao cấp FR12',
        price: new Prisma.Decimal(200_000),
        stockQuantity: 100,
        isActive: true,
      },
      {
        id: prod2Id,
        storeId,
        sku: 'FR12-SERUM-01',
        title: 'Serum phục hồi FR12',
        price: new Prisma.Decimal(300_000),
        stockQuantity: 100,
        isActive: true,
      },
    ];

    for (const p of testProducts) {
      await prisma.product.upsert({
        where: { id: p.id },
        create: p,
        update: p,
      });
    }

    // 5. Tạo link giới thiệu của KOL B an toàn (upsert)
    await prisma.referralLink.upsert({
      where: { id: refLinkId },
      create: {
        id: refLinkId,
        storeId,
        collaboratorId: kolBId,
        productId: prod1Id,
        shortCode: 'kolbref12',
        destinationPath: `/products/${prod1Id}`,
      },
      update: {
        storeId,
        collaboratorId: kolBId,
        productId: prod1Id,
        shortCode: 'kolbref12',
      },
    });

    // Đăng nhập lấy JWT tokens
    const resAdmin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin-fr12@scanms.test', password: 'Password@123' });
    tokenAdmin = resAdmin.body.accessToken;

    const resShop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'shop-fr12@scanms.test', password: 'Password@123' });
    tokenShop = resShop.body.accessToken;

    const resOtherShop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'othershop-fr12@scanms.test', password: 'Password@123' });
    tokenOtherShop = resOtherShop.body.accessToken;

    const resKolA = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kola-fr12@scanms.test', password: 'Password@123' });
    tokenKolA = resKolA.body.accessToken;

    const resKolB = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kolb-fr12@scanms.test', password: 'Password@123' });
    tokenKolB = resKolB.body.accessToken;
  });

  let createdCouponId: string;

  it('1. KOL đề xuất mã giảm giá mới (normalize sang chữ HOA, status PENDING_APPROVAL)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/collaborator/coupons')
      .set('Authorization', `Bearer ${tokenKolA}`)
      .send({
        storeId,
        code: 'thangvip10',
      })
      .expect(201);

    expect(res.body.coupon).toBeDefined();
    expect(res.body.coupon.codeNormalized).toBe('THANGVIP10');
    expect(res.body.coupon.status).toBe(CouponStatus.PENDING_APPROVAL);
    createdCouponId = res.body.coupon.id;
  });

  it('2. Chặn Shop tự chọn nguồn tài trợ SCANMS (PLATFORM_FUNDED / CO_FUNDED trả về 403)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/stores/${storeId}/coupons/${createdCouponId}/approve`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        fundingSource: CouponFundingSource.PLATFORM_FUNDED,
      })
      .expect(403);

    expect(res.body.message).toContain(
      'Gian hàng không có quyền chỉ định nền tảng SCANMS đồng tài trợ',
    );
  });

  it('3. Shop phê duyệt hợp lệ với nguồn SHOP_FUNDED (kích hoạt ACTIVE)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/stores/${storeId}/coupons/${createdCouponId}/approve`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 20,
        maximumDiscountAmount: 100_000,
        minimumOrderAmount: 150_000,
        usageLimitTotal: 10,
        usageLimitPerCustomer: 2,
        budgetTotal: 1_000_000,
        fundingSource: CouponFundingSource.SHOP_FUNDED,
        stackableWithProductDiscount: true,
      })
      .expect(200);

    expect(res.body.coupon.status).toBe(CouponStatus.ACTIVE);
    expect(Number(res.body.coupon.discountValue)).toBe(20);
    expect(res.body.coupon.fundingSource).toBe(CouponFundingSource.SHOP_FUNDED);
  });

  it('4. Khách kiểm tra mã giảm giá tại Giỏ hàng / Checkout (validateCoupon)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/coupons/validate')
      .send({
        code: 'THANGVIP10',
        customerPhone: '0912345678',
        items: [{ productId: prod1Id, quantity: 1 }], // 200k * 20% = 40k
      })
      .expect(200);

    expect(res.body.valid).toBe(true);
    expect(res.body.discountAmount).toBe(40_000);
    expect(res.body.eligibleSubtotal).toBe(200_000);
    // collaboratorId must be masked from public response
    expect(res.body.collaboratorId).toBeUndefined();
  });

  it('5. Từ chối validate khi giỏ hàng dưới mức tối thiểu', async () => {
    // Tạo coupon yêu cầu đơn tối thiểu 500k
    const couponMin = await prisma.coupon.create({
      data: {
        codeNormalized: 'MIN500K',
        displayCode: 'MIN500K',
        storeId,
        collaboratorId: kolAId,
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(10),
        minimumOrderAmount: new Prisma.Decimal(500_000),
      },
    });

    const res = await request(app.getHttpServer())
      .post('/api/coupons/validate')
      .send({
        code: 'MIN500K',
        items: [{ productId: prod1Id, quantity: 1 }], // 200k < 500k
      })
      .expect(400);

    expect(res.body.message).toContain('cần tối thiểu');

    await prisma.coupon.delete({ where: { id: couponMin.id } });
  });

  let firstOrderId: string;
  let firstOrderCancellationToken: string;
  const testIdempotencyKey = 'idemp-key-e2e-fr12-test-001';

  it('6. Guest Checkout với Coupon & Idempotency Key (Attribution cho KOL)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .send({
        storeSlug: 'fr12-demo-store',
        idempotencyKey: testIdempotencyKey,
        customerName: 'Nguyen Van Guest',
        customerPhone: '0912345678',
        shippingAddress: '123 Đường Láng, Hà Nội',
        couponCode: 'THANGVIP10',
        items: [{ productId: prod1Id, quantity: 1 }], // 200k -> giảm 40k -> 160k
      })
      .expect(201);

    expect(res.body.order).toBeDefined();
    firstOrderId = res.body.order.id;
    firstOrderCancellationToken =
      res.body.cancellationToken || res.body.order.cancellationToken;
    expect(firstOrderCancellationToken).toBeDefined();
    expect(Number(res.body.order.couponDiscountAmount)).toBe(40000);
    expect(Number(res.body.order.finalAmount)).toBe(160000);
    expect(res.body.order.attributedCollaboratorId).toBe(kolAId);
    expect(res.body.order.attributionMethod).toBe(AttributionMethod.COUPON);

    // Kiểm tra quota coupon đã được cập nhật
    const c = await prisma.coupon.findUnique({ where: { id: createdCouponId } });
    expect(c?.usageCount).toBe(1);
    expect(Number(c?.budgetUsed)).toBe(40_000);

    // Kiểm tra CouponRedemption
    const red = await prisma.couponRedemption.findUnique({
      where: { orderId: firstOrderId },
    });
    expect(red).toBeDefined();
    expect(red?.status).toBe(CouponRedemptionStatus.USED);
    expect(Number(red?.discountAmount)).toBe(40_000);
  });

  it('7. Idempotency retry: Gửi lại cùng key trả về cùng đơn hàng, không trừ 2 lần', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .send({
        storeSlug: 'fr12-demo-store',
        idempotencyKey: testIdempotencyKey,
        customerName: 'Nguyen Van Guest',
        customerPhone: '0912345678',
        shippingAddress: '123 Đường Láng, Hà Nội',
        couponCode: 'THANGVIP10',
        items: [{ productId: prod1Id, quantity: 1 }],
      })
      .expect(201);

    expect(res.body.order.id).toBe(firstOrderId);

    // Quota coupon vẫn là 1, không tăng thêm
    const c = await prisma.coupon.findUnique({ where: { id: createdCouponId } });
    expect(c?.usageCount).toBe(1);
    expect(Number(c?.budgetUsed)).toBe(40_000);
  });

  it('8. Coupon override referral cookie: Ưu tiên mã giảm giá hơn link tiếp thị', async () => {
    // Khách có cookie của KOL B nhưng nhập coupon của KOL A
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', [`scanms_referral_link=${refLinkId}`])
      .send({
        storeSlug: 'fr12-demo-store',
        idempotencyKey: 'idemp-override-cookie-test-002',
        customerName: 'Tran Thi B',
        customerPhone: '0987654321',
        shippingAddress: '456 Cầu Giấy, Hà Nội',
        couponCode: 'THANGVIP10',
        items: [{ productId: prod1Id, quantity: 1 }],
      })
      .expect(201);

    expect(res.body.order.attributedCollaboratorId).toBe(kolAId);
    expect(res.body.order.attributionMethod).toBe(AttributionMethod.COUPON);
    expect(res.body.order.overrideReason).toBe('COUPON_OVERRIDE_COOKIE');
    expect(res.body.order.originalCollaboratorId).toBe(kolBId);
  });

  it('9. Hai checkout đồng thời: Row lock ngăn vượt quota khi chỉ còn 1 lượt', async () => {
    // Tạo coupon giới hạn chỉ 1 lượt
    const raceCoupon = await prisma.coupon.create({
      data: {
        codeNormalized: 'RACEQUOTA1',
        displayCode: 'RACEQUOTA1',
        storeId,
        collaboratorId: kolAId,
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.FIXED_AMOUNT,
        discountValue: new Prisma.Decimal(10_000),
        usageLimitTotal: 1,
        usageCount: 0,
      },
    });

    // Chạy 2 checkout đồng thời
    const req1 = request(app.getHttpServer())
      .post('/api/orders')
      .send({
        storeSlug: 'fr12-demo-store',
        idempotencyKey: 'race-req-1',
        customerName: 'Race 1',
        customerPhone: '0911111111',
        shippingAddress: 'Hà Nội',
        couponCode: 'RACEQUOTA1',
        items: [{ productId: prod1Id, quantity: 1 }],
      });

    const req2 = request(app.getHttpServer())
      .post('/api/orders')
      .send({
        storeSlug: 'fr12-demo-store',
        idempotencyKey: 'race-req-2',
        customerName: 'Race 2',
        customerPhone: '0922222222',
        shippingAddress: 'Hà Nội',
        couponCode: 'RACEQUOTA1',
        items: [{ productId: prod1Id, quantity: 1 }],
      });

    const [res1, res2] = await Promise.all([req1, req2]);
    const statuses = [res1.status, res2.status].sort();
    // Đúng 1 request thành công 201 và 1 request thất bại 409 (hoặc 400)
    expect(statuses[0]).toBe(201);
    expect([400, 409]).toContain(statuses[1]);

    const updatedRaceCoupon = await prisma.coupon.findUnique({
      where: { id: raceCoupon.id },
    });
    expect(updatedRaceCoupon?.usageCount).toBe(1);
  });

  it('10. Bảo vệ endpoint hủy đơn: Yêu cầu xác thực và phân quyền nghiêm ngặt (Token + SĐT + RBAC)', async () => {
    // 10.1 Không có JWT khi gọi endpoint xác thực -> 401 Unauthorized
    await request(app.getHttpServer())
      .post(`/api/orders/${firstOrderId}/cancel`)
      .send({ reason: 'Hủy test' })
      .expect(401);

    // 10.2 Chủ shop khác gọi hủy -> 403 Forbidden
    await request(app.getHttpServer())
      .post(`/api/orders/${firstOrderId}/cancel`)
      .set('Authorization', `Bearer ${tokenOtherShop}`)
      .send({ reason: 'Hủy đơn trộm' })
      .expect(403);

    // 10.3 Khách vãng lai gọi guest-cancel thiếu cancellationToken -> 400 Bad Request
    await request(app.getHttpServer())
      .post(`/api/orders/${firstOrderId}/guest-cancel`)
      .send({
        customerPhone: '0912345678',
        reason: 'Hủy thiếu token',
      })
      .expect(400);

    // 10.4 Khách vãng lai gọi guest-cancel sai cancellationToken -> 403 Forbidden
    await request(app.getHttpServer())
      .post(`/api/orders/${firstOrderId}/guest-cancel`)
      .send({
        cancellationToken: 'invalid-cancellation-token-xyz',
        customerPhone: '0912345678',
        reason: 'Hủy sai token',
      })
      .expect(403);

    // 10.5 Khách vãng lai gọi guest-cancel đúng token nhưng sai số điện thoại -> 403 Forbidden
    await request(app.getHttpServer())
      .post(`/api/orders/${firstOrderId}/guest-cancel`)
      .send({
        cancellationToken: firstOrderCancellationToken,
        customerPhone: '0999999999', // Sai số điện thoại
        reason: 'Hủy sai SĐT',
      })
      .expect(403);

    // 10.6 Khách vãng lai gọi guest-cancel thành công với đúng Cancellation Token và SĐT
    const guestOrderRes = await request(app.getHttpServer())
      .post('/api/orders')
      .send({
        storeSlug: 'fr12-demo-store',
        idempotencyKey: 'guest-cancel-verify-test-01',
        customerName: 'Guest Auto Cancel',
        customerPhone: '0944444444',
        shippingAddress: '456 Lê Duẩn',
        items: [{ productId: prod1Id, quantity: 1 }],
      })
      .expect(201);

    const guestOrderId = guestOrderRes.body.order.id;
    const guestToken =
      guestOrderRes.body.cancellationToken ||
      guestOrderRes.body.order.cancellationToken;

    const guestCancelRes = await request(app.getHttpServer())
      .post(`/api/orders/${guestOrderId}/guest-cancel`)
      .send({
        cancellationToken: guestToken,
        customerPhone: '0944444444',
        reason: 'Khách tự hủy đơn vãng lai thành công',
      })
      .expect(200);

    expect(guestCancelRes.body.order.status).toBe(OrderStatus.CANCELLED);
  });

  it('11. Hủy đơn thành công: Hoàn trả ngân sách coupon và thu hồi hoa hồng', async () => {
    // Chủ shop hợp lệ hủy đơn hàng firstOrderId
    const cancelRes = await request(app.getHttpServer())
      .post(`/api/orders/${firstOrderId}/cancel`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({ reason: 'Khách đổi ý hủy đơn' })
      .expect(200);

    expect(cancelRes.body.order.status).toBe(OrderStatus.CANCELLED);

    // Kiểm tra CouponRedemption được đánh dấu CANCELLED
    const red = await prisma.couponRedemption.findUnique({
      where: { orderId: firstOrderId },
    });
    expect(red?.status).toBe(CouponRedemptionStatus.CANCELLED);

    // Kiểm tra Coupon được hoàn lại usageCount và budgetUsed
    const c = await prisma.coupon.findUnique({ where: { id: createdCouponId } });
    expect(c?.usageCount).toBe(1); // vì đơn ở test 8 đã dùng 1 lượt
    expect(Number(c?.budgetUsed)).toBe(40_000);

    // Kiểm tra Commission chuyển sang REVERSED
    const comm = await prisma.commission.findFirst({
      where: { orderId: firstOrderId },
    });
    expect(comm?.status).toBe(CommissionStatus.REVERSED);
  });

  it('12. Hoàn tiền một phần (Partial Refund): Điều chỉnh coupon và hoa hồng theo tỷ lệ', async () => {
    // Tạo đơn mới để test partial refund
    const orderRes = await request(app.getHttpServer())
      .post('/api/orders')
      .send({
        storeSlug: 'fr12-demo-store',
        idempotencyKey: 'partial-refund-test-order-003',
        customerName: 'Le Thi C',
        customerPhone: '0933333333',
        shippingAddress: 'Hải Phòng',
        couponCode: 'THANGVIP10',
        items: [{ productId: prod2Id, quantity: 1 }], // 300k - 20% (60k) = 240k final
      })
      .expect(201);

    const refundOrderId = orderRes.body.order.id;

    // Chuyển đơn sang COMPLETED để xử lý hoàn tiền
    await prisma.order.update({
      where: { id: refundOrderId },
      data: {
        status: OrderStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    const couponBefore = await prisma.coupon.findUnique({
      where: { id: createdCouponId },
    });
    const usageBefore = couponBefore?.usageCount || 0;
    const budgetBefore = Number(couponBefore?.budgetUsed || 0);

    // Hoàn 50% giá trị đơn hàng (120k / 240k)
    const refundRes = await request(app.getHttpServer())
      .post(`/api/stores/${storeId}/commission-rules/adjustments/refund`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        orderId: refundOrderId,
        refundAmount: '120000',
        reason: 'Hàng lỗi 1 phần hoàn 50%',
      })
      .expect(201);

    expect(refundRes.body.success).toBe(true);

    // CouponRedemption chuyển sang PARTIALLY_REFUNDED
    const red = await prisma.couponRedemption.findUnique({
      where: { orderId: refundOrderId },
    });
    expect(red?.status).toBe(CouponRedemptionStatus.PARTIALLY_REFUNDED);

    // usageCount KHÔNG được giảm (vẫn giữ nguyên), budgetUsed giảm 50% phần discount (30k)
    const couponAfter = await prisma.coupon.findUnique({
      where: { id: createdCouponId },
    });
    expect(couponAfter?.usageCount).toBe(usageBefore); // usageCount KHÔNG giảm khi hoàn 1 phần
    expect(Number(couponAfter?.budgetUsed)).toBe(budgetBefore - 30_000);

    // Commission của đơn cũng được giảm 50%
    const comm = await prisma.commission.findFirst({
      where: { orderId: refundOrderId },
    });
    expect(comm).toBeDefined();
    // 240k * 10% = 24k hoa hồng gốc -> sau hoàn 50% còn 12k
    expect(Number(comm?.commissionAmount)).toBe(12_000);
  });

  it('13. Redis Rate limit: Validate coupon quá tần suất cho phép (trả về 429)', async () => {
    const rateLimitSess = 'rate-limit-e2e-test-session-99';
    // Gửi 10 request
    for (let i = 0; i < 10; i++) {
      await request(app.getHttpServer())
        .post('/api/coupons/validate')
        .set('x-session-id', rateLimitSess)
        .send({
          code: 'THANGVIP10',
          items: [{ productId: prod1Id, quantity: 1 }],
        });
    }

    // Request thứ 11 phải bị chặn bởi Redis Rate Limit -> 429
    const blockedRes = await request(app.getHttpServer())
      .post('/api/coupons/validate')
      .set('x-session-id', rateLimitSess)
      .send({
        code: 'THANGVIP10',
        items: [{ productId: prod1Id, quantity: 1 }],
      });

    expect(blockedRes.status).toBe(429);
  });

  it('14. KOL tra cứu danh sách và chi tiết mã giảm giá của mình', async () => {
    const resList = await request(app.getHttpServer())
      .get('/api/collaborator/coupons')
      .set('Authorization', `Bearer ${tokenKolA}`)
      .expect(200);

    expect(resList.body.data).toBeDefined();
    expect(resList.body.data.length).toBeGreaterThan(0);

    const resDetail = await request(app.getHttpServer())
      .get(`/api/collaborator/coupons/${createdCouponId}`)
      .set('Authorization', `Bearer ${tokenKolA}`)
      .expect(200);

    expect(resDetail.body.id).toBe(createdCouponId);
    expect(resDetail.body.codeNormalized).toBe('THANGVIP10');
  });

  it('15. KOL tạm dừng và mở lại mã giảm giá của mình', async () => {
    // Tạm dừng (PAUSE)
    const pauseRes = await request(app.getHttpServer())
      .patch(`/api/collaborator/coupons/${createdCouponId}/pause`)
      .set('Authorization', `Bearer ${tokenKolA}`)
      .expect(200);

    expect(pauseRes.body.coupon.status).toBe(CouponStatus.PAUSED);

    // Khi mã bị tạm dừng, khách validate sẽ nhận lỗi COUPON_PAUSED
    const validateRes = await request(app.getHttpServer())
      .post('/api/coupons/validate')
      .set('x-session-id', 'pause-test-sess-fresh')
      .send({
        code: 'THANGVIP10',
        items: [{ productId: prod1Id, quantity: 1 }],
      })
      .expect(400);

    expect(validateRes.body.message).toContain('tạm ngưng');

    // Mở lại (ACTIVE)
    const resumeRes = await request(app.getHttpServer())
      .patch(`/api/collaborator/coupons/${createdCouponId}/pause`)
      .set('Authorization', `Bearer ${tokenKolA}`)
      .expect(200);

    expect(resumeRes.body.coupon.status).toBe(CouponStatus.ACTIVE);
  });

  it('16. Shop khác không được xem hoặc duyệt mã giảm giá thuộc Shop A (403 Forbidden)', async () => {
    // Shop Other cố truy cập danh sách coupon của Store A -> 403
    await request(app.getHttpServer())
      .get(`/api/stores/${storeId}/coupons`)
      .set('Authorization', `Bearer ${tokenOtherShop}`)
      .expect(403);

    // Shop Other cố phê duyệt coupon của Store A -> 403
    await request(app.getHttpServer())
      .patch(`/api/stores/${storeId}/coupons/${createdCouponId}/approve`)
      .set('Authorization', `Bearer ${tokenOtherShop}`)
      .send({
        discountType: DiscountType.PERCENTAGE,
        discountValue: 15,
        fundingSource: CouponFundingSource.SHOP_FUNDED,
      })
      .expect(403);
  });

  it('17. Shop từ chối coupon và bắt buộc nhập lý do (thiếu lý do trả 400, hợp lệ chuyển REJECTED & báo KOL)', async () => {
    // KOL A tạo mã mới để test từ chối
    const proposeRes = await request(app.getHttpServer())
      .post('/api/collaborator/coupons')
      .set('Authorization', `Bearer ${tokenKolA}`)
      .send({
        storeId,
        code: 'thangreject',
      })
      .expect(201);

    const rejectCouponId = proposeRes.body.coupon.id;

    // 17.1 Từ chối nhưng để trống lý do -> 400 Bad Request
    const errRes = await request(app.getHttpServer())
      .patch(`/api/stores/${storeId}/coupons/${rejectCouponId}/reject`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({ reason: '' })
      .expect(400);

    expect(errRes.body.message).toBeDefined();

    // 17.2 Từ chối với lý do hợp lệ (>= 5 ký tự) -> 200 OK
    const okRes = await request(app.getHttpServer())
      .patch(`/api/stores/${storeId}/coupons/${rejectCouponId}/reject`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({ reason: 'Chưa phù hợp với định vị thương hiệu của gian hàng' })
      .expect(200);

    expect(okRes.body.coupon.status).toBe(CouponStatus.REJECTED);
    expect(okRes.body.coupon.rejectedReason).toBe(
      'Chưa phù hợp với định vị thương hiệu của gian hàng',
    );

    // Kiểm tra Notification đã được tạo cho KOL A
    const notif = await prisma.notification.findFirst({
      where: {
        userId: kolAId,
        type: 'COUPON_REJECTED',
      },
    });
    expect(notif).toBeDefined();
    expect(notif?.title).toContain('từ chối');
  });

  it('18. Shop cập nhật chính sách coupon (Update policy: chiết khấu, đơn tối thiểu)', async () => {
    const updateRes = await request(app.getHttpServer())
      .patch(`/api/stores/${storeId}/coupons/${createdCouponId}/policy`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        discountValue: 25,
        minimumOrderAmount: 180_000,
        maximumDiscountAmount: 80_000,
      })
      .expect(200);

    expect(Number(updateRes.body.coupon.discountValue)).toBe(25);
    expect(Number(updateRes.body.coupon.minimumOrderAmount)).toBe(180_000);
    expect(Number(updateRes.body.coupon.maximumDiscountAmount)).toBe(80_000);
  });

  it('19. Admin xem toàn sàn, khóa (BLOCKED) và mở khóa (ACTIVE) mã giảm giá', async () => {
    // 19.1 Admin tra cứu danh sách coupon toàn hệ thống
    const adminListRes = await request(app.getHttpServer())
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(adminListRes.body.data).toBeDefined();
    expect(adminListRes.body.meta).toBeDefined();
    expect(adminListRes.body.data.length).toBeGreaterThan(0);

    // 19.2 Admin khóa coupon nghi ngờ gian lận -> BLOCKED
    const blockRes = await request(app.getHttpServer())
      .patch(`/api/admin/coupons/${createdCouponId}/block`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ reason: 'Phát hiện hành vi gian lận đơn ảo' })
      .expect(200);

    expect(blockRes.body.coupon.status).toBe(CouponStatus.BLOCKED);

    // Khách validate coupon bị khóa -> 400
    const valBlocked = await request(app.getHttpServer())
      .post('/api/coupons/validate')
      .set('x-session-id', 'admin-block-val-sess')
      .send({
        code: 'THANGVIP10',
        items: [{ productId: prod1Id, quantity: 1 }],
      })
      .expect(400);

    expect(valBlocked.body.message).toContain('không còn hiệu lực');

    // 19.3 Admin mở khóa coupon -> ACTIVE
    const unblockRes = await request(app.getHttpServer())
      .patch(`/api/admin/coupons/${createdCouponId}/unblock`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    expect(unblockRes.body.coupon.status).toBe(CouponStatus.ACTIVE);
  });

  it('20. KOL tra cứu danh sách gian hàng đủ điều kiện tạo coupon (chỉ lấy APPROVED)', async () => {
    // KOL A có liên kết APPROVED với storeId
    const resKolA = await request(app.getHttpServer())
      .get('/api/collaborator/coupons/eligible-stores')
      .set('Authorization', `Bearer ${tokenKolA}`)
      .expect(200);

    expect(Array.isArray(resKolA.body)).toBe(true);
    expect(resKolA.body.some((s: any) => s.id === storeId)).toBe(true);
    expect(resKolA.body.some((s: any) => s.id === otherStoreId)).toBe(false);

    // KOL B chưa có liên kết APPROVED nào -> nhận mảng rỗng []
    const resKolB = await request(app.getHttpServer())
      .get('/api/collaborator/coupons/eligible-stores')
      .set('Authorization', `Bearer ${tokenKolB}`)
      .expect(200);

    expect(Array.isArray(resKolB.body)).toBe(true);
    expect(resKolB.body.length).toBe(0);
  });

  it('21. KOL xóa mềm coupon và mã cũ không được tái sử dụng (409 Conflict)', async () => {
    // KOL A đề xuất mã mới thangsoftdel
    const propRes = await request(app.getHttpServer())
      .post('/api/collaborator/coupons')
      .set('Authorization', `Bearer ${tokenKolA}`)
      .send({
        storeId,
        code: 'thangsoftdel',
      })
      .expect(201);

    const delCouponId = propRes.body.coupon.id;

    // KOL A xóa mềm coupon
    const delRes = await request(app.getHttpServer())
      .delete(`/api/collaborator/coupons/${delCouponId}`)
      .set('Authorization', `Bearer ${tokenKolA}`)
      .send({ reason: 'KOL không còn sử dụng mã này' })
      .expect(200);

    expect(delRes.body.coupon.status).toBe(CouponStatus.DELETED);

    // Đề xuất lại chính mã THANGSOFTDEL -> 409 Conflict (không cho tái sử dụng mã cũ)
    const conflictRes = await request(app.getHttpServer())
      .post('/api/collaborator/coupons')
      .set('Authorization', `Bearer ${tokenKolA}`)
      .send({
        storeId,
        code: 'thangsoftdel',
      })
      .expect(409);

    expect(conflictRes.body.message).toContain('đã tồn tại');
  });

  it('22. Hoàn tiền 100% (Full Refund): Hoàn trả lượt dùng usageCount và toàn bộ budgetUsed', async () => {
    // Tạo đơn mới với coupon THANGVIP10
    const orderRes = await request(app.getHttpServer())
      .post('/api/orders')
      .send({
        storeSlug: 'fr12-demo-store',
        idempotencyKey: 'full-refund-test-order-004',
        customerName: 'Dang Thi D',
        customerPhone: '0955555555',
        shippingAddress: 'Đà Nẵng',
        couponCode: 'THANGVIP10',
        items: [{ productId: prod2Id, quantity: 1 }], // 300k - 25% (75k) = 225k
      })
      .expect(201);

    const fullRefundOrderId = orderRes.body.order.id;

    // Đơn sang COMPLETED
    await prisma.order.update({
      where: { id: fullRefundOrderId },
      data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
    });

    const cBefore = await prisma.coupon.findUnique({ where: { id: createdCouponId } });
    const usageBefore = cBefore?.usageCount || 0;
    const budgetBefore = Number(cBefore?.budgetUsed || 0);

    // Hoàn tiền 100% (225k)
    const refundRes = await request(app.getHttpServer())
      .post(`/api/stores/${storeId}/commission-rules/adjustments/refund`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        orderId: fullRefundOrderId,
        refundAmount: '225000',
        reason: 'Khách trả hàng hoàn tiền toàn bộ',
      })
      .expect(201);

    expect(refundRes.body.success).toBe(true);

    // CouponRedemption chuyển sang REFUNDED
    const red = await prisma.couponRedemption.findUnique({
      where: { orderId: fullRefundOrderId },
    });
    expect(red?.status).toBe(CouponRedemptionStatus.REFUNDED);

    // Coupon: usageCount GIẢM 1 lượt, budgetUsed GIẢM 75k
    const cAfter = await prisma.coupon.findUnique({ where: { id: createdCouponId } });
    expect(cAfter?.usageCount).toBe(usageBefore - 1);
    expect(Number(cAfter?.budgetUsed)).toBe(budgetBefore - 75_000);
  });

  afterAll(async () => {
    try {
      await cleanup();
    } catch {}

    try {
      const clickQueue = app.get(ClickQueueService, { strict: false });
      if (clickQueue) {
        await clickQueue.onModuleDestroy();
      }
    } catch {}

    try {
      const chatGateway = app.get(ChatGateway, { strict: false });
      if (chatGateway) {
        await chatGateway.onModuleDestroy();
      }
    } catch {}

    if (cacheService) {
      try {
        await cacheService.onModuleDestroy();
      } catch {}
    }

    if (app) {
      try {
        const server = app.getHttpServer();
        if (server) {
          if (typeof server.closeAllConnections === 'function') {
            server.closeAllConnections();
          }
          await new Promise<void>((resolve) => {
            if (typeof server.close === 'function') {
              server.close(() => resolve());
            } else {
              resolve();
            }
          });
        }
      } catch {}
      try {
        await app.close();
      } catch {}
    }

    if (prisma) {
      try {
        const pool = (prisma as any).pool;
        if (pool) {
          const allClients = [...(pool._clients || []), ...(pool._idle || [])];
          for (const client of allClients) {
            try {
              if (client.connection?.stream) {
                client.connection.stream.unref?.();
                client.connection.stream.destroy?.();
              }
            } catch {}
          }
          await pool.end().catch(() => {});
        }
      } catch {}
      try {
        await prisma.$disconnect();
      } catch {}
    }

    // Unref and destroy any lingering sockets or timers
    const handles = (process as any)._getActiveHandles?.() || [];
    for (const h of handles) {
      if (h) {
        if (typeof h.unref === 'function') {
          try {
            h.unref();
          } catch {}
        }
        if (typeof h.destroy === 'function' && !h.destroyed) {
          try {
            h.destroy();
          } catch {}
        }
      }
    }

    // Give libuv a short moment to flush destroyed socket close events
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 50);
      if (typeof (timer as any)?.unref === 'function') {
        (timer as any).unref();
      }
    });
  });
});
