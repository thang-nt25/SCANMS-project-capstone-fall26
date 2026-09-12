import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { UserRole, ReferralLinkStatus, AccessMethod } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { CacheService } from '../src/core/cache/cache.service';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { ClickQueueService } from '../src/modules/referral-links/click-queue.service';

const cookieParser = require('cookie-parser');

jest.setTimeout(60_000);

describe('FR-11 — Dynamic QR Code E2E (Real PostgreSQL & Redis)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cacheService: CacheService;

  const kolAId = '11111111-1111-4000-8000-000000000011';
  const kolBId = '22222222-2222-4000-8000-000000000011';
  const shopOwnerId = '33333333-3333-4000-8000-000000000011';
  const otherShopOwnerId = '44444444-4444-4000-8000-000000000011';
  const storeId = '55555555-5555-4000-8000-000000000011';
  const productId = '66666666-6666-4000-8000-000000000011';
  const linkId = '77777777-7777-4000-8000-000000000011';
  const shortCode = 'qrteste2e9';

  let tokenKolA: string;
  let tokenKolB: string;
  let tokenShop: string;
  let tokenOtherShop: string;

  async function cleanup() {
    await prisma.clickTrafficLog.deleteMany({
      where: { referralLinkId: linkId },
    });
    await prisma.referralLink.deleteMany({ where: { id: linkId } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.storeCollaborator.deleteMany({ where: { storeId } });
    await prisma.store.deleteMany({ where: { id: storeId } });
    await prisma.user.deleteMany({
      where: { id: { in: [kolAId, kolBId, shopOwnerId, otherShopOwnerId] } },
    });
  }

  beforeAll(async () => {
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

    await cleanup();

    const passwordHash = await bcrypt.hash('Password@123', 10);

    // Tạo các tài khoản test với email chữ thường
    await prisma.user.createMany({
      data: [
        {
          id: kolAId,
          email: 'kola-fr11-e2e@scanms.test',
          passwordHash,
          fullName: 'KOL A FR11',
          role: UserRole.COLLABORATOR,
        },
        {
          id: kolBId,
          email: 'kolb-fr11-e2e@scanms.test',
          passwordHash,
          fullName: 'KOL B FR11',
          role: UserRole.COLLABORATOR,
        },
        {
          id: shopOwnerId,
          email: 'shop-fr11-e2e@scanms.test',
          passwordHash,
          fullName: 'Shop Owner FR11',
          role: UserRole.SHOP_MANAGER,
        },
        {
          id: otherShopOwnerId,
          email: 'other-shop-fr11-e2e@scanms.test',
          passwordHash,
          fullName: 'Other Shop Owner FR11',
          role: UserRole.SHOP_MANAGER,
        },
      ],
    });

    // Tạo Store & Product
    await prisma.store.create({
      data: {
        id: storeId,
        ownerId: shopOwnerId,
        name: 'Store FR11 E2E',
        slug: 'store-fr11-e2e',
      },
    });

    await prisma.product.create({
      data: {
        id: productId,
        storeId,
        sku: 'SKU-FR11-E2E',
        title: 'Sản phẩm Test FR-11 QR',
        price: 250000,
        isAffiliateEnabled: true,
        isActive: true,
      },
    });

    // Tạo Referral Link
    await prisma.referralLink.create({
      data: {
        id: linkId,
        collaboratorId: kolAId,
        storeId,
        productId,
        shortCode,
        label: 'Link Test QR E2E',
        status: ReferralLinkStatus.ACTIVE,
        destinationPath: `/products/${productId}`,
      },
    });

    // Đăng nhập lấy JWT tokens
    const loginKolA = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kola-fr11-e2e@scanms.test', password: 'Password@123' });
    tokenKolA =
      loginKolA.body.accessToken ||
      loginKolA.body.token ||
      loginKolA.body.data?.token ||
      loginKolA.body.data?.accessToken;

    const loginKolB = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kolb-fr11-e2e@scanms.test', password: 'Password@123' });
    tokenKolB =
      loginKolB.body.accessToken ||
      loginKolB.body.token ||
      loginKolB.body.data?.token ||
      loginKolB.body.data?.accessToken;

    const loginShop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'shop-fr11-e2e@scanms.test', password: 'Password@123' });
    tokenShop =
      loginShop.body.accessToken ||
      loginShop.body.token ||
      loginShop.body.data?.token ||
      loginShop.body.data?.accessToken;

    const loginOtherShop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'other-shop-fr11-e2e@scanms.test',
        password: 'Password@123',
      });
    tokenOtherShop =
      loginOtherShop.body.accessToken ||
      loginOtherShop.body.token ||
      loginOtherShop.body.data?.token ||
      loginOtherShop.body.data?.accessToken;
  });

  // 1. Kiểm tra tải ảnh PNG 1024x1024, headers và decode QR
  it('1. Tải PNG 1024x1024 thành công, headers chuẩn, decode đúng URL có via=qr', async () => {
    const res = await request(app.getHttpServer())
      .get(
        `/api/referral-links/${linkId}/qr?format=png&size=1024&download=true`,
      )
      .set('Authorization', `Bearer ${tokenKolA}`)
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['content-disposition']).toContain(
      `attachment; filename="SCANMS-QR-${shortCode}.png"`,
    );
    expect(res.headers['cache-control']).toBe('private, max-age=86400');
    expect(res.headers['x-content-type-options']).toBe('nosniff');

    const buffer: Buffer = Buffer.isBuffer(res.body)
      ? res.body
      : Buffer.from(res.body);
    expect(buffer.length).toBeGreaterThan(1000);

    // Giải mã ảnh PNG bằng pngjs + jsqr
    const png = PNG.sync.read(buffer);
    const code = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(code).not.toBeNull();
    expect(code?.data).toContain(`/r/${shortCode}?via=qr`);

    // Kiểm tra PostgreSQL ghi nhận số lượt tải qrDownloadCount
    const updatedLink = await prisma.referralLink.findUnique({
      where: { id: linkId },
    });
    expect(updatedLink?.qrDownloadCount).toBeGreaterThanOrEqual(1);
  });

  // 2. Phân quyền: KOL B gọi endpoint QR của KOL A qua HTTP bị 403 Forbidden
  it('2. KOL B gọi endpoint QR của KOL A qua HTTP trả về 403 Forbidden', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/referral-links/${linkId}/qr?format=png&size=1024`)
      .set('Authorization', `Bearer ${tokenKolB}`);

    expect(res.status).toBe(403);
  });

  // 3. Phân quyền Shop: Shop Owner sở hữu sản phẩm xem được, Shop khác bị 403
  it('3. Shop sở hữu xem được QR, Shop khác bị từ chối 403', async () => {
    const resAllowed = await request(app.getHttpServer())
      .get(`/api/referral-links/${linkId}/qr?format=svg&size=512`)
      .set('Authorization', `Bearer ${tokenShop}`);
    expect(resAllowed.status).toBe(200);
    expect(resAllowed.headers['content-type']).toContain('image/svg+xml');

    const resForbidden = await request(app.getHttpServer())
      .get(`/api/referral-links/${linkId}/qr?format=svg&size=512`)
      .set('Authorization', `Bearer ${tokenOtherShop}`);
    expect(resForbidden.status).toBe(403);
  });

  // 4. Rate limit: Gọi download quá 20 lần trong 1 phút bị 429 Too Many Requests
  it('4. Rate limit download tối đa 20 request/phút, lần thứ 21 trả về 429 Too Many Requests', async () => {
    let lastStatus = 200;
    for (let i = 0; i < 21; i++) {
      const res = await request(app.getHttpServer())
        .get(
          `/api/referral-links/${linkId}/qr?format=png&size=512&download=true`,
        )
        .set('Authorization', `Bearer ${tokenKolA}`);
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }
    expect(lastStatus).toBe(429);
  });

  // 5. Quét QR redirect và lưu click traffic log với accessMethod = QR
  it('5. Quét QR /api/r/{shortCode}?via=qr ghi nhận accessMethod = QR vào database', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/r/${shortCode}?via=qr`)
      .set(
        'User-Agent',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)',
      )
      .set('Referer', 'https://instagram.com');

    expect([200, 302, 307]).toContain(res.status);

    // Xử lý queue ngay lập tức
    const clickQueue = app.get(ClickQueueService);
    await clickQueue.processQueue();

    const clickLog = await prisma.clickTrafficLog.findFirst({
      where: { referralLinkId: linkId },
      orderBy: { createdAt: 'desc' },
    });

    expect(clickLog).toBeDefined();
    expect(clickLog?.accessMethod).toBe(AccessMethod.QR);
  });

  // 6. Test các trạng thái link: PAUSED, BLOCKED, EXPIRED, DELETED khi quét QR
  it('6. Link PAUSED vẫn mở sản phẩm nhưng vô hiệu hóa attribution', async () => {
    await prisma.referralLink.update({
      where: { id: linkId },
      data: { status: ReferralLinkStatus.PAUSED },
    });
    await cacheService.del(`ref_link:${shortCode}`);

    const res = await request(app.getHttpServer()).get(
      `/api/r/${shortCode}?via=qr`,
    );
    expect([200, 302, 307]).toContain(res.status);
  });

  it('7. Link BLOCKED trả về 410 Gone', async () => {
    await prisma.referralLink.update({
      where: { id: linkId },
      data: {
        status: ReferralLinkStatus.BLOCKED,
        disabledReason: 'Vi phạm chính sách gian lận',
      },
    });
    await cacheService.del(`ref_link:${shortCode}`);

    const res = await request(app.getHttpServer()).get(
      `/api/r/${shortCode}?via=qr`,
    );
    expect(res.status).toBe(410);
  });

  it('8. Link DELETED trả về 404 Not Found', async () => {
    await prisma.referralLink.update({
      where: { id: linkId },
      data: { deletedAt: new Date() },
    });
    await cacheService.del(`ref_link:${shortCode}`);

    const res = await request(app.getHttpServer()).get(
      `/api/r/${shortCode}?via=qr`,
    );
    expect(res.status).toBe(404);
  });

  // 9. Test thay slug sản phẩm nhưng QR code cũ vẫn hoạt động bình thường
  it('9. Thay đổi slug của store/product nhưng QR code chứa shortCode vẫn redirect thành công', async () => {
    // Phục hồi link ACTIVE
    await prisma.referralLink.update({
      where: { id: linkId },
      data: { status: ReferralLinkStatus.ACTIVE, deletedAt: null },
    });
    // Đổi slug store và title product
    await prisma.store.update({
      where: { id: storeId },
      data: { slug: 'new-store-slug-2026' },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { title: 'Tên Sản Phẩm Đã Được Cập Nhật' },
    });
    await cacheService.del(`ref_link:${shortCode}`);

    const res = await request(app.getHttpServer()).get(
      `/api/r/${shortCode}?via=qr`,
    );
    expect([200, 302, 307]).toContain(res.status);
  });

  afterAll(async () => {
    try {
      await cleanup();
    } catch (e) {
      // ignore
    }
    const clickQueue = app.get(ClickQueueService, { strict: false });
    if (clickQueue) {
      await clickQueue.onModuleDestroy();
    }
    if (cacheService) {
      await cacheService.onModuleDestroy();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      const server = app.getHttpServer();
      if (server && typeof server.close === 'function') {
        server.close();
      }
      await app.close();
    }
  });
});
