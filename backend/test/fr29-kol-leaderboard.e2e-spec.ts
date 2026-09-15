import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import {
  UserRole,
  OrderStatus,
  CommissionStatus,
  SocialPlatform,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';

const cookieParser = require('cookie-parser');

jest.setTimeout(90_000);

describe('FR-29 — Gamified KOL Leaderboard & Hall of Fame Podium E2E Suite (Real PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const shopOwnerId = '11111111-2929-4000-8000-000000000001';
  const kolId1 = '22222222-2929-4000-8000-000000000001'; // Top 1 (Quán Quân)
  const kolId2 = '22222222-2929-4000-8000-000000000002'; // Top 2 (Á Quân 1)
  const kolId3 = '22222222-2929-4000-8000-000000000003'; // Top 3 (Á Quân 2)
  const storeId = '33333333-2929-4000-8000-000000000001';

  const productId1 = '44444444-2929-4000-8000-000000000001';
  const productId2 = '44444444-2929-4000-8000-000000000002';

  const refLinkId1 = '55555555-2929-4000-8000-000000000001';
  const refLinkId2 = '55555555-2929-4000-8000-000000000002';
  const refLinkId3 = '55555555-2929-4000-8000-000000000003';

  let tokenShop: string;
  let tokenKol1: string;
  let tokenKol2: string;
  let tokenKol3: string;

  async function cleanup() {
    try {
      const testEmails = [
        'shop-fr29@scanms.test',
        'kol1-fr29@scanms.test',
        'kol2-fr29@scanms.test',
        'kol3-fr29@scanms.test',
      ];
      const testUserIds = [shopOwnerId, kolId1, kolId2, kolId3];
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
            { slug: { in: ['fr29-leaderboard-store'] } },
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
      await prisma.collaboratorProfile.deleteMany({
        where: { userId: { in: allUserIds } },
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
      console.warn('FR-29 Cleanup error (ignored):', e);
    }
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'fr29-super-secret-jwt-key-2026';
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
        email: 'shop-fr29@scanms.test',
        fullName: 'Chủ Shop Leaderboard FR29',
        role: UserRole.SHOP_MANAGER,
        phoneNumber: '0901292901',
      },
      {
        id: kolId1,
        email: 'kol1-fr29@scanms.test',
        fullName: 'Nguyễn Minh Châu (Top 1)',
        role: UserRole.COLLABORATOR,
        phoneNumber: '0901292902',
      },
      {
        id: kolId2,
        email: 'kol2-fr29@scanms.test',
        fullName: 'Lê Thuỳ Linh (Top 2)',
        role: UserRole.COLLABORATOR,
        phoneNumber: '0901292903',
      },
      {
        id: kolId3,
        email: 'kol3-fr29@scanms.test',
        fullName: 'Hoàng Nam (Top 3)',
        role: UserRole.COLLABORATOR,
        phoneNumber: '0901292904',
      },
    ];

    for (const u of testUsers) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: { passwordHash, isActive: true, role: u.role, fullName: u.fullName },
        create: {
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          passwordHash,
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
        name: 'Gian Hàng Leaderboard FR29',
        slug: 'fr29-leaderboard-store',
        defaultCommissionRate: 15.0,
      },
    });

    // 3. Create Collaborator Profiles
    const kolProfiles = [
      { userId: kolId1, bio: 'Quán Quân Livestream TikTok', tier: 'DIAMOND' },
      { userId: kolId2, bio: 'Beauty Blogger Platinum', tier: 'PLATINUM' },
      { userId: kolId3, bio: 'Reviewer Công Nghệ Gold', tier: 'GOLD' },
    ];

    for (const p of kolProfiles) {
      await prisma.collaboratorProfile.upsert({
        where: { userId: p.userId },
        update: {},
        create: {
          userId: p.userId,
          bio: p.bio,
          bankName: 'Vietcombank',
          bankAccountNumber: '9991234567',
          bankAccountName: 'COLLABORATOR',
        },
      });

      await prisma.storeCollaborator.upsert({
        where: {
          storeId_collaboratorId: { storeId, collaboratorId: p.userId },
        },
        update: { status: 'APPROVED' },
        create: {
          storeId,
          collaboratorId: p.userId,
          status: 'APPROVED',
        },
      });
    }

    // 4. Create Products
    await prisma.product.upsert({
      where: { id: productId1 },
      update: {},
      create: {
        id: productId1,
        storeId,
        sku: 'SKU-FR29-P1',
        title: 'Serum B5 HA Leaderboard',
        price: 300000,
        stockQuantity: 100,
        isActive: true,
      },
    });

    await prisma.product.upsert({
      where: { id: productId2 },
      update: {},
      create: {
        id: productId2,
        storeId,
        sku: 'SKU-FR29-P2',
        title: 'Kem Dưỡng Da Leaderboard',
        price: 200000,
        stockQuantity: 100,
        isActive: true,
      },
    });

    // 5. Create Referral Links
    await prisma.referralLink.upsert({
      where: { id: refLinkId1 },
      update: {},
      create: {
        id: refLinkId1,
        storeId,
        collaboratorId: kolId1,
        productId: productId1,
        shortCode: 'fr29k1',
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
        productId: productId1,
        shortCode: 'fr29k2',
        channel: SocialPlatform.FACEBOOK,
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
        productId: productId2,
        shortCode: 'fr29k3',
        channel: SocialPlatform.YOUTUBE,
        status: 'ACTIVE',
      },
    });

    // 6. Generate Clicks
    const now = new Date();
    // KOL1: 20 clicks
    for (let i = 0; i < 20; i++) {
      await prisma.clickTrafficLog.create({
        data: {
          referralLinkId: refLinkId1,
          storeId,
          collaboratorId: kolId1,
          productId: productId1,
          ipAddress: `10.0.1.${i}`,
          isValid: true,
          createdAt: now,
        },
      });
    }

    // KOL2: 10 clicks
    for (let i = 0; i < 10; i++) {
      await prisma.clickTrafficLog.create({
        data: {
          referralLinkId: refLinkId2,
          storeId,
          collaboratorId: kolId2,
          productId: productId1,
          ipAddress: `10.0.2.${i}`,
          isValid: true,
          createdAt: now,
        },
      });
    }

    // KOL3: 5 clicks
    for (let i = 0; i < 5; i++) {
      await prisma.clickTrafficLog.create({
        data: {
          referralLinkId: refLinkId3,
          storeId,
          collaboratorId: kolId3,
          productId: productId2,
          ipAddress: `10.0.3.${i}`,
          isValid: true,
          createdAt: now,
        },
      });
    }

    // 7. Generate Orders & Commissions
    // KOL 1 Orders: 2 orders, Total 600,000,000 GMV (Dominant Global Top 1)
    const order1 = await prisma.order.create({
      data: {
        storeId,
        externalOrderSn: 'ORD-FR29-K1-1',
        attributedCollaboratorId: kolId1,
        referralLinkId: refLinkId1,
        subtotalAmount: 300000000,
        finalAmount: 300000000,
        status: OrderStatus.COMPLETED,
        createdAt: now,
      },
    });
    await prisma.commission.create({
      data: {
        orderId: order1.id,
        collaboratorId: kolId1,
        commissionAmount: 45000000,
        status: CommissionStatus.APPROVED,
        eligibleAt: now,
        availableAt: now,
        createdAt: now,
      },
    });

    const order2 = await prisma.order.create({
      data: {
        storeId,
        externalOrderSn: 'ORD-FR29-K1-2',
        attributedCollaboratorId: kolId1,
        referralLinkId: refLinkId1,
        subtotalAmount: 300000000,
        finalAmount: 300000000,
        status: OrderStatus.DELIVERED,
        createdAt: now,
      },
    });
    await prisma.commission.create({
      data: {
        orderId: order2.id,
        collaboratorId: kolId1,
        commissionAmount: 45000000,
        status: CommissionStatus.APPROVED,
        eligibleAt: now,
        availableAt: now,
        createdAt: now,
      },
    });

    // KOL 2 Orders: 1 order, Total 250,000,000 GMV (Global Top 2)
    const order3 = await prisma.order.create({
      data: {
        storeId,
        externalOrderSn: 'ORD-FR29-K2-1',
        attributedCollaboratorId: kolId2,
        referralLinkId: refLinkId2,
        subtotalAmount: 250000000,
        finalAmount: 250000000,
        status: OrderStatus.COMPLETED,
        createdAt: now,
      },
    });
    await prisma.commission.create({
      data: {
        orderId: order3.id,
        collaboratorId: kolId2,
        commissionAmount: 37500000,
        status: CommissionStatus.APPROVED,
        eligibleAt: now,
        availableAt: now,
        createdAt: now,
      },
    });

    // KOL 3 Orders: 1 order, Total 100,000,000 GMV (Global Top 3)
    const order4 = await prisma.order.create({
      data: {
        storeId,
        externalOrderSn: 'ORD-FR29-K3-1',
        attributedCollaboratorId: kolId3,
        referralLinkId: refLinkId3,
        subtotalAmount: 100000000,
        finalAmount: 100000000,
        status: OrderStatus.DELIVERED,
        createdAt: now,
      },
    });
    await prisma.commission.create({
      data: {
        orderId: order4.id,
        collaboratorId: kolId3,
        commissionAmount: 15000000,
        status: CommissionStatus.APPROVED,
        eligibleAt: now,
        availableAt: now,
        createdAt: now,
      },
    });

    // 8. Retrieve JWT Auth Tokens
    const loginShop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'shop-fr29@scanms.test', password: 'Password@123' });
    tokenShop = loginShop.body.data?.accessToken || loginShop.body.accessToken;

    const loginKol1 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kol1-fr29@scanms.test', password: 'Password@123' });
    tokenKol1 = loginKol1.body.data?.accessToken || loginKol1.body.accessToken;

    const loginKol2 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kol2-fr29@scanms.test', password: 'Password@123' });
    tokenKol2 = loginKol2.body.data?.accessToken || loginKol2.body.accessToken;

    const loginKol3 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kol3-fr29@scanms.test', password: 'Password@123' });
    tokenKol3 = loginKol3.body.data?.accessToken || loginKol3.body.accessToken;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  describe('1. Leaderboard Full List & Podium API', () => {
    it('[TC-01] GET /api/leaderboard - Collaborator retrieves full leaderboard list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body).toBeDefined();
      expect(body.podium).toBeDefined();
      expect(body.rankings).toBeDefined();
      expect(Array.isArray(body.rankings)).toBe(true);
      expect(body.metric).toBe('REVENUE');
      expect(body.totalParticipants).toBeGreaterThanOrEqual(3);
    });

    it('[TC-02] GET /api/leaderboard - Shop Manager retrieves store-scoped leaderboard', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard?scope=STORE')
        .set('Authorization', `Bearer ${tokenShop}`)
        .expect(200);

      const body = res.body;
      expect(body).toBeDefined();
      expect(body.podium.rank1).toBeDefined();
      expect(body.podium.rank1?.collaboratorId).toBe(kolId1);
      expect(body.totalParticipants).toBeGreaterThanOrEqual(3);
    });

    it('[TC-03] GET /api/leaderboard/podium - Returns Top 3 Podium with bonus rewards (+5M, +2.5M, +1M)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard/podium')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.rank1).toBeDefined();
      expect(body.rank1?.rank).toBe(1);
      expect(body.rank1?.bonusPrizeAmount).toBe(5000000);
      expect(body.rank1?.collaboratorId).toBe(kolId1);
      expect(body.rank1?.grossRevenue).toBe(600000000);

      expect(body.rank2).toBeDefined();
      expect(body.rank2?.rank).toBe(2);
      expect(body.rank2?.bonusPrizeAmount).toBe(2500000);
      expect(body.rank2?.collaboratorId).toBe(kolId2);
      expect(body.rank2?.grossRevenue).toBe(250000000);

      expect(body.rank3).toBeDefined();
      expect(body.rank3?.rank).toBe(3);
      expect(body.rank3?.bonusPrizeAmount).toBe(1000000);
      expect(body.rank3?.collaboratorId).toBe(kolId3);
      expect(body.rank3?.grossRevenue).toBe(100000000);
    });

    it('[TC-04] GET /api/leaderboard/my-rank - Authenticated KOL retrieves own rank and gap to Top 10', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard/my-rank')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.myRank).toBe(1);
      expect(body.myRevenue).toBe(600000000);
      expect(body.myOrders).toBe(2);
      expect(body.currentPeriodLabel).toBeDefined();
    });
  });

  describe('2. Multi-Metric Sorting & Filtering', () => {
    it('[TC-05] GET /api/leaderboard?metric=REVENUE - Sorts rankings descending by GMV Revenue', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard?metric=REVENUE')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.metric).toBe('REVENUE');
      expect(body.podium.rank1?.collaboratorId).toBe(kolId1);
      expect(body.podium.rank1?.grossRevenue).toBeGreaterThanOrEqual(body.podium.rank2?.grossRevenue || 0);
    });

    it('[TC-06] GET /api/leaderboard?metric=ORDERS - Sorts rankings descending by successful orders', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard?metric=ORDERS')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.metric).toBe('ORDERS');
      expect(body.podium.rank1?.totalOrders).toBeGreaterThanOrEqual(body.podium.rank2?.totalOrders || 0);
    });

    it('[TC-07] GET /api/leaderboard?metric=CONVERSION_RATE - Sorts rankings descending by CR%', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard?metric=CONVERSION_RATE')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.metric).toBe('CONVERSION_RATE');
      expect(body.podium.rank1?.conversionRate).toBeDefined();
    });

    it('[TC-08] GET /api/leaderboard?metric=COMMISSION - Sorts rankings descending by commission', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard?metric=COMMISSION')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.metric).toBe('COMMISSION');
      expect(body.podium.rank1?.totalCommission).toBeGreaterThanOrEqual(body.podium.rank2?.totalCommission || 0);
    });
  });

  describe('3. Time Ranges & Periods Filtering', () => {
    it('[TC-09] GET /api/leaderboard?timeRange=this_month - Filters data for current month', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard?timeRange=this_month')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.periodLabel).toBeDefined();
      expect(body.totalParticipants).toBeGreaterThanOrEqual(3);
    });

    it('[TC-10] GET /api/leaderboard?timeRange=last_month - Filters data for previous month', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard?timeRange=last_month')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.periodLabel).toBeDefined();
    });

    it('[TC-11] GET /api/leaderboard?timeRange=this_quarter - Filters data for current quarter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard?timeRange=this_quarter')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.periodLabel).toBeDefined();
      expect(body.totalParticipants).toBeGreaterThanOrEqual(3);
    });

    it('[TC-12] GET /api/leaderboard?month=9&year=2026 - Filters data for specific custom month/year', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard?month=9&year=2026')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body).toBeDefined();
      expect(body.periodLabel).toContain('Tháng 9/2026');
    });

    it('[TC-13] GET /api/leaderboard?limit=5 - Restricts returned items count according to limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/leaderboard?limit=5')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.rankings.length).toBeLessThanOrEqual(5);
    });
  });

  describe('4. Creator Profile & Security Validations', () => {
    it('[TC-14] GET /api/leaderboard/creator/:id - Returns Hall of Fame Creator detail profile', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/leaderboard/creator/${kolId1}`)
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(200);

      const body = res.body;
      expect(body.creatorId).toBe(kolId1);
      expect(body.fullName).toBe('Nguyễn Minh Châu (Top 1)');
      expect(body.lifetimeStats.totalRevenue).toBe(600000000);
      expect(body.lifetimeStats.totalOrders).toBe(2);
      expect(body.badges).toBeDefined();
      expect(Array.isArray(body.badges)).toBe(true);
      expect(body.badges.length).toBeGreaterThan(0);
    });

    it('[TC-15] GET /api/leaderboard - Rejects unauthorized requests without JWT (401)', async () => {
      await request(app.getHttpServer())
        .get('/api/leaderboard')
        .expect(401);
    });

    it('[TC-16] GET /api/leaderboard?metric=INVALID_METRIC - Returns 400 Bad Request on invalid metric', async () => {
      await request(app.getHttpServer())
        .get('/api/leaderboard?metric=INVALID_METRIC')
        .set('Authorization', `Bearer ${tokenKol1}`)
        .expect(400);
    });
  });
});
