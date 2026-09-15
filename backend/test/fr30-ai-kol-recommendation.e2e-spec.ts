import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import {
  UserRole,
  OrderStatus,
  CommissionStatus,
  SocialPlatform,
  KycStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';

const cookieParser = require('cookie-parser');

jest.setTimeout(90_000);

describe('FR-30 — Smart KOL Recommendation & Matching Engine E2E Suite (Real PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const shopOwnerId = '11111111-3030-4000-8000-000000000001';
  const adminId = '99999999-3030-4000-8000-000000000001';
  const kolId1 = '22222222-3030-4000-8000-000000000001'; // Diamond Beauty KOL
  const kolId2 = '22222222-3030-4000-8000-000000000002'; // Gold Fashion KOL
  const kolId3 = '22222222-3030-4000-8000-000000000003'; // Silver Tech KOL
  const storeId = '33333333-3030-4000-8000-000000000001';

  const tierIdDiamond = '77777777-3030-4000-8000-000000000001';
  const tierIdGold = '77777777-3030-4000-8000-000000000002';
  const tierIdSilver = '77777777-3030-4000-8000-000000000003';

  const productIdBeauty = '44444444-3030-4000-8000-000000000001';
  const productIdTech = '44444444-3030-4000-8000-000000000002';

  const refLinkId1 = '55555555-3030-4000-8000-000000000001';
  const refLinkId2 = '55555555-3030-4000-8000-000000000002';
  const refLinkId3 = '55555555-3030-4000-8000-000000000003';

  let tokenShop: string;
  let tokenAdmin: string;
  let tokenKol: string;

  async function cleanup() {
    try {
      const testEmails = [
        'shop-fr30@scanms.test',
        'admin-fr30@scanms.test',
        'kol1-fr30@scanms.test',
        'kol2-fr30@scanms.test',
        'kol3-fr30@scanms.test',
      ];
      const testUserIds = [shopOwnerId, adminId, kolId1, kolId2, kolId3];
      const testStoreIds = [storeId];

      const existingUsers = await prisma.user.findMany({
        where: {
          OR: [{ id: { in: testUserIds } }, { email: { in: testEmails } }],
        },
        select: { id: true },
      });
      const allUserIds = Array.from(new Set([...testUserIds, ...existingUsers.map((u) => u.id)]));

      const existingStores = await prisma.store.findMany({
        where: {
          OR: [
            { id: { in: testStoreIds } },
            { slug: { in: ['fr30-ai-match-store'] } },
            { ownerId: { in: allUserIds } },
          ],
        },
        select: { id: true },
      });
      const allStoreIds = Array.from(new Set([...testStoreIds, ...existingStores.map((s) => s.id)]));

      // Delete dependent data
      await prisma.commission.deleteMany({
        where: { collaboratorId: { in: allUserIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { product: { storeId: { in: allStoreIds } } },
      });
      await prisma.order.deleteMany({
        where: { storeId: { in: allStoreIds } },
      });
      await prisma.clickTrafficLog.deleteMany({
        where: { referralLink: { collaboratorId: { in: allUserIds } } },
      });
      await prisma.referralLink.deleteMany({
        where: {
          OR: [
            { collaboratorId: { in: allUserIds } },
            { storeId: { in: allStoreIds } },
          ],
        },
      });
      await prisma.product.deleteMany({
        where: { storeId: { in: allStoreIds } },
      });
      await prisma.storeCollaborator.deleteMany({
        where: {
          OR: [
            { storeId: { in: allStoreIds } },
            { collaboratorId: { in: allUserIds } },
          ],
        },
      });
      await prisma.collaboratorSocialChannel.deleteMany({
        where: { collaboratorId: { in: allUserIds } },
      });
      await prisma.collaboratorProfile.deleteMany({
        where: { userId: { in: allUserIds } },
      });
      await prisma.collaboratorTier.deleteMany({
        where: { id: { in: [tierIdDiamond, tierIdGold, tierIdSilver] } },
      });
      await prisma.wallet.deleteMany({
        where: { collaboratorId: { in: allUserIds } },
      });
      await prisma.store.deleteMany({
        where: { id: { in: allStoreIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: allUserIds } },
      });
    } catch (e) {
      console.warn('FR-30 Cleanup error (ignored):', e);
    }
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'fr30-super-secret-jwt-key-2026';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api', {
      exclude: ['r/:shortCode', 'api/r/:shortCode'],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    await cleanup();

    const passwordHash = await bcrypt.hash('Password@123', 10);

    // 1. Create Users
    const testUsers = [
      {
        id: shopOwnerId,
        email: 'shop-fr30@scanms.test',
        fullName: 'Chủ Shop AI Match FR30',
        role: UserRole.SHOP_MANAGER,
        phoneNumber: '0901303001',
      },
      {
        id: adminId,
        email: 'admin-fr30@scanms.test',
        fullName: 'Admin Sàn AI FR30',
        role: UserRole.SYSTEM_ADMIN,
        phoneNumber: '0901303099',
      },
      {
        id: kolId1,
        email: 'kol1-fr30@scanms.test',
        fullName: 'Trần Thu Hà (Diamond Beauty)',
        role: UserRole.COLLABORATOR,
        phoneNumber: '0901303002',
      },
      {
        id: kolId2,
        email: 'kol2-fr30@scanms.test',
        fullName: 'Lê Thuỳ Linh (Gold Fashion)',
        role: UserRole.COLLABORATOR,
        phoneNumber: '0901303003',
      },
      {
        id: kolId3,
        email: 'kol3-fr30@scanms.test',
        fullName: 'Hoàng Nam (Silver Tech)',
        role: UserRole.COLLABORATOR,
        phoneNumber: '0901303004',
      },
    ];

    for (const u of testUsers) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: { passwordHash, isActive: true, role: u.role, fullName: u.fullName },
        create: {
          id: u.id,
          email: u.email,
          passwordHash,
          fullName: u.fullName,
          role: u.role,
          phoneNumber: u.phoneNumber,
          isActive: true,
        },
      });
    }

    // 2. Create Store
    await prisma.store.upsert({
      where: { id: storeId },
      update: {},
      create: {
        id: storeId,
        ownerId: shopOwnerId,
        name: 'FR30 AI Smart Recommendation Store',
        slug: 'fr30-ai-match-store',
        defaultCommissionRate: 15.0,
      },
    });

    // 3. Create Tiers
    await prisma.collaboratorTier.upsert({
      where: { id: tierIdDiamond },
      update: {},
      create: {
        id: tierIdDiamond,
        name: 'Kim Cương (Diamond)',
        minRevenueThreshold: 300000000,
        extraBonusPercentage: 5.0,
      },
    });

    await prisma.collaboratorTier.upsert({
      where: { id: tierIdGold },
      update: {},
      create: {
        id: tierIdGold,
        name: 'Vàng (Gold)',
        minRevenueThreshold: 100000000,
        extraBonusPercentage: 3.0,
      },
    });

    await prisma.collaboratorTier.upsert({
      where: { id: tierIdSilver },
      update: {},
      create: {
        id: tierIdSilver,
        name: 'Bạc (Silver)',
        minRevenueThreshold: 30000000,
        extraBonusPercentage: 1.5,
      },
    });

    // 4. Create Products
    await prisma.product.upsert({
      where: { id: productIdBeauty },
      update: {},
      create: {
        id: productIdBeauty,
        storeId,
        sku: 'SKU-FR30-BEAUTY',
        title: 'Serum Dưỡng Trắng Da Niacinamide 10% B3',
        description: 'Serum chuyên sâu làm sáng và mịn da',
        categoryName: 'Mỹ phẩm & Làm đẹp',
        price: 350000,
        stockQuantity: 500,
        isActive: true,
      },
    });

    await prisma.product.upsert({
      where: { id: productIdTech },
      update: {},
      create: {
        id: productIdTech,
        storeId,
        sku: 'SKU-FR30-TECH',
        title: 'Tai Nghe Bluetooth True Wireless ANC',
        description: 'Chống ồn chủ động thời lượng pin 30h',
        categoryName: 'Công nghệ & Thiết bị số',
        price: 690000,
        stockQuantity: 200,
        isActive: true,
      },
    });

    // 5. Create Collaborator Profiles
    await prisma.collaboratorProfile.upsert({
      where: { userId: kolId1 },
      update: {},
      create: {
        userId: kolId1,
        tierId: tierIdDiamond,
        kycStatus: KycStatus.VERIFIED,
        bio: 'Chuyên gia review mỹ phẩm và chăm sóc da 5 năm kinh nghiệm',
        bankName: 'Vietcombank',
        bankAccountNumber: '9991234561',
        bankAccountName: 'TRAN THU HA',
        totalFollowers: 850000,
      },
    });

    await prisma.collaboratorProfile.upsert({
      where: { userId: kolId2 },
      update: {},
      create: {
        userId: kolId2,
        tierId: tierIdGold,
        kycStatus: KycStatus.VERIFIED,
        bio: 'Stylist & Fashion influencer phối đồ đi làm, đi chơi',
        bankName: 'MBBank',
        bankAccountNumber: '9991234562',
        bankAccountName: 'LE THUY LINH',
        totalFollowers: 320000,
      },
    });

    await prisma.collaboratorProfile.upsert({
      where: { userId: kolId3 },
      update: {},
      create: {
        userId: kolId3,
        tierId: tierIdSilver,
        kycStatus: KycStatus.VERIFIED,
        bio: 'Reviewer công nghệ, unboxing đồ số và phụ kiện gaming',
        bankName: 'Techcombank',
        bankAccountNumber: '9991234563',
        bankAccountName: 'HOANG NAM',
        totalFollowers: 140000,
      },
    });

    // 6. Create Social Channels
    await prisma.collaboratorSocialChannel.create({
      data: {
        collaboratorId: kolId1,
        platformName: SocialPlatform.TIKTOK,
        channelName: 'ha.beauty',
        channelUrl: 'https://tiktok.com/@ha.beauty',
        followerCount: 850000,
        isPrimary: true,
      },
    });

    await prisma.collaboratorSocialChannel.create({
      data: {
        collaboratorId: kolId2,
        platformName: SocialPlatform.INSTAGRAM,
        channelName: 'linh.fashion',
        channelUrl: 'https://instagram.com/linh.fashion',
        followerCount: 320000,
        isPrimary: true,
      },
    });

    await prisma.collaboratorSocialChannel.create({
      data: {
        collaboratorId: kolId3,
        platformName: SocialPlatform.YOUTUBE,
        channelName: 'nam.techreview',
        channelUrl: 'https://youtube.com/@nam.techreview',
        followerCount: 140000,
        isPrimary: true,
      },
    });

    // 7. Create Referral Links
    await prisma.referralLink.upsert({
      where: { id: refLinkId1 },
      update: {},
      create: {
        id: refLinkId1,
        storeId,
        collaboratorId: kolId1,
        productId: productIdBeauty,
        shortCode: 'fr30k1',
        channel: SocialPlatform.TIKTOK,
        status: 'ACTIVE',
      },
    });

    await prisma.referralLink.upsert({
      where: { id: refLinkId2 },
      update: {},
      create: {
        id: refLinkId2,
        storeId,
        collaboratorId: kolId2,
        productId: productIdBeauty,
        shortCode: 'fr30k2',
        channel: SocialPlatform.INSTAGRAM,
        status: 'ACTIVE',
      },
    });

    await prisma.referralLink.upsert({
      where: { id: refLinkId3 },
      update: {},
      create: {
        id: refLinkId3,
        storeId,
        collaboratorId: kolId3,
        productId: productIdTech,
        shortCode: 'fr30k3',
        channel: SocialPlatform.YOUTUBE,
        status: 'ACTIVE',
      },
    });

    // 8. Generate Simulated Clicks and Orders
    const now = new Date();
    // KOL1: 100 clicks
    for (let i = 0; i < 20; i++) {
      await prisma.clickTrafficLog.create({
        data: {
          referralLinkId: refLinkId1,
          storeId,
          collaboratorId: kolId1,
          productId: productIdBeauty,
          ipAddress: `10.0.1.${i}`,
          isValid: true,
          createdAt: now,
        },
      });
    }

    // KOL1 Orders: 10 completed orders (CR = 10 / 20 = 50% high conversion)
    for (let i = 0; i < 10; i++) {
      const ord = await prisma.order.create({
        data: {
          storeId,
          externalOrderSn: `ORD-FR30-K1-${i}`,
          attributedCollaboratorId: kolId1,
          referralLinkId: refLinkId1,
          subtotalAmount: 350000,
          finalAmount: 350000,
          status: OrderStatus.COMPLETED,
          createdAt: now,
        },
      });

      await prisma.orderItem.create({
        data: {
          orderId: ord.id,
          productId: productIdBeauty,
          quantity: 1,
          unitPrice: 350000,
          appliedCommissionRate: 15.0,
          calculatedCommissionAmount: 52500,
        },
      });

      await prisma.commission.create({
        data: {
          orderId: ord.id,
          collaboratorId: kolId1,
          commissionAmount: 52500,
          status: CommissionStatus.APPROVED,
          eligibleAt: now,
          availableAt: now,
          createdAt: now,
        },
      });
    }

    // Login users to obtain Bearer Tokens
    const loginShop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'shop-fr30@scanms.test', password: 'Password@123' });
    tokenShop = loginShop.body?.data?.accessToken || loginShop.body?.accessToken;

    const loginAdmin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin-fr30@scanms.test', password: 'Password@123' });
    tokenAdmin = loginAdmin.body?.data?.accessToken || loginAdmin.body?.accessToken;

    const loginKol = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kol1-fr30@scanms.test', password: 'Password@123' });
    tokenKol = loginKol.body?.data?.accessToken || loginKol.body?.accessToken;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  // -------------------------------------------------------------------------
  // TC01: Shop Manager retrieves top recommended KOLs for product (200 OK)
  // -------------------------------------------------------------------------
  it('TC01: Shop Manager retrieves top recommended KOLs for a specific product (200 OK)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/ai/recommend-kols/${productIdBeauty}`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body).toBeDefined();
    expect(body.targetProduct).toBeDefined();
    expect(body.targetProduct.productId).toBe(productIdBeauty);
    expect(body.targetProduct.category).toBe('Mỹ phẩm & Làm đẹp');
    expect(Array.isArray(body.recommendedKols)).toBe(true);
    expect(body.recommendedKols.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TC02: Match score is within valid percentage range [0 - 100%]
  // -------------------------------------------------------------------------
  it('TC02: Validates matchScore is within valid percentage range [0 - 100%]', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/ai/recommend-kols/${productIdBeauty}`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    for (const kol of body.recommendedKols) {
      expect(kol.matchScore).toBeGreaterThanOrEqual(0);
      expect(kol.matchScore).toBeLessThanOrEqual(100);
      expect(typeof kol.matchLevel).toBe('string');
    }
  });

  // -------------------------------------------------------------------------
  // TC03: Results are sorted descending by matchScore
  // -------------------------------------------------------------------------
  it('TC03: Validates results are sorted strictly descending by matchScore', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/ai/recommend-kols/${productIdBeauty}`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    const scores = body.recommendedKols.map((k: any) => k.matchScore);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  // -------------------------------------------------------------------------
  // TC04: Full 4-criteria scoreBreakdown in each recommended KOL
  // -------------------------------------------------------------------------
  it('TC04: Validates response includes full 4-criteria scoreBreakdown', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/ai/recommend-kols/${productIdBeauty}`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    const topKol = body.recommendedKols[0];
    expect(topKol.scoreBreakdown).toBeDefined();
    expect(topKol.scoreBreakdown.categoryScore).toBeGreaterThanOrEqual(0);
    expect(topKol.scoreBreakdown.conversionRateScore).toBeGreaterThanOrEqual(0);
    expect(topKol.scoreBreakdown.tierAndSocialScore).toBeGreaterThanOrEqual(0);
    expect(topKol.scoreBreakdown.priceFitScore).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // TC05: Includes Explainable AI reasoning and key strengths array
  // -------------------------------------------------------------------------
  it('TC05: Validates response includes explainable aiReasoning and keyStrengths array', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/ai/recommend-kols/${productIdBeauty}`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    const topKol = body.recommendedKols[0];
    expect(topKol.aiReasoning).toBeDefined();
    expect(typeof topKol.aiReasoning).toBe('string');
    expect(topKol.aiReasoning.length).toBeGreaterThan(10);
    expect(Array.isArray(topKol.keyStrengths)).toBe(true);
    expect(topKol.keyStrengths.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TC06: General recommendation filter by category
  // -------------------------------------------------------------------------
  it('TC06: General recommendation filtered by category returns relevant KOLs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/recommend-kols')
      .query({ category: 'Mỹ phẩm & Làm đẹp' })
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body.recommendedKols).toBeDefined();
    expect(body.recommendedKols.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TC07: Filter by minTier=GOLD
  // -------------------------------------------------------------------------
  it('TC07: Filter by minTier=GOLD returns only Gold, Platinum, and Diamond KOLs', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/recommend-kols')
      .query({ minTier: 'GOLD' })
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    for (const kol of body.recommendedKols) {
      const tier = kol.tierName?.toUpperCase();
      expect(['GOLD', 'PLATINUM', 'DIAMOND', 'VÀNG', 'BẠCH KIM', 'KIM CƯƠNG', 'KIM CƯƠNG (DIAMOND)', 'VÀNG (GOLD)']).toContain(tier);
    }
  });

  // -------------------------------------------------------------------------
  // TC08: Filter by minConversionRate=5.0
  // -------------------------------------------------------------------------
  it('TC08: Filter by minConversionRate=5.0 filters out low conversion rate creators', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/recommend-kols')
      .query({ minConversionRate: 5.0 })
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    for (const kol of body.recommendedKols) {
      expect(kol.lifetimeStats.conversionRate).toBeGreaterThanOrEqual(5.0);
    }
  });

  // -------------------------------------------------------------------------
  // TC09: Filter by priceRange=FROM_200K_TO_500K
  // -------------------------------------------------------------------------
  it('TC09: Filter by priceRange=FROM_200K_TO_500K executes successfully', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/recommend-kols')
      .query({ priceRange: 'FROM_200K_TO_500K' })
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body.recommendedKols).toBeDefined();
    expect(body.recommendedKols.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // TC10: Limit parameter restriction (limit=2)
  // -------------------------------------------------------------------------
  it('TC10: Validates limit parameter correctly bounds the result count (limit=2)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/ai/recommend-kols/${productIdBeauty}`)
      .query({ limit: 2 })
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body.recommendedKols.length).toBeLessThanOrEqual(2);
  });

  // -------------------------------------------------------------------------
  // TC11: Deep 1-on-1 match analysis endpoint POST /api/ai/match-analysis
  // -------------------------------------------------------------------------
  it('TC11: Deep 1-on-1 match analysis POST /api/ai/match-analysis returns detailed affinity report', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/ai/match-analysis')
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        productId: productIdBeauty,
        collaboratorId: kolId1,
      })
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body).toBeDefined();
    expect(body.targetProduct).toBeDefined();
    expect(body.collaborator).toBeDefined();
    expect(body.collaborator.collaboratorId).toBe(kolId1);
    expect(body.collaborator.matchScore).toBeGreaterThan(70);
    expect(body.collaborator.scoreBreakdown).toBeDefined();
    expect(body.collaborator.aiReasoning).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // TC12: 404 Not Found when product ID does not exist
  // -------------------------------------------------------------------------
  it('TC12: Returns 404 Not Found when product ID does not exist', async () => {
    const nonExistentId = '00000000-0000-4000-a000-000000000000';
    await request(app.getHttpServer())
      .get(`/api/ai/recommend-kols/${nonExistentId}`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(404);
  });

  // -------------------------------------------------------------------------
  // TC13: System Admin access to recommendation endpoint
  // -------------------------------------------------------------------------
  it('TC13: System Admin is authorized to access recommendation endpoints', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/ai/recommend-kols/${productIdBeauty}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body.recommendedKols).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // TC14: 401 Unauthorized without Bearer JWT token
  // -------------------------------------------------------------------------
  it('TC14: 401 Unauthorized without JWT token', async () => {
    await request(app.getHttpServer())
      .get(`/api/ai/recommend-kols/${productIdBeauty}`)
      .expect(401);
  });

  // -------------------------------------------------------------------------
  // TC15: Validates query parameter validation and boundary handling
  // -------------------------------------------------------------------------
  it('TC15: Handles custom query filters gracefully without crashing', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/recommend-kols')
      .query({ limit: 100, minConversionRate: 0 })
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);

    const body = res.body?.data || res.body;
    expect(body.recommendedKols).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // TC16: Latency test verifying response time
  // -------------------------------------------------------------------------
  it('TC16: Latency test verifying algorithm execution response time is performant', async () => {
    const startTime = Date.now();
    await request(app.getHttpServer())
      .get(`/api/ai/recommend-kols/${productIdBeauty}`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .expect(200);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000);
  });
});
