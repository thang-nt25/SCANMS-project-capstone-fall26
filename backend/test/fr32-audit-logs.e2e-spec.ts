import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { AuditService } from '../src/modules/audit/audit.service';

describe('FR-32 — Comprehensive Audit Logs & Security Trail E2E Suite (Real PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let auditService: AuditService;

  let adminToken: string;
  let shopToken: string;
  let kolToken: string;

  let adminUserId: string;
  let shopUserId: string;
  let kolUserId: string;

  let sampleAuditLogId: string;
  let sampleEventId: string;

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
    auditService = app.get(AuditService);

    // 1. Tạo Admin test
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin-fr32@scanms.test' },
      update: { role: UserRole.SYSTEM_ADMIN, isActive: true },
      create: {
        email: 'admin-fr32@scanms.test',
        fullName: 'Super Admin Auditor FR32',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJ.W/1pQ0eH6oNge',
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
      },
    });
    adminUserId = adminUser.id;

    // 2. Tạo Shop Manager test
    const shopUser = await prisma.user.upsert({
      where: { email: 'shop-fr32@scanms.test' },
      update: { role: UserRole.SHOP_MANAGER, isActive: true },
      create: {
        email: 'shop-fr32@scanms.test',
        fullName: 'Chủ Shop Sora Skin Test FR32',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJ.W/1pQ0eH6oNge',
        role: UserRole.SHOP_MANAGER,
        isActive: true,
      },
    });
    shopUserId = shopUser.id;

    // 3. Tạo KOL test
    const kolUser = await prisma.user.upsert({
      where: { email: 'kol-fr32@scanms.test' },
      update: { role: UserRole.COLLABORATOR, isActive: true },
      create: {
        email: 'kol-fr32@scanms.test',
        fullName: 'KOL Reviewer Test FR32',
        passwordHash: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6x8ecJ.W/1pQ0eH6oNge',
        role: UserRole.COLLABORATOR,
        isActive: true,
      },
    });
    kolUserId = kolUser.id;

    // 4. Gieo dữ liệu Audit Logs mẫu
    const testLog1 = await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'USER_STATUS_UPDATED',
        ipAddress: '192.168.1.100',
        details: {
          targetUserId: kolUserId,
          previousStatus: 'ACTIVE',
          newStatus: 'LOCKED',
          reason: 'Nghi vấn gian lận lưu lượng',
        },
      },
    });
    sampleAuditLogId = testLog1.id;

    await prisma.auditLog.create({
      data: {
        userId: shopUserId,
        action: 'PAYOUT_APPROVED',
        ipAddress: '192.168.1.101',
        details: {
          payoutId: 'payout-test-123',
          amount: 2500000,
          collaboratorEmail: 'kol-fr32@scanms.test',
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'AI_FRAUD_ACTION_APPLIED',
        ipAddress: '10.0.0.1',
        details: {
          incidentCode: 'INC-2026-TEST',
          action: 'FREEZE_COMMISSION',
          riskScore: 92,
        },
      },
    });

    // 5. Generate JWT Tokens
    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    shopToken = jwtService.sign({
      sub: shopUser.id,
      email: shopUser.email,
      role: shopUser.role,
    });

    kolToken = jwtService.sign({
      sub: kolUser.id,
      email: kolUser.email,
      role: kolUser.role,
    });
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test
    try {
      await prisma.auditLog.deleteMany({
        where: {
          userId: { in: [adminUserId, shopUserId, kolUserId] },
        },
      });
      await prisma.user.deleteMany({
        where: {
          id: { in: [adminUserId, shopUserId, kolUserId] },
        },
      });
    } catch (_) {}

    await app.close();
  });

  // TC01: Phân trang & Cấu trúc danh sách
  it('TC01: [GET /api/audit-logs] — Trả về 200 OK và cấu trúc phân trang hợp lệ', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit-logs?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('items');
    expect(res.body.data).toHaveProperty('pagination');
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.limit).toBe(10);
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(3);
  });

  // TC02: Lọc theo Category
  it('TC02: [GET /api/audit-logs] — Lọc theo Category FINANCIAL thành công', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit-logs?category=FINANCIAL')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const items = res.body.data.items;
    expect(items.length).toBeGreaterThanOrEqual(1);
    items.forEach((item: any) => {
      expect(item.category).toBe('FINANCIAL');
    });
  });

  // TC03: Lọc theo khung thời gian
  it('TC03: [GET /api/audit-logs] — Lọc theo startDate thành công', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app.getHttpServer())
      .get(`/api/audit-logs?startDate=${yesterday}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(3);
  });

  // TC04: Tìm kiếm theo từ khóa
  it('TC04: [GET /api/audit-logs] — Tìm kiếm theo từ khóa IP hoặc Action', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit-logs?keyword=192.168.1.100')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.items[0].ipAddress).toContain('192.168.1.100');
  });

  // TC05: Thống kê KPI Audit Stats
  it('TC05: [GET /api/audit-logs/stats] — Thống kê KPI trả về đầy đủ các chỉ số', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit-logs/stats?timeframe=30d')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const stats = res.body.data;
    expect(stats).toHaveProperty('totalEvents');
    expect(stats).toHaveProperty('eventsToday');
    expect(stats).toHaveProperty('financialEventsCount');
    expect(stats).toHaveProperty('securityEventsCount');
    expect(stats).toHaveProperty('authEventsCount');
    expect(stats).toHaveProperty('categoryBreakdown');
    expect(Array.isArray(stats.categoryBreakdown)).toBe(true);
    expect(stats.totalEvents).toBeGreaterThanOrEqual(3);
  });

  // TC06: Danh mục Action Codes
  it('TC06: [GET /api/audit-logs/actions] — Lấy danh mục action codes kèm metadata', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit-logs/actions')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(10);
    const first = res.body.data[0];
    expect(first).toHaveProperty('code');
    expect(first).toHaveProperty('nameVi');
    expect(first).toHaveProperty('category');
    expect(first).toHaveProperty('severity');
  });

  // TC07: Xem chi tiết 1 bản ghi Audit Log
  it('TC07: [GET /api/audit-logs/:id] — Xem chi tiết 1 bản ghi kiểm toán theo ID', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/audit-logs/${sampleAuditLogId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const log = res.body.data;
    expect(log.id).toBe(sampleAuditLogId);
    expect(log.action).toBe('USER_STATUS_UPDATED');
    expect(log.severity).toBe('CRITICAL');
    expect(log.details).toHaveProperty('newStatus', 'LOCKED');
    expect(log.actor.id).toBe(adminUserId);
  });

  // TC08: Xử lý lỗi 404 khi không tìm thấy Log ID
  it('TC08: [GET /api/audit-logs/:id] — Ném 404 Not Found khi ID không tồn tại', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app.getHttpServer())
      .get(`/api/audit-logs/${nonExistentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    expect(res.body.message).toContain('Không tìm thấy nhật ký kiểm toán');
  });

  // TC09: Xuất báo cáo kiểm toán ra CSV
  it('TC09: [GET /api/audit-logs/export] — Xuất file CSV kiểm toán thành công', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit-logs/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename=');
    expect(res.text).toContain('Mã Log (ID)');
    expect(res.text).toContain('Hành động (Action)');
    expect(res.text).toContain('USER_STATUS_UPDATED');
  });

  // TC10: Quyền hạn SYSTEM_ADMIN truy cập toàn diện
  it('TC10: [RBAC ADMIN] — SYSTEM_ADMIN có quyền truy cập kiểm toán toàn sàn', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // TC11: Quyền hạn SHOP_MANAGER truy cập thành công
  it('TC11: [RBAC SHOP] — SHOP_MANAGER có quyền truy cập nhật ký kiểm toán', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${shopToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  // TC12: Chặn 401 Unauthorized khi thiếu token
  it('TC12: [AUTH 401] — Ném 401 Unauthorized khi không gửi Bearer Token', async () => {
    await request(app.getHttpServer())
      .get('/api/audit-logs')
      .expect(401);
  });

  // TC13: Chặn 403 Forbidden đối với COLLABORATOR
  it('TC13: [RBAC 403] — Ném 403 Forbidden khi KOL/COLLABORATOR cố truy cập', async () => {
    await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${kolToken}`)
      .expect(403);
  });

  // TC14: Dữ liệu Actor được JOIN chính xác
  it('TC14: [DATA INTEGRITY] — Thông tin người thực hiện được JOIN đầy đủ từ User profile', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/audit-logs/${sampleAuditLogId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.actor.name).toBe('Super Admin Auditor FR32');
    expect(res.body.data.actor.email).toBe('admin-fr32@scanms.test');
    expect(res.body.data.actor.role).toBe(UserRole.SYSTEM_ADMIN);
  });

  // TC15: Helper recordAuditLog fail-safe
  it('TC15: [FAIL-SAFE LOGGING] — recordAuditLog ghi nhận thành công bản ghi mới', async () => {
    const created = await auditService.recordAuditLog(
      shopUserId,
      'COMMISSION_RULE_CREATED',
      { ruleName: 'Thưởng Top 1 Doanh Số Tháng', rewardAmount: 5000000 },
      '192.168.1.55',
    );

    expect(created).not.toBeNull();
    expect(created.action).toBe('COMMISSION_RULE_CREATED');
    expect(created.userId).toBe(shopUserId);

    // Dọn dẹp bản ghi phụ
    if (created?.id) {
      await prisma.auditLog.delete({ where: { id: created.id } }).catch(() => {});
    }
  });

  // TC16: Hiệu năng phản hồi API (< 1000ms)
  it('TC16: [PERFORMANCE] — Thời gian phản hồi API tra cứu kiểm toán dưới 1000ms', async () => {
    const start = Date.now();
    await request(app.getHttpServer())
      .get('/api/audit-logs?page=1&limit=20')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000);
  });
});
