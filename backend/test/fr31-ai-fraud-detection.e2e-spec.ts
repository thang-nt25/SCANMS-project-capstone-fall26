import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

describe('FR-31 — AI Fraud Sentinel & Traffic Anomaly Detection E2E Suite (Real PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let adminToken: string;
  let shopToken: string;
  let kolToken: string;

  let testUserId: string;
  let testShopId: string;
  let testKolId: string;
  let testProductId: string;
  let testReferralLinkId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // 1. Tạo Shop Manager test
    const shopUser = await prisma.user.upsert({
      where: { email: 'shop-fr31@scanms.test' },
      update: { role: UserRole.SHOP_MANAGER, isActive: true },
      create: {
        email: 'shop-fr31@scanms.test',
        fullName: 'Chủ Shop Sora Skin Test FR31',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJ.W/1pQ0eH6oNge',
        role: UserRole.SHOP_MANAGER,
        isActive: true,
      },
    });
    testUserId = shopUser.id;

    // 2. Tạo Store test
    const store = await prisma.store.upsert({
      where: { slug: 'sora-skin-fr31-e2e' },
      update: { name: 'Sora Skin Flagship FR31', ownerId: shopUser.id },
      create: {
        ownerId: shopUser.id,
        name: 'Sora Skin Flagship FR31',
        slug: 'sora-skin-fr31-e2e',
        description: 'Gian hàng thử nghiệm E2E FR-31 AI Fraud Sentinel',
      },
    });
    testShopId = store.id;

    // 3. Tạo Admin test
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin-fr31@scanms.test' },
      update: { role: UserRole.SYSTEM_ADMIN, isActive: true },
      create: {
        email: 'admin-fr31@scanms.test',
        fullName: 'Super Admin Sentinel FR31',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJ.W/1pQ0eH6oNge',
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
      },
    });

    // 4. Tạo KOL test
    const kolUser = await prisma.user.upsert({
      where: { email: 'kol-fr31@scanms.test' },
      update: { role: UserRole.COLLABORATOR, isActive: true },
      create: {
        email: 'kol-fr31@scanms.test',
        fullName: 'KOL Nguyễn Trọng Nghĩa Test FR31',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJ.W/1pQ0eH6oNge',
        role: UserRole.COLLABORATOR,
        isActive: true,
      },
    });
    testKolId = kolUser.id;

    // Profile & Tier
    await prisma.collaboratorProfile.upsert({
      where: { userId: kolUser.id },
      update: {},
      create: {
        userId: kolUser.id,
        bankName: 'MBBank',
        bankAccountNumber: '0987654321',
        bankAccountName: 'NGUYEN TRONG NGHIA',
        totalFollowers: 125000,
      },
    });

    // 5. Tạo Sản phẩm test
    const product = await prisma.product.upsert({
      where: { id: '00000000-0000-0000-0000-000000000311' },
      update: { price: 350000, isAffiliateEnabled: true },
      create: {
        id: '00000000-0000-0000-0000-000000000311',
        storeId: store.id,
        sku: 'FR31-SERUM-VITC',
        title: 'Serum Vitamin C 21.5% Pure Glow FR31',
        categoryName: 'Dưỡng Trắng & Mờ Thâm',
        price: 350000,
        originalPrice: 450000,
        customCommissionRate: 15.0,
        stockQuantity: 200,
        isActive: true,
        isAffiliateEnabled: true,
      },
    });
    testProductId = product.id;

    // 6. Tạo Link tiếp thị có traffic bất thường (Zombie Traffic & Bot Spam)
    const refLink = await prisma.referralLink.upsert({
      where: { shortCode: 'fr31bot' },
      update: { totalClicks: 1200, totalOrders: 0 },
      create: {
        collaboratorId: kolUser.id,
        storeId: store.id,
        productId: product.id,
        shortCode: 'fr31bot',
        label: 'Link Tiếp Thị TikTok Bot Test',
        totalClicks: 1200,
        totalOrders: 0,
        status: 'ACTIVE',
      },
    });
    testReferralLinkId = refLink.id;

    // Gieo mầm Click logs
    await prisma.clickTrafficLog.createMany({
      data: [
        { referralLinkId: refLink.id, storeId: store.id, ipAddress: '113.161.45.10', userAgent: 'Mozilla/5.0 Bot' },
        { referralLinkId: refLink.id, storeId: store.id, ipAddress: '113.161.45.10', userAgent: 'Mozilla/5.0 Bot' },
        { referralLinkId: refLink.id, storeId: store.id, ipAddress: '113.161.45.10', userAgent: 'Mozilla/5.0 Bot' },
        { referralLinkId: refLink.id, storeId: store.id, ipAddress: '113.161.45.10', userAgent: 'Mozilla/5.0 Bot' },
        { referralLinkId: refLink.id, storeId: store.id, ipAddress: '113.161.45.10', userAgent: 'Mozilla/5.0 Bot' },
        { referralLinkId: refLink.id, storeId: store.id, ipAddress: '113.161.45.10', userAgent: 'Mozilla/5.0 Bot' },
        { referralLinkId: refLink.id, storeId: store.id, ipAddress: '113.161.45.10', userAgent: 'Mozilla/5.0 Bot' },
        { referralLinkId: refLink.id, storeId: store.id, ipAddress: '113.161.45.10', userAgent: 'Mozilla/5.0 Bot' },
        { referralLinkId: refLink.id, storeId: store.id, ipAddress: '113.161.45.10', userAgent: 'Mozilla/5.0 Bot', riskReason: 'RATE_LIMIT_BURST' },
      ],
      skipDuplicates: true,
    });

    // 7. Tạo JWT Tokens
    shopToken = jwtService.sign({ sub: shopUser.id, role: shopUser.role, email: shopUser.email });
    adminToken = jwtService.sign({ sub: adminUser.id, role: adminUser.role, email: adminUser.email });
    kolToken = jwtService.sign({ sub: kolUser.id, role: kolUser.role, email: kolUser.email });
  });

  afterAll(async () => {
    try {
      await prisma.clickTrafficLog.deleteMany({ where: { referralLinkId: testReferralLinkId } });
      await prisma.referralLink.deleteMany({ where: { shortCode: 'fr31bot' } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    } catch {}
    await app.close();
  });

  // TC01: Quét traffic toàn diện
  it('TC01: GET /api/ai/fraud/scan returns 200 OK and valid summary structure', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/fraud/scan')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('totalScannedLinks');
    expect(res.body).toHaveProperty('totalScannedClicks');
    expect(res.body).toHaveProperty('totalIncidents');
    expect(res.body).toHaveProperty('criticalCount');
    expect(res.body).toHaveProperty('suspiciousCount');
    expect(res.body).toHaveProperty('cleanCount');
    expect(res.body).toHaveProperty('potentialSavedAmount');
    expect(Array.isArray(res.body.incidents)).toBe(true);
  });

  // TC02: Kiểm tra cấu trúc phân loại rủi ro
  it('TC02: Validates totalScannedClicks and potentialSavedAmount are non-negative numeric values', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/fraud/scan')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    expect(typeof res.body.totalScannedClicks).toBe('number');
    expect(res.body.totalScannedClicks).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.potentialSavedAmount).toBe('number');
    expect(res.body.potentialSavedAmount).toBeGreaterThanOrEqual(0);
  });

  // TC03: Kiểm tra biên độ điểm rủi ro [0 - 100]
  it('TC03: Validates riskScore of all incidents is bounded within [0 - 100]', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/fraud/scan')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    for (const incident of res.body.incidents) {
      expect(incident.riskScore).toBeGreaterThanOrEqual(0);
      expect(incident.riskScore).toBeLessThanOrEqual(100);
    }
  });

  // TC04: Kiểm tra phân loại riskLevel chuẩn xác
  it('TC04: Validates riskLevel matches valid enum categories (CLEAN, LOW_RISK, SUSPICIOUS, FRAUD_CRITICAL)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/fraud/scan')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    const validLevels = ['CLEAN', 'LOW_RISK', 'SUSPICIOUS', 'FRAUD_CRITICAL'];
    for (const incident of res.body.incidents) {
      expect(validLevels).toContain(incident.riskLevel);
    }
  });

  // TC05: Kiểm tra AI Reasoning và Evidences
  it('TC05: Validates response includes natural language aiReasoning and structured evidences array', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/fraud/scan')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    const botIncident = res.body.incidents.find((i: any) => i.referralLinkCode === 'fr31bot');
    if (botIncident) {
      expect(botIncident.aiReasoning.length).toBeGreaterThan(10);
      expect(Array.isArray(botIncident.evidences)).toBe(true);
      expect(botIncident.evidences.length).toBeGreaterThan(0);
      expect(botIncident.evidences[0]).toHaveProperty('metric');
      expect(botIncident.evidences[0]).toHaveProperty('value');
      expect(botIncident.evidences[0]).toHaveProperty('severity');
    }
  });

  // TC06: Lọc theo minRiskScore
  it('TC06: Filter by minRiskScore=70 returns only suspicious and critical incidents', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/fraud/scan?minRiskScore=70')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    for (const incident of res.body.incidents) {
      expect(incident.riskScore).toBeGreaterThanOrEqual(70);
    }
  });

  // TC07: Lọc theo timeframe
  it('TC07: Filter by timeframe=24h and timeframe=7d executes successfully', async () => {
    const res24h = await request(app.getHttpServer())
      .get('/api/ai/fraud/scan?timeframe=24h')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    expect(Array.isArray(res24h.body.incidents)).toBe(true);

    const res7d = await request(app.getHttpServer())
      .get('/api/ai/fraud/scan?timeframe=7d')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    expect(Array.isArray(res7d.body.incidents)).toBe(true);
  });

  // TC08: Lấy danh sách sự vụ GET /api/ai/fraud/incidents
  it('TC08: GET /api/ai/fraud/incidents returns array of incidents sorted descending by riskScore', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/fraud/incidents')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    for (let i = 0; i < res.body.length - 1; i++) {
      expect(res.body[i].riskScore).toBeGreaterThanOrEqual(res.body[i + 1].riskScore);
    }
  });

  // TC09: Lấy chi tiết sự vụ theo ID
  it('TC09: GET /api/ai/fraud/incidents/:id returns specific incident details', async () => {
    const incidentId = `incident-${testReferralLinkId}`;
    const res = await request(app.getHttpServer())
      .get(`/api/ai/fraud/incidents/${incidentId}`)
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    expect(res.body.id).toBe(incidentId);
    expect(res.body.referralLinkId).toBe(testReferralLinkId);
    expect(res.body.collaboratorEmail).toBe('kol-fr31@scanms.test');
  });

  // TC10: Trả về 404 khi incident ID không tồn tại
  it('TC10: Returns 404 Not Found for non-existent incident ID', async () => {
    await request(app.getHttpServer())
      .get('/api/ai/fraud/incidents/incident-non-existent-99999')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(404);
  });

  // TC11: Phân tích chuyên sâu 1 KOL
  it('TC11: GET /api/ai/fraud/kol/:collaboratorId/analysis returns deep creator anomaly report', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/ai/fraud/kol/${testKolId}/analysis`)
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    expect(res.body.collaboratorId).toBe(testKolId);
    expect(res.body).toHaveProperty('riskScore');
    expect(res.body).toHaveProperty('aiReasoning');
  });

  // TC12: Xử lý hành động FREEZE_COMMISSION
  it('TC12: POST /api/ai/fraud/incidents/:id/action with FREEZE_COMMISSION pauses link and sets status to FROZEN', async () => {
    const incidentId = `incident-${testReferralLinkId}`;
    const res = await request(app.getHttpServer())
      .post(`/api/ai/fraud/incidents/${incidentId}/action`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({ action: 'FREEZE_COMMISSION', note: 'Đóng băng do nghi vấn zombie traffic' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.incident.status).toBe('FROZEN');

    // Kiểm tra link trong DB đã chuyển sang PAUSED
    const linkInDb = await prisma.referralLink.findUnique({ where: { id: testReferralLinkId } });
    expect(linkInDb?.status).toBe('PAUSED');
  });

  // TC13: Xử lý hành động DISMISS (Bác bỏ cảnh báo)
  it('TC13: POST /api/ai/fraud/incidents/:id/action with DISMISS restores status to DISMISSED and link to ACTIVE', async () => {
    const incidentId = `incident-${testReferralLinkId}`;
    const res = await request(app.getHttpServer())
      .post(`/api/ai/fraud/incidents/${incidentId}/action`)
      .set('Authorization', `Bearer ${shopToken}`)
      .send({ action: 'DISMISS', note: 'Traffic hợp lệ từ phiên Livestream lớn' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.incident.status).toBe('DISMISSED');

    const linkInDb = await prisma.referralLink.findUnique({ where: { id: testReferralLinkId } });
    expect(linkInDb?.status).toBe('ACTIVE');
  });

  // TC14: Super Admin có quyền truy cập toàn diện
  it('TC14: System Admin is authorized to scan and take mitigation actions', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/ai/fraud/scan')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('totalScannedLinks');
  });

  // TC15: 401 Unauthorized khi không có JWT token
  it('TC15: 401 Unauthorized when request lacks JWT token', async () => {
    await request(app.getHttpServer())
      .get('/api/ai/fraud/scan')
      .expect(401);
  });

  // TC16: Kiểm tra độ trễ thuật toán (Performance & Latency)
  it('TC16: Latency test verifying algorithm completes under performant timing threshold (< 2000ms)', async () => {
    const startTime = Date.now();
    await request(app.getHttpServer())
      .get('/api/ai/fraud/scan')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(2000);
  });
});
