import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ReferralLinksService } from '../referral-links.service';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  generateShortCode,
  isValidShortCode,
  signAttributionToken,
  verifyAttributionToken,
  isSearchEngineBot,
} from '../utils/short-code.generator';
import {
  ReferralLinkStatus,
  UserRole,
  SocialPlatform,
  CampaignParticipantStatus,
  Prisma,
} from '@prisma/client';

import { CacheService } from '../../../core/cache/cache.service';

describe('ReferralLinksService (FR-10 Unit Tests)', () => {
  let service: ReferralLinksService;
  let prisma: any;

  const mockPrismaService = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    store: {
      findFirst: jest.fn(),
    },
    storeCollaborator: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    campaign: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    campaignParticipant: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    sampleProductRequest: {
      findFirst: jest.fn(),
    },
    referralLink: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    clickTrafficLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
    orderItem: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((cb) => {
      if (typeof cb === 'function') {
        return cb(mockPrismaService);
      }
      return Promise.all(cb);
    }),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'PUBLIC_APP_URL') return 'https://scanms.vn';
      if (key === 'JWT_SECRET') return 'test_secret_key_12345';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReferralLinksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        CacheService,
      ],
    }).compile();

    service = module.get<ReferralLinksService>(ReferralLinksService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('1. Quy tắc sinh shortCode (Mục 6)', () => {
    it('Mã rút gọn phải gồm đúng 8 ký tự chỉ chứa chữ thường [a-z] và số [0-9]', () => {
      for (let i = 0; i < 20; i++) {
        const code = generateShortCode(8);
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[a-z0-9]{8}$/);
        expect(isValidShortCode(code)).toBe(true);
      }
    });

    it('Không trùng lặp ngẫu nhiên trong các lần sinh liên tiếp', () => {
      const set = new Set<string>();
      for (let i = 0; i < 50; i++) {
        set.add(generateShortCode(8));
      }
      expect(set.size).toBe(50);
    });
  });

  describe('2. Tạo link tiếp thị rút gọn (Mục 4 & 5)', () => {
    const validCollabId = 'collab-uuid-1';
    const validProdId = 'prod-uuid-1';
    const validStoreId = 'store-uuid-1';

    const defaultUserMock = {
      id: validCollabId,
      role: UserRole.COLLABORATOR,
      isActive: true,
      deletedAt: null,
      collaboratorProfile: { id: 'prof-1' },
    };

    const defaultProductMock = {
      id: validProdId,
      storeId: validStoreId,
      title: 'Kem chống nắng SPF50',
      isActive: true,
      isAffiliateEnabled: true,
      deletedAt: null,
      customCommissionRate: 15,
      store: { id: validStoreId, defaultCommissionRate: 10, deletedAt: null },
    };

    it('Tạo link thành công khi KOL và sản phẩm hợp lệ, có quan hệ Shop được duyệt', async () => {
      prisma.user.findUnique.mockResolvedValue(defaultUserMock);
      prisma.product.findUnique.mockResolvedValue(defaultProductMock);
      prisma.storeCollaborator.findFirst.mockResolvedValue({
        id: 'sc-1',
        status: 'APPROVED',
      });
      prisma.campaignParticipant.findFirst.mockResolvedValue({
        id: 'part-1',
        status: CampaignParticipantStatus.ACCEPTED,
      });

      prisma.referralLink.count.mockResolvedValue(0);
      prisma.referralLink.create.mockResolvedValue({
        id: 'link-uuid-1',
        shortCode: 'a7kp2m9q',
        collaboratorId: validCollabId,
        storeId: validStoreId,
        productId: validProdId,
        status: ReferralLinkStatus.ACTIVE,
        label: 'Video review TikTok 9.9',
        channel: SocialPlatform.TIKTOK,
      });

      const result = await service.createReferralLink(validCollabId, {
        productId: validProdId,
        label: 'Video review TikTok 9.9',
        channel: SocialPlatform.TIKTOK,
      });

      expect(result).toBeDefined();
      expect(result.shortUrl).toContain('https://scanms.vn/r/');
      expect(prisma.referralLink.create).toHaveBeenCalled();
    });

    it('Bắt buộc phải có nhãn (label) và kênh (channel)', async () => {
      await expect(
        service.createReferralLink(validCollabId, {
          productId: validProdId,
          label: '   ',
          channel: SocialPlatform.TIKTOK,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createReferralLink(validCollabId, {
          productId: validProdId,
          label: 'Video review',
          channel: undefined as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Từ chối khi người dùng không phải là COLLABORATOR', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-admin',
        role: UserRole.SYSTEM_ADMIN,
        isActive: true,
        deletedAt: null,
      });

      await expect(
        service.createReferralLink('user-admin', {
          productId: validProdId,
          label: 'Test',
          channel: SocialPlatform.TIKTOK,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Từ chối khi sản phẩm không tồn tại hoặc bị xóa', async () => {
      prisma.user.findUnique.mockResolvedValue(defaultUserMock);
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createReferralLink(validCollabId, {
          productId: 'non-existent',
          label: 'Test',
          channel: SocialPlatform.TIKTOK,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Từ chối khi KOL chưa được Shop duyệt hoặc chưa tham gia chiến dịch (403 Forbidden)', async () => {
      prisma.user.findUnique.mockResolvedValue(defaultUserMock);
      prisma.product.findUnique.mockResolvedValue(defaultProductMock);
      prisma.storeCollaborator.findFirst.mockResolvedValue(null);
      prisma.campaignParticipant.findFirst.mockResolvedValue(null);

      await expect(
        service.createReferralLink(validCollabId, {
          productId: validProdId,
          label: 'Review TikTok',
          channel: SocialPlatform.TIKTOK,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Kiểm tra chiến dịch: từ chối khi chiến dịch đã hết hạn (409 Conflict)', async () => {
      prisma.user.findUnique.mockResolvedValue(defaultUserMock);
      prisma.product.findUnique.mockResolvedValue(defaultProductMock);
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-expired',
        storeId: validStoreId,
        isActive: true,
        startDate: new Date(Date.now() - 20000),
        endDate: new Date(Date.now() - 10000), // đã hết hạn
      });

      await expect(
        service.createReferralLink(validCollabId, {
          productId: validProdId,
          campaignId: 'camp-expired',
          label: 'Review',
          channel: SocialPlatform.TIKTOK,
        }),
      ).rejects.toThrow(HttpException);
    });

    it('Kiểm tra chiến dịch: từ chối khi chiến dịch chưa bắt đầu', async () => {
      prisma.user.findUnique.mockResolvedValue(defaultUserMock);
      prisma.product.findUnique.mockResolvedValue(defaultProductMock);
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-future',
        storeId: validStoreId,
        isActive: true,
        startDate: new Date(Date.now() + 100000), // chưa bắt đầu
        endDate: new Date(Date.now() + 500000),
      });

      await expect(
        service.createReferralLink(validCollabId, {
          productId: validProdId,
          campaignId: 'camp-future',
          label: 'Review',
          channel: SocialPlatform.TIKTOK,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Kiểm tra chiến dịch: từ chối khi KOL chưa được duyệt ACCEPTED trong chiến dịch', async () => {
      prisma.user.findUnique.mockResolvedValue(defaultUserMock);
      prisma.product.findUnique.mockResolvedValue(defaultProductMock);
      prisma.campaign.findUnique.mockResolvedValue({
        id: 'camp-1',
        storeId: validStoreId,
        isActive: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 1000000),
      });
      prisma.campaignParticipant.findUnique.mockResolvedValue({
        status: CampaignParticipantStatus.INVITED, // Chưa ACCEPTED
      });

      await expect(
        service.createReferralLink(validCollabId, {
          productId: validProdId,
          campaignId: 'camp-1',
          label: 'Review',
          channel: SocialPlatform.TIKTOK,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Chống Race Condition: bắt lỗi P2002 và retry sinh mã mới thành công', async () => {
      prisma.user.findUnique.mockResolvedValue(defaultUserMock);
      prisma.product.findUnique.mockResolvedValue(defaultProductMock);
      prisma.campaignParticipant.findFirst.mockResolvedValue({ status: 'ACCEPTED' });
      prisma.referralLink.count.mockResolvedValue(0);

      // Lần đầu gặp lỗi P2002 trùng mã, lần 2 tạo thành công
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`short_code`)',
        { code: 'P2002', clientVersion: '7.10.0' },
      );

      prisma.referralLink.create
        .mockRejectedValueOnce(p2002Error)
        .mockResolvedValueOnce({
          id: 'link-retry-success',
          shortCode: 'b8mp3k8x',
          collaboratorId: validCollabId,
          storeId: validStoreId,
          productId: validProdId,
          status: ReferralLinkStatus.ACTIVE,
        });

      const result = await service.createReferralLink(validCollabId, {
        productId: validProdId,
        label: 'Retry test',
        channel: SocialPlatform.TIKTOK,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('link-retry-success');
      expect(prisma.referralLink.create).toHaveBeenCalledTimes(2);
    });

    it('Chặn khi vượt quá 10 link / phút / KOL (Mục 32)', async () => {
      prisma.user.findUnique.mockResolvedValue(defaultUserMock);
      prisma.product.findUnique.mockResolvedValue(defaultProductMock);
      prisma.campaignParticipant.findFirst.mockResolvedValue({ status: 'ACCEPTED' });
      prisma.referralLink.count.mockResolvedValueOnce(10); // 10 links in last minute

      await expect(
        service.createReferralLink(validCollabId, {
          productId: validProdId,
          label: 'Spam link',
          channel: SocialPlatform.TIKTOK,
        }),
      ).rejects.toThrow(HttpException);
    });

    it('Chặn khi vượt quá 20 link / sản phẩm / KOL (Mục 32)', async () => {
      prisma.user.findUnique.mockResolvedValue(defaultUserMock);
      prisma.product.findUnique.mockResolvedValue(defaultProductMock);
      prisma.campaignParticipant.findFirst.mockResolvedValue({ status: 'ACCEPTED' });
      prisma.referralLink.count
        .mockResolvedValueOnce(0) // last minute
        .mockResolvedValueOnce(5) // active links
        .mockResolvedValueOnce(20); // 20 links for this product

      await expect(
        service.createReferralLink(validCollabId, {
          productId: validProdId,
          label: 'Link thứ 21',
          channel: SocialPlatform.TIKTOK,
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('3. Trạng thái link & Khóa link (Mục 18 & 20)', () => {
    it('Tạm ngừng và kích hoạt lại link', async () => {
      prisma.referralLink.findFirst.mockResolvedValue({
        id: 'link-1',
        shortCode: 'abc12345',
        collaboratorId: 'collab-1',
        status: ReferralLinkStatus.ACTIVE,
        deletedAt: null,
      });
      prisma.referralLink.update.mockResolvedValue({
        id: 'link-1',
        status: ReferralLinkStatus.PAUSED,
        shortCode: 'abc12345',
      });

      const res = await service.toggleLinkStatus('link-1', 'collab-1');
      expect(res.status).toBe(ReferralLinkStatus.PAUSED);
    });

    it('KOL không thể tự mở lại link đã bị khóa (BLOCKED)', async () => {
      prisma.referralLink.findFirst.mockResolvedValue({
        id: 'link-blocked',
        shortCode: 'abc12345',
        collaboratorId: 'collab-1',
        status: ReferralLinkStatus.BLOCKED,
        disabledReason: 'Vi phạm chính sách nội dung',
        deletedAt: null,
      });

      await expect(service.toggleLinkStatus('link-blocked', 'collab-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Chủ Shop khóa link phải lưu lý do khóa (disabledReason)', async () => {
      prisma.store.findFirst.mockResolvedValue({ id: 'store-1', ownerId: 'shop-owner-1', deletedAt: null });
      prisma.referralLink.findFirst.mockResolvedValue({ id: 'link-1', shortCode: 'abc12345', storeId: 'store-1', deletedAt: null });
      prisma.referralLink.update.mockResolvedValue({
        id: 'link-1',
        shortCode: 'abc12345',
        status: ReferralLinkStatus.BLOCKED,
        disabledReason: 'KOL sử dụng nội dung sai lệch giá',
      });

      const res = await service.blockLinkByShop(
        'link-1',
        'store-1',
        'shop-owner-1',
        'KOL sử dụng nội dung sai lệch giá',
      );
      expect(res.status).toBe(ReferralLinkStatus.BLOCKED);
      expect(res.disabledReason).toBe('KOL sử dụng nội dung sai lệch giá');
    });

    it('Admin mở khóa link thành công', async () => {
      prisma.referralLink.findFirst.mockResolvedValue({
        id: 'link-1',
        shortCode: 'abc12345',
        status: ReferralLinkStatus.BLOCKED,
        deletedAt: null,
      });
      prisma.referralLink.update.mockResolvedValue({
        id: 'link-1',
        shortCode: 'abc12345',
        status: ReferralLinkStatus.ACTIVE,
        disabledReason: null,
      });

      const res = await service.unblockLinkByAdmin('link-1', 'admin-id');
      expect(res.status).toBe(ReferralLinkStatus.ACTIVE);
      expect(res.disabledReason).toBeNull();
    });
  });

  describe('4. Chuyển hướng, Bot Detection và Attribution 30 ngày (Mục 12, 14, 19)', () => {
    it('Link hợp lệ: ghi nhận attribution và click log', async () => {
      prisma.referralLink.findUnique.mockResolvedValue({
        id: 'link-valid',
        shortCode: 'valid123',
        collaboratorId: 'collab-1',
        productId: 'prod-1',
        storeId: 'store-1',
        status: ReferralLinkStatus.ACTIVE,
        deletedAt: null,
        product: { id: 'prod-1', isActive: true, isAffiliateEnabled: true, deletedAt: null },
        store: { id: 'store-1', deletedAt: null },
        collaborator: { id: 'collab-1', fullName: 'Thắng Đặng', isActive: true },
      });

      prisma.clickTrafficLog.findFirst.mockResolvedValue(null); // Không click trùng trong 30s

      const redirectRes = await service.handleRedirect('valid123', {
        ip: '1.2.3.4',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });

      expect(redirectRes.allowAttribution).toBe(true);
      expect(redirectRes.attributionData).toBeDefined();
      expect(redirectRes.attributionData?.collaboratorId).toBe('collab-1');
    });

    it('Bot Detection: bot công cụ tìm kiếm không nhận attribution và không tăng unique clicks', async () => {
      prisma.referralLink.findUnique.mockResolvedValue({
        id: 'link-bot',
        shortCode: 'botlink1',
        collaboratorId: 'collab-1',
        productId: 'prod-1',
        storeId: 'store-1',
        status: ReferralLinkStatus.ACTIVE,
        deletedAt: null,
        product: { id: 'prod-1', isActive: true, deletedAt: null },
        store: { id: 'store-1', deletedAt: null },
        collaborator: { id: 'collab-1', fullName: 'Thắng Đặng', isActive: true },
      });

      const redirectRes = await service.handleRedirect('botlink1', {
        ip: '66.249.66.1',
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      });

      expect(isSearchEngineBot('Googlebot/2.1')).toBe(true);
      expect(redirectRes.allowAttribution).toBe(false);
      expect(redirectRes.attributionData).toBeNull();
    });

    it('Link bị Tạm ngừng (PAUSED): Vẫn redirect nhưng KHÔNG ghi attribution', async () => {
      prisma.referralLink.findUnique.mockResolvedValue({
        id: 'link-paused',
        shortCode: 'paused12',
        collaboratorId: 'collab-1',
        productId: 'prod-1',
        storeId: 'store-1',
        status: ReferralLinkStatus.PAUSED,
        deletedAt: null,
        product: { id: 'prod-1', isActive: true, deletedAt: null },
        store: { id: 'store-1', deletedAt: null },
        collaborator: { id: 'collab-1', fullName: 'Thắng Đặng', isActive: true },
      });

      const redirectRes = await service.handleRedirect('paused12', { ip: '1.2.3.4' });
      expect(redirectRes.status).toBe('PAUSED');
      expect(redirectRes.allowAttribution).toBe(false);
      expect(redirectRes.attributionData).toBeNull();
    });

    it('Link bị Khóa (BLOCKED): Bị chặn hoàn toàn với mã HTTP 410 Gone', async () => {
      prisma.referralLink.findUnique.mockResolvedValue({
        id: 'link-blocked',
        shortCode: 'blocked1',
        status: ReferralLinkStatus.BLOCKED,
        disabledReason: 'Gian lận',
        deletedAt: null,
      });

      await expect(
        service.handleRedirect('blocked1', { ip: '1.2.3.4' }),
      ).rejects.toThrow(HttpException);

      try {
        await service.handleRedirect('blocked1', { ip: '1.2.3.4' });
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.GONE);
      }
    });

    it('Link đã xóa (DELETED): Trả về mã HTTP 404 Not Found', async () => {
      prisma.referralLink.findUnique.mockResolvedValue({
        id: 'link-deleted',
        shortCode: 'deleted1',
        status: ReferralLinkStatus.ACTIVE,
        deletedAt: new Date(),
      });

      await expect(
        service.handleRedirect('deleted1', { ip: '1.2.3.4' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('5. Quy tắc Attribution khi Tạo Đơn Hàng & Chữ ký Token (Mục 14 & 15)', () => {
    it('Ký và xác thực token attribution bằng HMAC-SHA256 chống giả mạo', () => {
      const secret = 'super_secret_key_for_testing';
      const payload = {
        collaboratorId: 'collab-1',
        storeId: 'store-1',
        productId: 'prod-1',
        shortCode: 'a7kp2m9q',
      };

      const token = signAttributionToken(payload, secret);
      expect(token).toContain('.');

      const verified = verifyAttributionToken(token, secret);
      expect(verified).toBeDefined();
      expect(verified?.collaboratorId).toBe('collab-1');

      // Sai secret -> null
      const invalidSecret = verifyAttributionToken(token, 'wrong_secret');
      expect(invalidSecret).toBeNull();

      // Dữ liệu bị chỉnh sửa -> null
      const tamperedToken = token + 'tampered';
      expect(verifyAttributionToken(tamperedToken, secret)).toBeNull();
    });

    it('Link bị BLOCKED trước khi đặt hàng -> Attribution bị MẤT HIỆU LỰC', async () => {
      prisma.referralLink.findUnique.mockResolvedValue({
        id: 'link-1',
        shortCode: 'ref12345',
        storeId: 'store-1',
        productId: 'prod-1',
        status: ReferralLinkStatus.BLOCKED,
        deletedAt: null,
      });

      const res = await service.verifyAttributionForOrder({
        shortCode: 'ref12345',
        storeId: 'store-1',
        productId: 'prod-1',
      });

      expect(res.isValid).toBe(false);
      expect(res.reason).toContain('đã bị khóa trước thời điểm đặt hàng');
    });

    it('Link chỉ bị PAUSED bởi KOL sau khi khách click -> Attribution VẪN CÒN HIỆU LỰC', async () => {
      prisma.referralLink.findUnique.mockResolvedValue({
        id: 'link-1',
        shortCode: 'ref12345',
        collaboratorId: 'collab-1',
        storeId: 'store-1',
        productId: 'prod-1',
        status: ReferralLinkStatus.PAUSED,
        deletedAt: null,
        product: { isActive: true, isAffiliateEnabled: true, deletedAt: null },
        store: { deletedAt: null },
      });

      const res = await service.verifyAttributionForOrder({
        shortCode: 'ref12345',
        storeId: 'store-1',
        productId: 'prod-1',
      });

      expect(res.isValid).toBe(true);
      expect(res.collaboratorId).toBe('collab-1');
    });

    it('Sản phẩm hoặc Cửa hàng không khớp -> Từ chối attribution', async () => {
      prisma.referralLink.findUnique.mockResolvedValue({
        id: 'link-1',
        shortCode: 'ref12345',
        storeId: 'store-1',
        productId: 'prod-1',
        status: ReferralLinkStatus.ACTIVE,
        deletedAt: null,
        product: { isActive: true, isAffiliateEnabled: true, deletedAt: null },
        store: { deletedAt: null },
      });

      const res = await service.verifyAttributionForOrder({
        shortCode: 'ref12345',
        storeId: 'other-store-2', // Khác shop
        productId: 'prod-1',
      });

      expect(res.isValid).toBe(false);
    });
  });
});
