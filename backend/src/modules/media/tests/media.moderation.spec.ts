import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MediaService } from '../media.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { ReviewActionStatus } from '../dto/review-media.dto';
import { SubmitKolVideoDto } from '../dto/submit-kol-video.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CacheService } from '../../../core/cache/cache.service';

describe('FR-15 / FR-08: Media Submission & Moderation Flow (Unit Tests)', () => {
  let service: MediaService;
  let prisma: PrismaService;

  const mockPrisma = {
    $transaction: jest.fn(),
    store: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    storeCollaborator: {
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    campaignProduct: {
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn(),
    },
    mediaAsset: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    mockPrisma.$transaction.mockImplementation(async (callback) => {
      return callback(mockPrisma);
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: { delPrefix: jest.fn() } },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('URL Allowlist & SSRF Protection', () => {
    it('nên từ chối URL chứa javascript: hoặc giao thức không an toàn (XSS)', () => {
      expect(() =>
        service.validateAllowedUrl('javascript:alert(1)', 'Video URL'),
      ).toThrow(ForbiddenException);
    });

    it('nên từ chối URL localhost hoặc private IP (SSRF protection)', () => {
      expect(() =>
        service.validateAllowedUrl('http://127.0.0.1:8080/exploit.mp4', 'Video URL'),
      ).toThrow(ForbiddenException);

      expect(() =>
        service.validateAllowedUrl('http://localhost/video.mp4', 'Video URL'),
      ).toThrow(ForbiddenException);

      expect(() =>
        service.validateAllowedUrl('http://192.168.1.10/video.mp4', 'Video URL'),
      ).toThrow(ForbiddenException);
    });

    it('nên từ chối domain lạ không nằm trong allowlist', () => {
      expect(() =>
        service.validateAllowedUrl('https://website-lua-dao.example/video.mp4', 'Video URL'),
      ).toThrow(ForbiddenException);
    });

    it('nên chấp nhận URL từ các domain hợp lệ đã được phê duyệt (CDN SCANMS, Cloudinary, YouTube, TikTok)', () => {
      expect(() =>
        service.validateAllowedUrl('https://cdn.scanms.vn/videos/review.mp4', 'Video URL'),
      ).not.toThrow();

      expect(() =>
        service.validateAllowedUrl('https://res.cloudinary.com/scanms/video/upload/demo.mp4', 'Video URL'),
      ).not.toThrow();

      expect(() =>
        service.validateAllowedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'Video URL'),
      ).not.toThrow();
    });
  });

  describe('KOL Video Submission (submitKolVideo)', () => {
    it('nên từ chối nộp video nếu KOL chưa có quan hệ StoreCollaborator = APPROVED', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        storeId: 'store-1',
        isDeleted: false,
        store: { id: 'store-1', isDeleted: false, isActive: true },
      });
      mockPrisma.storeCollaborator.findFirst.mockResolvedValue(null);

      await expect(
        service.submitKolVideo('kol-1', {
          storeId: 'store-1',
          productId: 'prod-1',
          title: 'Review Serum',
          videoUrl: 'https://cdn.scanms.vn/videos/review.mp4',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên cho phép KOL nộp video review hợp lệ khi StoreCollaborator = APPROVED với status PENDING', async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: 'prod-1',
        storeId: 'store-1',
        isDeleted: false,
        store: { id: 'store-1', isDeleted: false, isActive: true },
      });
      mockPrisma.storeCollaborator.findFirst.mockResolvedValue({
        id: 'collab-assoc-1',
        status: 'APPROVED',
      });
      mockPrisma.mediaAsset.create.mockResolvedValue({
        id: 'media-new-1',
        storeId: 'store-1',
        productId: 'prod-1',
        collaboratorId: 'kol-1',
        status: 'PENDING',
        title: 'Review Serum sáng da',
        urlOrContent: 'https://cdn.scanms.vn/videos/review.mp4',
      });

      const result = await service.submitKolVideo('kol-1', {
        storeId: 'store-1',
        productId: 'prod-1',
        title: 'Review Serum sáng da',
        videoUrl: 'https://cdn.scanms.vn/videos/review.mp4',
        caption: 'Trải nghiệm 7 ngày làm mờ thâm',
      });

      expect(result.message).toContain('chờ Shop kiểm duyệt');
      expect(result.asset.status).toBe('PENDING');
      expect(mockPrisma.mediaAsset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            isFeatured: false,
          }),
        }),
      );
    });
  });

  describe('Video Review & Moderation (reviewMedia)', () => {
    it('nên chặn chuyển trạng thái sang PENDING qua API kiểm duyệt', async () => {
      await expect(
        service.reviewMedia('shop-owner-1', 'SHOP_MANAGER', 'media-1', {
          status: 'PENDING' as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên bắt buộc lý do khi REJECTED hoặc HIDDEN', async () => {
      await expect(
        service.reviewMedia('shop-owner-1', 'SHOP_MANAGER', 'media-1', {
          status: ReviewActionStatus.REJECTED,
          rejectionReason: '',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.reviewMedia('shop-owner-1', 'SHOP_MANAGER', 'media-1', {
          status: ReviewActionStatus.HIDDEN,
          rejectionReason: undefined,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('nên cấm Shop Manager duyệt video của gian hàng khác', async () => {
      mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'media-1',
        isDeleted: false,
        store: { ownerId: 'other-owner' },
      });

      await expect(
        service.reviewMedia('shop-owner-1', 'SHOP_MANAGER', 'media-1', {
          status: ReviewActionStatus.APPROVED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('nên cho phép Shop Manager duyệt video và tự động reset isFeatured của các video cũ cùng product', async () => {
      mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        id: 'media-1',
        productId: 'prod-1',
        storeId: 'store-1',
        isDeleted: false,
        store: { ownerId: 'shop-owner-1' },
        status: 'PENDING',
        isFeatured: false,
        rejectionReason: null,
      });
      mockPrisma.mediaAsset.update.mockResolvedValue({
        id: 'media-1',
        status: 'APPROVED',
        reviewedBy: 'shop-owner-1',
        reviewedAt: new Date(),
        isFeatured: true,
      });

      const result = await service.reviewMedia(
        'shop-owner-1',
        'SHOP_MANAGER',
        'media-1',
        {
          status: ReviewActionStatus.APPROVED,
          isFeatured: true,
        },
      );

      expect(result.message).toContain('[APPROVED]');
      expect(result.asset.status).toBe('APPROVED');

      // Kiểm tra đã gọi updateMany để hủy featured của video khác cùng product
      expect(mockPrisma.mediaAsset.updateMany).toHaveBeenCalledWith({
        where: {
          productId: 'prod-1',
          id: { not: 'media-1' },
          isFeatured: true,
        },
        data: { isFeatured: false },
      });

      // Kiểm tra đã ghi AuditLog
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'shop-owner-1',
          action: 'MEDIA_REVIEWED',
          details: expect.objectContaining({
            mediaId: 'media-1',
            productId: 'prod-1',
            newState: expect.objectContaining({
              status: 'APPROVED',
              isFeatured: true,
            }),
          }),
        }),
      });
    });
  });

  describe('SubmitKolVideoDto Validation', () => {
    it('nên báo lỗi khi campaignId không phải là UUID v4 hợp lệ', async () => {
      const dto = plainToInstance(SubmitKolVideoDto, {
        productId: 'prod-uuid-1',
        title: 'Review Video',
        videoUrl: 'https://cdn.scanms.vn/video.mp4',
        campaignId: 'not-a-valid-uuid',
      });

      const errors = await validate(dto);
      const campaignError = errors.find((e) => e.property === 'campaignId');
      expect(campaignError).toBeDefined();
      expect(campaignError?.constraints?.isUuid).toContain('campaignId phải là định dạng UUID hợp lệ');
    });

    it('nên chấp nhận campaignId là UUID v4 hợp lệ', async () => {
      const dto = plainToInstance(SubmitKolVideoDto, {
        productId: 'prod-uuid-1',
        title: 'Review Video',
        videoUrl: 'https://cdn.scanms.vn/video.mp4',
        campaignId: '550e8400-e29b-41d4-a716-446655440000',
      });

      const errors = await validate(dto);
      const campaignError = errors.find((e) => e.property === 'campaignId');
      expect(campaignError).toBeUndefined();
    });

    it('nên chuyển đổi chuỗi "false" thành boolean false và vượt qua validation', async () => {
      const dto = plainToInstance(SubmitKolVideoDto, {
        productId: 'prod-uuid-1',
        title: 'Review Video',
        videoUrl: 'https://cdn.scanms.vn/video.mp4',
        requiresCampaignParticipation: 'false' as any,
      });

      expect(dto.requiresCampaignParticipation).toBe(false);
      const errors = await validate(dto);
      const propError = errors.find((e) => e.property === 'requiresCampaignParticipation');
      expect(propError).toBeUndefined();
    });

    it('nên chuyển đổi chuỗi "true" thành boolean true và vượt qua validation', async () => {
      const dto = plainToInstance(SubmitKolVideoDto, {
        productId: 'prod-uuid-1',
        title: 'Review Video',
        videoUrl: 'https://cdn.scanms.vn/video.mp4',
        requiresCampaignParticipation: 'true' as any,
      });

      expect(dto.requiresCampaignParticipation).toBe(true);
      const errors = await validate(dto);
      const propError = errors.find((e) => e.property === 'requiresCampaignParticipation');
      expect(propError).toBeUndefined();
    });

    it('nên báo lỗi khi requiresCampaignParticipation nhận giá trị chuỗi không hợp lệ', async () => {
      const dto = plainToInstance(SubmitKolVideoDto, {
        productId: 'prod-uuid-1',
        title: 'Review Video',
        videoUrl: 'https://cdn.scanms.vn/video.mp4',
        requiresCampaignParticipation: 'invalid_string' as any,
      });

      const errors = await validate(dto);
      const propError = errors.find((e) => e.property === 'requiresCampaignParticipation');
      expect(propError).toBeDefined();
      expect(propError?.constraints?.isBoolean).toContain('requiresCampaignParticipation phải là kiểu boolean');
    });
  });
});
