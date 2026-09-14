import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import {
  UserRole,
  OrderStatus,
  CommissionStatus,
  CampaignParticipantStatus,
  SocialPlatform,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';

const cookieParser = require('cookie-parser');

jest.setTimeout(90_000);

describe('FR-28 — Realtime Sales & Performance Analytics Dashboard E2E Suite (Real PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const shopOwnerId = '11111111-2828-4000-8000-000000000001';
  const otherShopId = '22222222-2828-4000-8000-000000000002';
  const kolId = '33333333-2828-4000-8000-000000000003';
  const storeId = '55555555-2828-4000-8000-000000000005';
  const otherStoreId = '66666666-2828-4000-8000-000000000006';

  const productId1 = '77777777-2828-4000-8000-000000000001';
  const productId2 = '77777777-2828-4000-8000-000000000002';
  const campaignId = '88888888-2828-4000-8000-000000000001';
  const referralLinkId = '99999999-2828-4000-8000-000000000001';

  let tokenShop: string;
  let tokenOtherShop: string;
  let tokenKol: string;

  async function cleanup() {
    try {
      const testEmails = [
        'shop-fr28@scanms.test',
        'othershop-fr28@scanms.test',
        'kol-fr28@scanms.test',
      ];
      const testUserIds = [shopOwnerId, otherShopId, kolId];
      const testStoreIds = [storeId, otherStoreId];

      const existingUsers = await prisma.user.findMany({
        where: {
          OR: [{ id: { in: testUserIds } }, { email: { in: testEmails } }],
        },
        select: { id: true },
      });
      const allUserIds = Array.from(new Set([...testUserIds, ...existingUsers.map(u => u.id)]));

      const existingStores = await prisma.store.findMany({
        where: {
          OR: [
            { id: { in: testStoreIds } },
            { slug: { in: ['fr28-analytics-store', 'fr28-other-store'] } },
            { ownerId: { in: allUserIds } },
          ],
        },
        select: { id: true },
      });
      const allStoreIds = Array.from(new Set([...testStoreIds, ...existingStores.map(s => s.id)]));

      // Cleanup dependent tables
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
      await prisma.campaignParticipant.deleteMany({
        where: {
          OR: [
            { collaboratorId: { in: allUserIds } },
            { campaign: { storeId: { in: allStoreIds } } },
          ],
        },
      });
      await prisma.campaignProduct.deleteMany({
        where: { campaign: { storeId: { in: allStoreIds } } },
      });
      await prisma.campaign.deleteMany({
        where: { storeId: { in: allStoreIds } },
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
      console.warn('FR-28 Cleanup error (ignored):', e);
    }
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'fr28-super-secret-jwt-key-2026';
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
        email: 'shop-fr28@scanms.test',
        fullName: 'Chủ Shop Analytics FR28',
        role: UserRole.SHOP_MANAGER,
        phoneNumber: '0901282801',
      },
      {
        id: otherShopId,
        email: 'othershop-fr28@scanms.test',
        fullName: 'Chủ Shop Khác FR28',
        role: UserRole.SHOP_MANAGER,
        phoneNumber: '0901282802',
      },
      {
        id: kolId,
        email: 'kol-fr28@scanms.test',
        fullName: 'Nguyễn Văn KOL FR28',
        role: UserRole.COLLABORATOR,
        phoneNumber: '0901282803',
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

    // 2. Create Stores
    await prisma.store.upsert({
      where: { id: storeId },
      update: {},
      create: {
        id: storeId,
        ownerId: shopOwnerId,
        name: 'Gian Hàng Mỹ Phẩm Cao Cấp FR28',
        slug: 'fr28-analytics-store',
        defaultCommissionRate: 15.0,
      },
    });

    await prisma.store.upsert({
      where: { id: otherStoreId },
      update: {},
      create: {
        id: otherStoreId,
        ownerId: otherShopId,
        name: 'Gian Hàng Khác FR28',
        slug: 'fr28-other-store',
        defaultCommissionRate: 10.0,
      },
    });

    // 3. Create Collaborator Profile
    await prisma.collaboratorProfile.upsert({
      where: { userId: kolId },
      update: {},
      create: {
        userId: kolId,
        bankName: 'Vietcombank',
        bankAccountNumber: '9998887779',
        bankAccountName: 'NGUYEN VAN KOL',
      },
    });

    await prisma.storeCollaborator.upsert({
      where: {
        storeId_collaboratorId: { storeId, collaboratorId: kolId },
      },
      update: { status: 'APPROVED' },
      create: {
        storeId,
        collaboratorId: kolId,
        status: 'APPROVED',
      },
    });

    // 4. Create Products
    await prisma.product.upsert({
      where: { id: productId1 },
      update: {},
      create: {
        id: productId1,
        storeId,
        sku: 'SKU-FR28-B5',
        title: 'Serum Phục Hồi B5 HA FR28',
        price: 350000,
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
        sku: 'SKU-FR28-SUN',
        title: 'Kem Chống Nắng Tế Bào Gốc FR28',
        price: 450000,
        stockQuantity: 80,
        isActive: true,
      },
    });

    // 5. Create VIP Campaign
    const now = new Date();
    await prisma.campaign.upsert({
      where: { id: campaignId },
      update: {},
      create: {
        id: campaignId,
        storeId,
        name: 'Siêu Sale Analytics VIP 2026',
        bonusCommissionRate: 5.0,
        startDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    await prisma.campaignParticipant.upsert({
      where: {
        campaignId_collaboratorId: { campaignId, collaboratorId: kolId },
      },
      update: { status: CampaignParticipantStatus.ACCEPTED },
      create: {
        campaignId,
        collaboratorId: kolId,
        status: CampaignParticipantStatus.ACCEPTED,
      },
    });

    // 6. Create Referral Link & Clicks
    await prisma.referralLink.upsert({
      where: { id: referralLinkId },
      update: {},
      create: {
        id: referralLinkId,
        storeId,
        collaboratorId: kolId,
        productId: productId1,
        campaignId,
        shortCode: 'fr28ref01',
        channel: SocialPlatform.TIKTOK,
        status: 'ACTIVE',
      },
    });

    // Generate 5 mock clicks in click_traffic_logs
    for (let i = 0; i < 5; i++) {
      await prisma.clickTrafficLog.create({
        data: {
          referralLinkId,
          storeId,
          collaboratorId: kolId,
          productId: productId1,
          campaignId,
          ipAddress: `192.168.1.${10 + i}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          isValid: true,
          createdAt: new Date(now.getTime() - i * 3600 * 1000),
        },
      });
    }

    // 7. Create Orders, OrderItems & Commissions
    const order1 = await prisma.order.create({
      data: {
        storeId,
        externalOrderSn: 'ORD-FR28-001',
        attributedCollaboratorId: kolId,
        referralLinkId,
        subtotalAmount: 700000,
        finalAmount: 700000,
        status: OrderStatus.COMPLETED,
        createdAt: now,
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        productId: productId1,
        referralLinkId,
        quantity: 2,
        unitPrice: 350000,
        appliedCommissionRate: 15.0,
        calculatedCommissionAmount: 105000,
      },
    });

    await prisma.commission.create({
      data: {
        orderId: order1.id,
        collaboratorId: kolId,
        commissionAmount: 105000,
        status: CommissionStatus.APPROVED,
        eligibleAt: now,
        availableAt: now,
        createdAt: now,
      },
    });

    const order2 = await prisma.order.create({
      data: {
        storeId,
        externalOrderSn: 'ORD-FR28-002',
        attributedCollaboratorId: kolId,
        referralLinkId,
        subtotalAmount: 450000,
        finalAmount: 450000,
        status: OrderStatus.DELIVERED,
        createdAt: now,
      },
    });

    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        productId: productId2,
        referralLinkId,
        quantity: 1,
        unitPrice: 450000,
        appliedCommissionRate: 15.0,
        calculatedCommissionAmount: 67500,
      },
    });

    await prisma.commission.create({
      data: {
        orderId: order2.id,
        collaboratorId: kolId,
        commissionAmount: 67500,
        status: CommissionStatus.APPROVED,
        eligibleAt: now,
        availableAt: now,
        createdAt: now,
      },
    });

    // 8. Retrieve JWT Auth Tokens
    const loginShop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'shop-fr28@scanms.test', password: 'Password@123' });
    tokenShop = loginShop.body.data?.accessToken || loginShop.body.accessToken;

    const loginOtherShop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'othershop-fr28@scanms.test', password: 'Password@123' });
    tokenOtherShop = loginOtherShop.body.data?.accessToken || loginOtherShop.body.accessToken;

    const loginKol = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kol-fr28@scanms.test', password: 'Password@123' });
    tokenKol = loginKol.body.data?.accessToken || loginKol.body.accessToken;
  });

  afterAll(async () => {
    await cleanup();
    if (app) {
      await app.close();
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 1: Shop Manager xem 5 KPI tổng quan hôm nay
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 1 [GET /api/dashboard/realtime/overview] — Shop Manager xem 5 KPI tổng quan hôm nay', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/overview?range=today')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('metrics');
    expect(res.body.metrics.grossRevenue).toBe(1150000);
    expect(res.body.metrics.totalOrders).toBe(2);
    expect(res.body.metrics.totalClicks).toBe(5);
    expect(res.body.metrics.totalCommission).toBe(172500);
    expect(res.body.metrics.conversionRate).toBe(40);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 2: Collaborator xem KPI cá nhân
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 2 [GET /api/dashboard/realtime/overview] — KOL xem KPI thu nhập và click cá nhân', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/overview?range=today')
      .set('Authorization', `Bearer ${tokenKol}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics.grossRevenue).toBe(1150000);
    expect(res.body.metrics.totalCommission).toBe(172500);
    expect(res.body.metrics.totalClicks).toBe(5);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 3: Bộ lọc 7 ngày qua (7d)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 3 [GET /api/dashboard/realtime/overview] — Lọc dữ liệu 7 ngày qua (7d)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/overview?range=7d')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(res.body.period.range).toBe('7d');
    expect(res.body.metrics.totalOrders).toBeGreaterThanOrEqual(2);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 4: Bộ lọc 30 ngày qua (30d)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 4 [GET /api/dashboard/realtime/overview] — Lọc dữ liệu 30 ngày qua (30d)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/overview?range=30d')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(res.body.period.range).toBe('30d');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 5: Bộ lọc tháng này (this_month)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 5 [GET /api/dashboard/realtime/overview] — Lọc dữ liệu tháng hiện tại (this_month)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/overview?range=this_month')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(res.body.period.range).toBe('this_month');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 6: Bộ lọc tùy chỉnh ngày (custom)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 6 [GET /api/dashboard/realtime/overview] — Lọc theo khoảng ngày tùy chỉnh (custom)', async () => {
    const start = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date().toISOString();

    const res = await request(app.getHttpServer())
      .get(`/api/dashboard/realtime/overview?range=custom&startDate=${start}&endDate=${end}`)
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(res.body.period.range).toBe('custom');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 7: Biểu đồ chuỗi thời gian theo giờ (today)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 7 [GET /api/dashboard/realtime/timeseries] — Trả về chuỗi dữ liệu 24 giờ của hôm nay', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/timeseries?range=today')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(24);
    expect(res.body[0]).toHaveProperty('hour');
    expect(res.body[0]).toHaveProperty('revenue');
    expect(res.body[0]).toHaveProperty('orders');
    expect(res.body[0]).toHaveProperty('clicks');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 8: Biểu đồ chuỗi thời gian theo ngày (7d)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 8 [GET /api/dashboard/realtime/timeseries] — Trả về chuỗi dữ liệu 7 ngày qua', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/timeseries?range=7d')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(7);
    expect(res.body[0]).toHaveProperty('date');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 9: Top sản phẩm bán chạy nhất
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 9 [GET /api/dashboard/realtime/top-products] — Trả về danh sách top sản phẩm bán chạy', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/top-products?range=today')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('productId');
    expect(res.body[0]).toHaveProperty('title');
    expect(res.body[0]).toHaveProperty('quantitySold');
    expect(res.body[0]).toHaveProperty('grossRevenue');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 10: Top sản phẩm giới hạn limit
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 10 [GET /api/dashboard/realtime/top-products] — Tôn trọng tham số limit', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/top-products?range=today&limit=1')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(1);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 11: Phân bổ kênh lưu lượng & tiếp thị
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 11 [GET /api/dashboard/realtime/top-channels] — Trả về phân tích theo kênh TIKTOK, FB...', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/top-channels?range=today')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const tiktok = res.body.find((c: any) => c.channel === 'TIKTOK');
    expect(tiktok).toBeDefined();
    expect(tiktok.clicks).toBeGreaterThanOrEqual(5);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 12: Phễu chuyển đổi (Conversion Funnel)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 12 [GET /api/dashboard/realtime/funnel] — Trả về phễu 3 tầng: Clicks -> Orders -> Paid', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/funnel?range=today')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stages');
    expect(res.body).toHaveProperty('conversionRate');
    expect(res.body.stages.length).toBe(3);
    expect(res.body.stages[0].stage).toBe('VISITORS_CLICKS');
    expect(res.body.stages[0].count).toBe(5);
    expect(res.body.stages[2].stage).toBe('ORDERS_COMPLETED');
    expect(res.body.stages[2].count).toBe(2);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 13: Hiệu năng Chiến dịch VIP (FR-27 integration)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 13 [GET /api/dashboard/realtime/campaigns] — Thống kê hiệu quả chiến dịch VIP', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/campaigns?range=today')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const camp = res.body.find((c: any) => c.campaignId === campaignId);
    expect(camp).toBeDefined();
    expect(camp.campaignName).toBe('Siêu Sale Analytics VIP 2026');
    expect(camp.bonusCommissionRate).toBe(5.0);
    expect(camp.participantCount).toBe(1);
    expect(camp.totalRevenue).toBe(1150000);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 14: Bảo mật 401 khi không có JWT Token
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 14 [GET /api/dashboard/realtime/overview] — Trả về 401 khi không truyền Access Token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/overview?range=today');

    expect(res.status).toBe(401);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 15: Phân lập dữ liệu giữa các Gian Hàng (Store Isolation)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 15 [GET /api/dashboard/realtime/overview] — Shop khác không thấy số liệu của Shop 1', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/overview?range=today')
      .set('Authorization', `Bearer ${tokenOtherShop}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics.grossRevenue).toBe(0);
    expect(res.body.metrics.totalOrders).toBe(0);
    expect(res.body.metrics.totalClicks).toBe(0);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 16: Validation Error 400 khi range không hợp lệ
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 16 [GET /api/dashboard/realtime/overview] — Bắt lỗi 400 khi truyền range sai quy cách', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/realtime/overview?range=invalid_range')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(400);
  });
});
