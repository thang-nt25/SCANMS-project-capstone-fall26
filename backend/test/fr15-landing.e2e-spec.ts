import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { ClickQueueService } from '../src/modules/referral-links/click-queue.service';
import { CacheService } from '../src/core/cache/cache.service';
import { signOpaqueVisitorToken } from '../src/modules/referral-links/utils/short-code.generator';
import * as crypto from 'crypto';

const cookieParser = require('cookie-parser');

jest.setTimeout(60_000);

describe('FR-15 — Landing Page & Video Review & Order Placement E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let cacheService: CacheService;

  const testStoreId = '77777777-1515-4000-8000-000000000001';
  const testStore2Id = '77777777-1515-4000-8000-000000000002';
  const testOwnerId = '88888888-1515-4000-8000-000000000001';
  const testOwner2Id = '88888888-1515-4000-8000-000000000002';
  const testKolId = '99999999-1515-4000-8000-000000000001';
  const testProductId = '66666666-1515-4000-8000-000000000001';
  const testProduct2Id = '66666666-1515-4000-8000-000000000002';
  const testRefLinkId = '55555555-1515-4000-8000-000000000001';
  const testSessionId = '44444444-1515-4000-8000-000000000001';
  const testMediaId = '33333333-1515-4000-8000-000000000001';
  const testPendingMediaId = '33333333-1515-4000-8000-000000000002';
  const testRejectedMediaId = '33333333-1515-4000-8000-000000000003';
  const testHiddenMediaId = '33333333-1515-4000-8000-000000000004';
  const testReview1Id = '22222222-1515-4000-8000-000000000001';
  const testReview2Id = '22222222-1515-4000-8000-000000000002';
  const testCouponId = '11111111-1515-4000-8000-000000000001';

  let shop1Token: string;
  let shop2Token: string;

  const jwtSecret =
    process.env.JWT_SECRET || 'scanms-jwt-secret-key-production';
  const visitorId = 'visitor-fr15-e2e-test-12345';
  const visitorIdHash = crypto
    .createHmac('sha256', jwtSecret)
    .update(visitorId)
    .digest('hex');
  const signedCookieToken = signOpaqueVisitorToken(visitorId, jwtSecret);

  async function cleanupData() {
    if (!prisma) return;
    const storeIds = [testStoreId, testStore2Id];
    const userIds = [testOwnerId, testOwner2Id, testKolId];

    try {
      if (prisma.commission) {
        await prisma.commission.deleteMany({
          where: { order: { storeId: { in: storeIds } } },
        }).catch(() => {});
      }

      if (prisma.attributionAdjustment) {
        await prisma.attributionAdjustment.deleteMany({
          where: { order: { storeId: { in: storeIds } } },
        }).catch(() => {});
      }

      if (prisma.couponRedemption) {
        await prisma.couponRedemption.deleteMany({
          where: { order: { storeId: { in: storeIds } } },
        }).catch(() => {});
      }

      if (prisma.couponProduct) {
        await prisma.couponProduct.deleteMany({
          where: { couponId: testCouponId },
        }).catch(() => {});
      }

      if (prisma.coupon) {
        await prisma.coupon.deleteMany({
          where: { storeId: { in: storeIds } },
        }).catch(() => {});
      }

      if (prisma.orderItem) {
        await prisma.orderItem.deleteMany({
          where: {
            OR: [
              { order: { storeId: { in: storeIds } } },
              { product: { storeId: { in: storeIds } } },
            ],
          },
        }).catch(() => {});
      }

      if (prisma.order) {
        await prisma.order.deleteMany({
          where: { storeId: { in: storeIds } },
        }).catch(() => {});
      }

      if (prisma.mediaAsset) {
        await prisma.mediaAsset.deleteMany({
          where: {
            OR: [
              { storeId: { in: storeIds } },
              { collaboratorId: { in: userIds } },
            ],
          },
        }).catch(() => {});
      }

      if (prisma.productReview) {
        await prisma.productReview.deleteMany({
          where: { product: { storeId: { in: storeIds } } },
        }).catch(() => {});
      }

      if (prisma.attributionSession) {
        await prisma.attributionSession.deleteMany({
          where: {
            OR: [
              { storeId: { in: storeIds } },
              { collaboratorId: { in: userIds } },
            ],
          },
        }).catch(() => {});
      }

      if (prisma.referralLink) {
        await prisma.referralLink.deleteMany({
          where: {
            OR: [
              { storeId: { in: storeIds } },
              { collaboratorId: { in: userIds } },
            ],
          },
        }).catch(() => {});
      }

      if (prisma.product) {
        await prisma.product.deleteMany({
          where: { storeId: { in: storeIds } },
        }).catch(() => {});
      }

      if (prisma.storeCollaborator) {
        await prisma.storeCollaborator.deleteMany({
          where: { storeId: { in: storeIds } },
        }).catch(() => {});
      }

      if (prisma.store) {
        await prisma.store.deleteMany({
          where: { id: { in: storeIds } },
        }).catch(() => {});
      }

      if (prisma.collaboratorProfile) {
        await prisma.collaboratorProfile.deleteMany({
          where: { userId: { in: userIds } },
        }).catch(() => {});
      }

      if (prisma.auditLog) {
        await prisma.auditLog.deleteMany({
          where: { userId: { in: userIds } },
        }).catch(() => {});
      }

      if (prisma.user) {
        await prisma.user.deleteMany({
          where: { id: { in: userIds } },
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Cleanup error (ignored):', e);
    }
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableShutdownHooks();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
    jwtService = app.get<JwtService>(JwtService);
    cacheService = app.get<CacheService>(CacheService);

    // Dọn dẹp dữ liệu test cũ nếu có
    await cleanupData();

    // 1. Tạo Chủ shop 1, Chủ shop 2 & KOL
    await prisma.user.createMany({
      data: [
        {
          id: testOwnerId,
          email: 'owner-fr15@scanms.vn',
          passwordHash: 'dummy-hash',
          fullName: 'Chủ Shop Sora Skin',
          role: 'SHOP_MANAGER',
          isActive: true,
        },
        {
          id: testOwner2Id,
          email: 'owner2-fr15@scanms.vn',
          passwordHash: 'dummy-hash',
          fullName: 'Chủ Shop Aura Bio',
          role: 'SHOP_MANAGER',
          isActive: true,
        },
        {
          id: testKolId,
          email: 'kol-fr15@scanms.vn',
          passwordHash: 'dummy-hash',
          fullName: 'KOL Hoàng Yến Review',
          role: 'COLLABORATOR',
          isActive: true,
        },
      ],
    });

    // Tạo JWT Tokens
    shop1Token = jwtService.sign({
      sub: testOwnerId,
      email: 'owner-fr15@scanms.vn',
      role: 'SHOP_MANAGER',
    });
    shop2Token = jwtService.sign({
      sub: testOwner2Id,
      email: 'owner2-fr15@scanms.vn',
      role: 'SHOP_MANAGER',
    });

    await prisma.collaboratorProfile.create({
      data: {
        userId: testKolId,
        avatarUrl: 'https://cdn.scanms.vn/avatars/hoang-yen.jpg',
        bankName: 'MBBank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'LE HOANG YEN',
        kycStatus: 'VERIFIED',
      },
    });

    // 2. Tạo 2 Store độc lập (Kiểm thử cách ly đa gian hàng Multi-tenant)
    await prisma.store.createMany({
      data: [
        {
          id: testStoreId,
          ownerId: testOwnerId,
          name: 'Sora Skin E2E Store',
          slug: 'sora-skin-e2e',
          isActive: true,
          isVerified: true,
          policyReturn: 'Đổi trả 7 ngày chính hãng',
          policyWarranty: 'Bảo hành 12 tháng từ Sora Skin',
          policyShipping: 'Giao hàng hỏa tốc toàn quốc',
        },
        {
          id: testStore2Id,
          ownerId: testOwner2Id,
          name: 'Aura Bio Cosmetics E2E Store',
          slug: 'aura-bio-e2e',
          isActive: true,
          isVerified: true,
          policyReturn: 'Đổi trả 14 ngày',
          policyWarranty: 'Bảo hành chính hãng Aura',
          policyShipping: 'Giao hàng tiêu chuẩn 2-3 ngày',
        },
      ],
    });

    // Liên kết StoreCollaborator = APPROVED
    await prisma.storeCollaborator.create({
      data: {
        storeId: testStoreId,
        collaboratorId: testKolId,
        status: 'APPROVED',
      },
    });

    // 3. Tạo Sản phẩm cho Shop 1
    await prisma.product.create({
      data: {
        id: testProductId,
        storeId: testStoreId,
        title: 'Serum Trắng Da Vitamin C E2E',
        sku: 'SERUM-VITC-E2E',
        price: 350000,
        originalPrice: 450000,
        stockQuantity: 50,
        isActive: true,
        imageUrl: 'https://cdn.scanms.vn/products/serum-vitc.jpg',
      },
    });

    // 4. Tạo Referral Link & Attribution Session
    await prisma.referralLink.create({
      data: {
        id: testRefLinkId,
        storeId: testStoreId,
        collaboratorId: testKolId,
        productId: testProductId,
        shortCode: 'sora-vitc-yen',
        status: 'ACTIVE',
      },
    });

    await prisma.attributionSession.create({
      data: {
        id: testSessionId,
        storeId: testStoreId,
        collaboratorId: testKolId,
        referralLinkId: testRefLinkId,
        visitorIdHash,
        fingerprintHash: 'fp-hash-15',
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        status: 'ACTIVE',
      },
    });

    // 5. Tạo Media Videos với nhiều trạng thái khác nhau
    await prisma.mediaAsset.createMany({
      data: [
        {
          id: testMediaId,
          storeId: testStoreId,
          productId: testProductId,
          collaboratorId: testKolId,
          assetType: 'VIDEO',
          title: 'Trải nghiệm 14 ngày làm sáng da cùng Sora Skin (APPROVED)',
          urlOrContent: 'https://cdn.scanms.vn/videos/review-serum.mp4',
          posterUrl: 'https://cdn.scanms.vn/videos/poster-serum.jpg',
          caption: 'Hiệu quả rõ rệt sau 2 tuần',
          status: 'APPROVED',
          isFeatured: true,
        },
        {
          id: testPendingMediaId,
          storeId: testStoreId,
          productId: testProductId,
          collaboratorId: testKolId,
          assetType: 'VIDEO',
          title: 'Video nháp chờ duyệt (PENDING)',
          urlOrContent: 'https://cdn.scanms.vn/videos/draft.mp4',
          status: 'PENDING',
        },
        {
          id: testRejectedMediaId,
          storeId: testStoreId,
          productId: testProductId,
          collaboratorId: testKolId,
          assetType: 'VIDEO',
          title: 'Video vi phạm chính sách (REJECTED)',
          urlOrContent: 'https://cdn.scanms.vn/videos/rejected.mp4',
          status: 'REJECTED',
        },
        {
          id: testHiddenMediaId,
          storeId: testStoreId,
          productId: testProductId,
          collaboratorId: testKolId,
          assetType: 'VIDEO',
          title: 'Video tạm ẩn bởi Shop (HIDDEN)',
          urlOrContent: 'https://cdn.scanms.vn/videos/hidden.mp4',
          status: 'HIDDEN',
        },
      ],
    });

    // 6. Tạo Coupon thật cho Shop 1
    await prisma.coupon.create({
      data: {
        id: testCouponId,
        codeNormalized: 'E2E15OFF',
        displayCode: 'E2E15OFF',
        collaboratorId: testKolId,
        storeId: testStoreId,
        status: 'ACTIVE',
        discountType: 'FIXED_AMOUNT',
        discountValue: 50000,
        minimumOrderAmount: 200000,
        maximumDiscountAmount: 50000,
        usageLimitTotal: 100,
        usageLimitPerCustomer: 5,
        budgetTotal: 1000000,
        budgetUsed: 0,
        fundingSource: 'SHOP_FUNDED',
        stackableWithProductDiscount: true,
      },
    });
  });

  afterAll(async () => {
    try {
      const schedulerRegistry = app.get(SchedulerRegistry, { strict: false });
      if (schedulerRegistry) {
        const cronJobs = schedulerRegistry.getCronJobs();
        cronJobs.forEach((job) => job.stop());
        const intervals = schedulerRegistry.getIntervals();
        intervals.forEach((interval) => schedulerRegistry.deleteInterval(interval));
        const timeouts = schedulerRegistry.getTimeouts();
        timeouts.forEach((timeout) => schedulerRegistry.deleteTimeout(timeout));
      }
    } catch {}

    try {
      const clickQueueService = app.get(ClickQueueService, { strict: false });
      if (clickQueueService) {
        await clickQueueService.onModuleDestroy().catch(() => {});
      }
    } catch {}

    try {
      const cacheService = app.get(CacheService, { strict: false });
      if (cacheService) {
        await cacheService.onModuleDestroy().catch(() => {});
      }
    } catch {}

    await cleanupData();

    if (app) {
      await app.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('1. GET /api/public/products/:idOrSlug/landing - Nhận diện attribution cookie đã ký và ưu tiên video KOL thật', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/public/products/SERUM-VITC-E2E/landing`)
      .set('Cookie', [`scanms_attr=${signedCookieToken}`])
      .expect(200);

    expect(res.body.product.title).toBe('Serum Trắng Da Vitamin C E2E');
    expect(res.body.product.price).toBe(350000);
    expect(res.body.store.name).toBe('Sora Skin E2E Store');
    expect(res.body.store.isVerified).toBe(true);

    // Kiểm tra chính sách thật
    expect(res.body.policies.warranty).toBe('Bảo hành 12 tháng từ Sora Skin');

    // Kiểm tra video review: Nhận diện KOL thật và ưu tiên KOL referral
    expect(res.body.videos.length).toBeGreaterThanOrEqual(1);
    const topVideo = res.body.videos[0];
    expect(topVideo.kol.name).toBe('KOL Hoàng Yến Review');
    expect(topVideo.kol.isVerified).toBe(true);
    expect(topVideo.isReferredKol).toBe(true);
    expect(topVideo.caption).toBe('Hiệu quả rõ rệt sau 2 tuần');

    // Không có review nào thì averageRating = null (Mục 11)
    expect(res.body.reviews.totalReviews).toBe(0);
    expect(res.body.reviews.averageRating).toBeNull();
  });

  it('2. POST /api/orders - Đặt hàng với IdempotencyKey hợp lệ và tạo đơn hàng thật', async () => {
    const idempotencyKey = crypto.randomUUID();

    const orderPayload = {
      storeId: testStoreId,
      customerName: 'Khách Mua Hàng Thật',
      customerPhone: '0988776655',
      shippingAddress: '123 Đường Lê Lợi, Quận 1, TP.HCM',
      orderNotes: 'Giao hàng trong giờ hành chính',
      paymentMethod: 'COD',
      idempotencyKey,
      items: [
        {
          productId: testProductId,
          quantity: 2,
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Cookie', [`scanms_attr=${signedCookieToken}`])
      .send(orderPayload)
      .expect(201);

    expect(res.body.order).toBeDefined();
    expect(res.body.order.id).toBeDefined();
    expect(res.body.order.externalOrderSn).toBeDefined();
    expect(Number(res.body.order.finalAmount)).toBe(700000); // 350,000 * 2
    expect(res.body.order.status).toBe('PENDING');

    // Kiểm tra tính Idempotent (Gửi lại cùng key thì trả đơn cũ không nhân đôi)
    const replayRes = await request(app.getHttpServer())
      .post('/api/orders')
      .send(orderPayload)
      .expect(201);

    expect(replayRes.body.order.id).toBe(res.body.order.id);
  });

  it('3. Sản phẩm hết hàng / tạm ngừng kinh doanh / không tồn tại', async () => {
    // 3.1 Cập nhật tồn kho về 0 -> canPurchase: false, inStock: false, status: OUT_OF_STOCK
    await prisma.product.update({
      where: { id: testProductId },
      data: { stockQuantity: 0 },
    });
    await cacheService.delPrefix('landing:v2:');

    const outOfStockRes = await request(app.getHttpServer())
      .get(`/api/public/products/SERUM-VITC-E2E/landing`)
      .expect(200);

    expect(outOfStockRes.body.product.canPurchase).toBe(false);
    expect(outOfStockRes.body.availability.inStock).toBe(false);
    expect(outOfStockRes.body.availability.stockQuantity).toBe(0);

    // Phục hồi lại tồn kho
    await prisma.product.update({
      where: { id: testProductId },
      data: { stockQuantity: 50 },
    });
    await cacheService.delPrefix('landing:v2:');

    // 3.2 Tạm ngừng kinh doanh (isActive = false) -> Trả 200 với canPurchase: false và status: INACTIVE (Mục 6 FR-15)
    await prisma.product.update({
      where: { id: testProductId },
      data: { isActive: false },
    });
    await cacheService.delPrefix('landing:v2:');

    const inactiveRes = await request(app.getHttpServer())
      .get(`/api/public/products/SERUM-VITC-E2E/landing`)
      .expect(200);

    expect(inactiveRes.body.product.canPurchase).toBe(false);
    expect(inactiveRes.body.product.isActive).toBe(false);
    expect(inactiveRes.body.product.status).toBe('INACTIVE');
    expect(inactiveRes.body.status).toBe('INACTIVE');

    // Phục hồi lại isActive
    await prisma.product.update({
      where: { id: testProductId },
      data: { isActive: true },
    });
    await cacheService.delPrefix('landing:v2:');

    // 3.3 Mã sản phẩm hoàn toàn không tồn tại -> 404
    await request(app.getHttpServer())
      .get(`/api/public/products/NON-EXISTENT-SKU-999/landing`)
      .expect(404);
  });

  it('4. Video kiểm duyệt: Video PENDING / REJECTED / HIDDEN không bị lộ ra public', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/public/products/SERUM-VITC-E2E/landing`)
      .expect(200);

    const videoIds = res.body.videos.map((v: any) => v.id);

    // Chỉ video APPROVED được xuất hiện
    expect(videoIds).toContain(testMediaId);

    // Tuyệt đối không để lộ video PENDING, REJECTED hoặc HIDDEN
    expect(videoIds).not.toContain(testPendingMediaId);
    expect(videoIds).not.toContain(testRejectedMediaId);
    expect(videoIds).not.toContain(testHiddenMediaId);
  });

  it('5. Bảo vệ riêng tư & An toàn dữ liệu: Không lộ PII hoặc hoa hồng tiếp thị', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/public/products/SERUM-VITC-E2E/landing`)
      .expect(200);

    const bodyStr = JSON.stringify(res.body);

    // Không làm lộ các trường nhạy cảm về tài chính nội bộ / hoa hồng CTV
    expect(bodyStr).not.toContain('commissionRate');
    expect(bodyStr).not.toContain('customCommissionRate');
    expect(bodyStr).not.toContain('collaboratorMargin');
    expect(bodyStr).not.toContain('bankAccountNumber');
    expect(bodyStr).not.toContain('bankAccountName');
  });

  it('6. Kiểm duyệt đánh giá (Review Moderation) & Huy hiệu Đã mua hàng (Verified Buyer)', async () => {
    // Tạo 2 review: 1 cái chưa duyệt (status: PENDING), 1 cái đã duyệt (status: APPROVED)
    await prisma.productReview.createMany({
      data: [
        {
          id: testReview1Id,
          productId: testProductId,
          customerName: 'Nguyễn Văn Minh',
          rating: 1,
          comment: 'Sản phẩm giao trễ chưa ưng ý (Chưa duyệt)',
          status: 'PENDING',
          isApproved: false,
        },
        {
          id: testReview2Id,
          productId: testProductId,
          customerName: 'Trần Thị Thảo',
          rating: 5,
          comment: 'Chất lượng tuyệt vời, da sáng sau 1 tuần!',
          status: 'APPROVED',
          isApproved: true,
        },
      ],
    });
    await cacheService.delPrefix('landing:v2:');

    const res = await request(app.getHttpServer())
      .get(`/api/public/products/SERUM-VITC-E2E/landing`)
      .expect(200);

    // Review chưa duyệt tuyệt đối không xuất hiện và không tính điểm trung bình
    expect(res.body.reviews.totalReviews).toBe(1);
    expect(res.body.reviews.averageRating).toBe(5);

    const items = res.body.reviews.items;
    expect(items.length).toBe(1);
    expect(items[0].id).toBe(testReview2Id);
    expect(items[0].rating).toBe(5);
    // Tên khách hàng phải được che PII bảo mật
    expect(items[0].customerName).not.toBe('Trần Thị Thảo');
    expect(items[0].customerName).toContain('***');
  });

  it('7. Phân quyền Shop A / Shop B (Multi-tenant Shop Isolation) & Đa trạng thái Review', async () => {
    // Chủ Shop 2 cố tình can thiệp duyệt đánh giá của Shop 1 -> Phải bị 403 Forbidden
    const crossShopRes = await request(app.getHttpServer())
      .patch(`/api/products/reviews/${testReview1Id}/moderation`)
      .set('Authorization', `Bearer ${shop2Token}`)
      .send({
        status: 'APPROVED',
      })
      .expect(403);

    expect(crossShopRes.body.message).toContain(
      'Bạn không có quyền kiểm duyệt đánh giá của Shop khác',
    );

    // Chủ Shop 1 duyệt hợp lệ đánh giá của chính gian hàng mình -> 200 OK
    const ownerRes = await request(app.getHttpServer())
      .patch(`/api/products/reviews/${testReview1Id}/moderation`)
      .set('Authorization', `Bearer ${shop1Token}`)
      .send({
        status: 'APPROVED',
      })
      .expect(200);

    expect(ownerRes.body.review.status).toBe('APPROVED');
    expect(ownerRes.body.review.isApproved).toBe(true);
    expect(ownerRes.body.review.reviewedBy).toBe(testOwnerId);

    // Chủ Shop 1 từ chối đánh giá kèm lý do rõ ràng
    const rejectRes = await request(app.getHttpServer())
      .patch(`/api/products/reviews/${testReview1Id}/moderation`)
      .set('Authorization', `Bearer ${shop1Token}`)
      .send({
        status: 'REJECTED',
        reason: 'Đánh giá có chứa nội dung không liên quan đến sản phẩm',
      })
      .expect(200);

    expect(rejectRes.body.review.status).toBe('REJECTED');
    expect(rejectRes.body.review.isApproved).toBe(false);
    expect(rejectRes.body.review.rejectionReason).toBe(
      'Đánh giá có chứa nội dung không liên quan đến sản phẩm',
    );

    // Duyệt lại để kiểm tra hiển thị landing page
    await request(app.getHttpServer())
      .patch(`/api/products/reviews/${testReview1Id}/moderation`)
      .set('Authorization', `Bearer ${shop1Token}`)
      .send({
        status: 'APPROVED',
      })
      .expect(200);

    // Sau khi duyệt, review 1 xuất hiện trên landing page
    const updatedLanding = await request(app.getHttpServer())
      .get(`/api/public/products/SERUM-VITC-E2E/landing`)
      .expect(200);

    expect(updatedLanding.body.reviews.totalReviews).toBe(2);
    expect(updatedLanding.body.reviews.averageRating).toBe(3); // (1 + 5) / 2 = 3.0
  });

  it('8. Đặt hàng kèm mã giảm giá Coupon (Coupon validation & discount)', async () => {
    const idempotencyKey = crypto.randomUUID();

    const orderPayload = {
      storeId: testStoreId,
      customerName: 'Khách Dùng Mã Giảm Giá',
      customerPhone: '0977665544',
      shippingAddress: '456 Đường CMT8, Quận 3, TP.HCM',
      orderNotes: 'Áp dụng mã ưu đãi E2E15OFF',
      paymentMethod: 'COD',
      idempotencyKey,
      couponCode: 'E2E15OFF',
      items: [
        {
          productId: testProductId,
          quantity: 2, // 350,000 * 2 = 700,000
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .send(orderPayload)
      .expect(201);

    expect(res.body.order).toBeDefined();
    // Giảm 50.000: 700.000 - 50.000 = 650.000
    expect(Number(res.body.order.discountAmount)).toBe(50000);
    expect(Number(res.body.order.finalAmount)).toBe(650000);
    expect(res.body.order.couponCodeSnapshot).toBe('E2E15OFF');
  });

  it('9. Marketplace công khai & Phân trang an toàn', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/public/products?search=Serum&page=1&limit=10')
      .expect(200);

    expect(res.body.items).toBeDefined();
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);

    const firstItem = res.body.items[0];
    expect(firstItem.id).toBeDefined();
    expect(firstItem.title).toBeDefined();
    expect(firstItem.price).toBeDefined();
    expect(firstItem.store).toBeDefined();

    // Không làm lộ thông tin nhạy cảm
    expect(firstItem.customCommissionRate).toBeUndefined();
  });

  it('10. Server-Side Open Graph Meta Tags cho Social Crawlers (FR-15 SEO)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/public/products/SERUM-VITC-E2E/seo')
      .expect(200);

    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('og:title');
    expect(res.text).toContain('Serum Trắng Da Vitamin C E2E');
    expect(res.text).toContain('og:price:amount');
    expect(res.text).toContain('350000');
    expect(res.text).toContain('og:site_name');
    expect(res.text).toContain('SCANMS');
  });
});
