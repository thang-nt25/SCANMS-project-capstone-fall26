import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole, ReviewStatus } from '@prisma/client';
import { ProductsService } from '../products.service';
import { PrismaService } from '../../../core/database/prisma.service';
import { CacheService } from '../../../core/cache/cache.service';

describe('FR-15: Products Landing Page & Video Reviews (Unit Tests)', () => {
  let service: ProductsService;
  let prisma: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    product: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    store: {
      findFirst: jest.fn(),
    },
    mediaAsset: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    productReview: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    attributionSession: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'JWT_SECRET') return 'unit-test-jwt-secret-key-12345';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CacheService,
          useValue: {
            checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            delPrefix: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it('nên throw NotFoundException khi idOrSlug rỗng', async () => {
    await expect(service.getLandingPageData('')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('nên throw NotFoundException khi sản phẩm không tồn tại trong database', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue(null);

    await expect(
      service.getLandingPageData('NON_EXISTING_SKU'),
    ).rejects.toThrow(NotFoundException);
  });

  it('nên throw NotFoundException khi sản phẩm đã bị xóa mềm (isDeleted = true)', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue({
      id: 'e8b7c91a-1111-4444-8888-111122223333',
      sku: 'DELETED-01',
      isDeleted: true,
    });

    await expect(service.getLandingPageData('DELETED-01')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('nên throw NotFoundException khi Store đã bị xóa hoặc tạm ngừng', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue({
      id: 'e8b7c91a-1111-4444-8888-111122223333',
      sku: 'SKIN-01',
      isDeleted: false,
      store: { id: 'store-1', isDeleted: true, isActive: true },
    });

    await expect(service.getLandingPageData('SKIN-01')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('nên throw ForbiddenException khi tài khoản chủ Store bị khóa (owner.isActive = false)', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue({
      id: 'e8b7c91a-1111-4444-8888-111122223333',
      sku: 'SKIN-01',
      isDeleted: false,
      store: {
        id: 'store-1',
        isDeleted: false,
        isActive: true,
        owner: { id: 'owner-1', isActive: false },
      },
    });

    await expect(service.getLandingPageData('SKIN-01')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('nên trả về payload Landing Page an toàn, che tên khách hàng và tính toán đúng sao', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue({
      id: 'e8b7c91a-1111-4444-8888-111122223333',
      storeId: 'store-sora',
      sku: 'SERUM-C',
      title: 'Serum Vitamin C 15%',
      categoryName: 'Mỹ phẩm & Chăm sóc da',
      description: 'Dưỡng sáng da mờ thâm mụn chuyên sâu',
      price: 459000,
      originalPrice: 550000,
      imageUrl: 'https://cdn.scanms.vn/products/serum-c.jpg',
      stockQuantity: 25,
      isActive: true,
      customCommissionRate: 20, // Hoa hồng nội bộ KHÔNG ĐƯỢC LỘ
      isDeleted: false,
      store: {
        id: 'store-sora',
        name: 'Sora Skin Official',
        slug: 'sora-skin',
        isDeleted: false,
        isActive: true,
        isVerified: true,
        policyReturn: 'Đổi trả miễn phí 7 ngày',
        policyWarranty: 'Bảo hành 12 tháng',
        policyShipping: 'Giao hàng toàn quốc',
        owner: { id: 'owner-1', isActive: true },
      },
    });

    mockPrismaService.mediaAsset.findMany.mockResolvedValue([
      {
        id: 'media-img-1',
        assetType: 'IMAGE',
        urlOrContent: 'https://cdn.scanms.vn/products/gallery-1.jpg',
        isFeatured: false,
        createdAt: new Date(),
        collaborator: null,
      },
      {
        id: 'media-vid-1',
        assetType: 'VIDEO',
        title: 'Review Serum Vitamin C sau 14 ngày',
        urlOrContent: 'https://cdn.scanms.vn/videos/review-1.mp4',
        posterUrl: 'https://cdn.scanms.vn/videos/poster-1.jpg',
        isFeatured: true,
        collaboratorId: 'kol-123',
        createdAt: new Date(),
        collaborator: {
          id: 'kol-123',
          fullName: 'Lê Hoàng Yến',
          collaboratorProfile: {
            avatarUrl: 'https://cdn.scanms.vn/avatars/yen.jpg',
            kycStatus: 'VERIFIED',
          },
        },
      },
    ]);

    mockPrismaService.productReview.findMany.mockResolvedValue([
      {
        id: 'rev-1',
        customerName: 'Nguyễn Đình Tuấn',
        rating: 5,
        comment: 'Hàng chuẩn dùng rất thích!',
        isApproved: true,
        order: {
          id: 'order-12345',
          status: 'DELIVERED',
        },
        reviewImageUrl: null,
        createdAt: new Date(),
      },
      {
        id: 'rev-2',
        customerName: 'Trần Văn Nhật',
        rating: 4,
        comment: 'Giao nhanh, đóng gói cẩn thận',
        isApproved: true,
        order: {
          id: 'order-99999',
          status: 'PENDING', // Chưa DELIVERED/COMPLETED -> không phải verified buyer
        },
        reviewImageUrl: null,
        createdAt: new Date(),
      },
    ]);

    const result = await service.getLandingPageData('SERUM-C');

    // 1. Kiểm tra an toàn dữ liệu sản phẩm
    expect(result.product.title).toBe('Serum Vitamin C 15%');
    expect(result.product.sku).toBe('SERUM-C');
    expect(result.product.price).toBe(459000);
    expect(result.product.originalPrice).toBe(550000);
    expect(result.product.canPurchase).toBe(true);
    expect((result.product as any).customCommissionRate).toBeUndefined(); // Không lộ hoa hồng

    // 2. Kiểm tra Store
    expect(result.store.name).toBe('Sora Skin Official');
    expect(result.store.isVerified).toBe(true);

    // 3. Kiểm tra Tồn kho
    expect(result.availability.inStock).toBe(true);
    expect(result.availability.stockQuantity).toBe(25);

    // 4. Kiểm tra Reviews & Mask tên khách & Verified buyer logic
    expect(result.reviews.totalReviews).toBe(2);
    expect(result.reviews.averageRating).toBe(4.5);
    expect(result.reviews.starDistribution[5]).toBe(1);
    expect(result.reviews.starDistribution[4]).toBe(1);

    // Tên phải được che một phần theo chuẩn FR-15
    const rev1 = result.reviews.items.find((i: any) => i.id === 'rev-1');
    expect(rev1.customerName).toBe('Nguyễn Đ*** T***');
    expect(rev1.isVerifiedBuyer).toBe(true); // DELIVERED order

    const rev2 = result.reviews.items.find((i: any) => i.id === 'rev-2');
    expect(rev2.customerName).toBe('Trần V*** N***');
    expect(rev2.isVerifiedBuyer).toBe(false); // PENDING order is NOT verified buyer

    // 5. Kiểm tra Video review có KOL thật và nhãn minh bạch
    expect(result.videos.length).toBe(1);
    expect(result.videos[0].kol.name).toBe('Lê Hoàng Yến');
    expect(result.videos[0].kol.isVerified).toBe(true);
    expect(result.videos[0].kol.disclosure).toContain('Nội dung có liên kết tiếp thị');
    expect(result.videos[0].videoUrl).toBe(
      'https://cdn.scanms.vn/videos/review-1.mp4',
    );
  });

  it('nên trả averageRating = null khi sản phẩm chưa có review nào (Mục 11)', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue({
      id: 'prod-new',
      sku: 'NEW-PROD',
      title: 'Sản phẩm mới',
      price: 200000,
      stockQuantity: 10,
      isActive: true,
      isDeleted: false,
      store: {
        id: 'store-1',
        name: 'Shop 1',
        isDeleted: false,
        isActive: true,
        owner: { id: 'owner-1', isActive: true },
      },
    });

    mockPrismaService.mediaAsset.findMany.mockResolvedValue([]);
    mockPrismaService.productReview.findMany.mockResolvedValue([]);

    const result = await service.getLandingPageData('NEW-PROD');

    expect(result.reviews.totalReviews).toBe(0);
    expect(result.reviews.averageRating).toBeNull();
  });

  it('nên xử lý đúng trạng thái hết hàng (stockQuantity = 0)', async () => {
    mockPrismaService.product.findFirst.mockResolvedValue({
      id: 'prod-out-of-stock',
      sku: 'OUT-OF-STOCK',
      title: 'Sản phẩm hết hàng',
      price: 100000,
      stockQuantity: 0,
      isActive: true,
      isDeleted: false,
      store: {
        id: 'store-1',
        name: 'Shop 1',
        isDeleted: false,
        isActive: true,
        owner: { id: 'owner-1', isActive: true },
      },
    });

    mockPrismaService.mediaAsset.findMany.mockResolvedValue([]);
    mockPrismaService.productReview.findMany.mockResolvedValue([]);

    const result = await service.getLandingPageData('OUT-OF-STOCK');

    expect(result.availability.inStock).toBe(false);
    expect(result.availability.stockQuantity).toBe(0);
    expect(result.product.canPurchase).toBe(false);
  });

  describe('moderateReview (FR-15 Review Status Moderation & Audit)', () => {
    const mockReview = {
      id: 'rev-uuid-1',
      productId: 'prod-uuid-1',
      status: ReviewStatus.PENDING,
      isApproved: false,
      customerName: 'Nguyễn Văn A',
      comment: 'Sản phẩm dùng rất tốt',
      product: {
        id: 'prod-uuid-1',
        storeId: 'store-uuid-1',
        store: {
          id: 'store-uuid-1',
          ownerId: 'owner-uuid-1',
        },
      },
    };

    it('nên phê duyệt review thành công với status APPROVED và isApproved = true', async () => {
      mockPrismaService.productReview.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.productReview.update.mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.APPROVED,
        isApproved: true,
        reviewedBy: 'owner-uuid-1',
        reviewedAt: new Date(),
        rejectionReason: null,
      });

      const result = await service.moderateReview(
        'owner-uuid-1',
        UserRole.SHOP_MANAGER,
        'rev-uuid-1',
        { status: ReviewStatus.APPROVED },
      );

      expect(result.message).toContain('Đã duyệt và công khai đánh giá');
      expect(result.review.status).toBe(ReviewStatus.APPROVED);
      expect(result.review.isApproved).toBe(true);
      expect(result.review.rejectionReason).toBeNull();
      expect(mockPrismaService.productReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rev-uuid-1' },
          data: expect.objectContaining({
            status: ReviewStatus.APPROVED,
            isApproved: true,
            reviewedBy: 'owner-uuid-1',
          }),
        }),
      );
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PRODUCT_REVIEW_APPROVED',
            userId: 'owner-uuid-1',
          }),
        }),
      );
    });

    it('nên từ chối review với status REJECTED và lưu lý do rejectionReason', async () => {
      mockPrismaService.productReview.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.productReview.update.mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.REJECTED,
        isApproved: false,
        reviewedBy: 'owner-uuid-1',
        reviewedAt: new Date(),
        rejectionReason: 'Nội dung chứa ngôn từ không phù hợp',
      });

      const result = await service.moderateReview(
        'owner-uuid-1',
        UserRole.SHOP_MANAGER,
        'rev-uuid-1',
        {
          status: ReviewStatus.REJECTED,
          reason: 'Nội dung chứa ngôn từ không phù hợp',
        },
      );

      expect(result.message).toContain('Đã từ chối đánh giá');
      expect(result.review.status).toBe(ReviewStatus.REJECTED);
      expect(result.review.isApproved).toBe(false);
      expect(result.review.rejectionReason).toBe('Nội dung chứa ngôn từ không phù hợp');
      expect(mockPrismaService.productReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rev-uuid-1' },
          data: expect.objectContaining({
            status: ReviewStatus.REJECTED,
            isApproved: false,
            rejectionReason: 'Nội dung chứa ngôn từ không phù hợp',
          }),
        }),
      );
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PRODUCT_REVIEW_REJECTED',
          }),
        }),
      );
    });

    it('nên ẩn review với status HIDDEN và lưu lý do', async () => {
      mockPrismaService.productReview.findUnique.mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.APPROVED,
        isApproved: true,
      });
      mockPrismaService.productReview.update.mockResolvedValue({
        ...mockReview,
        status: ReviewStatus.HIDDEN,
        isApproved: false,
        reviewedBy: 'admin-1',
        rejectionReason: 'Tạm ẩn theo yêu cầu người dùng',
      });

      const result = await service.moderateReview(
        'admin-1',
        UserRole.SYSTEM_ADMIN,
        'rev-uuid-1',
        {
          status: ReviewStatus.HIDDEN,
          reason: 'Tạm ẩn theo yêu cầu người dùng',
        },
      );

      expect(result.message).toContain('Đã tạm ẩn đánh giá');
      expect(result.review.status).toBe(ReviewStatus.HIDDEN);
      expect(result.review.isApproved).toBe(false);
    });

    it('nên chặn Shop Manager kiểm duyệt review của cửa hàng khác (ForbiddenException)', async () => {
      mockPrismaService.productReview.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.moderateReview(
          'other-owner-uuid',
          UserRole.SHOP_MANAGER,
          'rev-uuid-1',
          { status: ReviewStatus.APPROVED },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
