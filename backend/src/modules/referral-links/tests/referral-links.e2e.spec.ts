import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const request = require('supertest');
const cookieParser = require('cookie-parser');
import { AppModule } from '../../../app.module';
import { PrismaService } from '../../../core/database/prisma.service';
import { UserRole, ReferralLinkStatus, SocialPlatform } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { TransformInterceptor } from '../../../common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../../../common/filters/http-exception.filter';

jest.setTimeout(120000);

describe('ReferralLinks Full E2E HTTP Test Suite (FR-10)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let shopAToken: string;
  let shopBToken: string;
  let kolAToken: string;
  let kolBToken: string;

  const adminId = 'a1111111-1111-4111-8111-111111111111';
  const shopAOwnerId = 'a2222222-2222-4222-8222-222222222222';
  const shopBOwnerId = 'a3333333-3333-4333-8333-333333333333';
  const storeAId = 'a4444444-4444-4444-8444-444444444444';
  const storeBId = 'a5555555-5555-4555-8555-555555555555';
  const kolAId = 'a6666666-6666-4666-8666-666666666666';
  const kolBId = 'a7777777-7777-4777-8777-777777777777';
  const productAId = 'a8888888-8888-4888-8888-888888888888';

  let createdLinkId: string;
  let createdShortCode: string;
  let attributionCookieHeader: string;

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
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Dọn dẹp dữ liệu cũ nếu có
    await cleanup();

    // 1. Tạo Users & Tokens
    const passwordHash = bcrypt.hashSync('Password@123', 10);

    // Admin
    await prisma.user.create({
      data: {
        id: adminId,
        email: 'e2e_admin@scanms.vn',
        passwordHash,
        fullName: 'E2E System Admin',
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
      },
    });

    // Shop A Owner & Store A
    await prisma.user.create({
      data: {
        id: shopAOwnerId,
        email: 'e2e_shop_a@scanms.vn',
        passwordHash,
        fullName: 'E2E Chủ Shop A',
        role: UserRole.SHOP_MANAGER,
        isActive: true,
      },
    });
    await prisma.store.create({
      data: {
        id: storeAId,
        ownerId: shopAOwnerId,
        name: 'Store A E2E Test',
        slug: 'store-a-e2e',
        defaultCommissionRate: 10,
      },
    });

    // Shop B Owner & Store B
    await prisma.user.create({
      data: {
        id: shopBOwnerId,
        email: 'e2e_shop_b@scanms.vn',
        passwordHash,
        fullName: 'E2E Chủ Shop B',
        role: UserRole.SHOP_MANAGER,
        isActive: true,
      },
    });
    await prisma.store.create({
      data: {
        id: storeBId,
        ownerId: shopBOwnerId,
        name: 'Store B E2E Test',
        slug: 'store-b-e2e',
        defaultCommissionRate: 8,
      },
    });

    // KOL A
    await prisma.user.create({
      data: {
        id: kolAId,
        email: 'e2e_kol_a@scanms.vn',
        passwordHash,
        fullName: 'KOL A E2E',
        role: UserRole.COLLABORATOR,
        isActive: true,
      },
    });

    // KOL B
    await prisma.user.create({
      data: {
        id: kolBId,
        email: 'e2e_kol_b@scanms.vn',
        passwordHash,
        fullName: 'KOL B E2E',
        role: UserRole.COLLABORATOR,
        isActive: true,
      },
    });

    // Duyệt quan hệ KOL A với Store A
    await prisma.storeCollaborator.create({
      data: {
        storeId: storeAId,
        collaboratorId: kolAId,
        status: 'APPROVED',
      },
    });

    // Tạo sản phẩm thuộc Store A
    await prisma.product.create({
      data: {
        id: productAId,
        storeId: storeAId,
        sku: 'E2E-PROD-A',
        title: 'Sản phẩm Test E2E Shop A',
        price: 500000,
        customCommissionRate: 12,
        stockQuantity: 100,
        isActive: true,
        isAffiliateEnabled: true,
      },
    });

    // Đăng nhập HTTP lấy JWT Token thật
    adminToken = await login('e2e_admin@scanms.vn');
    shopAToken = await login('e2e_shop_a@scanms.vn');
    shopBToken = await login('e2e_shop_b@scanms.vn');
    kolAToken = await login('e2e_kol_a@scanms.vn');
    kolBToken = await login('e2e_kol_b@scanms.vn');
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  async function login(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'Password@123' })
      .expect(200);

    return res.body.data?.accessToken || res.body.accessToken;
  }

  async function cleanup() {
    try {
      await prisma.attributionAdjustment.deleteMany({
        where: { order: { storeId: { in: [storeAId, storeBId] } } },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { storeId: { in: [storeAId, storeBId] } } },
      });
      await prisma.order.deleteMany({
        where: { storeId: { in: [storeAId, storeBId] } },
      });
      await prisma.clickTrafficLog.deleteMany({
        where: { referralLink: { storeId: { in: [storeAId, storeBId] } } },
      });
      await prisma.attributionSession.deleteMany({
        where: { storeId: { in: [storeAId, storeBId] } },
      });
      await prisma.referralLink.deleteMany({
        where: { storeId: { in: [storeAId, storeBId] } },
      });
      await prisma.product.deleteMany({
        where: { storeId: { in: [storeAId, storeBId] } },
      });
      await prisma.storeCollaborator.deleteMany({
        where: { storeId: { in: [storeAId, storeBId] } },
      });
      await prisma.store.deleteMany({
        where: { id: { in: [storeAId, storeBId] } },
      });
      await prisma.user.deleteMany({
        where: {
          id: {
            in: [adminId, shopAOwnerId, shopBOwnerId, kolAId, kolBId],
          },
        },
      });
    } catch {}
  }

  it('1. [E2E] KOL A tạo link tiếp thị qua HTTP POST /api/referral-links', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/referral-links')
      .set('Authorization', `Bearer ${kolAToken}`)
      .send({
        productId: productAId,
        label: 'Link Tiktok review sản phẩm A',
        channel: SocialPlatform.TIKTOK,
        utmSource: 'tiktok',
        utmMedium: 'bio_link',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.shortCode).toMatch(/^[a-z0-9]{8}$/);
    expect(res.body.data.collaboratorId).toBe(kolAId);
    expect(res.body.data.status).toBe('ACTIVE');

    createdLinkId = res.body.data.id;
    createdShortCode = res.body.data.shortCode;
  });

  it('2. [E2E] Phân quyền đa người dùng: KOL B KHÔNG thể sửa hoặc xóa link của KOL A', async () => {
    // KOL B cố gắng tạm ngừng link của KOL A -> 404 hoặc 403
    await request(app.getHttpServer())
      .patch(`/api/referral-links/${createdLinkId}/toggle-status`)
      .set('Authorization', `Bearer ${kolBToken}`)
      .expect(404);

    // KOL B cố gắng xóa link của KOL A -> 404
    await request(app.getHttpServer())
      .delete(`/api/referral-links/${createdLinkId}`)
      .set('Authorization', `Bearer ${kolBToken}`)
      .expect(404);
  });

  it('3. [E2E] Chuyển hướng HTTP 302 và trả về Cookie Attribution HttpOnly', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/r/${createdShortCode}`)
      .expect(302);

    expect(res.headers.location).toContain(`/products/${productAId}`);

    // Kiểm tra header Set-Cookie có chứa scanms_attribution và HttpOnly
    const cookies: string[] = res.headers['set-cookie'] || [];
    expect(cookies.length).toBeGreaterThan(0);

    const attributionCookie = cookies.find((c) =>
      c.includes('scanms_attribution='),
    );
    expect(attributionCookie).toBeDefined();
    expect(attributionCookie).toContain('HttpOnly');
    expect(attributionCookie).toContain('Path=/');

    // Lưu lại cookie để dùng cho bài test checkout tiếp theo
    attributionCookieHeader = attributionCookie!.split(';')[0];
  });

  it('4. [E2E] Shop B KHÔNG thể khóa link của Shop A (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/stores/${storeAId}/referral-links/${createdLinkId}/block`)
      .set('Authorization', `Bearer ${shopBToken}`)
      .send({ reason: 'Shop B cố tình khóa nhầm' })
      .expect(403);
  });

  it('5. [E2E] Chủ Shop A khóa link vi phạm của KOL A kèm lý do bắt buộc', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/stores/${storeAId}/referral-links/${createdLinkId}/block`)
      .set('Authorization', `Bearer ${shopAToken}`)
      .send({ reason: 'Nội dung review sai lệch công dụng sản phẩm' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('BLOCKED');
    expect(res.body.data.disabledReason).toBe(
      'Nội dung review sai lệch công dụng sản phẩm',
    );
  });

  it('6. [E2E] Khi link bị BLOCKED: truy cập HTTP trả về 410 Gone', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/r/${createdShortCode}`)
      .expect(410);

    expect(res.text).toContain('410');
    expect(res.text).toContain('Nội dung review sai lệch công dụng');
  });

  it('7. [E2E] Quản trị viên (Admin) mở khóa link qua HTTP PATCH /api/admin/referral-links/:id/unblock', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/admin/referral-links/${createdLinkId}/unblock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.disabledReason).toBeNull();
  });

  it('8. [E2E] Checkout HTTP tạo đơn hàng thật, đọc Cookie Attribution và Snapshot hoa hồng', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/checkout')
      .set('Cookie', attributionCookieHeader) // Gửi cookie attribution đã nhận từ bước 3
      .send({
        storeId: storeAId,
        customerName: 'Khách hàng E2E Test',
        customerPhone: '0988776655',
        shippingAddress: '123 Đường Test, Quận 1, TP.HCM',
        items: [
          {
            productId: productAId,
            quantity: 2,
            unitPrice: 500000,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const data = res.body.data || res.body;
    expect(data.order).toBeDefined();
    expect(data.order.referralLinkId).toBe(createdLinkId);
    expect(data.attribution.attributed).toBe(true);
    expect(data.attribution.collaboratorId).toBe(kolAId);

    // Kiểm tra dòng OrderItem đã được snapshot hoa hồng chính xác (12% của 1,000,000 = 120,000)
    const orderItem = data.order.orderItems[0];
    expect(orderItem.referralLinkId).toBe(createdLinkId);
    expect(Number(orderItem.appliedCommissionRate)).toBe(12);
    expect(Number(orderItem.calculatedCommissionAmount)).toBe(120000);

    // Kiểm tra totalOrders của ReferralLink đã được tăng 1
    expect(data.order.referralLink.totalOrders).toBe(1);
  });

  it('9. [E2E] Concurrent Requests: Gửi nhiều lượt truy cập đồng thời kiểm tra tính ổn định', async () => {
    const requests = Array.from({ length: 5 }).map(() =>
      request(app.getHttpServer()).get(`/api/r/${createdShortCode}`),
    );

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.status).toBe(302);
    });
  });
});
