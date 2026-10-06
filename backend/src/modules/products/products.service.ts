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
import { UpdateVariantSamplePolicyDto } from './dto/update-variant-sample-policy.dto';
import { SyncProductVariantsDto } from './dto/sync-product-variants.dto';
import { TrackAnalyticsEventDto } from './dto/track-event.dto';
import { ProductLandingResponseDto } from './dto/landing-page-response.dto';
import {
  UserRole,
  ReviewStatus,
  ProductModerationStatus,
} from '@prisma/client';
import { verifyOpaqueVisitorToken } from '../referral-links/utils/short-code.generator';
import { publicReturnPolicy } from '../stores/store-policy.util';
import * as crypto from 'crypto';

@Injectable()
export class ProductsService {
  private static readonly PRODUCT_EVIDENCE_MARKER = 'SCANMS_PRODUCT_EVIDENCE:';
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
    'unsplash.com',
    'images.unsplash.com',
    'plus.unsplash.com',
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

  private buildProductEvidenceRows(
    input: {
      originProofLinks?: string[];
      originProofImages?: string[];
      labelProofLinks?: string[];
      labelProofImages?: string[];
    },
    storeId: string,
    productId: string,
    replaceKinds?: string[],
  ) {
    const groups = [
      {
        kind: 'ORIGIN_LINK',
        title: 'Minh chứng nguồn gốc · Link',
        values: input.originProofLinks,
      },
      {
        kind: 'ORIGIN_IMAGE',
        title: 'Minh chứng nguồn gốc · Ảnh',
        values: input.originProofImages,
      },
      {
        kind: 'LABEL_LINK',
        title: 'Minh chứng nhãn mác · Link',
        values: input.labelProofLinks,
      },
      {
        kind: 'LABEL_IMAGE',
        title: 'Minh chứng nhãn mác · Ảnh',
        values: input.labelProofImages,
      },
    ];
    return groups
      .filter(
        (group) =>
          group.values !== undefined &&
          (!replaceKinds || replaceKinds.includes(group.kind)),
      )
      .flatMap((group) =>
        (group.values || [])
          .map((url) => ({
            storeId,
            productId,
            title: group.title,
            assetType: 'COPYWRITE_TEXT' as const,
            caption: `${ProductsService.PRODUCT_EVIDENCE_MARKER}${group.kind}`,
            urlOrContent: url.trim(),
            status: 'PENDING' as const,
          }))
          .filter((item) => item.urlOrContent),
      );
  }

  private assertProductSubmissionComplete(dto: CreateProductDto): void {
    const issues: string[] = [];
    const requiredText: Array<[string | undefined, string]> = [
      [dto.sku, 'Mã SKU sản phẩm'],
      [dto.title, 'Tên sản phẩm'],
      [dto.categoryName, 'Danh mục sản phẩm'],
      [dto.imageUrl, 'Ảnh chính sản phẩm'],
      [dto.description, 'Mô tả chi tiết sản phẩm'],
      [dto.ingredients, 'Thành phần sản phẩm'],
      [dto.origin, 'Xuất xứ sản phẩm'],
      [dto.labelInfo, 'Thông tin nhãn mác, cảnh báo và hướng dẫn sử dụng'],
    ];
    for (const [value, label] of requiredText) {
      if (typeof value !== 'string' || !value.trim()) issues.push(label);
    }

    if (!Number.isFinite(dto.price) || dto.price <= 0) {
      issues.push('Giá bán sản phẩm phải lớn hơn 0');
    }
    if (!Number.isInteger(dto.stockQuantity) || dto.stockQuantity < 0) {
      issues.push('Số lượng tồn kho phải là số nguyên từ 0 trở lên');
    }
    if (
      dto.sampleEnabled &&
      (!Number.isInteger(dto.sampleQuota) || Number(dto.sampleQuota) <= 0)
    ) {
      issues.push(
        'Nếu bật cấp sản phẩm mẫu, tổng suất mẫu phải là số nguyên lớn hơn 0',
      );
    }

    const hasOriginEvidence = [
      ...(dto.originProofLinks || []),
      ...(dto.originProofImages || []),
    ].some((item) => typeof item === 'string' && item.trim());
    if (!hasOriginEvidence)
      issues.push('Minh chứng nguồn gốc: thêm ít nhất một link hoặc ảnh');

    const hasLabelEvidence = [
      ...(dto.labelProofLinks || []),
      ...(dto.labelProofImages || []),
    ].some((item) => typeof item === 'string' && item.trim());
    if (!hasLabelEvidence)
      issues.push('Minh chứng nhãn mác: thêm ít nhất một link hoặc ảnh');

    const variants = dto.variants || [];
    if (!variants.length) {
      issues.push('Thêm ít nhất một phân loại SKU cho sản phẩm');
    }

    const categoryFields: Record<string, Array<[string, string]>> = {
      'Mỹ phẩm & Chăm sóc da': [
        ['volume', 'Dung tích / khối lượng'],
        ['formula', 'Dạng / công thức'],
        ['package', 'Quy cách'],
      ],
      'Trang điểm & Làm đẹp': [
        ['shade', 'Màu / tông'],
        ['finish', 'Chất / hiệu ứng'],
        ['volume', 'Dung tích / khối lượng'],
      ],
      'Chăm sóc cơ thể & Tóc': [
        ['volume', 'Dung tích / khối lượng'],
        ['scent', 'Mùi hương'],
        ['formula', 'Dạng sản phẩm'],
      ],
      'Thực phẩm chức năng & Sức khỏe': [
        ['weight', 'Khối lượng / số lượng'],
        ['flavor', 'Vị / hương'],
        ['package', 'Quy cách đóng gói'],
      ],
      'Thiết bị điện tử & Phụ kiện': [
        ['model', 'Mẫu / phiên bản'],
        ['color', 'Màu sắc'],
        ['capacity', 'Cấu hình / dung lượng'],
      ],
      'Thời trang & Phụ kiện': [
        ['color', 'Màu sắc'],
        ['size', 'Size'],
        ['style', 'Kiểu / mẫu'],
      ],
    };
    const expectedFields = categoryFields[dto.categoryName?.trim()] || [
      ['type', 'Loại / mẫu'],
      ['specification', 'Kích thước / quy cách'],
      ['color', 'Màu / phiên bản'],
    ];
    for (const [index, variant] of variants.entries()) {
      const missingAttributes = expectedFields
        .filter(([key]) => !variant.attributes?.[key]?.trim())
        .map(([, label]) => label);
      if (missingAttributes.length) {
        issues.push(
          `Phân loại ${index + 1}: thiếu ${missingAttributes.join(', ')}`,
        );
      }
      if (!variant.name?.trim())
        issues.push(`Phân loại ${index + 1}: thiếu tên hiển thị`);
      if (!variant.sku?.trim())
        issues.push(`Phân loại ${index + 1}: thiếu mã SKU`);
      if (!variant.imageUrl?.trim())
        issues.push(`Phân loại ${index + 1}: thiếu ảnh riêng`);
      if (!Number.isFinite(variant.price) || Number(variant.price) <= 0) {
        issues.push(`Phân loại ${index + 1}: giá bán phải lớn hơn 0`);
      }
      if (
        !Number.isInteger(variant.stockQuantity) ||
        variant.stockQuantity < 0
      ) {
        issues.push(
          `Phân loại ${index + 1}: tồn kho phải là số nguyên từ 0 trở lên`,
        );
      }
    }

    if (issues.length) {
      throw new BadRequestException(
        `Hoàn thiện thông tin bắt buộc trước khi gửi duyệt:\n${issues.map((issue) => `• ${issue}`).join('\n')}`,
      );
    }
  }

  private attachProductEvidence<T extends { id: string }>(
    product: T,
    evidence: Array<{ caption: string | null; urlOrContent: string }> = [],
  ) {
    const evidenceUrls = (kind: string) =>
      evidence
        .filter(
          (item) =>
            item.caption ===
            `${ProductsService.PRODUCT_EVIDENCE_MARKER}${kind}`,
        )
        .map((item) => item.urlOrContent);
    return {
      ...product,
      originProofLinks: evidenceUrls('ORIGIN_LINK'),
      originProofImages: evidenceUrls('ORIGIN_IMAGE'),
      labelProofLinks: evidenceUrls('LABEL_LINK'),
      labelProofImages: evidenceUrls('LABEL_IMAGE'),
    };
  }

  private async loadProductEvidence(productIds: string[]) {
    const byProduct = new Map<
      string,
      Array<{ caption: string | null; urlOrContent: string }>
    >();
    if (!productIds.length) return byProduct;
    const rows = await this.prisma.mediaAsset.findMany({
      where: {
        productId: { in: productIds },
        assetType: 'COPYWRITE_TEXT',
        caption: { startsWith: ProductsService.PRODUCT_EVIDENCE_MARKER },
        isDeleted: false,
      },
      select: { productId: true, caption: true, urlOrContent: true },
      orderBy: { createdAt: 'asc' },
    });
    for (const row of rows) {
      if (!row.productId) continue;
      const entries = byProduct.get(row.productId) || [];
      entries.push({ caption: row.caption, urlOrContent: row.urlOrContent });
      byProduct.set(row.productId, entries);
    }
    return byProduct;
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

    const UUID_REGEX =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (query.storeId && !UUID_REGEX.test(query.storeId)) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const where: any = {
      isDeleted: false,
    };

    if (query.storeId) {
      where.storeId = query.storeId;
      if (viewer?.role !== UserRole.SHOP_MANAGER) {
        where.isActive = true;
      }
      where.store = {
        isDeleted: false,
        isActive: true,
        ...(viewer?.role === UserRole.SHOP_MANAGER
          ? { ownerId: viewer.id }
          : {}),
        ...(viewer?.role === UserRole.COLLABORATOR
          ? { isVerified: true, onboardingStatus: 'VERIFIED' }
          : {}),
      };
      if (viewer?.role === UserRole.COLLABORATOR) {
        where.moderationStatus = ProductModerationStatus.APPROVED;
      }
    } else if (viewer?.role === UserRole.SHOP_MANAGER) {
      where.store = { ownerId: viewer.id, isDeleted: false };
    } else if (viewer?.role === UserRole.COLLABORATOR) {
      where.isActive = true;
      where.moderationStatus = ProductModerationStatus.APPROVED;
      where.store = {
        isDeleted: false,
        isActive: true,
        isVerified: true,
        onboardingStatus: 'VERIFIED',
      };
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
          mediaAssets: {
            where: { isDeleted: false, assetType: 'IMAGE' },
            select: { id: true, urlOrContent: true },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              sku: true,
              name: true,
              attributes: true,
              imageUrl: true,
              price: true,
              stockQuantity: true,
              isActive: true,
              sampleEnabled: true,
              sampleQuota: true,
              sampleGrantedCount: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          _count: {
            select: { mediaAssets: { where: { isDeleted: false } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const canViewEvidence =
      viewer?.role === UserRole.SHOP_MANAGER ||
      viewer?.role === UserRole.SYSTEM_MANAGER ||
      viewer?.role === UserRole.SYSTEM_ADMIN;
    const evidenceByProduct = canViewEvidence
      ? await this.loadProductEvidence(items.map((product) => product.id))
      : new Map<
          string,
          Array<{ caption: string | null; urlOrContent: string }>
        >();

    return {
      items: canViewEvidence
        ? items.map((product) =>
            this.attachProductEvidence(
              product,
              evidenceByProduct.get(product.id),
            ),
          )
        : items,
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
              moderationStatus: ProductModerationStatus.APPROVED,
              store: {
                isDeleted: false,
                isActive: true,
                isVerified: true,
                onboardingStatus: 'VERIFIED',
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

    const canViewEvidence =
      viewer?.role === UserRole.SHOP_MANAGER ||
      viewer?.role === UserRole.SYSTEM_MANAGER ||
      viewer?.role === UserRole.SYSTEM_ADMIN;
    if (!canViewEvidence) return product;
    const evidenceByProduct = await this.loadProductEvidence([product.id]);
    return this.attachProductEvidence(
      product,
      evidenceByProduct.get(product.id),
    );
  }

  /**
   * Marketplace công khai cho khách xem danh sách sản phẩm an toàn với bộ lọc thực tế
   */
  async findPublicMarketplace(
    queryOrSearch?:
      | string
      | {
          search?: string;
          category?: string;
          storeId?: string;
          minPrice?: number;
          maxPrice?: number;
          sortBy?: string;
          page?: number;
          limit?: number;
        },
    pageArg = 1,
    limitArg = 24,
    includeCommission = false,
  ) {
    let search = '';
    let category: string | undefined;
    let storeId: string | undefined;
    let minPrice: number | undefined;
    let maxPrice: number | undefined;
    let sortBy = 'newest';
    let page = pageArg;
    let limit = limitArg;

    if (typeof queryOrSearch === 'object' && queryOrSearch !== null) {
      search = queryOrSearch.search || '';
      category = queryOrSearch.category;
      storeId = queryOrSearch.storeId;
      minPrice = queryOrSearch.minPrice;
      maxPrice = queryOrSearch.maxPrice;
      sortBy = queryOrSearch.sortBy || 'newest';
      page = queryOrSearch.page || 1;
      limit = queryOrSearch.limit || 24;
    } else if (typeof queryOrSearch === 'string') {
      search = queryOrSearch;
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(48, Math.max(1, Number(limit) || 24));

    const where: any = {
      isDeleted: false,
      isActive: true,
      moderationStatus: ProductModerationStatus.APPROVED,
      store: {
        isDeleted: false,
        isActive: true,
        isVerified: true,
        onboardingStatus: 'VERIFIED',
        owner: { isActive: true },
      },
    };

    if (search?.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { sku: { contains: search.trim(), mode: 'insensitive' } },
        { categoryName: { contains: search.trim(), mode: 'insensitive' } },
        { store: { name: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    if (category && category !== 'all') {
      where.categoryName = { equals: category.trim(), mode: 'insensitive' };
    }

    if (storeId && storeId !== 'all') {
      where.storeId = storeId.trim();
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined && !isNaN(minPrice))
        where.price.gte = minPrice;
      if (maxPrice !== undefined && !isNaN(maxPrice))
        where.price.lte = maxPrice;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (sortBy === 'price_desc') {
      orderBy = { price: 'desc' };
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy,
        select: {
          id: true,
          sku: true,
          title: true,
          description: true,
          categoryName: true,
          imageUrl: true,
          price: true,
          originalPrice: true,
          ...(includeCommission ? { customCommissionRate: true } : {}),
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
              ...(includeCommission ? { defaultCommissionRate: true } : {}),
            },
          },
          mediaAssets: {
            where: { assetType: 'IMAGE' },
            take: 4,
            select: {
              id: true,
              urlOrContent: true,
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
   * Lấy danh sách danh mục sản phẩm thực tế trên Marketplace
   */
  async getPublicCategories() {
    const products = await this.prisma.product.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        moderationStatus: ProductModerationStatus.APPROVED,
        categoryName: { not: null },
        store: {
          isDeleted: false,
          isActive: true,
          isVerified: true,
          onboardingStatus: 'VERIFIED',
          owner: { isActive: true },
        },
      },
      select: { categoryName: true },
    });

    const countsMap = new Map<string, number>();
    products.forEach((p) => {
      const cat = p.categoryName?.trim();
      if (cat) {
        countsMap.set(cat, (countsMap.get(cat) || 0) + 1);
      }
    });

    return Array.from(countsMap.entries()).map(([name, count]) => ({
      name,
      count,
    }));
  }

  /**
   * Lấy danh sách các gian hàng đối tác đang có sản phẩm kinh doanh
   */
  async getPublicStores() {
    return this.prisma.store.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        isVerified: true,
        onboardingStatus: 'VERIFIED',
        owner: { isActive: true },
        products: {
          some: {
            isDeleted: false,
            isActive: true,
            moderationStatus: ProductModerationStatus.APPROVED,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        isVerified: true,
        _count: {
          select: {
            products: {
              where: {
                isDeleted: false,
                isActive: true,
                moderationStatus: ProductModerationStatus.APPROVED,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
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
      targetStatus = dto.approved
        ? ReviewStatus.APPROVED
        : ReviewStatus.REJECTED;
    }
    const isApproved = targetStatus === ReviewStatus.APPROVED;
    const rejectionReason =
      targetStatus === ReviewStatus.REJECTED ||
      targetStatus === ReviewStatus.HIDDEN
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
  async listProductsForModeration(status = 'DRAFT') {
    const validStatuses = ['DRAFT', 'APPROVED', 'REJECTED', 'ALL'];
    const normalizedStatus = validStatuses.includes(status.toUpperCase())
      ? status.toUpperCase()
      : 'DRAFT';
    const items = await this.prisma.product.findMany({
      where: {
        isDeleted: false,
        ...(normalizedStatus === 'ALL'
          ? {}
          : { moderationStatus: normalizedStatus as ProductModerationStatus }),
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            ownerId: true,
            owner: { select: { id: true, fullName: true, email: true } },
          },
        },
        mediaAssets: {
          where: { isDeleted: false, assetType: 'IMAGE' },
          select: { id: true, urlOrContent: true, title: true },
          orderBy: { createdAt: 'asc' },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            sku: true,
            attributes: true,
            price: true,
            imageUrl: true,
            stockQuantity: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const evidenceByProduct = await this.loadProductEvidence(
      items.map((product) => product.id),
    );
    return {
      items: items.map((product) =>
        this.attachProductEvidence(product, evidenceByProduct.get(product.id)),
      ),
      total: items.length,
    };
  }

  async moderateProduct(
    userId: string,
    productId: string,
    dto: { status: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
      include: {
        store: { select: { id: true, name: true, ownerId: true } },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');
    if (product.moderationStatus !== ProductModerationStatus.DRAFT) {
      throw new BadRequestException(
        'Chỉ sản phẩm đang chờ kiểm duyệt mới được xử lý.',
      );
    }
    const reason = dto.reason?.trim() || null;
    if (dto.status === 'REJECTED' && (!reason || reason.length < 3)) {
      throw new BadRequestException(
        'Vui lòng ghi rõ lý do từ chối (ít nhất 3 ký tự).',
      );
    }

    const reviewedAt = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.product.update({
        where: { id: productId },
        data: {
          moderationStatus: dto.status,
          moderationReason: dto.status === 'REJECTED' ? reason : null,
          moderatedAt: reviewedAt,
          moderatedById: userId,
          isActive: dto.status === 'APPROVED',
        },
      });
      await tx.notification.create({
        data: {
          userId: product.store.ownerId,
          title:
            dto.status === 'APPROVED'
              ? 'Sản phẩm đã được duyệt'
              : 'Sản phẩm cần chỉnh sửa',
          message:
            dto.status === 'APPROVED'
              ? 'Sản phẩm "' +
                product.title +
                '" đã được SCANMS phê duyệt và có thể hiển thị trên sàn.'
              : 'Sản phẩm "' +
                product.title +
                '" chưa được duyệt. Lý do: ' +
                reason,
          type:
            dto.status === 'APPROVED' ? 'PRODUCT_APPROVED' : 'PRODUCT_REJECTED',
          data: { productId, storeId: product.store.id, status: dto.status },
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action:
            dto.status === 'APPROVED'
              ? 'PRODUCT_MODERATION_APPROVED'
              : 'PRODUCT_MODERATION_REJECTED',
          details: {
            productId,
            storeId: product.store.id,
            previousStatus: product.moderationStatus,
            status: dto.status,
            reason,
          },
        },
      });
      return result;
    });

    await this.invalidateLandingCache(productId);
    return {
      message:
        dto.status === 'APPROVED'
          ? 'Đã phê duyệt và công khai sản phẩm.'
          : 'Đã từ chối sản phẩm và gửi lý do cho Shop.',
      product: updated,
    };
  }

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

    this.assertProductSubmissionComplete(dto);

    if (
      userRole === UserRole.SHOP_MANAGER &&
      (!store.isVerified || store.onboardingStatus !== 'VERIFIED')
    ) {
      throw new ForbiddenException(
        'Gian hàng chỉ được đăng sản phẩm và nhập kho sau khi Ban Quản Trị xác minh hồ sơ.',
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

    const variants = dto.variants || [];
    const variantSkus = variants.map((variant) =>
      variant.sku.trim().toUpperCase(),
    );
    if (
      variants.some(
        (variant) =>
          variant.id || !variant.name.trim() || !variant.imageUrl?.trim(),
      ) ||
      variantSkus.some((sku) => !sku) ||
      new Set(variantSkus).size !== variantSkus.length
    ) {
      throw new BadRequestException(
        'Mỗi phân loại mới cần tên, SKU duy nhất và ảnh riêng.',
      );
    }
    if (variantSkus.length) {
      const conflicts = await this.prisma.productVariant.findMany({
        where: { sku: { in: variantSkus } },
        select: { sku: true },
      });
      if (conflicts.length)
        throw new ConflictException(
          `SKU phân loại đã tồn tại: ${conflicts.map((item) => item.sku).join(', ')}`,
        );
    }
    const preparedVariants = variants.map((variant, index) => {
      const raw = variant.attributes || {};
      if (
        Object.keys(raw).length > 4 ||
        Object.entries(raw).some(
          ([key, value]) =>
            !/^[a-z][a-z0-9_]{0,29}$/.test(key) ||
            typeof value !== 'string' ||
            value.trim().length > 80,
        )
      ) {
        throw new BadRequestException('Thuộc tính phân loại không hợp lệ.');
      }
      return {
        sku: variantSkus[index],
        name: variant.name.trim(),
        attributes: Object.fromEntries(
          Object.entries(raw)
            .map(([key, value]) => [key, value.trim()])
            .filter(([, value]) => value),
        ),
        imageUrl: variant.imageUrl!.trim(),
        price: variant.price ?? dto.price,
        stockQuantity: variant.stockQuantity,
      };
    });
    this.assertDistinctVariantAttributes(
      preparedVariants.map((variant) => variant.attributes),
    );

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
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
          stockQuantity: preparedVariants.length
            ? preparedVariants.reduce(
                (sum, variant) => sum + variant.stockQuantity,
                0,
              )
            : dto.stockQuantity || 0,
          isActive: false,
          moderationStatus: ProductModerationStatus.DRAFT,
          ingredients: dto.ingredients?.trim() || null,
          origin: dto.origin?.trim() || null,
          labelInfo: dto.labelInfo?.trim() || null,
          isAffiliateEnabled: dto.isAffiliateEnabled ?? false,
          sampleEnabled: dto.sampleEnabled ?? false,
          sampleQuota: dto.sampleQuota ?? 0,
          ...(preparedVariants.length
            ? { variants: { create: preparedVariants } }
            : {}),
        },
      });

      const evidenceRows = this.buildProductEvidenceRows(
        dto,
        store.id,
        created.id,
      );
      if (evidenceRows.length) {
        await tx.mediaAsset.createMany({ data: evidenceRows });
      }

      if (
        dto.subImages &&
        Array.isArray(dto.subImages) &&
        dto.subImages.length > 0
      ) {
        for (const imgUrl of dto.subImages.slice(0, 4)) {
          if (!imgUrl || typeof imgUrl !== 'string' || !imgUrl.trim()) continue;
          await tx.mediaAsset.create({
            data: {
              storeId: store.id,
              productId: created.id,
              assetType: 'IMAGE',
              urlOrContent: imgUrl.trim(),
              title: `${created.title} - Ảnh chi tiết`,
              status: 'APPROVED',
            },
          });
        }
      }
      return created;
    });

    return {
      message: 'Đã lưu sản phẩm ở trạng thái chờ Ban Quản Trị kiểm duyệt.',
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
      include: {
        store: true,
        mediaAssets: {
          where: { isDeleted: false, assetType: 'IMAGE' },
          select: { urlOrContent: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product || product.isDeleted) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const isSystemAdminOrManager =
      userRole === UserRole.SYSTEM_ADMIN ||
      userRole === UserRole.SYSTEM_MANAGER;

    if (!isSystemAdminOrManager && product.store.ownerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa sản phẩm của cửa hàng khác',
      );
    }

    if (
      userRole === UserRole.SHOP_MANAGER &&
      (!product.store.isVerified ||
        product.store.onboardingStatus !== 'VERIFIED')
    ) {
      throw new ForbiddenException(
        'Gian hàng chưa được xác minh nên chưa thể cập nhật sản phẩm hoặc tồn kho.',
      );
    }

    const isResubmission =
      userRole === UserRole.SHOP_MANAGER &&
      product.moderationStatus === ProductModerationStatus.REJECTED;
    const evidenceByProduct = await this.loadProductEvidence([id]);
    const existingEvidenceRows = evidenceByProduct.get(id) || [];

    const textChanged = (
      next: string | null | undefined,
      current: string | null | undefined,
    ) =>
      next !== undefined &&
      (next?.trim() || null) !== (current?.trim() || null);
    const stringListChanged = (
      next: string[] | undefined,
      current: string[] | null | undefined,
    ) =>
      next !== undefined &&
      JSON.stringify(next.map((value) => value.trim())) !==
        JSON.stringify((current ?? []).map((value) => value.trim()));
    const existingEvidence = this.attachProductEvidence(
      product,
      existingEvidenceRows,
    );
    const numberChanged = (next: number | null | undefined, current: unknown) =>
      next !== undefined &&
      (next === null ? null : Number(next)) !==
        (current === null || current === undefined ? null : Number(current));
    const existingImages = (product.mediaAssets || [])
      .map((asset) => asset.urlOrContent.trim())
      .filter(Boolean)
      .slice(0, 4);
    const requestedImages = dto.subImages
      ?.slice(0, 4)
      .map((url) => url.trim())
      .filter(Boolean);
    const subImagesChanged =
      requestedImages !== undefined &&
      JSON.stringify(requestedImages) !== JSON.stringify(existingImages);
    const approvedShopContentChanged =
      userRole === UserRole.SHOP_MANAGER &&
      product.moderationStatus === ProductModerationStatus.APPROVED &&
      (textChanged(dto.sku, product.sku) ||
        textChanged(dto.title, product.title) ||
        textChanged(dto.categoryName, product.categoryName) ||
        textChanged(dto.description, product.description) ||
        textChanged(dto.ingredients, product.ingredients) ||
        textChanged(dto.origin, product.origin) ||
        textChanged(dto.labelInfo, product.labelInfo) ||
        stringListChanged(
          dto.originProofLinks,
          existingEvidence.originProofLinks,
        ) ||
        stringListChanged(
          dto.originProofImages,
          existingEvidence.originProofImages,
        ) ||
        stringListChanged(
          dto.labelProofLinks,
          existingEvidence.labelProofLinks,
        ) ||
        stringListChanged(
          dto.labelProofImages,
          existingEvidence.labelProofImages,
        ) ||
        textChanged(dto.imageUrl, product.imageUrl) ||
        numberChanged(dto.price, product.price) ||
        numberChanged(dto.originalPrice, product.originalPrice) ||
        subImagesChanged);
    const requiresModeration = isResubmission || approvedShopContentChanged;
    const evidenceKindsToReplace = [
      dto.originProofLinks !== undefined ? 'ORIGIN_LINK' : null,
      dto.originProofImages !== undefined ? 'ORIGIN_IMAGE' : null,
      dto.labelProofLinks !== undefined ? 'LABEL_LINK' : null,
      dto.labelProofImages !== undefined ? 'LABEL_IMAGE' : null,
    ].filter((kind): kind is string => kind !== null);
    const updatedEvidenceRows = this.buildProductEvidenceRows(
      dto,
      product.storeId,
      id,
      evidenceKindsToReplace,
    );

    if (
      dto.sampleQuota !== undefined &&
      dto.sampleQuota < product.sampleGrantedCount
    ) {
      throw new BadRequestException(
        `Hạn mức mẫu không thể thấp hơn số mẫu Shop đã duyệt (${product.sampleGrantedCount}).`,
      );
    }
    if (dto.sampleQuota !== undefined) {
      const quotaGuard = await this.prisma.product.updateMany({
        where: { id, sampleGrantedCount: { lte: dto.sampleQuota } },
        data: { sampleQuota: dto.sampleQuota },
      });
      if (!quotaGuard.count) {
        throw new BadRequestException(
          'Hạn mức vừa thay đổi do Shop duyệt mẫu đồng thời. Tải lại sản phẩm rồi thử lại.',
        );
      }
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
        ...(dto.ingredients !== undefined && {
          ingredients: dto.ingredients?.trim() || null,
        }),
        ...(dto.origin !== undefined && {
          origin: dto.origin?.trim() || null,
        }),
        ...(dto.labelInfo !== undefined && {
          labelInfo: dto.labelInfo?.trim() || null,
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
        ...(dto.isActive !== undefined &&
          product.moderationStatus === ProductModerationStatus.APPROVED &&
          !approvedShopContentChanged && { isActive: dto.isActive }),
        ...(dto.isAffiliateEnabled !== undefined && {
          isAffiliateEnabled: dto.isAffiliateEnabled,
        }),
        ...(dto.sampleEnabled !== undefined && {
          sampleEnabled: dto.sampleEnabled,
        }),
        ...(requiresModeration && {
          moderationStatus: ProductModerationStatus.DRAFT,
          moderationReason: null,
          moderatedAt: null,
          moderatedById: null,
          isActive: false,
        }),
      },
    });

    if (evidenceKindsToReplace.length > 0) {
      await this.prisma.mediaAsset.updateMany({
        where: {
          productId: id,
          assetType: 'COPYWRITE_TEXT',
          caption: {
            in: evidenceKindsToReplace.map(
              (kind) => `${ProductsService.PRODUCT_EVIDENCE_MARKER}${kind}`,
            ),
          },
          isDeleted: false,
        },
        data: { isDeleted: true, deletedAt: new Date() },
      });
      if (updatedEvidenceRows.length > 0) {
        await this.prisma.mediaAsset.createMany({ data: updatedEvidenceRows });
      }
    }

    if (dto.subImages !== undefined && Array.isArray(dto.subImages)) {
      await this.prisma.mediaAsset.deleteMany({
        where: {
          productId: id,
          assetType: 'IMAGE',
        },
      });

      for (const imgUrl of dto.subImages.slice(0, 4)) {
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim()) {
          await this.prisma.mediaAsset.create({
            data: {
              storeId: product.storeId,
              productId: id,
              assetType: 'IMAGE',
              urlOrContent: imgUrl.trim(),
              title: `${dto.title || product.title} - Ảnh chi tiết`,
              status: 'APPROVED',
            },
          });
        }
      }
    }

    await this.invalidateLandingCache(id);

    return {
      message: requiresModeration
        ? 'Đã cập nhật nội dung. Sản phẩm tạm ẩn và chuyển về hàng đợi kiểm duyệt.'
        : 'Cập nhật sản phẩm thành công!',
      requiresModeration,
      product: updated,
    };
  }

  async updateVariantSamplePolicy(
    userId: string,
    userRole: UserRole,
    productId: string,
    variantId: string,
    dto: UpdateVariantSamplePolicyDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
      select: { id: true, store: { select: { ownerId: true } } },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
    const isSystemAdminOrManager =
      userRole === UserRole.SYSTEM_ADMIN ||
      userRole === UserRole.SYSTEM_MANAGER;
    if (!isSystemAdminOrManager && product.store.ownerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh SKU của cửa hàng khác',
      );
    }

    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId, isActive: true },
      select: { id: true, sampleGrantedCount: true },
    });
    if (!variant) throw new NotFoundException('SKU không tồn tại hoặc đã tắt');

    const inheritProductPolicy = dto.inheritProductPolicy === true;
    if (
      dto.sampleQuota !== undefined &&
      dto.sampleQuota < variant.sampleGrantedCount
    ) {
      throw new BadRequestException(
        `Hạn mức SKU không thể thấp hơn số mẫu Shop đã duyệt (${variant.sampleGrantedCount}).`,
      );
    }

    const update = await this.prisma.productVariant.updateMany({
      where: {
        id: variantId,
        productId,
        ...(dto.sampleQuota !== undefined && !inheritProductPolicy
          ? { sampleGrantedCount: { lte: dto.sampleQuota } }
          : {}),
      },
      data: inheritProductPolicy
        ? { sampleEnabled: null, sampleQuota: null }
        : {
            ...(dto.sampleEnabled !== undefined && {
              sampleEnabled: dto.sampleEnabled,
            }),
            ...(dto.sampleQuota !== undefined && {
              sampleQuota: dto.sampleQuota,
            }),
          },
    });
    if (!update.count) {
      throw new BadRequestException(
        'Hạn mức SKU vừa thay đổi do Shop duyệt mẫu đồng thời. Tải lại sản phẩm rồi thử lại.',
      );
    }
    await this.invalidateLandingCache(productId);
    return {
      message: inheritProductPolicy
        ? 'SKU đã kế thừa chính sách mẫu của sản phẩm.'
        : 'Đã cập nhật chính sách cấp mẫu cho SKU.',
      variant: await this.prisma.productVariant.findUnique({
        where: { id: variantId },
      }),
    };
  }

  async syncProductVariants(
    userId: string,
    userRole: UserRole,
    productId: string,
    dto: SyncProductVariantsDto,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isDeleted: false },
      include: {
        store: true,
        variants: {
          select: {
            id: true,
            sku: true,
            name: true,
            attributes: true,
            price: true,
            imageUrl: true,
            isActive: true,
            stockQuantity: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại');

    const isSystemAdminOrManager =
      userRole === UserRole.SYSTEM_ADMIN ||
      userRole === UserRole.SYSTEM_MANAGER;
    if (!isSystemAdminOrManager && product.store.ownerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền sửa phân loại của sản phẩm này',
      );
    }
    if (
      userRole === UserRole.SHOP_MANAGER &&
      (!product.store.isVerified ||
        product.store.onboardingStatus !== 'VERIFIED')
    ) {
      throw new ForbiddenException(
        'Gian hàng chưa được xác minh nên chưa thể cập nhật SKU',
      );
    }

    const variants = dto.variants || [];
    const normalizedAttributes = variants.map((variant) => {
      const raw =
        variant.attributes ??
        (variant.id
          ? product.variants.find((item) => item.id === variant.id)?.attributes
          : {}) ??
        {};
      if (
        typeof raw !== 'object' ||
        Array.isArray(raw) ||
        !raw ||
        Object.keys(raw).length > 4
      ) {
        throw new BadRequestException('Thuộc tính phân loại không hợp lệ.');
      }
      const cleaned = Object.fromEntries(
        Object.entries(raw)
          .map(([key, value]) => {
            if (
              !/^[a-z][a-z0-9_]{0,29}$/.test(key) ||
              typeof value !== 'string' ||
              value.trim().length > 80
            ) {
              throw new BadRequestException(
                'Thuộc tính phân loại không hợp lệ.',
              );
            }
            return [key, value.trim()];
          })
          .filter(([, value]) => value),
      );
      return cleaned;
    });
    this.assertDistinctVariantAttributes(normalizedAttributes);
    const normalizedSkus = variants.map((variant) =>
      variant.sku.trim().toUpperCase(),
    );
    if (
      normalizedSkus.some((sku) => !sku) ||
      new Set(normalizedSkus).size !== normalizedSkus.length
    ) {
      throw new BadRequestException(
        'Mỗi phân loại phải có SKU riêng và không được để trống',
      );
    }
    const submittedIds = variants.flatMap((variant) =>
      variant.id ? [variant.id] : [],
    );
    if (new Set(submittedIds).size !== submittedIds.length) {
      throw new BadRequestException(
        'Một SKU không thể xuất hiện nhiều lần trong danh sách',
      );
    }

    const currentIds = new Set(product.variants.map((variant) => variant.id));
    if (submittedIds.some((id) => !currentIds.has(id))) {
      throw new BadRequestException('Có phân loại không thuộc sản phẩm này');
    }

    const currentVariantsById = new Map(
      product.variants.map((variant) => [variant.id, variant]),
    );
    const variantsChanged =
      variants.length !==
        product.variants.filter((variant) => variant.isActive).length ||
      variants.some((variant, index) => {
        const current = variant.id ? currentVariantsById.get(variant.id) : null;
        return (
          !current ||
          current.sku.toUpperCase() !== normalizedSkus[index] ||
          current.name !== variant.name.trim() ||
          JSON.stringify(
            Object.entries(
              (current.attributes || {}) as Record<string, string>,
            ).sort(),
          ) !==
            JSON.stringify(
              Object.entries(normalizedAttributes[index]).sort(),
            ) ||
          Number(current.price ?? product.price) !==
            Number(variant.price ?? product.price) ||
          (current.imageUrl || null) !== (variant.imageUrl?.trim() || null)
        );
      });
    const requiresModeration =
      userRole === UserRole.SHOP_MANAGER &&
      product.moderationStatus === ProductModerationStatus.APPROVED &&
      variantsChanged;

    const conflictingVariants = await this.prisma.productVariant.findMany({
      where: {
        sku: { in: normalizedSkus },
        ...(submittedIds.length ? { id: { notIn: submittedIds } } : {}),
      },
      select: { sku: true },
    });
    if (conflictingVariants.length) {
      throw new ConflictException(
        `SKU đã được sử dụng: ${conflictingVariants.map((variant) => variant.sku).join(', ')}`,
      );
    }

    const savedVariants = await this.prisma.$transaction(async (tx) => {
      const saved: any[] = [];
      if (requiresModeration) {
        await tx.product.update({
          where: { id: productId },
          data: {
            moderationStatus: ProductModerationStatus.DRAFT,
            moderationReason: null,
            moderatedAt: null,
            moderatedById: null,
            isActive: false,
          },
        });
      }
      for (const [index, variant] of variants.entries()) {
        const data = {
          sku: normalizedSkus[index],
          name: variant.name.trim(),
          attributes: normalizedAttributes[index],
          price: variant.price ?? product.price,
          stockQuantity: variant.stockQuantity,
          imageUrl: variant.imageUrl?.trim() || null,
          isActive: true,
        };
        saved.push(
          variant.id
            ? await tx.productVariant.update({
                where: { id: variant.id },
                data,
              })
            : await tx.productVariant.create({ data: { ...data, productId } }),
        );
      }
      await tx.productVariant.updateMany({
        where: {
          productId,
          isActive: true,
          ...(submittedIds.length ? { id: { notIn: submittedIds } } : {}),
        },
        data: { isActive: false },
      });
      if (saved.length) {
        await tx.product.update({
          where: { id: productId },
          data: {
            stockQuantity: saved.reduce(
              (sum, variant) => sum + variant.stockQuantity,
              0,
            ),
          },
        });
      }
      return saved;
    });

    await this.invalidateLandingCache(productId);
    return {
      message: requiresModeration
        ? 'Đã cập nhật phân loại. Sản phẩm tạm ẩn và chuyển về hàng đợi kiểm duyệt.'
        : 'Đã lưu phân loại và ảnh theo SKU',
      requiresModeration,
      variants: savedVariants,
    };
  }

  private assertDistinctVariantAttributes(
    attributes: Record<string, string>[],
  ) {
    const signatures = attributes
      .map((item) =>
        Object.entries(item)
          .filter(([, value]) => value.trim())
          .sort(([first], [second]) => first.localeCompare(second))
          .map(
            ([key, value]) =>
              `${key}:${value.trim().toLocaleLowerCase('vi-VN')}`,
          )
          .join('|'),
      )
      .filter(Boolean);
    if (new Set(signatures).size !== signatures.length) {
      throw new BadRequestException('Có phân loại trùng tổ hợp thuộc tính.');
    }
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
      userRole === UserRole.SYSTEM_ADMIN ||
      userRole === UserRole.SYSTEM_MANAGER;

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
      userRole === UserRole.SYSTEM_ADMIN ||
      userRole === UserRole.SYSTEM_MANAGER;

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
        moderationStatus: ProductModerationStatus.APPROVED,
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
            attributes: true,
            imageUrl: true,
            price: true,
            stockQuantity: true,
            isActive: true,
            sampleEnabled: true,
            sampleQuota: true,
            sampleGrantedCount: true,
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
            onboardingStatus: true,
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
          moderationStatus: ProductModerationStatus.APPROVED,
          OR: [
            ...(aliasSkus.length > 0
              ? [{ sku: { in: aliasSkus, mode: 'insensitive' as const } }]
              : []),
            ...(normalizedWords.length > 0
              ? [
                  {
                    AND: normalizedWords.map((word) => ({
                      OR: [
                        {
                          title: {
                            contains: word,
                            mode: 'insensitive' as const,
                          },
                        },
                        {
                          sku: { contains: word, mode: 'insensitive' as const },
                        },
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
              attributes: true,
              imageUrl: true,
              price: true,
              stockQuantity: true,
              isActive: true,
              sampleEnabled: true,
              sampleQuota: true,
              sampleGrantedCount: true,
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
              onboardingStatus: true,
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

    if (
      !product.store.isVerified ||
      product.store.onboardingStatus !== 'VERIFIED'
    ) {
      throw new NotFoundException(
        'STORE_NOT_VERIFIED: Gian hàng chưa được Ban Quản Trị xác minh.',
      );
    }

    if (!product.store.owner?.isActive) {
      throw new ForbiddenException(
        'STORE_SUSPENDED: Tài khoản chủ gian hàng đang bị tạm khóa, không thể giao dịch',
      );
    }

    // 2. Phân giải Attribution Cookie một cách an toàn qua HMAC Token và DB Session (FR-13)
    const cacheKey = `landing:v2:${product.id}:${visitorIdHash || 'anon'}`;
    const cached =
      await this.cacheService.get<ProductLandingResponseDto>(cacheKey);
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
      orderBy: { createdAt: 'asc' },
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
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
        (r.orderId || (r as any).order?.id) && r.order?.status === 'COMPLETED',
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
        publicReturnPolicy(product.store.policyReturn) ||
        'Yêu cầu đổi trả trong 14 ngày kể từ khi nhận hàng, kèm ảnh và video mở hộp.',
      warranty:
        product.store.policyWarranty ||
        'Bảo hành chính hãng theo chính sách gian hàng đối tác',
      shipping:
        product.store.policyShipping ||
        'Giao hàng toàn quốc - Được kiểm tra hàng trước khi thanh toán',
      genuineCommitment: 'Cam kết 100% sản phẩm chính hãng từ đối tác SCANMS',
    };

    // 6. Trả về payload an toàn chuẩn hóa cho Landing Page (FR-15)
    const isProductActive = Boolean(product.isActive && !product.isDeleted);
    const availableStock = product.variants?.length
      ? product.variants.reduce(
          (sum, variant) => sum + variant.stockQuantity,
          0,
        )
      : product.stockQuantity;
    const canPurchase = Boolean(isProductActive && availableStock > 0);
    const productStatus = !isProductActive
      ? 'INACTIVE'
      : availableStock <= 0
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
        sampleEnabled: product.sampleEnabled,
        sampleAvailable: Boolean(
          product.sampleEnabled &&
          product.sampleGrantedCount < product.sampleQuota,
        ),
        sampleQuotaRemaining: Math.max(
          0,
          product.sampleQuota - product.sampleGrantedCount,
        ),
        variants:
          (product as any).variants?.map((v: any) => ({
            id: v.id,
            sku: v.sku,
            name: v.name,
            attributes: v.attributes || {},
            imageUrl: this.isSafeUrl(v.imageUrl) ? v.imageUrl : null,
            price: Number(v.price ?? product.price),
            stockQuantity: v.stockQuantity,
            isActive: v.isActive,
            sampleEnabled: v.sampleEnabled ?? product.sampleEnabled,
            sampleAvailable: Boolean(
              (v.sampleEnabled ?? product.sampleEnabled) &&
              (v.sampleQuota ?? product.sampleQuota) >
                (v.sampleEnabled !== null || v.sampleQuota !== null
                  ? v.sampleGrantedCount
                  : product.sampleGrantedCount),
            ),
            sampleQuotaRemaining: Math.max(
              0,
              (v.sampleQuota ?? product.sampleQuota) -
                (v.sampleEnabled !== null || v.sampleQuota !== null
                  ? v.sampleGrantedCount
                  : product.sampleGrantedCount),
            ),
          })) || [],
      },
      store: {
        id: product.store.id,
        name: product.store.name,
        slug: product.store.slug,
        logoUrl:
          product.store.logoUrl &&
          !product.store.logoUrl.includes('unsplash.com')
            ? product.store.logoUrl
            : null,
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
        inStock: availableStock > 0,
        stockQuantity: availableStock,
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
    if (!lower.startsWith('http://') && !lower.startsWith('https://'))
      return false;

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
   * Lấy số tồn kho tức thời của sản phẩm (không cache) — dùng cho polling realtime (FR-16 / Inventory)
   * Trả về: stockQuantity, inStock, lowStock (cảnh báo khi <= 5)
   */
  async getRealtimeStock(idOrSlug: string): Promise<{
    productId: string;
    sku: string;
    stockQuantity: number;
    inStock: boolean;
    lowStock: boolean;
    lowStockThreshold: number;
    status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  }> {
    const trimmed = idOrSlug.trim();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

    const product = await this.prisma.product.findFirst({
      where: {
        isDeleted: false,
        OR: isUuid
          ? [{ id: trimmed }, { sku: { equals: trimmed, mode: 'insensitive' } }]
          : [{ sku: { equals: trimmed, mode: 'insensitive' } }],
      },
      select: {
        id: true,
        sku: true,
        stockQuantity: true,
        isActive: true,
        isDeleted: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã bị xóa.');
    }

    const LOW_STOCK_THRESHOLD = 5;
    const qty = product.stockQuantity ?? 0;
    const inStock = qty > 0 && product.isActive && !product.isDeleted;
    const lowStock = inStock && qty <= LOW_STOCK_THRESHOLD;

    let status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    if (!inStock) status = 'OUT_OF_STOCK';
    else if (lowStock) status = 'LOW_STOCK';
    else status = 'IN_STOCK';

    return {
      productId: product.id,
      sku: product.sku,
      stockQuantity: qty,
      inStock,
      lowStock,
      lowStockThreshold: LOW_STOCK_THRESHOLD,
      status,
    };
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
