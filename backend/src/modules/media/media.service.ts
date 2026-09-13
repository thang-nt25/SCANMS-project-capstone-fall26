import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { ReviewMediaDto, ReviewActionStatus } from './dto/review-media.dto';
import { UserRole } from '@prisma/client';
import { CacheService } from '../../core/cache/cache.service';

@Injectable()
export class MediaService {
  /**
   * Danh sách tên miền được phê duyệt lưu trữ media an toàn trên sàn SCANMS (FR-15 Mục 37)
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
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Lấy danh sách tài nguyên truyền thông (Hỗ trợ lọc theo loại IMAGE/VIDEO/COPYWRITE_TEXT)
   */
  async findAll(
    query: QueryMediaDto,
    viewer: { id: string; role: UserRole },
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (viewer.role === UserRole.SHOP_MANAGER) {
      where.store = { ownerId: viewer.id, isDeleted: false };
    } else if (viewer.role === UserRole.COLLABORATOR) {
      where.store = {
        isDeleted: false,
        isActive: true,
        storeCollaborators: {
          some: { collaboratorId: viewer.id, status: 'APPROVED' },
        },
      };
      // KOL chỉ xem tài nguyên đã duyệt hoặc chính video mình đã nộp.
      where.OR = [
        { status: 'APPROVED' },
        { collaboratorId: viewer.id },
      ];
    }

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.assetType) {
      where.assetType = query.assetType;
    }

    const [total, items] = await Promise.all([
      this.prisma.mediaAsset.count({ where }),
      this.prisma.mediaAsset.findMany({
        where,
        skip,
        take: limit,
        include: {
          store: { select: { id: true, name: true, slug: true } },
          product: {
            select: { id: true, title: true, sku: true, price: true },
          },
          collaborator: {
            select: { id: true, fullName: true },
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
   * Tạo tài nguyên Media mới (Chủ Shop hoặc SYSTEM_MANAGER/SYSTEM_ADMIN tải lên banner/video hoặc kịch bản SEO)
   */
  async create(userId: string, userRole: UserRole, dto: CreateMediaDto) {
    let storeId: string;

    if (userRole === UserRole.SYSTEM_MANAGER || userRole === UserRole.SYSTEM_ADMIN) {
      if (dto.storeId) {
        const store = await this.prisma.store.findFirst({
          where: { id: dto.storeId, isDeleted: false },
        });
        if (!store) {
          throw new NotFoundException('Cửa hàng chỉ định không tồn tại');
        }
        storeId = store.id;
      } else if (dto.productId) {
        const product = await this.prisma.product.findFirst({
          where: { id: dto.productId, isDeleted: false },
        });
        if (!product) {
          throw new NotFoundException('Sản phẩm được gán không tồn tại');
        }
        storeId = product.storeId;
      } else {
        throw new BadRequestException(
          'Quản trị viên/Vận hành bắt buộc phải chỉ định storeId hoặc productId khi tạo tài nguyên media.',
        );
      }
    } else {
      const store = await this.prisma.store.findFirst({
        where: { ownerId: userId, isDeleted: false },
      });

      if (!store) {
        throw new ForbiddenException('Bạn chưa sở hữu cửa hàng nào');
      }
      storeId = store.id;
    }

    if (dto.assetType === 'IMAGE' || dto.assetType === 'VIDEO') {
      this.validateAllowedUrl(dto.urlOrContent, 'URL Tài nguyên');
    }

    // Nếu gán với 1 sản phẩm, kiểm tra sản phẩm đó có thuộc store không
    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.productId, storeId, isDeleted: false },
      });
      if (!product) {
        throw new NotFoundException('Sản phẩm được gán không thuộc cửa hàng này hoặc không tồn tại');
      }
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        storeId,
        productId: dto.productId || null,
        title: dto.title.trim(),
        assetType: dto.assetType,
        urlOrContent: dto.urlOrContent.trim(),
        status: 'APPROVED', // Tài nguyên do Shop Manager hoặc Quản trị viên tải lên được duyệt mặc định
      },
      include: {
        product: { select: { id: true, title: true, sku: true } },
      },
    });

    if (dto.productId) {
      await this.cacheService.delPrefix(`landing:v2:${dto.productId}:`);
    }

    return {
      message: 'Tải lên tài nguyên truyền thông thành công!',
      asset,
    };
  }

  /**
   * Xóa mềm tài nguyên media
   */
  async softDelete(userId: string, userRole: UserRole, id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id },
      include: { store: true },
    });

    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Tài nguyên không tồn tại');
    }

    const isSystemAdminOrManager =
      userRole === UserRole.SYSTEM_ADMIN || userRole === UserRole.SYSTEM_MANAGER;
    const isStoreOwner = asset.store?.ownerId === userId;
    const isOwnerCollaborator = asset.collaboratorId === userId;

    if (!isSystemAdminOrManager && !isStoreOwner && !isOwnerCollaborator) {
      throw new ForbiddenException(
        'Bạn không có quyền xóa tài nguyên này',
      );
    }

    await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    if (asset.productId) {
      await this.cacheService.delPrefix(`landing:v2:${asset.productId}:`);
    }

    return { message: 'Đã xóa tài nguyên tiếp thị thành công' };
  }

  /**
   * FR-15 / FR-08: KOL nộp video review sản phẩm để Shop kiểm duyệt
   * Kiểm tra nghiêm ngặt:
   * 1. URL nằm trong allowlist an toàn và chống SSRF.
   * 2. Sản phẩm và Gian hàng đang hoạt động bình thường.
   * 3. KOL bắt buộc phải có quan hệ StoreCollaborator với trạng thái APPROVED.
   * Trạng thái khởi tạo bắt buộc là PENDING.
   */
  async submitKolVideo(collaboratorId: string, dto: any) {
    this.validateAllowedUrl(dto.videoUrl, 'URL Video');
    if (dto.posterUrl) {
      this.validateAllowedUrl(dto.posterUrl, 'URL Poster');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, isDeleted: false },
      include: { store: true },
    });

    if (!product || product.isDeleted) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã bị xóa');
    }

    if (!product.store || product.store.isDeleted || !product.store.isActive) {
      throw new ForbiddenException('Cửa hàng của sản phẩm đang tạm ngừng hoạt động');
    }

    // Kiểm tra KOL đã được phê duyệt làm cộng tác viên của gian hàng chưa
    const storeCollab = await this.prisma.storeCollaborator.findFirst({
      where: {
        storeId: product.storeId,
        collaboratorId,
        status: 'APPROVED',
      },
    });

    if (!storeCollab) {
      throw new ForbiddenException(
        'KOL chưa được phê duyệt làm cộng tác viên (StoreCollaborator = APPROVED) của gian hàng này.',
      );
    }

    // Chỉ kiểm tra CampaignParticipant = ACCEPTED khi video được đánh dấu thuộc về chiến dịch
    // hoặc có campaignId chỉ định. Nếu là video review thông thường cho gian hàng (StoreCollaborator = APPROVED),
    // cho phép nộp thẳng vào hàng đợi duyệt PENDING.
    if (dto.requiresCampaignParticipation || dto.campaignId) {
      const now = new Date();
      const campaignFilter: any = {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        participants: { some: { collaboratorId, status: 'ACCEPTED' } },
      };
      if (dto.campaignId) {
        campaignFilter.id = dto.campaignId;
      }

      const eligibleCampaign = await this.prisma.campaignProduct.findFirst({
        where: {
          productId: product.id,
          campaign: campaignFilter,
        },
        select: { id: true },
      });
      if (!eligibleCampaign) {
        throw new ForbiddenException(
          'KOL chưa được chấp nhận tham gia chiến dịch đang áp dụng cho sản phẩm này.',
        );
      }
    }

    const asset = await this.prisma.mediaAsset.create({
      data: {
        storeId: product.storeId,
        productId: product.id,
        collaboratorId,
        title: dto.title.trim(),
        assetType: 'VIDEO',
        urlOrContent: dto.videoUrl.trim(),
        posterUrl: dto.posterUrl?.trim() || null,
        caption: dto.caption?.trim() || null,
        status: 'PENDING',
        isFeatured: false,
      },
      include: {
        product: { select: { id: true, title: true, sku: true } },
        store: { select: { id: true, name: true } },
      },
    });

    return {
      message: 'Nộp video review thành công! Video đang chờ Shop kiểm duyệt trước khi xuất hiện trên Landing Page.',
      asset,
    };
  }

  /**
   * FR-15: Shop Manager hoặc Admin kiểm duyệt video review (APPROVED, REJECTED, HIDDEN)
   * Nghiệp vụ chuẩn:
   * 1. Không cho phép gửi trạng thái PENDING.
   * 2. Bắt buộc cung cấp rejectionReason khi REJECTED hoặc HIDDEN.
   * 3. Khi isFeatured: true, transaction tự động hủy featured của các video khác thuộc cùng sản phẩm.
   * 4. Ghi bản ghi AuditLog lưu giữ trạng thái trước và sau khi duyệt.
   * 5. Tự động giải phóng Cache Landing Page của sản phẩm.
   */
  async reviewMedia(
    reviewerId: string,
    reviewerRole: string,
    mediaId: string,
    dto: ReviewMediaDto,
  ) {
    if ((dto.status as string) === 'PENDING') {
      throw new BadRequestException(
        'Không thể chuyển trạng thái media thành PENDING qua API kiểm duyệt',
      );
    }

    if (
      (dto.status === ReviewActionStatus.REJECTED ||
        dto.status === ReviewActionStatus.HIDDEN) &&
      (!dto.rejectionReason || !dto.rejectionReason.trim())
    ) {
      throw new BadRequestException(
        'Bắt buộc cung cấp lý do khi từ chối (REJECTED) hoặc ẩn (HIDDEN) video review',
      );
    }

    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: mediaId },
      include: { store: true },
    });

    if (!asset || asset.isDeleted) {
      throw new NotFoundException('Tài nguyên media không tồn tại hoặc đã bị xóa');
    }

    // Phân quyền: SHOP_MANAGER chỉ được duyệt media của shop mình
    if (
      reviewerRole !== 'SYSTEM_ADMIN' &&
      reviewerRole !== 'SYSTEM_MANAGER' &&
      asset.store.ownerId !== reviewerId
    ) {
      throw new ForbiddenException(
        'Bạn chỉ có quyền kiểm duyệt media thuộc gian hàng do bạn sở hữu',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Đảm bảo chỉ có tối đa 1 video featured cho cùng một sản phẩm
      if (dto.isFeatured === true && asset.productId) {
        await tx.mediaAsset.updateMany({
          where: {
            productId: asset.productId,
            id: { not: mediaId },
            isFeatured: true,
          },
          data: { isFeatured: false },
        });
      }

      // 2. Cập nhật trạng thái media
      const updatedAsset = await tx.mediaAsset.update({
        where: { id: mediaId },
        data: {
          status: dto.status,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          rejectionReason: dto.rejectionReason?.trim() || null,
          isFeatured:
            typeof dto.isFeatured === 'boolean'
              ? dto.isFeatured
              : asset.isFeatured,
        },
      });

      // 3. Ghi vết AuditLog theo chuẩn kiểm toán sàn SCANMS
      await tx.auditLog.create({
        data: {
          userId: reviewerId,
          action: 'MEDIA_REVIEWED',
          details: {
            mediaId,
            productId: asset.productId,
            storeId: asset.storeId,
            previousState: {
              status: asset.status,
              isFeatured: asset.isFeatured,
              rejectionReason: asset.rejectionReason,
            },
            newState: {
              status: dto.status,
              isFeatured: updatedAsset.isFeatured,
              rejectionReason: dto.rejectionReason?.trim() || null,
            },
            reviewerRole,
          },
        },
      });

      return updatedAsset;
    });

    // 4. Giải phóng cache landing page cho sản phẩm liên quan
    if (asset.productId) {
      await this.cacheService.delPrefix(`landing:v2:${asset.productId}:`);
    }

    return {
      message: `Đã cập nhật trạng thái kiểm duyệt media thành [${dto.status}]`,
      asset: updated,
    };
  }

  /**
   * Kiểm tra allowlist URL để chống XSS, URL độc hại và tấn công SSRF (FR-15 Mục 37)
   */
  public validateAllowedUrl(url: string, fieldName = 'URL'): void {
    if (!url || !url.trim()) return;
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();

    // 1. Chặn các giao thức độc hại và mã script
    if (
      lower.startsWith('javascript:') ||
      lower.startsWith('data:') ||
      lower.startsWith('vbscript:') ||
      lower.includes('<script') ||
      lower.includes('%3cscript')
    ) {
      throw new ForbiddenException(
        `${fieldName} chứa giao thức hoặc ký tự không an toàn`,
      );
    }

    // 2. Chấp nhận đường dẫn relative nội bộ (VD: /assets/...)
    if (lower.startsWith('/')) {
      return;
    }

    // 3. Bắt buộc giao thức https:// hoặc http://
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) {
      throw new ForbiddenException(
        `${fieldName} phải bắt đầu bằng https:// hoặc http://`,
      );
    }

    // 4. Parse URL để kiểm tra hostname (Chống SSRF)
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException(`${fieldName} không phải là một URL hợp lệ`);
    }

    const host = parsed.hostname.toLowerCase();

    // Chặn IP nội bộ & localhost
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

    if (isPrivateOrLoopback) {
      throw new ForbiddenException(
        `${fieldName} không được trỏ đến địa chỉ IP nội bộ hoặc loopback (Chống tấn công SSRF)`,
      );
    }

    // Kiểm tra hostname có thuộc allowlist các nhà cung cấp được phép không
    const extraDomains = (process.env.ALLOWED_MEDIA_DOMAINS || '')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    const fullAllowlist = [
      ...MediaService.ALLOWED_HOST_DOMAINS,
      ...extraDomains,
    ];

    const isAllowed = fullAllowlist.some(
      (domain) => host === domain || host.endsWith('.' + domain),
    );

    if (!isAllowed) {
      throw new ForbiddenException(
        `${fieldName} (${host}) không thuộc danh sách nguồn lưu trữ được sàn SCANMS phê duyệt (CDN SCANMS, Cloudinary, YouTube, TikTok, Vimeo, Supabase).`,
      );
    }
  }
}
