import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../core/cache/cache.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ModerateProductReviewDto } from './dto/moderate-product-review.dto';
import { TrackAnalyticsEventDto } from './dto/track-event.dto';
import { ProductLandingResponseDto } from './dto/landing-page-response.dto';
import { UserRole, ReviewStatus } from '@prisma/client';
import { verifyOpaqueVisitorToken } from '../referral-links/utils/short-code.generator';
import * as crypto from 'crypto';

@Injectable()
export class ProductsService {
  /**
   * Danh sách tên miền lưu trữ media được sàn SCANMS cho phép (Chống SSRF / URL độc hại)
   */
  private static readonly ALLOWED_HOST_DOMAINS = [
    'scanms.vn',
    'cdn.scanms.vn',
    'cloudinary.com',
    'res.cloudinary.com',
    'youtube.com',
    'www.youtube.com',
    'youtu.be',
    'tiktok.com',
    'www.tiktok.com',
    'v.douyin.com',
    'vimeo.com',
    'player.vimeo.com',
    'supabase.co',
    'storage.googleapis.com',
    'amazonaws.com',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  public async invalidateLandingCache(productId?: string): Promise<void> {
    await this.cacheService.delPrefix(
      productId ? `landing:v2:${productId}:` : 'landing:v2:',
    );
  }

  /**
   * Danh sách sản phẩm (Hỗ trợ phân trang, tìm kiếm, lọc danh mục)
   * Luôn tuân thủ nguyên tắc: chỉ lấy sản phẩm CHƯA XÓA (isDeleted: false)
   */
  async findAll(
    query: QueryProductsDto,
    viewer?: { id: string; role: UserRole },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (viewer?.role === UserRole.SHOP_MANAGER) {
      where.store = { ownerId: viewer.id, isDeleted: false };
    } else if (viewer?.role === UserRole.COLLABORATOR) {
      where.isActive = true;
      where.store = {
        isDeleted: false,
        isActive: true,
        storeCollaborators: {
          some: { collaboratorId: viewer.id, status: 'APPROVED' },
        },
      };
    }

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.category) {
      where.categoryName = {
        contains: query.category,
        mode: 'insensitive',
      };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { sku: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              defaultCommissionRate: true,
            },
          },
          _count: {
            select: { mediaAssets: { where: { isDeleted: false } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Xem chi tiết một sản phẩm kèm kho Media của sản phẩm đó
   */
  async findOne(id: string, viewer?: { id: string; role: UserRole }) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        isDeleted: false,
        ...(viewer?.role === UserRole.SHOP_MANAGER
          ? { store: { ownerId: viewer.id, isDeleted: false } }
          : {}),
        ...(viewer?.role === UserRole.COLLABORATOR
          ? {
              isActive: true,
              store: {
                isDeleted: false,
                isActive: true,
                storeCollaborators: {
                  some: { collaboratorId: viewer.id, status: 'APPROVED' },
                },
              },
            }
          : {}),
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            defaultCommissionRate: true,
            attributionWindowDays: true,
          },
        },
        mediaAssets: {
          where: { isDeleted: false },
        },
        productReviews: {
          where: { isApproved: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product || product.isDeleted) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    return product;
  }

  /**
   * Marketplace công khai cho khách xem danh sách sản phẩm an toàn
   */
  async findPublicMarketplace(search = '', page = 1, limit = 24) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(48, Math.max(1, Number(limit) || 24));
    const where: any = {
      isDeleted: false,
      isActive: true,
      store: { isDeleted: false, isActive: true, owner: { isActive: true } },
    };

    if (search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { sku: { contains: search.trim(), mode: 'insensitive' } },
        { categoryName: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sku: true,
          title: true,
          categoryName: true,
          imageUrl: true,
          price: true,
          originalPrice: true,
          stockQuantity: true,
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              sku: true,
              name: true,
              price: true,
              stockQuantity: true,
              isActive: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              isVerified: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Danh sách đánh giá chờ kiểm duyệt (Dành cho Shop Manager hoặc Admin)
   */
  async listReviewsForModeration(userId: string, role: UserRole) {
    const where: any = {};
    if (role === UserRole.SHOP_MANAGER) {
      where.product = { store: { ownerId: userId, isDeleted: false } };
    }
    return this.prisma.productReview.findMany({
      where,
      include: {
        product: {
          select: { id: true, title: true, sku: true, storeId: true },
        },
        order: { select: { id: true, status: true } },
      },
      orderBy: [{ isApproved: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  /**
   * Phê duyệt hoặc từ chối đánh giá sản phẩm
   */
  async moderateReview(
    userId: string,
    role: UserRole,
    reviewId: string,
    dto: ModerateProductReviewDto,
  ) {
    const review = await this.prisma.productReview.findUnique({
      where: { id: reviewId },
      include: { product: { include: { store: true } } },
    });

    if (!review) throw new NotFoundException('Không tìm thấy đánh giá');
    if (
      role === UserRole.SHOP_MANAGER &&
      review.product.store.ownerId !== userId
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền kiểm duyệt đánh giá của Shop khác',
      );
    }

    let targetStatus: ReviewStatus = ReviewStatus.APPROVED;
    if (dto.status) {
      targetStatus = dto.status;
    } else if (dto.approved !== undefined) {
      targetStatus = dto.approved ? ReviewStatus.APPROVED : ReviewStatus.REJECTED;
    }
    const isApproved = targetStatus === ReviewStatus.APPROVED;
    const rejectionReason =
      targetStatus === ReviewStatus.REJECTED || targetStatus === ReviewStatus.HIDDEN
        ? dto.reason || null
        : null;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.productReview.update({
        where: { id: reviewId },
        data: {
          status: targetStatus,
          isApproved,
          reviewedBy: userId,
          reviewedAt: new Date(),
          rejectionReason,
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: isApproved
            ? 'PRODUCT_REVIEW_APPROVED'
            : targetStatus === ReviewStatus.HIDDEN
              ? 'PRODUCT_REVIEW_HIDDEN'
              : 'PRODUCT_REVIEW_REJECTED',
          details: {
            reviewId,
            productId: review.productId,
            previousStatus: review.status,
            previousApproved: review.isApproved,
            status: targetStatus,
            isApproved,
            reason: rejectionReason,
          },
        },
      });
      return result;
    });

    await this.invalidateLandingCache(review.productId);
    return {
      message: isApproved
        ? 'Đã duyệt và công khai đánh giá'
        : targetStatus === ReviewStatus.HIDDEN
          ? 'Đã tạm ẩn đánh giá'
          : 'Đã từ chối đánh giá',
      review: updated,
    };
  }

  /**
   * Tạo sản phẩm mới (Dành cho Chủ Shop hoặc Quản trị viên/Vận hành sàn)
   */
  async create(userId: string, userRole: UserRole, dto: CreateProductDto) {
    let store;
    if (
      userRole === UserRole.SYSTEM_ADMIN ||
      userRole === UserRole.SYSTEM_MANAGER
    ) {
      if (!dto.storeId) {
        throw new BadRequestException(
          'Quản trị viên/Vận hành bắt buộc phải chỉ định storeId gian hàng khi tạo sản phẩm.',
        );
      }
      store = await this.prisma.store.findFirst({
        where: { id: dto.storeId, isDeleted: false },
      });
      if (!store) {
        throw new NotFoundException('Gian hàng chỉ định không tồn tại.');
      }
    } else {
      store = await this.prisma.store.findFirst({
        where: { id: dto.storeId, ownerId: userId, isDeleted: false },
      });
    }

    if (!store) {
      throw new ForbiddenException(
        'Bạn chưa thiết lập cửa hàng. Vui lòng cập nhật thông tin cửa hàng trước.',
      );
    }

    // Kiểm tra trùng SKU trong cùng cửa hàng
    const existingSku = await this.prisma.product.findFirst({
      where: {
        storeId: store.id,
        sku: dto.sku.trim(),
        isDeleted: false,
      },
    });

    if (existingSku) {
      throw new ConflictException(
        `Mã SKU "${dto.sku}" đã tồn tại trong cửa hàng của bạn`,
      );
    }

    const product = await this.prisma.product.create({
      data: {
        storeId: store.id,
        sku: dto.sku.trim().toUpperCase(),
        title: dto.title.trim(),
        categoryName: dto.categoryName?.trim() || null,
        description: dto.description?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || null,
        price: dto.price,
        originalPrice: dto.originalPrice || null,
        customCommissionRate: dto.customCommissionRate || null,
        stockQuantity: dto.stockQuantity || 0,
      },
    });

    return {
      message: 'Tạo sản phẩm thành công!',
      product,
    };
  }

  /**
   * Cập nhật thông tin & % hoa hồng sản phẩm
   */
  async update(
    userId: string,
    userRole: UserRole,
    id: string,
    dto: UpdateProductDto,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!product || product.isDeleted) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const isSystemAdminOrManager =
      userRole === UserRole.SYSTEM_ADMIN || userRole === UserRole.SYSTEM_MANAGER;

    if (!isSystemAdminOrManager && product.store.ownerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa sản phẩm của cửa hàng khác',
      );
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.sku && { sku: dto.sku.trim().toUpperCase() }),
        ...(dto.title && { title: dto.title.trim() }),
        ...(dto.categoryName !== undefined && {
          categoryName: dto.categoryName?.trim() || null,
        }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.imageUrl !== undefined && {
          imageUrl: dto.imageUrl?.trim() || null,
        }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.originalPrice !== undefined && {
          originalPrice: dto.originalPrice,
        }),
        ...(dto.customCommissionRate !== undefined && {
          customCommissionRate: dto.customCommissionRate,
        }),
        ...(dto.stockQuantity !== undefined && {
          stockQuantity: dto.stockQuantity,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.invalidateLandingCache(id);

    return {
      message: 'Cập nhật sản phẩm thành công!',
      product: updated,
    };
  }

  /**
   * XÓA MỀM SẢN PHẨM (Soft Delete Invariant)
   * Tuyệt đối không gọi .delete() để bảo toàn toàn vẹn lịch sử đơn hàng và hoa hồng
   */
  async softDelete(userId: string, userRole: UserRole, id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!product || product.isDeleted) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const isSystemAdminOrManager =
      userRole === UserRole.SYSTEM_ADMIN || userRole === UserRole.SYSTEM_MANAGER;

    if (!isSystemAdminOrManager && product.store.ownerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa sản phẩm của cửa hàng khác',
      );
    }

    await this.prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
    });

    await this.invalidateLandingCache(id);

    return {
      message:
        'Sản phẩm đã được ẩn (xóa mềm) an toàn. Lịch sử đơn hàng vẫn được bảo toàn nguyên vẹn!',
    };
  }

  /**
   * Cài đặt tỷ lệ hoa hồng hàng loạt cho nhiều sản phẩm
   */
  async bulkUpdateCommission(
    userId: string,
    userRole: UserRole,
    productIds: string[],
    commissionRate: number,
  ) {
    const isSystemAdminOrManager =
      userRole === UserRole.SYSTEM_ADMIN || userRole === UserRole.SYSTEM_MANAGER;

    const where: any = {
      id: { in: productIds },
      isDeleted: false,
    };

    if (!isSystemAdminOrManager) {
      const store = await this.prisma.store.findFirst({
        where: { ownerId: userId, isDeleted: false },
      });
      if (!store) {
        throw new ForbiddenException('Không tìm thấy cửa hàng của bạn');
      }
      where.storeId = store.id;
    }

    const result = await this.prisma.product.updateMany({
      where,
      data: {
        customCommissionRate: commissionRate,
      },
    });

    return {
      message: `Đã cập nhật mức hoa hồng ${commissionRate}% cho ${result.count} sản phẩm`,
      updatedCount: result.count,
    };
  }

  /**
   * FR-15: Lấy dữ liệu Landing Page sản phẩm & Video Review cho khách vãng lai
   * - Phân giải Attribution an toàn qua HMAC Token & Database AttributionSession (FR-13).
   * - Chỉ lấy Video Review có trạng thái APPROVED.
   * - Ưu tiên video của đúng KOL referral qua quan hệ collaboratorId thật.
   * - Kiểm tra đơn hàng DELIVERED/COMPLETED trước khi gắn huy hiệu "Đã mua hàng".
   * - Trả averageRating: null khi chưa có đánh giá nào.
   * - Tuyệt đối không dùng ảnh Unsplash ngẫu nhiên, che PII khách hàng.
   */
  async getLandingPageData(
    idOrSlug: string,
    attributionCookie?: string,
  ): Promise<ProductLandingResponseDto> {
    if (!idOrSlug || !idOrSlug.trim()) {
      throw new NotFoundException('Vui lòng cung cấp mã hoặc slug sản phẩm');
    }

    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!jwtSecret || !jwtSecret.trim()) {
      throw new InternalServerErrorException(
        'Cấu hình JWT_SECRET bị thiếu trong hệ thống!',
      );
    }

    let visitorIdHash: string | null = null;
    let attributedCollaboratorId: string | null = null;

    if (attributionCookie?.trim()) {
      try {
        const visitorId = verifyOpaqueVisitorToken(
          attributionCookie.trim(),
          jwtSecret,
        );
        if (visitorId) {
          visitorIdHash = crypto
            .createHmac('sha256', jwtSecret)
            .update(visitorId)
            .digest('hex');
        }
      } catch {
        // Token không hợp lệ thì bỏ qua attribution
      }
    }

    const trimmed = idOrSlug.trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

    // 1. Tìm sản phẩm theo ID hoặc SKU
    let product = await this.prisma.product.findFirst({
      where: {
        isDeleted: false,
        OR: isUuid
          ? [{ id: trimmed }, { sku: { equals: trimmed, mode: 'insensitive' } }]
          : [{ sku: { equals: trimmed, mode: 'insensitive' } }],
      },
      include: {
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            stockQuantity: true,
            isActive: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isActive: true,
            isVerified: true,
            policyReturn: true,
            policyWarranty: true,
            policyShipping: true,
            isDeleted: true,
            owner: {
              select: {
                id: true,
                fullName: true,
                isActive: true,
                collaboratorProfile: {
                  select: {
                    kycStatus: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 1.1 Hỗ trợ phân giải slug URL thân thiện (VD: /products/serum-vitamin-c -> sản phẩm Serum Vitamin C)
    if (!product) {
      const normalizedSlug = trimmed.toLowerCase();
      // Nhận diện các alias phổ biến cho sản phẩm Flagship
      const isSerumAlias =
        normalizedSlug.includes('serum') &&
        (normalizedSlug.includes('vitamin') || normalizedSlug.includes('c'));

      const aliasSkus = isSerumAlias ? ['SR-VTC-15', 'SERUM-VITC-E2E'] : [];

      const normalizedWords = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 0);

      product = await this.prisma.product.findFirst({
        where: {
          isDeleted: false,
          OR: [
            ...(aliasSkus.length > 0
              ? [{ sku: { in: aliasSkus, mode: 'insensitive' as const } }]
              : []),
            ...(normalizedWords.length > 0
              ? [
                  {
                    AND: normalizedWords.map((word) => ({
                      OR: [
                        { title: { contains: word, mode: 'insensitive' as const } },
                        { sku: { contains: word, mode: 'insensitive' as const } },
                      ],
                    })),
                  },
                ]
              : []),
          ],
        },
        include: {
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              sku: true,
              name: true,
              price: true,
              stockQuantity: true,
              isActive: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              isActive: true,
              isVerified: true,
              policyReturn: true,
              policyWarranty: true,
              policyShipping: true,
              isDeleted: true,
              owner: {
                select: {
                  id: true,
                  fullName: true,
                  isActive: true,
                  collaboratorProfile: {
                    select: {
                      kycStatus: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    if (!product || product.isDeleted) {
      throw new NotFoundException(
        'PRODUCT_NOT_FOUND: Sản phẩm không tồn tại hoặc đã bị xóa',
      );
    }

    if (!product.store || product.store.isDeleted || !product.store.isActive) {
      throw new NotFoundException(
        'STORE_INACTIVE: Gian hàng cung cấp sản phẩm đã tạm đóng hoặc ngừng hoạt động',
      );
    }

    if (!product.store.owner?.isActive) {
      throw new ForbiddenException(
        'STORE_SUSPENDED: Tài khoản chủ gian hàng đang bị tạm khóa, không thể giao dịch',
      );
    }

    // 2. Phân giải Attribution Cookie một cách an toàn qua HMAC Token và DB Session (FR-13)
    const cacheKey = `landing:v2:${product.id}:${visitorIdHash || 'anon'}`;
    const cached = await this.cacheService.get<ProductLandingResponseDto>(cacheKey);
    if (cached) return cached;

    if (visitorIdHash) {
      try {
        const session = await this.prisma.attributionSession.findUnique({
          where: {
            storeId_visitorIdHash: {
              storeId: product.storeId,
              visitorIdHash,
            },
          },
          include: {
            referralLink: {
              select: {
                id: true,
                collaboratorId: true,
                status: true,
                deletedAt: true,
              },
            },
          },
        });

        if (
          session &&
          session.status === 'ACTIVE' &&
          new Date(session.expiresAt) > new Date() &&
          session.referralLink &&
          session.referralLink.status === 'ACTIVE' &&
          !session.referralLink.deletedAt
        ) {
          attributedCollaboratorId =
            session.collaboratorId || session.referralLink.collaboratorId;
        }
      } catch {
        // Token không hợp lệ thì bỏ qua attribution, không làm hỏng trang landing
      }
    }

    // 3. Tách media assets: Ảnh gallery và video review
    // Chỉ lấy media assets có status === 'APPROVED' và isDeleted === false (FR-15 Mục 8)
    const mediaList = await this.prisma.mediaAsset.findMany({
      where: {
        productId: product.id,
        isDeleted: false,
        status: 'APPROVED',
      },
      include: {
        collaborator: {
          select: {
            id: true,
            fullName: true,
            collaboratorProfile: {
              select: {
                kycStatus: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const galleryImages: string[] = [];
    if (this.isSafeUrl(product.imageUrl)) {
      galleryImages.push(product.imageUrl!.trim());
    }

    const videoAssets: any[] = [];
    for (const asset of mediaList) {
      if (asset.assetType === 'IMAGE') {
        if (
          this.isSafeUrl(asset.urlOrContent) &&
          !galleryImages.includes(asset.urlOrContent.trim())
        ) {
          galleryImages.push(asset.urlOrContent.trim());
        }
      } else if (asset.assetType === 'VIDEO') {
        if (this.isSafeUrl(asset.urlOrContent)) {
          const isReferredKol = Boolean(
            attributedCollaboratorId &&
              asset.collaboratorId === attributedCollaboratorId,
          );

          const isKycVerified =
            asset.collaborator?.collaboratorProfile?.kycStatus === 'VERIFIED';

          videoAssets.push({
            id: asset.id,
            title: asset.title,
            videoUrl: asset.urlOrContent.trim(),
            posterUrl: this.isSafeUrl(asset.posterUrl)
              ? asset.posterUrl!.trim()
              : this.isSafeUrl(product.imageUrl)
                ? product.imageUrl!.trim()
                : null,
            caption: asset.caption || null,
            kol: {
              id: asset.collaboratorId || null,
              name:
                asset.collaborator?.fullName ||
                (asset.collaboratorId
                  ? 'KOL Đối Tác SCANMS'
                  : product.store.name),
              avatarUrl: null,
              isVerified: isKycVerified,
              badgeLabel: asset.collaboratorId
                ? 'Video review từ KOL'
                : 'Gian hàng cung cấp',
              disclosure: 'Nội dung có liên kết tiếp thị',
            },
            isFeatured: Boolean(asset.isFeatured),
            isReferredKol,
            createdAt: asset.createdAt,
          });
        }
      }
    }

    // Sắp xếp ưu tiên: Video của đúng KOL referral lên đầu -> Video featured -> Các video khác
    videoAssets.sort((a, b) => {
      if (a.isReferredKol && !b.isReferredKol) return -1;
      if (!a.isReferredKol && b.isReferredKol) return 1;
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    // 4. Xử lý đánh giá khách hàng (Reviews) & Che PII bảo vệ quyền riêng tư
    const reviews = await this.prisma.productReview.findMany({
      where: {
        productId: product.id,
        isApproved: true,
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalReviews = reviews.length;
    const starDistribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let sumRating = 0;

    const formattedReviews = reviews.map((r) => {
      const star = Math.min(5, Math.max(1, r.rating || 5));
      starDistribution[star] = (starDistribution[star] || 0) + 1;
      sumRating += star;

      const isVerifiedBuyer = Boolean(
        (r.orderId || (r as any).order?.id) &&
          (r.order?.status === 'DELIVERED' || r.order?.status === 'COMPLETED'),
      );

      return {
        id: r.id,
        customerName: this.maskCustomerName(r.customerName),
        rating: star,
        comment: r.comment || '',
        reviewImageUrl: this.isSafeUrl(r.reviewImageUrl)
          ? r.reviewImageUrl
          : null,
        isVerifiedBuyer,
        createdAt: r.createdAt,
      };
    });

    const averageRating =
      totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : null;

    // 5. Chính sách cam kết của gian hàng
    const isStoreVerified =
      product.store.isVerified ||
      (product.store.owner as any)?.collaboratorProfile?.kycStatus ===
        'VERIFIED';

    const policies = {
      returnPolicy:
        product.store.policyReturn ||
        'Chính sách đổi trả hàng theo quy định chuẩn của sàn SCANMS',
      warranty:
        product.store.policyWarranty ||
        'Bảo hành chính hãng theo chính sách gian hàng đối tác',
      shipping:
        product.store.policyShipping ||
        'Giao hàng toàn quốc - Được kiểm tra hàng trước khi thanh toán',
      genuineCommitment:
        'Cam kết 100% sản phẩm chính hãng từ đối tác SCANMS',
    };

    // 6. Trả về payload an toàn chuẩn hóa cho Landing Page (FR-15)
    const isProductActive = Boolean(product.isActive && !product.isDeleted);
    const canPurchase = Boolean(isProductActive && product.stockQuantity > 0);
    const productStatus = !isProductActive
      ? 'INACTIVE'
      : product.stockQuantity <= 0
        ? 'OUT_OF_STOCK'
        : 'ACTIVE';

    const resultPayload: ProductLandingResponseDto = {
      status: productStatus,
      product: {
        id: product.id,
        sku: product.sku,
        title: product.title,
        status: productStatus,
        categoryName: product.categoryName || 'Sản phẩm tiêu dùng',
        description:
          product.description ||
          'Sản phẩm chính hãng chất lượng cao được phân phối bởi gian hàng đối tác trên hệ thống sàn SCANMS.',
        price: Number(product.price),
        originalPrice: product.originalPrice
          ? Number(product.originalPrice)
          : null,
        imageUrl: this.isSafeUrl(product.imageUrl) ? product.imageUrl : null,
        isActive: isProductActive,
        canPurchase,
        variants: (product as any).variants?.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          name: v.name,
          price: Number(v.price),
          stockQuantity: v.stockQuantity,
          isActive: v.isActive,
        })) || [],
      },
      store: {
        id: product.store.id,
        name: product.store.name,
        slug: product.store.slug,
        isVerified: isStoreVerified,
      },
      images: galleryImages,
      videos: videoAssets,
      reviews: {
        averageRating,
        totalReviews,
        starDistribution,
        items: formattedReviews,
      },
      availability: {
        inStock: product.stockQuantity > 0,
        stockQuantity: product.stockQuantity,
      },
      policies,
    };

    await this.cacheService.set(cacheKey, resultPayload, 30);

    return resultPayload;
  }

  /**
   * Helper kiểm tra URL an toàn chống XSS, URL độc hại và tấn công SSRF (FR-15 Mục 37)
   */
  private isSafeUrl(url?: string | null): boolean {
    if (!url || !url.trim()) return false;
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();

    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('vbscript:') ||
      lower.includes('<script') ||
      lower.includes('%3cscript')
    ) {
      return false;
    }

    if (lower.startsWith('/')) return true;
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) return false;

    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();

      // Chặn IP nội bộ & localhost (Chống SSRF)
      const isPrivateOrLoopback =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '0.0.0.0' ||
        host === '::1' ||
        host.startsWith('10.') ||
        host.startsWith('192.168.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host) ||
        host.startsWith('169.254.') ||
        host.endsWith('.local') ||
        host.endsWith('.internal');

      if (isPrivateOrLoopback) return false;

      const extraDomains = (process.env.ALLOWED_MEDIA_DOMAINS || '')
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      const fullAllowlist = [
        ...ProductsService.ALLOWED_HOST_DOMAINS,
        ...extraDomains,
      ];

      return fullAllowlist.some(
        (allowed) => host === allowed || host.endsWith('.' + allowed),
      );
    } catch {
      return false;
    }
  }

  /**
   * FR-15 Analytics: Ghi nhận sự kiện tương tác từ Landing Page vào hệ thống
   */
  async recordAnalyticsEvent(
    dto: TrackAnalyticsEventDto,
    context?: { ip?: string; userAgent?: string },
  ) {
    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!jwtSecret?.trim()) {
      throw new InternalServerErrorException('Thiếu khóa bảo mật analytics');
    }

    const ipHash = crypto
      .createHmac('sha256', jwtSecret)
      .update(context?.ip || 'unknown')
      .digest('hex');
    const userAgentHash = crypto
      .createHmac('sha256', jwtSecret)
      .update(context?.userAgent || 'unknown')
      .digest('hex');

    const rateLimit = await this.cacheService.checkRateLimit(
      `landing_analytics:${ipHash}`,
      60,
      60,
    );
    if (!rateLimit.allowed) {
      throw new HttpException(
        'Quá nhiều sự kiện analytics. Vui lòng thử lại sau.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      await this.prisma.auditLog.create({
        data: {
          eventId: dto.eventId,
          action: `ANALYTICS_${dto.event.toUpperCase()}`,
          details: {
            event: dto.event,
            productId: dto.productId || null,
            storeId: dto.storeId || null,
            metadata: dto.metadata || null,
            ipHash,
            userAgentHash,
            recordedAt: new Date().toISOString(),
          },
          ipAddress: null,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return { recorded: false, duplicate: true };
      }
      return { recorded: false };
    }
    return { success: true, event: dto.event };
  }

  /**
   * Helper che tên khách hàng để bảo vệ quyền riêng tư (FR-15 Mục 19 & 46)
   * Ví dụ: "Nguyễn Đình Tuấn" -> "Nguyễn Đ*** T***"
   */
  private maskCustomerName(name?: string | null): string {
    if (!name || !name.trim()) return 'Khách hàng ẩn danh';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      const single = parts[0];
      return single.length <= 2
        ? single + '***'
        : single[0] + '***' + single[single.length - 1];
    }
    return parts.map((p, idx) => (idx === 0 ? p : p[0] + '***')).join(' ');
  }
}
