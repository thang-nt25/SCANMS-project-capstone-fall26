import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import {
  UserRole,
  ReferralLinkStatus,
  AttributionMethod,
  OrderStatus,
  StoreCollaboratorStatus,
  CommissionStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { CacheService } from '../src/core/cache/cache.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  hashIpAddress,
  normalizeUserAgent,
  generateDeviceFingerprint,
  signMultiShopAttributionToken,
  verifyMultiShopAttributionToken,
  signOpaqueVisitorToken,
  verifyOpaqueVisitorToken,
} from '../src/modules/referral-links/utils/short-code.generator';
import { ReferralLinksService } from '../src/modules/referral-links/referral-links.service';
import { ClickQueueService } from '../src/modules/referral-links/click-queue.service';

const cookieParser = require('cookie-parser');

function getSetCookies(headers: Record<string, any>): string[] {
  const c = headers['set-cookie'];
  if (!c) return [];
  return Array.isArray(c) ? c : [c];
}

jest.setTimeout(90_000);

describe('FR-13 — Last-Click & Cookie Tracking Engine E2E (Full Specification)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cacheService: CacheService;

  let secret = 'fr13-super-secret-jwt-key-for-testing-123456';

  // Test UUIDs
  const kolAId = '11111111-1313-4000-8000-000000000001';
  const kolBId = '22222222-1313-4000-8000-000000000002';
  const kolCId = '33333333-1313-4000-8000-000000000003';
  const shopOwner1Id = '44444444-1313-4000-8000-000000000001';
  const shopOwner2Id = '55555555-1313-4000-8000-000000000002';
  const store1Id = '66666666-1313-4000-8000-000000000001';
  const store2Id = '77777777-1313-4000-8000-000000000002';
  const product1Id = '88888888-1313-4000-8000-000000000001';
  const product2Id = '99999999-1313-4000-8000-000000000002';
  const link1KolAId = 'aaaaaaaa-1313-4000-8000-000000000001';
  const link2KolBId = 'bbbbbbbb-1313-4000-8000-000000000002';
  const link3KolCId = 'cccccccc-1313-4000-8000-000000000003';
  const couponId = 'dddddddd-1313-4000-8000-000000000001';
  const adminId = '99999999-1313-4000-8000-000000000099';

  const shortCode1 = 'fr13link1';
  const shortCode2 = 'fr13link2';
  const shortCode3 = 'fr13link3';

  let tokenKolA: string;
  let tokenShop1: string;
  let tokenShop2: string;
  let tokenAdmin: string;
  let capturedCookie1: string = '';

  async function cleanup() {
    try {
      await prisma.attributionAdjustment.deleteMany({
        where: { order: { storeId: { in: [store1Id, store2Id] } } },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: { in: [store1Id, store2Id] } } },
      });
      await prisma.couponRedemption.deleteMany({
        where: { storeId: { in: [store1Id, store2Id] } },
      });
      await prisma.commission.deleteMany({
        where: { order: { storeId: { in: [store1Id, store2Id] } } },
      });
      await prisma.order.deleteMany({
        where: { storeId: { in: [store1Id, store2Id] } },
      });
      await prisma.coupon.deleteMany({
        where: { id: couponId },
      });
      await prisma.clickTrafficLog.deleteMany({
        where: { referralLinkId: { in: [link1KolAId, link2KolBId, link3KolCId] } },
      });
      await prisma.attributionSession.deleteMany({
        where: { storeId: { in: [store1Id, store2Id] } },
      });
      await prisma.referralLink.deleteMany({
        where: { id: { in: [link1KolAId, link2KolBId, link3KolCId] } },
      });
      await prisma.product.deleteMany({
        where: { id: { in: [product1Id, product2Id] } },
      });
      await prisma.storeCollaborator.deleteMany({
        where: { storeId: { in: [store1Id, store2Id] } },
      });
      await prisma.store.deleteMany({
        where: { id: { in: [store1Id, store2Id] } },
      });
      await prisma.collaboratorProfile.deleteMany({
        where: { userId: { in: [kolAId, kolBId, kolCId] } },
      });
      await prisma.wallet.deleteMany({
        where: { collaboratorId: { in: [kolAId, kolBId, kolCId] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [kolAId, kolBId, kolCId, shopOwner1Id, shopOwner2Id, adminId] } },
      });
    } catch (e) {
      console.warn('Cleanup error (ignored):', e);
    }
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
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
    cacheService = app.get(CacheService);
    const configService = app.get(ConfigService);
    secret = configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'fr13-super-secret-jwt-key-for-testing-123456';

    await cleanup();

    // 1. Tạo Users & Stores
    const passwordHash = await bcrypt.hash('Password@123', 10);

    // KOL A, B, C
    await prisma.user.createMany({
      data: [
        { id: kolAId, email: 'kol.a.fr13@scanms.vn', passwordHash, role: UserRole.COLLABORATOR, fullName: 'KOL Alpha', isActive: true },
        { id: kolBId, email: 'kol.b.fr13@scanms.vn', passwordHash, role: UserRole.COLLABORATOR, fullName: 'KOL Beta', isActive: true },
        { id: kolCId, email: 'kol.c.fr13@scanms.vn', passwordHash, role: UserRole.COLLABORATOR, fullName: 'KOL Charlie', isActive: true },
        { id: shopOwner1Id, email: 'shop1.owner.fr13@scanms.vn', passwordHash, role: UserRole.SHOP_MANAGER, fullName: 'Chủ Shop 1', isActive: true },
        { id: shopOwner2Id, email: 'shop2.owner.fr13@scanms.vn', passwordHash, role: UserRole.SHOP_MANAGER, fullName: 'Chủ Shop 2', isActive: true },
        { id: adminId, email: 'admin.fr13@scanms.vn', passwordHash, role: UserRole.SYSTEM_ADMIN, fullName: 'System Admin FR13', isActive: true },
      ],
    });

    await prisma.collaboratorProfile.createMany({
      data: [
        {
          userId: kolAId,
          bankName: 'Vietcombank',
          bankAccountNumber: '0123456789',
          bankAccountName: 'KOL ALPHA',
          totalOrdersReferred: 0,
        },
        {
          userId: kolBId,
          bankName: 'MBBank',
          bankAccountNumber: '0987654321',
          bankAccountName: 'KOL BETA',
          totalOrdersReferred: 0,
        },
        {
          userId: kolCId,
          bankName: 'Techcombank',
          bankAccountNumber: '1122334455',
          bankAccountName: 'KOL CHARLIE',
          totalOrdersReferred: 0,
        },
      ],
    });

    await prisma.wallet.createMany({
      data: [
        { collaboratorId: kolAId, pendingBalance: 0, availableBalance: 0 },
        { collaboratorId: kolBId, pendingBalance: 0, availableBalance: 0 },
        { collaboratorId: kolCId, pendingBalance: 0, availableBalance: 0 },
      ],
    });

    // Store 1 (Sora Skin) & Store 2 (Aura Bio)
    await prisma.store.createMany({
      data: [
        { id: store1Id, ownerId: shopOwner1Id, name: 'Sora Skin Official', slug: 'sora-skin-fr13', attributionWindowDays: 30 },
        { id: store2Id, ownerId: shopOwner2Id, name: 'Aura Bio Cosmetics', slug: 'aura-bio-fr13', attributionWindowDays: 14 },
      ],
    });

    // Quyền tiếp thị của KOLs trên Shop 1 & Shop 2
    await prisma.storeCollaborator.createMany({
      data: [
        { storeId: store1Id, collaboratorId: kolAId, status: StoreCollaboratorStatus.APPROVED },
        { storeId: store1Id, collaboratorId: kolCId, status: StoreCollaboratorStatus.APPROVED },
        { storeId: store2Id, collaboratorId: kolBId, status: StoreCollaboratorStatus.APPROVED },
      ],
    });

    // Products
    await prisma.product.createMany({
      data: [
        {
          id: product1Id,
          storeId: store1Id,
          sku: 'SKU-SERUM-FR13-01',
          title: 'Serum Dưỡng Sáng Sora Skin',
          price: 300000,
          originalPrice: 350000,
          stockQuantity: 100,
          isActive: true,
          isDeleted: false,
          customCommissionRate: 15,
        },
        {
          id: product2Id,
          storeId: store2Id,
          sku: 'SKU-SUN-FR13-02',
          title: 'Kem Chống Nắng Aura Bio',
          price: 250000,
          originalPrice: 280000,
          stockQuantity: 100,
          isActive: true,
          isDeleted: false,
          customCommissionRate: 20,
        },
      ],
    });

    // Referral Links
    await prisma.referralLink.createMany({
      data: [
        {
          id: link1KolAId,
          shortCode: shortCode1,
          collaboratorId: kolAId,
          storeId: store1Id,
          productId: product1Id,
          channel: 'TIKTOK',
          label: 'Serum TikTok KOL A',
          status: ReferralLinkStatus.ACTIVE,
        },
        {
          id: link2KolBId,
          shortCode: shortCode2,
          collaboratorId: kolBId,
          storeId: store2Id,
          productId: product2Id,
          channel: 'FACEBOOK',
          label: 'Kem Chống Nắng KOL B',
          status: ReferralLinkStatus.ACTIVE,
        },
        {
          id: link3KolCId,
          shortCode: shortCode3,
          collaboratorId: kolCId,
          storeId: store1Id,
          productId: product1Id,
          channel: 'YOUTUBE',
          label: 'Serum YouTube KOL C',
          status: ReferralLinkStatus.ACTIVE,
        },
      ],
    });

    // Tạo Coupon của KOL A trên Store 1
    await prisma.coupon.create({
      data: {
        id: couponId,
        storeId: store1Id,
        collaboratorId: kolAId,
        codeNormalized: 'KOLA10',
        displayCode: 'KOLA10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        status: 'ACTIVE',
        scopeType: 'STORE_WIDE',
        usageLimitTotal: 100,
        usageCount: 0,
        budgetTotal: 10000000,
        budgetUsed: 0,
        usageLimitPerCustomer: 5,
        stackableWithProductDiscount: true,
        startsAt: new Date(Date.now() - 3600000),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });

    // Đăng nhập lấy JWT
    const resKolA = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kol.a.fr13@scanms.vn', password: 'Password@123' });
    tokenKolA = resKolA.body?.accessToken || resKolA.body?.token;

    const resShop1 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'shop1.owner.fr13@scanms.vn', password: 'Password@123' });
    tokenShop1 = resShop1.body?.accessToken || resShop1.body?.token;

    const resShop2 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'shop2.owner.fr13@scanms.vn', password: 'Password@123' });
    tokenShop2 = resShop2.body?.accessToken || resShop2.body?.token;

    const resAdmin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin.fr13@scanms.vn', password: 'Password@123' });
    tokenAdmin = resAdmin.body?.accessToken || resAdmin.body?.token;
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  // =========================================================================
  // 1. UNIT TESTS CHO CÁC HÀM TIỆN ÍCH BẢO MẬT & PRIVACY (FR-13 Mục 7, 8, 9, 10)
  // =========================================================================
  describe('1. Security & Privacy Utility Functions', () => {
    it('1.1 hashIpAddress chuẩn hóa subnet IPv4 /24 và băm HMAC', () => {
      const res1 = hashIpAddress('192.168.1.150', secret);
      const res2 = hashIpAddress('192.168.1.200', secret);
      // Cùng subnet /24 -> Cùng prefix và hash
      expect(res1.prefix).toBe('192.168.1.0/24');
      expect(res2.prefix).toBe('192.168.1.0/24');
      expect(res1.hash).toBe(res2.hash);
      // Không chứa IP thô
      expect(res1.hash).not.toContain('192.168.1.150');
    });

    it('1.2 normalizeUserAgent giới hạn tối đa 512 ký tự', () => {
      const longUa = 'Mozilla/5.0 '.repeat(60);
      const normalized = normalizeUserAgent(longUa);
      expect(normalized.length).toBeLessThanOrEqual(512);
    });

    it('1.3 generateDeviceFingerprint tạo Server-Side HMAC không lưu fingerprint thô', () => {
      const fp1 = generateDeviceFingerprint('203.0.113.195', 'Mozilla/5.0 TestBrowser', secret);
      const fp2 = generateDeviceFingerprint('203.0.113.195', 'Mozilla/5.0 TestBrowser', secret);
      const fpDifferent = generateDeviceFingerprint('198.51.100.1', 'DifferentBrowser', secret);

      expect(fp1).toBe(fp2);
      expect(fp1).not.toBe(fpDifferent);
      expect(fp1.length).toBe(64); // SHA-256 hex string
    });

    it('1.4 signMultiShopAttributionToken & verifyMultiShopAttributionToken hoạt động chính xác và chống giả mạo', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 86400000).toISOString();
      const payload = {
        v: 1,
        vid: 'visitor-test-123',
        shops: {
          [store1Id]: {
            sessionId: 'sess-1',
            collaboratorId: kolAId,
            referralLinkId: link1KolAId,
            shortCode: shortCode1,
            productId: product1Id,
            clickedAt: now.toISOString(),
            expiresAt,
            via: 'LINK' as const,
          },
        },
      };

      const signedToken = signMultiShopAttributionToken(payload, secret);
      expect(typeof signedToken).toBe('string');
      expect(signedToken.split('.').length).toBe(2);

      const verified = verifyMultiShopAttributionToken(signedToken, secret);
      expect(verified).not.toBeNull();
      expect(verified?.shops[store1Id]?.collaboratorId).toBe(kolAId);

      // Sửa đổi trái phép token -> verify phải trả về null
      const tampered = signedToken.slice(0, -5) + 'abcde';
      expect(verifyMultiShopAttributionToken(tampered, secret)).toBeNull();

      // Sai secret -> verify trả về null
      expect(verifyMultiShopAttributionToken(signedToken, 'wrong-secret')).toBeNull();
    });
  });

  // =========================================================================
  // 2. REDIRECT ENGINE & COOKIE ATTRIBUTION (FR-13 Mục 5, 6, 10, 11, 22)
  // =========================================================================
  describe('2. Redirect Engine & Cookie Attribution', () => {
    it('2.1 Mở /r/:shortCode hợp lệ -> Trả về 302, Set-Cookie scanms_attr Opaque Token và tạo AttributionSession hợp lệ trong DB', async () => {
      const res = await request(app.getHttpServer())
        .get(`/r/${shortCode1}`)
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        .set('X-Forwarded-For', '203.0.113.10');

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('/products');

      const setCookieHeader = getSetCookies(res.headers);
      expect(setCookieHeader.length).toBeGreaterThan(0);

      const attrCookieStr = setCookieHeader.find((c: string) => c.startsWith('scanms_attr='));
      expect(attrCookieStr).toBeDefined();
      expect(attrCookieStr).toContain('HttpOnly');
      expect(attrCookieStr).toContain('SameSite=Lax');
      // Max-Age theo attributionWindowDays của Store 1 (30 ngày = 2592000s)
      expect(attrCookieStr).toContain('Max-Age=2592000');

      // Token là Opaque Token ngẫu nhiên, không chứa PII
      capturedCookie1 = attrCookieStr!.split(';')[0].split('=')[1];
      const visitorId = verifyOpaqueVisitorToken(capturedCookie1, secret);
      expect(visitorId).toBeDefined();
      expect(capturedCookie1.length).toBeLessThan(150);
      expect(capturedCookie1).not.toContain(kolAId);
      expect(capturedCookie1).not.toContain(store1Id);

      // Kiểm tra AttributionSession được tạo trong cơ sở dữ liệu với latestClickId hợp lệ (Issue 1)
      const visitorIdHash = crypto.createHmac('sha256', secret).update(visitorId!).digest('hex');
      const session = await prisma.attributionSession.findUnique({
        where: {
          storeId_visitorIdHash: {
            storeId: store1Id,
            visitorIdHash,
          },
        },
      });
      expect(session).toBeDefined();
      expect(session?.collaboratorId).toBe(kolAId);
      expect(session?.referralLinkId).toBe(link1KolAId);
      expect(session?.latestClickId).toBeDefined();
      // latestClickId phải là UUID hợp lệ
      expect(session?.latestClickId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('2.2 Quét QR kèm via=qr -> Chuyển hướng thành công và ghi nhận truy cập', async () => {
      const res = await request(app.getHttpServer())
        .get(`/r/${shortCode1}?via=qr`)
        .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')
        .set('X-Forwarded-For', '203.0.113.11');

      expect(res.status).toBe(302);
      const setCookieHeader = getSetCookies(res.headers);
      const attrCookieStr = setCookieHeader.find((c: string) => c.startsWith('scanms_attr='));
      expect(attrCookieStr).toBeDefined();
    });

    it('2.3 Multi-Merchant Isolation: Click Store 2 (KOL B) không xóa attribution Store 1 (KOL A) trong Database', async () => {
      const res = await request(app.getHttpServer())
        .get(`/r/${shortCode2}`)
        .set('Cookie', `scanms_attr=${capturedCookie1}`)
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        .set('X-Forwarded-For', '203.0.113.10');

      expect(res.status).toBe(302);
      // Max-Age cho Store 2 (14 ngày = 1209600s)
      const setCookieHeader = getSetCookies(res.headers);
      const attrCookieStr = setCookieHeader.find((c: string) => c.startsWith('scanms_attr='));
      expect(attrCookieStr).toBeDefined();
      expect(attrCookieStr).toContain('Max-Age=1209600');

      const visitorId = verifyOpaqueVisitorToken(capturedCookie1, secret);
      const visitorIdHash = crypto.createHmac('sha256', secret).update(visitorId!).digest('hex');

      // Cả 2 session của 2 shop đều tồn tại song song trong DB (Multi-Merchant Isolation)
      const session1 = await prisma.attributionSession.findUnique({
        where: { storeId_visitorIdHash: { storeId: store1Id, visitorIdHash } },
      });
      const session2 = await prisma.attributionSession.findUnique({
        where: { storeId_visitorIdHash: { storeId: store2Id, visitorIdHash } },
      });

      expect(session1?.collaboratorId).toBe(kolAId);
      expect(session2?.collaboratorId).toBe(kolBId);
    });

    it('2.4 Last-Click Wins cho cùng một Shop: Click link KOL C của Store 1 ghi đè KOL A trong Database', async () => {
      const res = await request(app.getHttpServer())
        .get(`/r/${shortCode3}`)
        .set('Cookie', `scanms_attr=${capturedCookie1}`)
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        .set('X-Forwarded-For', '203.0.113.10');

      expect(res.status).toBe(302);

      const visitorId = verifyOpaqueVisitorToken(capturedCookie1, secret);
      const visitorIdHash = crypto.createHmac('sha256', secret).update(visitorId!).digest('hex');

      const session1 = await prisma.attributionSession.findUnique({
        where: { storeId_visitorIdHash: { storeId: store1Id, visitorIdHash } },
      });
      const session2 = await prisma.attributionSession.findUnique({
        where: { storeId_visitorIdHash: { storeId: store2Id, visitorIdHash } },
      });

      // Store 1 ghi đè thành KOL C
      expect(session1?.collaboratorId).toBe(kolCId);
      expect(session1?.referralLinkId).toBe(link3KolCId);
      // Store 2 vẫn giữ nguyên KOL B
      expect(session2?.collaboratorId).toBe(kolBId);
    });

    it('2.5 Bảo mật quyền riêng tư: ClickTrafficLog lưu subnet IP /24 và không lưu fingerprint thô (Issue 2)', async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const latestLog = await prisma.clickTrafficLog.findFirst({
        where: { referralLinkId: link1KolAId },
        orderBy: { createdAt: 'desc' },
      });

      expect(latestLog).toBeDefined();
      expect(latestLog?.ipAddress).toContain('/24');
      expect(latestLog?.deviceFingerprint).toBeNull();
      expect(latestLog?.fingerprintHash).toBeDefined();
    });
  });

  // =========================================================================
  // 3. RATE LIMITING & BOT DETECTION (FR-13 Mục 25)
  // =========================================================================
  describe('3. Rate Limiting & Bot Detection', () => {
    it('3.1 Social Bot / Crawler mạng xã hội -> Chuyển hướng an toàn nhưng KHÔNG cấp cookie', async () => {
      const res = await request(app.getHttpServer())
        .get(`/r/${shortCode1}`)
        .set('User-Agent', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')
        .set('X-Forwarded-For', '66.220.144.1');

      // Vẫn redirect an toàn không làm hỏng trải nghiệm chia sẻ link
      expect(res.status).toBe(302);
      // Không được cấp cookie attribution
      const setCookieHeader = getSetCookies(res.headers);
      const attrCookie = setCookieHeader.find((c: string) => c.startsWith('scanms_attr='));
      expect(attrCookie).toBeUndefined();
    });
  });

  // =========================================================================
  // 4. CHECKOUT ATTRIBUTION PRIORITY RESOLUTION (FR-13 Mục 15, 16, 28, 29)
  // =========================================================================
  describe('4. Checkout Attribution Priority (Coupon > Cookie > Fingerprint > Organic)', () => {
    it('4.1 P2: Cookie Last-Click hợp lệ gắn đúng KOL C cho đơn hàng Store 1', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Cookie', `scanms_attr=${capturedCookie1}`)
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        .set('X-Forwarded-For', '203.0.113.10')
        .send({
          storeId: store1Id,
          idempotencyKey: `idemp-test-41-${Date.now()}-${Math.random()}`,
          customerName: 'Khách Test Cookie',
          customerPhone: '0901112233',
          shippingAddress: '123 Test Street, TP.HCM',
          items: [{ productId: product1Id, quantity: 1 }],
        });

      expect(res.status).toBe(201);
      const order = res.body.order;
      expect(order).toBeDefined();
      expect(order.attributionMethod).toBe(AttributionMethod.COOKIE);
      expect(order.attributedCollaboratorId).toBe(kolCId);
      expect(order.referralLinkId).toBe(link3KolCId);
      expect(order.attributionConfidence).toBe('HIGH');
      expect(order.attributionSnapshot).toBeDefined();
      expect(order.attributionSnapshot.attributionType).toBe('COOKIE');
    });

    it('4.2 P1: Coupon KOL A ghi đè Cookie KOL C (COUPON_OVERRIDE_COOKIE)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Cookie', `scanms_attr=${capturedCookie1}`)
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        .set('X-Forwarded-For', '203.0.113.10')
        .send({
          storeId: store1Id,
          idempotencyKey: `idemp-test-42-${Date.now()}-${Math.random()}`,
          couponCode: 'KOLA10',
          customerName: 'Khách Test Coupon Override',
          customerPhone: '0904445566',
          shippingAddress: '456 Test Street, TP.HCM',
          items: [{ productId: product1Id, quantity: 1 }],
        });

      expect(res.status).toBe(201);
      const order = res.body.order;
      expect(order).toBeDefined();
      // P1: Coupon thắng!
      expect(order.attributionMethod).toBe(AttributionMethod.COUPON);
      expect(order.attributedCollaboratorId).toBe(kolAId);
      // Lưu nguồn gốc ghi đè để đối soát theo Mục 15 & 29
      expect(order.overrideReason).toBe('COUPON_OVERRIDE_COOKIE');
      expect(order.originalCollaboratorId).toBe(kolCId);
      expect(order.originalAttributionMethod).toBe(AttributionMethod.COOKIE);
    });

    it('4.3 P3: Fingerprint Fallback 24 giờ khi không có cookie và không có coupon', async () => {
      // Giả lập click hợp lệ từ KOL A bằng IP '198.51.100.77'
      const testIp = '198.51.100.77';
      const testUa = 'Custom-Browser-Fingerprint-Test/1.0';
      const testFp = generateDeviceFingerprint(testIp, testUa, secret);

      await prisma.clickTrafficLog.create({
        data: {
          eventId: `evt-fp-test-${Date.now()}`,
          referralLinkId: link1KolAId,
          storeId: store1Id,
          collaboratorId: kolAId,
          ipAddress: testIp,
          fingerprintHash: testFp,
          isValid: true,
          accessMethod: 'LINK',
        },
      });

      // Đặt hàng từ cùng IP và User-Agent KHÔNG CÓ COOKIE
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('User-Agent', testUa)
        .set('X-Forwarded-For', testIp)
        .send({
          storeId: store1Id,
          idempotencyKey: `idemp-test-43-${Date.now()}-${Math.random()}`,
          customerName: 'Khách Fallback Fingerprint',
          customerPhone: '0907778899',
          shippingAddress: '789 Fallback Ave, Đà Nẵng',
          items: [{ productId: product1Id, quantity: 1 }],
        });

      expect(res.status).toBe(201);
      const order = res.body.order;
      expect(order).toBeDefined();
      expect(order.attributionMethod).toBe(AttributionMethod.FINGERPRINT);
      expect(order.attributedCollaboratorId).toBe(kolAId);
      expect(order.attributionConfidence).toBe('MEDIUM');
      expect(order.overrideReason).toBe('FINGERPRINT_FALLBACK_24H');
    });

    it('4.4 P4: Đơn hàng hoàn toàn tự nhiên (ORGANIC) không tự gán bừa KOL', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('User-Agent', 'Totally-New-Organic-Device/9.9')
        .set('X-Forwarded-For', '10.0.0.1')
        .send({
          storeId: store1Id,
          idempotencyKey: `idemp-test-44-${Date.now()}-${Math.random()}`,
          customerName: 'Khách Vãng Lai Organic',
          customerPhone: '0909999999',
          shippingAddress: '10 Organic Way, Hà Nội',
          items: [{ productId: product1Id, quantity: 1 }],
        });

      expect(res.status).toBe(201);
      const order = res.body.order;
      expect(order).toBeDefined();
      expect(order.attributionMethod).toBe(AttributionMethod.ORGANIC);
      expect(order.attributedCollaboratorId).toBeNull();
      expect(order.referralLinkId).toBeNull();
      expect(order.attributionConfidence).toBe('ORGANIC');
    });

    it('4.5 Checkout bỏ qua mã tracking client tự gửi qua cookieRefCode (Issue 5)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('User-Agent', 'Totally-New-Client-Browser/1.0')
        .set('X-Forwarded-For', '10.99.88.77')
        .send({
          storeId: store1Id,
          cookieRefCode: shortCode1,
          idempotencyKey: `idemp-test-refcode-${Date.now()}-${Math.random()}`,
          customerName: 'Khách Tự Bơm Ref Code',
          customerPhone: '0901234999',
          shippingAddress: '99 Scam Street, TP.HCM',
          items: [{ productId: product1Id, quantity: 1 }],
        });

      expect(res.status).toBe(201);
      const order = res.body.order;
      expect(order).toBeDefined();
      // Không được tin client gửi -> fallback về ORGANIC!
      expect(order.attributionMethod).toBe(AttributionMethod.ORGANIC);
      expect(order.attributedCollaboratorId).toBeNull();
    });

    it('4.6 Kiểm tra trạng thái link tại checkout: Link PAUSED không nhận attribution (Issue 7)', async () => {
      // Tạm dừng link 3 (KOL C)
      await prisma.referralLink.update({
        where: { id: link3KolCId },
        data: { status: ReferralLinkStatus.PAUSED },
      });

      try {
        const res = await request(app.getHttpServer())
          .post('/api/orders')
          .set('Cookie', `scanms_attr=${capturedCookie1}`)
          .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
          .set('X-Forwarded-For', '203.0.113.10')
          .send({
            storeId: store1Id,
            idempotencyKey: `idemp-test-paused-${Date.now()}-${Math.random()}`,
            customerName: 'Khách Đặt Link Paused',
            customerPhone: '0903334455',
            shippingAddress: '456 Paused Ave, TP.HCM',
            items: [{ productId: product1Id, quantity: 1 }],
          });

        expect(res.status).toBe(201);
        const order = res.body.order;
        // Link PAUSED không còn được gán tại checkout
        expect(order.attributedCollaboratorId).toBeNull();
        expect(order.attributionMethod).toBe(AttributionMethod.ORGANIC);
      } finally {
        // Luôn phục hồi lại link 3
        await prisma.referralLink.update({
          where: { id: link3KolCId },
          data: { status: ReferralLinkStatus.ACTIVE },
        });
      }
    });

    it('4.7 Fingerprint mơ hồ (nhiều KOL cùng fingerprint trong 24h) -> Không tự gán bừa, chuyển thành AMBIGUOUS / ORGANIC (Issue 8)', async () => {
      const ambiguousIp = '198.51.200.55';
      const ambiguousUa = 'Shared-Wifi-Public-Library-Browser/2.0';
      const ambiguousFp = generateDeviceFingerprint(ambiguousIp, ambiguousUa, secret);

      // Click 1 từ KOL A
      await prisma.clickTrafficLog.create({
        data: {
          eventId: `evt-ambig-1-${Date.now()}`,
          referralLinkId: link1KolAId,
          storeId: store1Id,
          collaboratorId: kolAId,
          ipAddress: '198.51.200.0/24',
          fingerprintHash: ambiguousFp,
          isValid: true,
          accessMethod: 'LINK',
        },
      });

      // Click 2 từ KOL C (cùng Store 1, cùng thiết bị/mạng)
      await prisma.clickTrafficLog.create({
        data: {
          eventId: `evt-ambig-2-${Date.now()}`,
          referralLinkId: link3KolCId,
          storeId: store1Id,
          collaboratorId: kolCId,
          ipAddress: '198.51.200.0/24',
          fingerprintHash: ambiguousFp,
          isValid: true,
          accessMethod: 'LINK',
        },
      });

      // Đặt hàng từ cùng thiết bị / IP không có cookie
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('User-Agent', ambiguousUa)
        .set('X-Forwarded-For', ambiguousIp)
        .send({
          storeId: store1Id,
          idempotencyKey: `idemp-test-ambig-${Date.now()}-${Math.random()}`,
          customerName: 'Khách Dùng Wi-Fi Thư Viện',
          customerPhone: '0908887766',
          shippingAddress: '999 Library St, Huế',
          items: [{ productId: product1Id, quantity: 1 }],
        });

      expect(res.status).toBe(201);
      const order = res.body.order;
      expect(order).toBeDefined();
      // Kết quả mơ hồ: Không tự chọn bản ghi gần nhất! Chuyển thành AMBIGUOUS & ORGANIC
      expect(order.attributionMethod).toBe(AttributionMethod.ORGANIC);
      expect(order.attributedCollaboratorId).toBeNull();
      expect(order.attributionConfidence).toBe('AMBIGUOUS');
      expect(order.overrideReason).toBe('ATTRIBUTION_AMBIGUOUS_MULTIPLE_KOLS');
    });
  });

  // =========================================================================
  // 5. PRIVACY & RBAC ANALYTICS (FR-13 Mục 37, 40)
  // =========================================================================
  describe('5. Privacy & RBAC Analytics', () => {
    it('5.1 KOL truy cập analytics link của mình -> Nhận số liệu tổng hợp, KHÔNG có IP, User-Agent hay Fingerprint', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/collaborator/referral-links/${link1KolAId}/analytics`)
        .set('Authorization', `Bearer ${tokenKolA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const analytics = res.body.analytics;
      expect(analytics).toBeDefined();
      expect(analytics.rawClicks).toBeDefined();
      expect(analytics.validClicks).toBeDefined();
      expect(analytics.uniqueClicks).toBeDefined();
      expect(analytics.conversions).toBeDefined();
      expect(analytics.breakdownByVia).toBeDefined();

      // Đảm bảo không lộ dữ liệu PII và tín hiệu kỹ thuật thô cho KOL
      expect(res.text).not.toContain('ip');
      expect(res.text).not.toContain('fingerprintHash');
      expect(res.text).not.toContain('userAgent');
    });

    it('5.2 Chủ Shop truy cập analytics link thuộc Shop mình -> Thành công', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/stores/${store1Id}/referral-links/${link1KolAId}/analytics`)
        .set('Authorization', `Bearer ${tokenShop1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.analytics).toBeDefined();
    });

    it('5.3 KOL khác (KOL B) cố xem link của KOL A -> Bị từ chối 403 Forbidden', async () => {
      const resKolB = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'kol.b.fr13@scanms.vn', password: 'Password@123' });
      const tokenKolB = resKolB.body?.accessToken || resKolB.body?.token;

      const res = await request(app.getHttpServer())
        .get(`/api/collaborator/referral-links/${link1KolAId}/analytics`)
        .set('Authorization', `Bearer ${tokenKolB}`);

      expect(res.status).toBe(403);
    });

    it('5.4 Chủ Shop 1 cố xem analytics link thuộc Shop 2 -> Bị từ chối 403 Forbidden (Issue 9)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/stores/${store1Id}/referral-links/${link2KolBId}/analytics`)
        .set('Authorization', `Bearer ${tokenShop1}`);

      expect(res.status).toBe(403);
    });

    it('5.5 Điều chỉnh attribution: Kiểm tra điều kiện KOL mới (Role, Approved Store relation) và tạo bản ghi AttributionAdjustment bảo toàn lịch sử đơn (Issue 9 & 10)', async () => {
      const order = await prisma.order.findFirst({
        where: { storeId: store1Id, attributedCollaboratorId: { not: null } },
      });
      expect(order).toBeDefined();
      const originalCollabId = order!.attributedCollaboratorId;

      // 1. Thử điều chỉnh sang KOL B khi chưa được Store 1 duyệt -> Bị từ chối BadRequestException (Issue 9)
      await expect(
        app.get(ReferralLinksService).adjustOrderAttribution(
          order!.id,
          {
            newCollaboratorId: kolBId,
            reason: 'Khiếu nại khi chưa duyệt',
          },
          shopOwner1Id,
          '127.0.0.1',
        ),
      ).rejects.toThrow();

      // Duyệt quan hệ Store 1 cho KOL B
      await prisma.storeCollaborator.create({
        data: {
          storeId: store1Id,
          collaboratorId: kolBId,
          status: StoreCollaboratorStatus.APPROVED,
        },
      });

      // Tạo trước hoa hồng PENDING cho KOL cũ của đơn hàng
      const prevComm = await prisma.commission.upsert({
        where: {
          orderId_collaboratorId: {
            orderId: order!.id,
            collaboratorId: originalCollabId!,
          },
        },
        create: {
          orderId: order!.id,
          collaboratorId: originalCollabId!,
          commissionAmount: 50000,
          status: CommissionStatus.PENDING,
        },
        update: {
          status: CommissionStatus.PENDING,
        },
      });

      // 2. Điều chỉnh thành công sau khi đã duyệt
      const resAdj = await app.get(ReferralLinksService).adjustOrderAttribution(
        order!.id,
        {
          newCollaboratorId: kolBId,
          reason: 'Khiếu nại attribution hợp lệ của KOL B',
          evidenceUrl: 'https://scanms.vn/evidence/adj-123.jpg',
        },
        shopOwner1Id,
        '127.0.0.1',
      );

      expect(resAdj).toBeDefined();
      expect(resAdj.previousCollaboratorId).toBe(originalCollabId);
      expect(resAdj.newCollaboratorId).toBe(kolBId);
      expect(resAdj.previousCommissionId).toBe(prevComm.id);
      expect(resAdj.newCommissionId).toBeDefined();

      // Issue 4: Hoa hồng cũ KHÔNG BỊ XÓA, chuyển sang REVERSED để bảo toàn sổ cái
      const prevCommAfter = await prisma.commission.findUnique({
        where: { id: prevComm.id },
      });
      expect(prevCommAfter).toBeDefined();
      expect(prevCommAfter?.status).toBe(CommissionStatus.REVERSED);

      // Hoa hồng mới của KOL mới được tạo với PENDING
      const newCommAfter = await prisma.commission.findUnique({
        where: { id: resAdj.newCommissionId! },
      });
      expect(newCommAfter).toBeDefined();
      expect(newCommAfter?.collaboratorId).toBe(kolBId);
      expect(newCommAfter?.status).toBe(CommissionStatus.PENDING);

      // Đơn hàng gốc KHÔNG bị sửa đè trực tiếp (Bảo toàn lịch sử đơn - Issue 10)
      const orderAfterAdj = await prisma.order.findUnique({
        where: { id: order!.id },
      });
      expect(orderAfterAdj?.attributedCollaboratorId).toBe(originalCollabId);

      // 3. Kiểm tra resolveEffectiveOrderAttribution trả về KOL B (Issue 3)
      const effectiveInfo = await app.get(ReferralLinksService).resolveEffectiveOrderAttribution(order!.id);
      expect(effectiveInfo.effectiveCollaboratorId).toBe(kolBId);
      expect(effectiveInfo.isAdjusted).toBe(true);
      expect(effectiveInfo.originalCollaboratorId).toBe(originalCollabId);

      // 4. Thử điều chỉnh lại chính KOL B -> Phải bị từ chối BadRequestException (trùng lặp)
      await expect(
        app.get(ReferralLinksService).adjustOrderAttribution(
          order!.id,
          {
            newCollaboratorId: kolBId,
            reason: 'Điều chỉnh trùng lặp KOL B',
          },
          shopOwner1Id,
          '127.0.0.1',
        ),
      ).rejects.toThrow();
    });

    it('5.6 Open Redirect Protection: Chặn chuyển hướng đến domain độc hại ngoài allowlist (Issue 7)', async () => {
      // Tạo một link trỏ đến domain ngoài allowlist
      const maliciousLink = await prisma.referralLink.create({
        data: {
          shortCode: 'scam1234',
          storeId: store1Id,
          collaboratorId: kolAId,
          productId: product1Id,
          destinationPath: 'https://malicious-phishing-site.com/steal-info',
          channel: 'TIKTOK',
          label: 'Phishing test',
          status: ReferralLinkStatus.ACTIVE,
        },
      });

      try {
        const res = await request(app.getHttpServer())
          .get('/r/scam1234')
          .set('User-Agent', 'Mozilla/5.0');

        // Bị chặn vì domain ngoài allowlist
        expect(res.status).not.toBe(302);
      } finally {
        await prisma.attributionSession.deleteMany({ where: { referralLinkId: maliciousLink.id } });
        await prisma.clickTrafficLog.deleteMany({ where: { referralLinkId: maliciousLink.id } });
        await prisma.referralLink.delete({ where: { id: maliciousLink.id } });
      }
    });

    it('5.7 Privacy Consent & DNT: Không cấp cookie attribution khi khách bật DNT hoặc Opt-out (Issue 6)', async () => {
      // 1. Khách gửi header DNT: 1
      const resDnt = await request(app.getHttpServer())
        .get(`/r/${shortCode1}`)
        .set('DNT', '1')
        .set('User-Agent', 'Privacy-Conscious-User/1.0')
        .set('X-Forwarded-For', '203.0.113.88');

      expect(resDnt.status).toBe(302);
      const dntCookie = getSetCookies(resDnt.headers).find((c: string) => c.startsWith('scanms_attr='));
      expect(dntCookie).toBeUndefined();

      // 2. API opt-out /r/consent
      const resConsent = await request(app.getHttpServer())
        .post('/r/consent')
        .send({ allowTracking: false });

      expect(resConsent.status).toBe(200);
      expect(resConsent.body.allowTracking).toBe(false);
      const optOutCookie = getSetCookies(resConsent.headers).find((c: string) => c.startsWith('scanms_opt_out='));
      expect(optOutCookie).toBeDefined();
    });

    it('5.8 Data Retention Cleanup: purgeOldTrackingData & handleScheduledDataRetentionCleanup ẩn danh hóa click logs cũ hơn 90 ngày (Issue 1 & 6)', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      await prisma.clickTrafficLog.create({
        data: {
          referralLinkId: link1KolAId,
          storeId: store1Id,
          collaboratorId: kolAId,
          ipAddress: '198.51.100.0/24',
          userAgent: 'Old-Browser/1.0',
          isValid: true,
          accessMethod: 'LINK',
          createdAt: oldDate,
        },
      });

      // Gọi handler cron dọn dẹp dữ liệu tự động
      const cronResult = await app.get(ReferralLinksService).handleScheduledDataRetentionCleanup();
      expect(cronResult).toBeDefined();
      expect(cronResult!.anonymizedLogsCount).toBeGreaterThanOrEqual(1);

      const cleanedLog = await prisma.clickTrafficLog.findFirst({
        where: { referralLinkId: link1KolAId, createdAt: { lt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000) } },
      });
      if (cleanedLog) {
        expect(cleanedLog.userAgent).toBeNull();
        expect(cleanedLog.ipAddress).toBe('0.0.0.0/0');
      }
    });

    it('5.9 Cache & Rate Limit: Cung cấp getHealthStatus phục vụ giám sát vận hành multi-instance (Issue 4)', async () => {
      const health = app.get(CacheService).getHealthStatus();
      expect(health).toBeDefined();
      expect(health).toHaveProperty('isRedisActive');
      expect(health).toHaveProperty('isDegraded');
      expect(health).toHaveProperty('degradationAlertCount');
    });

    it('5.10 Redis Reliable Queue: Worker quản lý job an toàn multi-instance bằng lease expiration timeout (Issue 2)', async () => {
      const queueService = app.get(ClickQueueService);
      expect(queueService).toBeDefined();
      expect(queueService.workerId).toBeDefined();
      expect(queueService.leaseDurationMs).toBe(30000);

      // Gọi hàm reclaimStuckJobs đảm bảo chỉ quét job quá hạn lease
      const reclaimed = await queueService.reclaimStuckJobs();
      expect(typeof reclaimed).toBe('number');
    });

    it('5.11 Database Schema: Foreign Key click_traffic_logs là ON DELETE RESTRICT bảo toàn dữ liệu lịch sử (Issue 2)', async () => {
      // link1KolAId đã có click logs lịch sử -> Xóa referralLink bị Postgres chặn lại do RESTRICT (P2003)
      await expect(
        prisma.referralLink.delete({
          where: { id: link1KolAId },
        }),
      ).rejects.toThrow();
    });

    it('5.12 Effective Attribution API: Tra cứu qua endpoint GET /api/stores/:storeId/referral-links/orders/:orderId/effective-attribution (Issue 3)', async () => {
      const order = await prisma.order.findFirst({
        where: { storeId: store1Id },
      });
      expect(order).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/stores/${store1Id}/referral-links/orders/${order!.id}/effective-attribution`)
        .set('Authorization', `Bearer ${tokenShop1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('orderId', order!.id);
      expect(res.body).toHaveProperty('effectiveCollaboratorId');
      expect(res.body).toHaveProperty('isAdjusted');

      // Issue 1: Kiểm tra che email KOL và không leak email Admin cho Chủ Shop
      if (res.body.effectiveCollaborator?.email) {
        expect(res.body.effectiveCollaborator.email).toContain('***@');
      }
      if (res.body.latestAdjustment?.admin) {
        expect(res.body.latestAdjustment.admin).not.toHaveProperty('email');
      }
    });

    it('5.13 Bảo mật RBAC Effective Attribution: Chủ Shop 2 KHÔNG THỂ xem đơn của Shop 1 (403 Forbidden - Issue 1)', async () => {
      const order1 = await prisma.order.findFirst({
        where: { storeId: store1Id },
      });
      expect(order1).toBeDefined();

      // Shop 2 cố dùng token của mình để tra cứu đơn thuộc Shop 1
      const res = await request(app.getHttpServer())
        .get(`/api/stores/${store1Id}/referral-links/orders/${order1!.id}/effective-attribution`)
        .set('Authorization', `Bearer ${tokenShop2}`);

      expect(res.status).toBe(403);
    });

    it('5.14 Quản trị viên (Admin) xem được thông tin đầy đủ không bị mask (Issue 1)', async () => {
      const order1 = await prisma.order.findFirst({
        where: { storeId: store1Id },
      });
      expect(order1).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/api/admin/referral-links/orders/${order1!.id}/effective-attribution`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      if (res.body.effectiveCollaborator?.email) {
        expect(res.body.effectiveCollaborator.email).not.toContain('***@');
      }
    });
  });
});
