import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcryptjs';
import {
  UserRole,
  CampaignParticipantStatus,
} from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/database/prisma.service';
import { ConfigService } from '@nestjs/config';

const cookieParser = require('cookie-parser');

jest.setTimeout(90_000);

describe('FR-27 — Exclusive VIP Campaign Chat Invitations E2E Suite (Real PostgreSQL)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const shopOwnerId = '11111111-2727-4000-8000-000000000001';
  const otherShopId = '22222222-2727-4000-8000-000000000002';
  const kolAId = '33333333-2727-4000-8000-000000000003';
  const kolBId = '44444444-2727-4000-8000-000000000004';
  const storeId = '55555555-2727-4000-8000-000000000005';
  const otherStoreId = '66666666-2727-4000-8000-000000000006';

  let tokenShop: string;
  let tokenOtherShop: string;
  let tokenKolA: string;
  let tokenKolB: string;

  let createdCampaignId: string;
  let participantKolAId: string;
  let participantKolBId: string;
  let conversationKolAId: string;

  async function cleanup() {
    try {
      const testEmails = [
        'shop-fr27@scanms.test',
        'othershop-fr27@scanms.test',
        'kola-fr27@scanms.test',
        'kolb-fr27@scanms.test',
      ];
      const testUserIds = [shopOwnerId, otherShopId, kolAId, kolBId];
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
            { slug: { in: ['fr27-vip-store', 'fr27-other-store'] } },
            { ownerId: { in: allUserIds } },
          ],
        },
        select: { id: true },
      });
      const allStoreIds = Array.from(new Set([...testStoreIds, ...existingStores.map(s => s.id)]));

      // Dọn dẹp bảng quan hệ
      await prisma.auditLog.deleteMany({
        where: { userId: { in: allUserIds } },
      });
      await prisma.notification.deleteMany({
        where: { userId: { in: allUserIds } },
      });
      await prisma.chatMessage.deleteMany({
        where: {
          OR: [
            { senderId: { in: allUserIds } },
            { conversation: { storeId: { in: allStoreIds } } },
          ],
        },
      });
      await prisma.conversation.deleteMany({
        where: {
          OR: [
            { storeId: { in: allStoreIds } },
            { collaboratorId: { in: allUserIds } },
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
      console.warn('FR-27 Cleanup error (ignored):', e);
    }
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = 'fr27-super-secret-jwt-key-2026';
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

    // 1. Tạo tài khoản mẫu (upsert an toàn)
    const testUsers = [
      {
        id: shopOwnerId,
        email: 'shop-fr27@scanms.test',
        fullName: 'Chủ Shop VIP FR27',
        role: UserRole.SHOP_MANAGER,
        phoneNumber: '0901272701',
      },
      {
        id: otherShopId,
        email: 'othershop-fr27@scanms.test',
        fullName: 'Chủ Shop Khác FR27',
        role: UserRole.SHOP_MANAGER,
        phoneNumber: '0901272702',
      },
      {
        id: kolAId,
        email: 'kola-fr27@scanms.test',
        fullName: 'Nguyễn Văn KOL A (Gold Tier)',
        role: UserRole.COLLABORATOR,
        phoneNumber: '0901272703',
      },
      {
        id: kolBId,
        email: 'kolb-fr27@scanms.test',
        fullName: 'Trần Thị KOL B (Diamond Tier)',
        role: UserRole.COLLABORATOR,
        phoneNumber: '0901272704',
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

    // 2. Tạo gian hàng Store (upsert an toàn)
    const testStores = [
      {
        id: storeId,
        ownerId: shopOwnerId,
        name: 'Gian Hàng Mỹ Phẩm Cao Cấp FR27',
        slug: 'fr27-vip-store',
        defaultCommissionRate: 10.0,
        logoUrl: 'https://scanms.vn/logo-fr27.png',
      },
      {
        id: otherStoreId,
        ownerId: otherShopId,
        name: 'Gian Hàng Khác FR27',
        slug: 'fr27-other-store',
        defaultCommissionRate: 8.0,
      },
    ];

    for (const s of testStores) {
      await prisma.store.upsert({
        where: { id: s.id },
        update: s,
        create: s,
      });
    }

    // 3. Tạo profile và liên kết StoreCollaborator
    await prisma.collaboratorProfile.upsert({
      where: { userId: kolAId },
      update: {},
      create: {
        userId: kolAId,
        bankName: 'Vietcombank',
        bankAccountNumber: '9998887771',
        bankAccountName: 'NGUYEN VAN A',
        bio: 'Top 1 Beauty Creator',
      },
    });

    await prisma.collaboratorProfile.upsert({
      where: { userId: kolBId },
      update: {},
      create: {
        userId: kolBId,
        bankName: 'Techcombank',
        bankAccountNumber: '9998887772',
        bankAccountName: 'TRAN THI B',
        bio: 'Fashion Reviewer',
      },
    });

    await prisma.storeCollaborator.upsert({
      where: {
        storeId_collaboratorId: { storeId, collaboratorId: kolAId },
      },
      update: { status: 'APPROVED' },
      create: {
        storeId,
        collaboratorId: kolAId,
        status: 'APPROVED',
      },
    });

    await prisma.storeCollaborator.upsert({
      where: {
        storeId_collaboratorId: { storeId, collaboratorId: kolBId },
      },
      update: { status: 'APPROVED' },
      create: {
        storeId,
        collaboratorId: kolBId,
        status: 'APPROVED',
      },
    });

    // 4. Lấy JWT Token đăng nhập
    const loginShop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'shop-fr27@scanms.test', password: 'Password@123' });
    tokenShop = loginShop.body.data?.accessToken || loginShop.body.accessToken;

    const loginOtherShop = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'othershop-fr27@scanms.test', password: 'Password@123' });
    tokenOtherShop = loginOtherShop.body.data?.accessToken || loginOtherShop.body.accessToken;

    const loginKolA = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kola-fr27@scanms.test', password: 'Password@123' });
    tokenKolA = loginKolA.body.data?.accessToken || loginKolA.body.accessToken;

    const loginKolB = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'kolb-fr27@scanms.test', password: 'Password@123' });
    tokenKolB = loginKolB.body.data?.accessToken || loginKolB.body.accessToken;
  });

  afterAll(async () => {
    await cleanup();
    if (app) {
      await app.close();
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 1: Shop tạo Chiến Dịch VIP mới (+7.5% hoa hồng thưởng)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 1 [POST /api/campaigns] — Shop tạo thành công chiến dịch tiếp thị VIP kèm hoa hồng thưởng', async () => {
    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const res = await request(app.getHttpServer())
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        name: 'Siêu Sale Mùa Thu - VIP Gala 2026',
        bonusCommissionRate: 7.5,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Siêu Sale Mùa Thu - VIP Gala 2026');
    expect(Number(res.body.bonusCommissionRate)).toBe(7.5);
    expect(res.body.storeId).toBe(storeId);
    expect(res.body.isActive).toBe(true);

    createdCampaignId = res.body.id;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 2: Ngày kết thúc trước ngày bắt đầu -> 400 Bad Request
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 2 [POST /api/campaigns] — Từ chối tạo chiến dịch nếu ngày kết thúc trước ngày bắt đầu (400)', async () => {
    const startDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const res = await request(app.getHttpServer())
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        name: 'Chiến Dịch Lỗi Ngày',
        bonusCommissionRate: 5.0,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

    expect(res.status).toBe(400);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 3: Phân quyền vai trò (KOL không được tạo Campaign)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 3 [POST /api/campaigns] — Chặn tài khoản KOL không được quyền tạo chiến dịch (403 Forbidden)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${tokenKolA}`)
      .send({
        name: 'Chiến Dịch Hacker',
        bonusCommissionRate: 10.0,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(res.status).toBe(403);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 4: Shop lấy danh sách chiến dịch của mình
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 4 [GET /api/campaigns/shop] — Shop lấy danh sách chiến dịch kèm thông tin gian hàng', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/campaigns/shop')
      .set('Authorization', `Bearer ${tokenShop}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].id).toBe(createdCampaignId);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 5: Shop gửi Thẻ Mời VIP qua Chat tới KOL A
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 5 [POST /api/campaigns/:id/invite] — Shop gửi Thẻ Mời VIP vào khung Chat của KOL A', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/campaigns/${createdCampaignId}/invite`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        collaboratorId: kolAId,
        personalMessage: 'Chào bạn Nhật, Shop trân trọng mời bạn tham gia với thưởng +7.5% nhé!',
      });

    expect(res.status).toBe(200);
    expect(res.body.participant).toBeDefined();
    expect(res.body.participant.status).toBe('INVITED');
    expect(res.body.chatMessage).toBeDefined();

    participantKolAId = res.body.participant.id;
    conversationKolAId = res.body.chatMessage.conversationId;

    // Kiểm tra cấu trúc JSON Card Payload
    const card = JSON.parse(res.body.chatMessage.messageText);
    expect(card.type).toBe('CAMPAIGN_INVITE');
    expect(card.participantId).toBe(participantKolAId);
    expect(card.campaignId).toBe(createdCampaignId);
    expect(Number(card.bonusCommissionRate)).toBe(7.5);
    expect(card.storeName).toBe('Gian Hàng Mỹ Phẩm Cao Cấp FR27');
    expect(card.personalMessage).toContain('thưởng +7.5%');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 6: Shop gửi mời từ cuộc hội thoại Chat (inviteInChat)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 6 [POST /api/campaigns/chat/:conversationId/invite] — Shop gửi Thẻ Mời VIP trực tiếp từ cửa sổ Chat', async () => {
    // Tạo campaign 2
    const c2 = await prisma.campaign.create({
      data: {
        storeId,
        name: 'Chiến Dịch Mỹ Phẩm Siêu Cấp',
        bonusCommissionRate: 10.0,
        startDate: new Date(),
        endDate: new Date(Date.now() + 864000000),
        isActive: true,
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/api/campaigns/chat/${conversationKolAId}/invite`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        campaignId: c2.id,
        personalMessage: 'Mời bạn thêm chiến dịch thứ 2!',
      });

    expect(res.status).toBe(200);
    expect(res.body.participant.status).toBe('INVITED');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 7: Chống mời trùng lặp (Double Invite Protection)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 7 [POST /api/campaigns/:id/invite] — Chống gửi thẻ mời trùng lặp khi đang chờ phản hồi (400)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/campaigns/${createdCampaignId}/invite`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({
        collaboratorId: kolAId,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('KOL này đã nhận được thẻ mời VIP trước đó');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 8: Shop khác không có quyền mời vào Campaign của Shop này
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 8 [POST /api/campaigns/:id/invite] — Chặn Shop khác gửi thẻ mời chiến dịch không thuộc quyền sở hữu (404)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/campaigns/${createdCampaignId}/invite`)
      .set('Authorization', `Bearer ${tokenOtherShop}`)
      .send({
        collaboratorId: kolBId,
      });

    expect(res.status).toBe(404);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 9: KOL A xem danh sách lời mời của mình
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 9 [GET /api/campaigns/my-invitations] — KOL A lấy danh sách lời mời VIP nhận được', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/campaigns/my-invitations')
      .set('Authorization', `Bearer ${tokenKolA}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const myInvite = res.body.find((inv: any) => inv.id === participantKolAId);
    expect(myInvite).toBeDefined();
    expect(myInvite.status).toBe('INVITED');
    expect(myInvite.campaign.store.name).toBe('Gian Hàng Mỹ Phẩm Cao Cấp FR27');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 10: KOL A chấp nhận Thẻ Mời VIP (Accept Invitation)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 10 [PATCH /api/campaigns/invitations/:id/accept] — KOL A chấp nhận Thẻ Mời VIP thành công', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/campaigns/invitations/${participantKolAId}/accept`)
      .set('Authorization', `Bearer ${tokenKolA}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACCEPTED');
    expect(res.body.joinedAt).toBeDefined();

    // Kiểm tra tin nhắn phản hồi CAMPAIGN_ACCEPTED được lưu trong Chat
    const msgs = await prisma.chatMessage.findMany({
      where: { conversationId: conversationKolAId },
      orderBy: { createdAt: 'desc' },
    });

    const acceptedMsg = msgs.find(m => {
      try {
        const parsed = JSON.parse(m.messageText);
        return parsed.type === 'CAMPAIGN_ACCEPTED';
      } catch {
        return false;
      }
    });

    expect(acceptedMsg).toBeDefined();
    expect(acceptedMsg?.senderId).toBe(kolAId);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 11: Chống chấp nhận lại lần 2 (Double Accept Protection)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 11 [PATCH /api/campaigns/invitations/:id/accept] — Chống chấp nhận lại chiến dịch đã tham gia (400)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/campaigns/invitations/${participantKolAId}/accept`)
      .set('Authorization', `Bearer ${tokenKolA}`)
      .send({});

    expect(res.status).toBe(400);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 12: Bảo mật — KOL B không thể chấp nhận thay cho KOL A
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 12 [PATCH /api/campaigns/invitations/:id/accept] — Chặn KOL khác chấp nhận thay (403 Forbidden)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/campaigns/invitations/${participantKolAId}/accept`)
      .set('Authorization', `Bearer ${tokenKolB}`)
      .send({});

    expect(res.status).toBe(403);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 13: KOL B từ chối Thẻ Mời VIP (Reject Invitation)
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 13 [PATCH /api/campaigns/invitations/:id/reject] — KOL B từ chối lời mời chiến dịch', async () => {
    // Shop gửi mời KOL B
    const inviteRes = await request(app.getHttpServer())
      .post(`/api/campaigns/${createdCampaignId}/invite`)
      .set('Authorization', `Bearer ${tokenShop}`)
      .send({ collaboratorId: kolBId });

    participantKolBId = inviteRes.body.participant.id;

    // KOL B từ chối
    const rejectRes = await request(app.getHttpServer())
      .patch(`/api/campaigns/invitations/${participantKolBId}/reject`)
      .set('Authorization', `Bearer ${tokenKolB}`)
      .send({});

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('REJECTED');

    // Kiểm tra tin nhắn phản hồi CAMPAIGN_REJECTED trong DB
    const conv = await prisma.conversation.findFirst({
      where: { storeId, collaboratorId: kolBId },
    });
    expect(conv).toBeDefined();

    const rejectMsg = await prisma.chatMessage.findFirst({
      where: {
        conversationId: conv!.id,
        senderId: kolBId,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(rejectMsg).toBeDefined();
    const parsed = JSON.parse(rejectMsg!.messageText);
    expect(parsed.type).toBe('CAMPAIGN_REJECTED');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 14: Không thể từ chối chiến dịch đã Accepted
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 14 [PATCH /api/campaigns/invitations/:id/reject] — Chặn từ chối chiến dịch đã Accepted trước đó (400)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/campaigns/invitations/${participantKolAId}/reject`)
      .set('Authorization', `Bearer ${tokenKolA}`)
      .send({});

    expect(res.status).toBe(400);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 15: Kiểm tra AuditLog & Notification hệ thống
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 15 [AUDIT & NOTIFY] — Ghi nhận đầy đủ AuditLog và Notification cho cả 2 bên', async () => {
    const auditLogs = await prisma.auditLog.findMany({
      where: { userId: { in: [shopOwnerId, kolAId, kolBId] } },
    });

    const actions = auditLogs.map(a => a.action);
    expect(actions).toContain('CAMPAIGN_CREATED');
    expect(actions).toContain('CAMPAIGN_INVITE_SENT');
    expect(actions).toContain('CAMPAIGN_INVITE_ACCEPTED');
    expect(actions).toContain('CAMPAIGN_INVITE_REJECTED');

    const notifications = await prisma.notification.findMany({
      where: { userId: { in: [shopOwnerId, kolAId, kolBId] } },
    });

    const notifTypes = notifications.map(n => n.type);
    expect(notifTypes).toContain('CAMPAIGN_INVITE');
    expect(notifTypes).toContain('CAMPAIGN_ACCEPTED');
    expect(notifTypes).toContain('CAMPAIGN_REJECTED');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Test 16: Public lấy chi tiết chiến dịch
  // ══════════════════════════════════════════════════════════════════════════
  it('Test 16 [GET /api/campaigns/:id] — Xem chi tiết chiến dịch và danh sách thành viên tham gia', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/campaigns/${createdCampaignId}`)
      .set('Authorization', `Bearer ${tokenKolA}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Siêu Sale Mùa Thu - VIP Gala 2026');
    expect(res.body.store.name).toBe('Gian Hàng Mỹ Phẩm Cao Cấp FR27');
    expect(res.body.participants).toBeDefined();
    expect(res.body.participants.length).toBeGreaterThanOrEqual(1);
  });
});
