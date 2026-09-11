import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ReferralLinksService } from '../referral-links.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';
import {
  UserRole,
  ReferralLinkStatus,
  SocialPlatform,
  CampaignParticipantStatus,
  StoreCollaboratorStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  signAttributionToken,
  verifyAttributionToken,
  escapeHtml,
} from '../utils/short-code.generator';

jest.setTimeout(40000);

describe('ReferralLinks Real PostgreSQL Integration Tests (FR-10)', () => {
  let service: ReferralLinksService;
  let prisma: PrismaService;
  let cacheService: CacheService;

  const testAdminId = '77777777-7777-7777-7777-777777777777';
  const testOwnerId = '66666666-6666-6666-6666-666666666666';
  const testStoreId = '55555555-5555-5555-5555-555555555555';
  const testKolId = '44444444-4444-4444-4444-444444444444';
  const testProductId = '33333333-3333-3333-3333-333333333333';
  const testCampaignId = '22222222-2222-2222-2222-222222222222';
  const testOrderId = '11111111-1111-1111-1111-111111111111';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [ReferralLinksService, PrismaService, CacheService],
    }).compile();

    service = module.get<ReferralLinksService>(ReferralLinksService);
    prisma = module.get<PrismaService>(PrismaService);
    cacheService = module.get<CacheService>(CacheService);

    await cleanupTestData();

    // 1. Tạo Admin
    let admin = await prisma.user.findFirst({
      where: { OR: [{ id: testAdminId }, { email: 'real_admin_fr10@scanms.vn' }] },
    });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          id: testAdminId,
          email: 'real_admin_fr10@scanms.vn',
          passwordHash: bcrypt.hashSync('Password@123', 10),
          fullName: 'System Admin Test FR-10',
          role: UserRole.SYSTEM_ADMIN,
          isActive: true,
        },
      });
    }

    // 2. Tạo Owner thật trong PostgreSQL
    let owner = await prisma.user.findFirst({
      where: { OR: [{ id: testOwnerId }, { email: 'real_owner_fr10@scanms.vn' }] },
    });
    if (!owner) {
      owner = await prisma.user.create({
        data: {
          id: testOwnerId,
          email: 'real_owner_fr10@scanms.vn',
          passwordHash: bcrypt.hashSync('Password@123', 10),
          fullName: 'Chủ Shop Test FR-10',
          role: UserRole.SHOP_MANAGER,
          isActive: true,
        },
      });
    }

    // 3. Tạo KOL thật trong PostgreSQL
    let kol = await prisma.user.findFirst({
      where: { OR: [{ id: testKolId }, { email: 'real_kol_fr10@scanms.vn' }] },
    });
    if (!kol) {
      kol = await prisma.user.create({
        data: {
          id: testKolId,
          email: 'real_kol_fr10@scanms.vn',
          passwordHash: bcrypt.hashSync('Password@123', 10),
          fullName: 'KOL Test FR-10',
          role: UserRole.COLLABORATOR,
          isActive: true,
        },
      });
    }

    // Profile KOL
    await prisma.collaboratorProfile.upsert({
      where: { userId: testKolId },
      create: {
        userId: testKolId,
        bankName: 'Vietcombank',
        bankAccountNumber: '1234567890',
        bankAccountName: 'KOL Test FR-10',
      },
      update: {},
    });

    // 4. Tạo Store thật
    let store = await prisma.store.findUnique({ where: { id: testStoreId } });
    if (!store) {
      store = await prisma.store.create({
        data: {
          id: testStoreId,
          ownerId: testOwnerId,
          name: 'Cửa hàng Mỹ phẩm Real DB',
          slug: 'cua-hang-my-pham-real-db-' + Date.now(),
          defaultCommissionRate: 12.5,
        },
      });
    }

    // 5. Tạo quan hệ chính thức StoreCollaborator (Shop duyệt KOL)
    await prisma.storeCollaborator.upsert({
      where: {
        storeId_collaboratorId: {
          storeId: testStoreId,
          collaboratorId: testKolId,
        },
      },
      create: {
        storeId: testStoreId,
        collaboratorId: testKolId,
        status: StoreCollaboratorStatus.APPROVED,
        approvedAt: new Date(),
        note: 'Duyệt làm đối tác chính thức',
      },
      update: {
        status: StoreCollaboratorStatus.APPROVED,
      },
    });

    // 6. Tạo Product thật (có bật affiliate)
    let product = await prisma.product.findUnique({ where: { id: testProductId } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          id: testProductId,
          storeId: testStoreId,
          sku: 'SKU-FR10-REAL',
          title: 'Kem Dưỡng Da Collagen Thật',
          price: 350000,
          customCommissionRate: 15,
          stockQuantity: 100,
          isActive: true,
          isAffiliateEnabled: true,
        },
      });
    }

    // 7. Tạo Campaign thật
    let campaign = await prisma.campaign.findUnique({ where: { id: testCampaignId } });
    if (!campaign) {
      campaign = await prisma.campaign.create({
        data: {
          id: testCampaignId,
          storeId: testStoreId,
          name: 'Chiến dịch Thu 2026',
          bonusCommissionRate: 5,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Đã bắt đầu từ hôm qua
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Còn 30 ngày
          isActive: true,
        },
      });
    }

    // 8. Gán KOL tham gia chiến dịch với trạng thái ACCEPTED
    await prisma.campaignParticipant.upsert({
      where: {
        campaignId_collaboratorId: {
          campaignId: testCampaignId,
          collaboratorId: testKolId,
        },
      },
      create: {
        campaignId: testCampaignId,
        collaboratorId: testKolId,
        status: CampaignParticipantStatus.ACCEPTED,
        joinedAt: new Date(),
      },
      update: {
        status: CampaignParticipantStatus.ACCEPTED,
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  async function cleanupTestData() {
    try {
      await prisma.orderItem.deleteMany({
        where: { orderId: testOrderId },
      });
      await prisma.order.deleteMany({
        where: { id: testOrderId },
      });
      await prisma.clickTrafficLog.deleteMany({
        where: { referralLink: { storeId: testStoreId } },
      });
      await prisma.referralLink.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.storeCollaborator.deleteMany({
        where: { storeId: testStoreId },
      });
      await prisma.campaignParticipant.deleteMany({
        where: { collaboratorId: testKolId },
      });
      await prisma.campaign.deleteMany({
        where: { id: testCampaignId },
      });
      await prisma.product.deleteMany({
        where: { id: testProductId },
      });
      await prisma.store.deleteMany({
        where: { id: testStoreId },
      });
      await prisma.collaboratorProfile.deleteMany({
        where: { userId: testKolId },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [testOwnerId, testKolId, testAdminId] } },
      });
    } catch {}
  }

  it('1. Tạo link thật vào PostgreSQL, lưu đúng Base36 8 ký tự và AuditLog', async () => {
    const link = await service.createReferralLink(testKolId, {
      productId: testProductId,
      campaignId: testCampaignId,
      label: 'Video review TikTok mùa thu',
      channel: SocialPlatform.TIKTOK,
      utmSource: 'tiktok',
      utmMedium: 'creator',
    });

    expect(link).toBeDefined();
    expect(link.shortCode).toHaveLength(8);
    expect(link.shortCode).toMatch(/^[a-z0-9]{8}$/);
    expect(link.status).toBe(ReferralLinkStatus.ACTIVE);
    expect(link.storeId).toBe(testStoreId);
    expect(link.productId).toBe(testProductId);

    // Kiểm tra trong PostgreSQL thật
    const dbRecord = await prisma.referralLink.findUnique({
      where: { id: link.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.shortCode).toBe(link.shortCode);
    expect(dbRecord?.deletedAt).toBeNull();

    // Kiểm tra expiresAt tự động gán theo campaign.endDate khi frontend không gửi
    expect(dbRecord?.expiresAt).not.toBeNull();

    // Kiểm tra AuditLog thật
    const auditRecord = await prisma.auditLog.findFirst({
      where: {
        userId: testKolId,
        action: 'REFERRAL_LINK_CREATED',
      },
      orderBy: { createdAt: 'desc' },
    });
    expect(auditRecord).not.toBeNull();
  });

  it('2. Từ chối tạo link khi chiến dịch chưa bắt đầu (startDate > now)', async () => {
    // Tạo campaign tương lai chưa bắt đầu
    const futureCampaign = await prisma.campaign.create({
      data: {
        storeId: testStoreId,
        name: 'Chiến dịch Tương Lai',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 ngày nữa
        endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000),
        isActive: true,
      },
    });

    await prisma.campaignParticipant.create({
      data: {
        campaignId: futureCampaign.id,
        collaboratorId: testKolId,
        status: CampaignParticipantStatus.ACCEPTED,
      },
    });

    await expect(
      service.createReferralLink(testKolId, {
        productId: testProductId,
        campaignId: futureCampaign.id,
        label: 'Link sớm',
        channel: SocialPlatform.TIKTOK,
      }),
    ).rejects.toThrow('Chiến dịch tiếp thị chưa bắt đầu');

    await prisma.campaignParticipant.deleteMany({ where: { campaignId: futureCampaign.id } });
    await prisma.campaign.delete({ where: { id: futureCampaign.id } });
  });

  it('3. Lọc danh sách sản phẩm getEligibleProducts chỉ trả về sản phẩm đã được Shop duyệt', async () => {
    const products = await service.getEligibleProducts(testKolId, { storeId: testStoreId });
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].id).toBe(testProductId);
    expect(products[0].estimatedCommissionRate).toBe(15);

    // Thử với KOL khác chưa được duyệt -> trả về rỗng
    const strangerKolId = '88888888-8888-8888-8888-888888888888';
    const strangerProducts = await service.getEligibleProducts(strangerKolId, { storeId: testStoreId });
    expect(strangerProducts).toEqual([]);
  });

  it('4. Chuyển đổi trạng thái Tạm ngừng và Kích hoạt lại trong PostgreSQL', async () => {
    const links = await prisma.referralLink.findMany({
      where: { collaboratorId: testKolId, deletedAt: null },
      take: 1,
    });
    const linkId = links[0].id;

    // Tạm ngừng
    const paused = await service.toggleLinkStatus(linkId, testKolId);
    expect(paused.status).toBe(ReferralLinkStatus.PAUSED);

    let dbCheck = await prisma.referralLink.findUnique({ where: { id: linkId } });
    expect(dbCheck?.status).toBe(ReferralLinkStatus.PAUSED);

    // Kích hoạt lại
    const activated = await service.toggleLinkStatus(linkId, testKolId);
    expect(activated.status).toBe(ReferralLinkStatus.ACTIVE);

    dbCheck = await prisma.referralLink.findUnique({ where: { id: linkId } });
    expect(dbCheck?.status).toBe(ReferralLinkStatus.ACTIVE);
  });

  it('5. Chủ Cửa hàng khóa link vi phạm kèm lý do bắt buộc trong PostgreSQL', async () => {
    const links = await prisma.referralLink.findMany({
      where: { storeId: testStoreId, deletedAt: null },
      take: 1,
    });
    const linkId = links[0].id;

    const blocked = await service.blockLinkByShop(
      linkId,
      testStoreId,
      testOwnerId,
      'Vi phạm quy định quảng cáo sai sự thật về công dụng',
    );

    expect(blocked.status).toBe(ReferralLinkStatus.BLOCKED);
    expect(blocked.disabledReason).toBe('Vi phạm quy định quảng cáo sai sự thật về công dụng');
    expect(blocked.disabledBy).toBe(testOwnerId);
    expect(blocked.disabledAt).not.toBeNull();

    // KOL cố tình tự mở lại link bị Shop khóa -> Phải bị từ chối
    await expect(service.toggleLinkStatus(linkId, testKolId)).rejects.toThrow();

    // Chủ Shop mở khóa lại
    const unblocked = await service.unblockLinkByShop(linkId, testStoreId, testOwnerId);
    expect(unblocked.status).toBe(ReferralLinkStatus.ACTIVE);
    expect(unblocked.disabledReason).toBeNull();
  });

  it('6. Quản trị viên (Admin) tra cứu toàn sàn, khóa và mở khóa link', async () => {
    const links = await prisma.referralLink.findMany({
      where: { storeId: testStoreId, deletedAt: null },
      take: 1,
    });
    const linkId = links[0].id;

    // Admin tra cứu danh sách
    const adminList = await service.getAdminReferralLinks({ search: links[0].shortCode });
    expect(adminList.data.length).toBeGreaterThan(0);
    expect(adminList.data[0].id).toBe(linkId);

    // Admin khóa vi phạm
    const blocked = await service.blockLinkByAdmin(linkId, testAdminId, 'Admin khóa do vi phạm chính sách sàn');
    expect(blocked.status).toBe(ReferralLinkStatus.BLOCKED);
    expect(blocked.disabledReason).toBe('Admin khóa do vi phạm chính sách sàn');

    // Admin mở khóa
    const unblocked = await service.unblockLinkByAdmin(linkId, testAdminId);
    expect(unblocked.status).toBe(ReferralLinkStatus.ACTIVE);
    expect(unblocked.disabledReason).toBeNull();
  });

  it('7. Xác thực quy tắc Attribution khi Checkout đơn hàng trên dữ liệu thật', async () => {
    const links = await prisma.referralLink.findMany({
      where: { collaboratorId: testKolId, deletedAt: null },
      take: 1,
    });
    const link = links[0];

    // a. Link hợp lệ -> Hợp lệ kèm snapshot hoa hồng chính xác (15% + 5% campaign bonus = 20%)
    const res1 = await service.verifyAttributionForOrder({
      shortCode: link.shortCode,
      storeId: testStoreId,
      productId: testProductId,
    });
    expect(res1.isValid).toBe(true);
    expect(res1.collaboratorId).toBe(testKolId);
    expect(res1.referralLinkId).toBe(link.id);
    expect(res1.appliedCommissionRate).toBe(20); // 15 + 5
    expect(res1.calculatedCommissionAmount).toBe(70000); // 350,000 * 20%

    // b. Cửa hàng không khớp -> Từ chối
    const res2 = await service.verifyAttributionForOrder({
      shortCode: link.shortCode,
      storeId: '00000000-0000-0000-0000-000000000000',
      productId: testProductId,
    });
    expect(res2.isValid).toBe(false);

    // c. Khóa link -> Mất hiệu lực hoàn toàn
    await prisma.referralLink.update({
      where: { id: link.id },
      data: { status: ReferralLinkStatus.BLOCKED },
    });
    const res3 = await service.verifyAttributionForOrder({
      shortCode: link.shortCode,
      storeId: testStoreId,
      productId: testProductId,
    });
    expect(res3.isValid).toBe(false);
    expect(res3.reason).toContain('bị khóa trước thời điểm đặt hàng');

    // d. Link chỉ bị PAUSED -> Vẫn bảo toàn attribution
    await prisma.referralLink.update({
      where: { id: link.id },
      data: { status: ReferralLinkStatus.PAUSED },
    });
    const res4 = await service.verifyAttributionForOrder({
      shortCode: link.shortCode,
      storeId: testStoreId,
      productId: testProductId,
    });
    expect(res4.isValid).toBe(true);
    expect(res4.collaboratorId).toBe(testKolId);

    // Khôi phục lại ACTIVE
    await prisma.referralLink.update({
      where: { id: link.id },
      data: { status: ReferralLinkStatus.ACTIVE },
    });
  });

  it('8. Tích hợp Checkout: recordOrderAttribution gắn referralLinkId, snapshot hoa hồng, idempotency và chỉ gán đúng sản phẩm', async () => {
    const links = await prisma.referralLink.findMany({
      where: { collaboratorId: testKolId, deletedAt: null },
      take: 1,
    });
    const link = links[0];
    const initialOrders = link.totalOrders;

    const otherProductId = '99999999-9999-9999-9999-999999999999';
    await prisma.product.upsert({
      where: { id: otherProductId },
      create: {
        id: otherProductId,
        storeId: testStoreId,
        sku: 'OTHER-PROD-TEST',
        title: 'Sản phẩm khác không thuộc link tiếp thị',
        price: 100000,
        stockQuantity: 50,
        isActive: true,
        isAffiliateEnabled: true,
      },
      update: {},
    });

    // Tạo đơn hàng thật trong PostgreSQL với 2 dòng sản phẩm
    const order = await prisma.order.create({
      data: {
        id: testOrderId,
        storeId: testStoreId,
        externalOrderSn: 'ORDER-SN-REAL-DB-FR10',
        subtotalAmount: 450000,
        finalAmount: 450000,
      },
    });

    // Item 1: Đúng sản phẩm của link tiếp thị
    await prisma.orderItem.create({
      data: {
        orderId: testOrderId,
        productId: testProductId,
        quantity: 1,
        unitPrice: 350000,
        appliedCommissionRate: 0,
        calculatedCommissionAmount: 0,
      },
    });

    // Item 2: Sản phẩm khác trong giỏ hàng (không thuộc link)
    await prisma.orderItem.create({
      data: {
        orderId: testOrderId,
        productId: otherProductId,
        quantity: 1,
        unitPrice: 100000,
        appliedCommissionRate: 0,
        calculatedCommissionAmount: 0,
      },
    });

    // Ghi nhận attribution lần 1
    await service.recordOrderAttribution({
      orderId: order.id,
      referralLinkId: link.id,
      collaboratorId: testKolId,
      appliedCommissionRate: 20,
      calculatedCommissionAmount: 70000,
    });

    // Kiểm tra đơn hàng trong PostgreSQL
    const updatedOrder = await prisma.order.findUnique({
      where: { id: testOrderId },
      include: { orderItems: true },
    });
    expect(updatedOrder?.referralLinkId).toBe(link.id);
    expect(updatedOrder?.attributedCollaboratorId).toBe(testKolId);

    // Dòng sản phẩm khớp: ĐƯỢC GẮN link và SNAPSHOT hoa hồng
    const matchedItem = updatedOrder?.orderItems.find((i) => i.productId === testProductId);
    expect(matchedItem?.referralLinkId).toBe(link.id);
    expect(Number(matchedItem?.appliedCommissionRate)).toBe(20);
    expect(Number(matchedItem?.calculatedCommissionAmount)).toBe(70000);

    // Dòng sản phẩm khác: KHÔNG bị gắn nhầm link
    const otherItem = updatedOrder?.orderItems.find((i) => i.productId === otherProductId);
    expect(otherItem?.referralLinkId).toBeNull();
    expect(Number(otherItem?.appliedCommissionRate)).toBe(0);

    // Kiểm tra totalOrders của ReferralLink được tăng 1
    const updatedLink = await prisma.referralLink.findUnique({
      where: { id: link.id },
    });
    expect(updatedLink?.totalOrders).toBe(initialOrders + 1);

    // KIỂM TRA IDEMPOTENCY: Gọi lại lần 2 cho cùng đơn hàng -> totalOrders KHÔNG được tăng thêm
    await service.recordOrderAttribution({
      orderId: order.id,
      referralLinkId: link.id,
      collaboratorId: testKolId,
      appliedCommissionRate: 20,
      calculatedCommissionAmount: 70000,
    });
    const idempotentLink = await prisma.referralLink.findUnique({
      where: { id: link.id },
    });
    expect(idempotentLink?.totalOrders).toBe(initialOrders + 1); // Vẫn giữ nguyên, không bị nhân đôi

    // KIỂM TRA BẢO VỆ ATTRIBUTION: Thử gán sang link B cho đơn hàng đã có link A -> Phải bị từ chối
    const linkB = await service.createReferralLink(testKolId, {
      productId: testProductId,
      label: 'Link B test override protection',
      channel: SocialPlatform.FACEBOOK,
    });
    await expect(
      service.recordOrderAttribution({
        orderId: order.id,
        referralLinkId: linkB.id,
        collaboratorId: testKolId,
      }),
    ).rejects.toThrow('Đơn hàng đã được ghi nhận attribution cho liên kết khác. Không thể thay đổi.');
  });

  it('9. Xóa mềm link (deletedAt) trong PostgreSQL và không trả về ở danh sách thông thường', async () => {
    const links = await prisma.referralLink.findMany({
      where: { collaboratorId: testKolId, deletedAt: null },
      take: 1,
    });
    const linkId = links[0].id;

    const delRes = await service.deleteLink(linkId, testKolId);
    expect(delRes.success).toBe(true);

    const dbRecord = await prisma.referralLink.findUnique({
      where: { id: linkId },
    });
    expect(dbRecord?.deletedAt).not.toBeNull();

    // Query danh sách của KOL -> không còn xuất hiện link đã xóa
    const list = await service.getCollaboratorLinks(testKolId, {});
    const foundInList = list.data.some((l) => l.id === linkId);
    expect(foundInList).toBe(false);
  });

  it('10. Kiểm tra bảo mật: chống XSS bằng escapeHtml và kiểm tra hạn dùng iat/exp của token attribution', () => {
    // a. Chống XSS
    const malicious = '<script>alert("XSS")</script>&"\'';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain('<script>');
    expect(escaped).toContain('&lt;script&gt;');
    expect(escaped).toContain('&amp;');
    expect(escaped).toContain('&quot;');
    expect(escaped).toContain('&#39;');

    // b. Token attribution có iat và exp
    const secret = 'test_secret_key_12345';
    const token = signAttributionToken({ collaboratorId: '123' }, secret, 30);
    const verified = verifyAttributionToken(token, secret);
    expect(verified).not.toBeNull();
    expect(verified?.iat).toBeDefined();
    expect(verified?.exp).toBeDefined();
    expect(verified?.exp).toBeGreaterThan(verified?.iat);

    // c. Token quá hạn bị từ chối
    const expiredToken = signAttributionToken({ collaboratorId: '123' }, secret, -1);
    const expiredVerified = verifyAttributionToken(expiredToken, secret);
    expect(expiredVerified).toBeNull();
  });

  it('11. Kiểm tra quan hệ CampaignProduct: từ chối tạo link khi sản phẩm không thuộc chiến dịch', async () => {
    // Gắn một sản phẩm cụ thể khác vào chiến dịch (giới hạn danh mục sản phẩm)
    const specificCampProdId = '88888888-8888-8888-8888-888888888888';
    await prisma.product.upsert({
      where: { id: specificCampProdId },
      create: {
        id: specificCampProdId,
        storeId: testStoreId,
        sku: 'CAMP-SPECIFIC-PROD',
        title: 'Sản phẩm duy nhất trong chiến dịch',
        price: 200000,
        stockQuantity: 20,
        isActive: true,
        isAffiliateEnabled: true,
      },
      update: {},
    });

    await prisma.campaignProduct.upsert({
      where: {
        campaignId_productId: {
          campaignId: testCampaignId,
          productId: specificCampProdId,
        },
      },
      create: {
        campaignId: testCampaignId,
        productId: specificCampProdId,
      },
      update: {},
    });

    // Thử tạo link cho testProductId (không nằm trong danh sách campaign_products) -> Phải bị từ chối
    await expect(
      service.createReferralLink(
        testKolId,
        {
          productId: testProductId,
          campaignId: testCampaignId,
          label: 'Link thử sản phẩm ngoài chiến dịch',
          channel: SocialPlatform.TIKTOK,
        },
        '127.0.0.1',
      ),
    ).rejects.toThrow('Sản phẩm đã chọn không nằm trong danh mục áp dụng của chiến dịch này.');
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
    cacheService.onModuleDestroy();
  });
});
