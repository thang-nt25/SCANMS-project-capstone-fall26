import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import {
  UserRole,
  ReferralLinkStatus,
  StoreCollaboratorStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { CacheService } from '../src/core/cache/cache.service';
import { ClickQueueService } from '../src/modules/referral-links/click-queue.service';

const cookieParser = require('cookie-parser');

function getSetCookies(headers: Record<string, any>): string[] {
  const c = headers['set-cookie'];
  if (!c) return [];
  return Array.isArray(c) ? c : [c];
}

jest.setTimeout(90_000);

describe('FR-14 — Anti Click Spam via Redis Rate Limit E2E Test Suite (Production Grade)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cacheService: CacheService;
  let clickQueueService: ClickQueueService;

  // Test identifiers
  const kolId = '14141414-1414-4000-8000-000000000001';
  const kol2Id = '14141414-1414-4000-8000-000000000002';
  const shopOwnerId = '14141414-1414-4000-8000-000000000003';
  const storeId = '14141414-1414-4000-8000-000000000004';
  const productId = '14141414-1414-4000-8000-000000000005';
  const linkId1 = '14141414-1414-4000-8000-000000000006';
  const linkId2 = '14141414-1414-4000-8000-000000000007';

  const shortCode1 = 'fr14sc01';
  const shortCode2 = 'fr14sc02';
  const testStoreSlug = 'sora-skin-fr14';
  const testEmails = [
    'kol.fr14@scanms.vn',
    'kol2.fr14@scanms.vn',
    'shop.fr14@scanms.vn',
  ];
  const testUserIds = [kolId, kol2Id, shopOwnerId];
  const testShortCodes = [shortCode1, shortCode2];

  async function cleanup() {
    try {
      if (clickQueueService) {
        await clickQueueService.waitUntilIdle().catch(() => {});
      }
      // 1. Tìm tất cả user IDs liên quan (theo ID hoặc Email)
      const existingUsers = await prisma.user.findMany({
        where: {
          OR: [
            { id: { in: testUserIds } },
            { email: { in: testEmails } },
          ],
        },
        select: { id: true },
      });
      const allUserIds = Array.from(new Set([...testUserIds, ...existingUsers.map((u) => u.id)]));

      // 2. Tìm tất cả store IDs liên quan (theo ID, slug, hoặc ownerId)
      const existingStores = await prisma.store.findMany({
        where: {
          OR: [
            { id: storeId },
            { slug: testStoreSlug },
            { ownerId: { in: allUserIds } },
          ],
        },
        select: { id: true },
      });
      const allStoreIds = Array.from(new Set([storeId, ...existingStores.map((s) => s.id)]));

      // 3. Tìm tất cả referral link IDs liên quan (theo ID, shortCode, storeId, hoặc collaboratorId)
      const existingLinks = await prisma.referralLink.findMany({
        where: {
          OR: [
            { id: { in: [linkId1, linkId2] } },
            { shortCode: { in: testShortCodes } },
            { storeId: { in: allStoreIds } },
            { collaboratorId: { in: allUserIds } },
          ],
        },
        select: { id: true },
      });
      const allLinkIds = Array.from(new Set([linkId1, linkId2, ...existingLinks.map((l) => l.id)]));

      // 4. Gỡ foreign key latest_click_id trong attribution_sessions để tránh FK cycle constraint
      if (allStoreIds.length > 0 || allLinkIds.length > 0) {
        const storeInSql = allStoreIds.map((id) => `'${id}'`).join(',');
        const linkInSql = allLinkIds.map((id) => `'${id}'`).join(',');
        const conds: string[] = [];
        if (storeInSql) conds.push(`store_id IN (${storeInSql})`);
        if (linkInSql) conds.push(`referral_link_id IN (${linkInSql})`);

        if (conds.length > 0) {
          await prisma.$executeRawUnsafe(
            `UPDATE attribution_sessions SET latest_click_id = NULL WHERE ${conds.join(' OR ')}`,
          );
        }
      }

      // 5. Xóa AttributionSession
      await prisma.attributionSession.deleteMany({
        where: {
          OR: [
            { storeId: { in: allStoreIds } },
            { referralLinkId: { in: allLinkIds } },
            { collaboratorId: { in: allUserIds } },
          ],
        },
      });

      // 6. Xóa ClickTrafficLog triệt để cả theo referralLinkId, shortCode, storeId, collaboratorId
      await prisma.$executeRawUnsafe(`
        DELETE FROM click_traffic_logs
        WHERE referral_link_id IN (
          SELECT id FROM referral_links 
          WHERE short_code IN ('${shortCode1}', '${shortCode2}')
             OR id IN ('${linkId1}', '${linkId2}')
        )
        OR store_id = '${storeId}'
        OR collaborator_id IN ('${kolId}', '${kol2Id}')
      `);

      await prisma.clickTrafficLog.deleteMany({
        where: {
          OR: [
            { referralLinkId: { in: allLinkIds } },
            { referralLink: { shortCode: { in: testShortCodes } } },
            { storeId: { in: allStoreIds } },
            { collaboratorId: { in: allUserIds } },
          ],
        },
      });

      // 7. Xóa ReferralLink (theo cả id và shortCode)
      await prisma.referralLink.deleteMany({
        where: {
          OR: [
            { id: { in: allLinkIds } },
            { shortCode: { in: testShortCodes } },
          ],
        },
      });

      // 8. Xóa Product
      await prisma.product.deleteMany({
        where: {
          OR: [
            { id: productId },
            { sku: 'SKU-FR14-01' },
            { storeId: { in: allStoreIds } },
          ],
        },
      });

      // 9. Xóa StoreCollaborator
      await prisma.storeCollaborator.deleteMany({
        where: {
          OR: [
            { storeId: { in: allStoreIds } },
            { collaboratorId: { in: allUserIds } },
          ],
        },
      });

      // 10. Xóa Store (theo id hoặc slug)
      await prisma.store.deleteMany({
        where: {
          OR: [
            { id: { in: allStoreIds } },
            { slug: testStoreSlug },
          ],
        },
      });

      // 11. Xóa CollaboratorProfile
      await prisma.collaboratorProfile.deleteMany({
        where: { userId: { in: allUserIds } },
      });

      // 12. Xóa Wallet
      await prisma.wallet.deleteMany({
        where: { collaboratorId: { in: allUserIds } },
      });

      // 13. Xóa User (theo cả id và email)
      await prisma.user.deleteMany({
        where: {
          OR: [
            { id: { in: allUserIds } },
            { email: { in: testEmails } },
          ],
        },
      });
    } catch (err: any) {
      console.error('[E2E CLEANUP ERROR] Dọn dẹp dữ liệu thất bại:', {
        code: err?.code,
        meta: err?.meta,
        message: err?.message,
      });
      throw err;
    }
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'fr14-super-secret-jwt-key-for-testing-123456';
    process.env.TRUST_PROXY = 'true'; // Bật để test reverse proxy IP qua X-Forwarded-For
    process.env.REDIS_HOST = '127.0.0.1';
    process.env.REDIS_PORT = '6379';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api', {
      exclude: [
        'r/:shortCode',
        'api/r/:shortCode',
        'r/rate-limit/health',
        'api/referral-links/rate-limit/health',
      ],
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
    clickQueueService = app.get(ClickQueueService);

    await cleanup();

    try {
      // 1. Seed Users
      const passwordHash = await bcrypt.hash('Password@123', 10);
      await prisma.user.createMany({
        data: [
          {
            id: kolId,
            email: 'kol.fr14@scanms.vn',
            passwordHash,
            role: UserRole.COLLABORATOR,
            fullName: 'KOL Test FR14',
            isActive: true,
          },
          {
            id: kol2Id,
            email: 'kol2.fr14@scanms.vn',
            passwordHash,
            role: UserRole.COLLABORATOR,
            fullName: 'KOL 2 Test FR14',
            isActive: true,
          },
          {
            id: shopOwnerId,
            email: 'shop.fr14@scanms.vn',
            passwordHash,
            role: UserRole.SHOP_MANAGER,
            fullName: 'Shop Owner FR14',
            isActive: true,
          },
        ],
      });

      await prisma.collaboratorProfile.createMany({
        data: [
          {
            userId: kolId,
            bankName: 'Vietcombank',
            bankAccountNumber: '1234567890',
            bankAccountName: 'KOL FR14',
            totalOrdersReferred: 0,
          },
          {
            userId: kol2Id,
            bankName: 'Techcombank',
            bankAccountNumber: '0987654321',
            bankAccountName: 'KOL 2 FR14',
            totalOrdersReferred: 0,
          },
        ],
      });

      await prisma.wallet.createMany({
        data: [
          { collaboratorId: kolId, pendingBalance: 0, availableBalance: 0 },
          { collaboratorId: kol2Id, pendingBalance: 0, availableBalance: 0 },
        ],
      });

      // 2. Seed Store & Collaborator
      await prisma.store.create({
        data: {
          id: storeId,
          ownerId: shopOwnerId,
          name: 'Sora Skin FR14',
          slug: testStoreSlug,
          attributionWindowDays: 30,
        },
      });

      await prisma.storeCollaborator.createMany({
        data: [
          { storeId, collaboratorId: kolId, status: StoreCollaboratorStatus.APPROVED },
          { storeId, collaboratorId: kol2Id, status: StoreCollaboratorStatus.APPROVED },
        ],
      });

      // 3. Seed Product
      await prisma.product.create({
        data: {
          id: productId,
          storeId,
          sku: 'SKU-FR14-01',
          title: 'Kem Dưỡng Chống Lão Hóa Sora Skin',
          price: 450000,
          originalPrice: 500000,
          stockQuantity: 100,
          isActive: true,
          isAffiliateEnabled: true,
          isDeleted: false,
          customCommissionRate: 15,
        },
      });

      // 4. Seed Referral Links
      await prisma.referralLink.createMany({
        data: [
          {
            id: linkId1,
            collaboratorId: kolId,
            storeId,
            productId,
            shortCode: shortCode1,
            destinationPath: '/products/kem-duong-sora-skin',
            channel: 'TIKTOK',
            label: 'Kem Dưỡng KOL 1',
            status: ReferralLinkStatus.ACTIVE,
            totalClicks: 0,
            uniqueClicks: 0,
          },
          {
            id: linkId2,
            collaboratorId: kol2Id,
            storeId,
            productId,
            shortCode: shortCode2,
            destinationPath: '/products/kem-duong-sora-skin',
            channel: 'FACEBOOK',
            label: 'Kem Dưỡng KOL 2',
            status: ReferralLinkStatus.ACTIVE,
            totalClicks: 0,
            uniqueClicks: 0,
          },
        ],
      });
    } catch (err: any) {
      console.error('[E2E SEED ERROR] Khởi tạo dữ liệu seed thất bại:', {
        code: err?.code,
        meta: err?.meta,
        message: err?.message,
      });
      throw err;
    }
  });

  afterAll(async () => {
    delete process.env.TRUST_PROXY;
    if (clickQueueService) {
      await clickQueueService.waitUntilIdle().catch(() => {});
    }
    const redis = cacheService?.getRedisClient();
    if (redis) {
      await redis
        .del(
          'scanms:click_queue:pending',
          'scanms:click_queue:processing_zset',
          'scanms:click_queue:dlq',
        )
        .catch(() => {});
    }
    try {
      await cleanup();
    } catch (err: any) {
      console.error('[E2E AFTER_ALL ERROR] cleanup failed:', {
        code: err?.code,
        meta: err?.meta,
        message: err?.message,
      });
    }
    if (app) {
      await app.close();
    }
  });

  describe('0. Real Redis Verification (Point 1 & 6)', () => {
    it('should be running on REAL Redis in E2E environment (not degraded RAM)', () => {
      expect(cacheService.isRedisActive()).toBe(true);
      const health = cacheService.getHealthStatus();
      expect(health.backend).toBe('redis');
      expect(health.status).toBe('ok');
      expect(health.isDegraded).toBe(false);
      expect(health.rateLimiter).toBe('redis_lua_sliding_window_zset');
    });
  });

  describe('1. Core Threshold: 10 clicks/sec/IP (Specification Item 5, 12, 13, 15)', () => {
    const testIp = '198.51.100.77';

    it('should allow first 10 clicks in 1-second window and rate-limit the 11th click with 302 and no cookie', async () => {
      // Point 6: Sử dụng getRedisClient() chính xác để dọn dẹp key Redis trước test
      const redisClient = cacheService.getRedisClient();
      if (redisClient) {
        const keys = await redisClient.keys('*198.51.100.77*');
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      }

      // Bắn đồng thời 11 requests
      const requests = Array.from({ length: 11 }).map(() =>
        request(app.getHttpServer())
          .get(`/r/${shortCode1}`)
          .set('X-Forwarded-For', testIp)
          .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/1.0'),
      );

      const responses = await Promise.all(requests);

      // ALL 11 requests must return 302 redirect (user experience is never broken)
      responses.forEach((res) => {
        expect(res.status).toBe(302);
        expect(res.header.location).toContain('/products/kem-duong-sora-skin');
      });

      // Filter responses that received attribution cookie
      const responsesWithCookie = responses.filter((res) => {
        const cookies = getSetCookies(res.headers);
        return cookies.some((c) => c.includes('scanms_attr='));
      });

      // Exactly 10 requests receive attribution cookie
      expect(responsesWithCookie.length).toBe(10);

      // Exactly 1 response is rate limited (no cookie issued)
      const responsesWithoutCookie = responses.filter((res) => {
        const cookies = getSetCookies(res.headers);
        return !cookies.some((c) => c.includes('scanms_attr='));
      });
      expect(responsesWithoutCookie.length).toBe(1);

      // Wait up to 5 seconds for async click queue to persist logs to DB
      let logs: any[] = [];
      for (let i = 0; i < 25; i++) {
        await clickQueueService.processQueue();
        logs = await prisma.clickTrafficLog.findMany({
          where: { referralLinkId: linkId1 },
        });
        if (logs.length >= 11) break;
        await new Promise((r) => setTimeout(r, 200));
      }

      // Check DB logs: valid vs rate-limited
      const validLogs = logs.filter((l) => l.isValid);
      const rateLimitedLogs = logs.filter((l) => !l.isValid && l.riskReason?.includes('CLICK_RATE_LIMITED'));

      expect(validLogs.length).toBe(10);
      expect(rateLimitedLogs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. IP Isolation: Independent limits per IP (Specification Item 4 & 35)', () => {
    it('should allow requests from a different IP even when the first IP is rate-limited', async () => {
      const anotherIp = '203.0.113.88';

      const res = await request(app.getHttpServer())
        .get(`/r/${shortCode1}`)
        .set('X-Forwarded-For', anotherIp)
        .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/2.0');

      expect(res.status).toBe(302);
      const cookies = getSetCookies(res.headers);
      const hasAttrCookie = cookies.some((c) => c.includes('scanms_attr='));
      expect(hasAttrCookie).toBe(true);
    });
  });

  describe('3. Concurrency Burst Protection: Atomic Lua Script (Specification Item 7 & 35)', () => {
    it('should atomically allow at most 10 requests when 20 requests hit simultaneously in Redis', async () => {
      const burstIp = '192.0.2.99';

      const requests = Array.from({ length: 20 }).map(() =>
        request(app.getHttpServer())
          .get(`/r/${shortCode1}`)
          .set('X-Forwarded-For', burstIp)
          .set('User-Agent', 'Mozilla/5.0 ConcurrencyBot/1.0'),
      );

      const responses = await Promise.all(requests);

      // All 20 must redirect 302
      responses.forEach((res) => {
        expect(res.status).toBe(302);
      });

      // Count responses with attribution cookie
      const responsesWithCookie = responses.filter((res) => {
        const cookies = getSetCookies(res.headers);
        return cookies.some((c) => c.includes('scanms_attr='));
      });

      // Lua script ensures exactly 10 requests get through
      expect(responsesWithCookie.length).toBe(10);

      // And exactly 10 requests are rate-limited
      const responsesWithoutCookie = responses.filter((res) => {
        const cookies = getSetCookies(res.headers);
        return !cookies.some((c) => c.includes('scanms_attr='));
      });
      expect(responsesWithoutCookie.length).toBe(10);
    });
  });

  describe('4. Link & QR Share Same Quota (Specification Item 17)', () => {
    it('should consume the same quota when switching between standard link and QR via=qr', async () => {
      const sharedIp = '198.51.100.123';

      // 10 requests mixed between regular and via=qr
      const requests = Array.from({ length: 11 }).map((_, i) => {
        const query = i % 2 === 0 ? '?via=qr' : '';
        return request(app.getHttpServer())
          .get(`/r/${shortCode1}${query}`)
          .set('X-Forwarded-For', sharedIp)
          .set('User-Agent', 'Mozilla/5.0 Mobile/1.0');
      });

      const responses = await Promise.all(requests);

      // All 11 redirect 302
      responses.forEach((res) => {
        expect(res.status).toBe(302);
      });

      // Exactly 10 have cookie, 1 is rate limited
      const withCookie = responses.filter((r) => getSetCookies(r.headers).some((c) => c.includes('scanms_attr=')));
      const withoutCookie = responses.filter((r) => !getSetCookies(r.headers).some((c) => c.includes('scanms_attr=')));

      expect(withCookie.length).toBe(10);
      expect(withoutCookie.length).toBe(1);
    });
  });

  describe('5. Preservation of Existing Last-Click Attribution (Point 7 & Specification Item 14)', () => {
    it('should NOT overwrite existing valid Last-Click attribution when a subsequent click is rate-limited', async () => {
      const visitorIp = '203.0.113.200';

      // Bước 1: Khách hàng click hợp lệ link của KOL 1
      const res1 = await request(app.getHttpServer())
        .get(`/r/${shortCode1}`)
        .set('X-Forwarded-For', visitorIp)
        .set('User-Agent', 'Mozilla/5.0 ValidShopper/1.0');

      expect(res1.status).toBe(302);
      const cookies1 = getSetCookies(res1.headers);
      const attrCookieHeader = cookies1.find((c) => c.includes('scanms_attr='));
      expect(attrCookieHeader).toBeDefined();
      const cookieValue = attrCookieHeader!.split(';')[0];

      // Xác minh trong DB attribution session thuộc về KOL 1
      const sessionBefore = await prisma.attributionSession.findFirst({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
      });
      expect(sessionBefore?.collaboratorId).toBe(kolId); // KOL 1

      // Bước 2: Dùng hết quota còn lại của IP (9 requests nữa) trong cùng giây
      for (let i = 2; i <= 10; i++) {
        await request(app.getHttpServer())
          .get(`/r/${shortCode1}`)
          .set('X-Forwarded-For', visitorIp)
          .set('Cookie', [cookieValue]);
      }

      // Bước 3: Bây giờ gửi click thứ 11 của KOL 2 từ cùng IP (BỊ RATE LIMITED)
      const resKOL2Spam = await request(app.getHttpServer())
        .get(`/r/${shortCode2}`)
        .set('X-Forwarded-For', visitorIp)
        .set('Cookie', [cookieValue]);

      expect(resKOL2Spam.status).toBe(302);
      // Không được cấp cookie cho KOL 2
      const cookiesSpam = getSetCookies(resKOL2Spam.headers);
      expect(cookiesSpam.some((c) => c.includes('scanms_attr='))).toBe(false);

      // Bước 4 (Point 7): KIỂM TRA NGHIÊM NGẶT: Attribution session trong DB TUYỆT ĐỐI VẪN PHẢI LÀ KOL 1, KHÔNG BỊ GHI ĐÈ BỞI KOL 2!
      const sessionAfter = await prisma.attributionSession.findFirst({
        where: { storeId },
        orderBy: { updatedAt: 'desc' },
      });
      expect(sessionAfter).toBeDefined();
      expect(sessionAfter?.collaboratorId).toBe(kolId); // VẪN LÀ KOL 1!
    });
  });

  describe('6. Rate Limit Health Check Endpoint (Specification Item 23 & 29)', () => {
    it('should return 200 OK with operational metrics from GET /api/referral-links/rate-limit/health', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/referral-links/rate-limit/health',
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('backend');
      expect(res.body.backend).toBe('redis');
      expect(res.body.rateLimiter).toBe('redis_lua_sliding_window_zset');
      expect(res.body).toHaveProperty('thresholds');
      expect(res.body.thresholds).toEqual({
        maxClicksPerSec: 10,
        maxClicksPerMin: 60,
      });
      expect(res.body).toHaveProperty('metrics');
      expect(res.body.metrics).toHaveProperty('allowed');
      expect(res.body.metrics).toHaveProperty('blockedSec');
      expect(res.body.metrics).toHaveProperty('blockedMin');
      expect(res.body.metrics).toHaveProperty('degraded');
    });
  });
});
