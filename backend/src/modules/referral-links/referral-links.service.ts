import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  ReferralLinkStatus,
  UserRole,
  CampaignParticipantStatus,
  StoreCollaboratorStatus,
  Prisma,
} from '@prisma/client';
import { CreateReferralLinkDto } from './dto/create-referral-link.dto';
import { UpdateReferralLinkDto } from './dto/update-referral-link.dto';
import { QueryReferralLinksDto } from './dto/query-referral-links.dto';
import {
  generateShortCode,
  sanitizeUtmString,
  isSearchEngineBot,
} from './utils/short-code.generator';
import { CacheService } from '../../core/cache/cache.service';

export interface ClientTrackingInfo {
  ip: string;
  userAgent?: string;
  referer?: string;
  fingerprint?: string;
  deviceType?: string;
  sessionId?: string;
}

/**
 * Xác định trạng thái thực tế theo đúng thứ tự ưu tiên:
 * DELETED → BLOCKED → EXPIRED → PAUSED → ACTIVE
 */
export function computeEffectiveStatus(link: {
  deletedAt?: Date | null;
  status: ReferralLinkStatus;
  expiresAt?: Date | null;
}): 'DELETED' | 'BLOCKED' | 'EXPIRED' | 'PAUSED' | 'ACTIVE' {
  if (link.deletedAt) {
    return 'DELETED';
  }
  if (link.status === ReferralLinkStatus.BLOCKED) {
    return 'BLOCKED';
  }
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return 'EXPIRED';
  }
  if (link.status === ReferralLinkStatus.PAUSED) {
    return 'PAUSED';
  }
  return 'ACTIVE';
}

import { ClickQueueService } from './click-queue.service';

@Injectable()
export class ReferralLinksService {
  private readonly logger = new Logger(ReferralLinksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    @Optional() private readonly clickQueue?: ClickQueueService,
  ) {}

  private getPublicAppUrl(): string {
    return (
      this.configService.get<string>('PUBLIC_APP_URL') ||
      this.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:5173'
    );
  }

  /**
   * 1. Lấy danh sách sản phẩm hợp lệ để KOL tạo link tiếp thị
   * - BẮT BUỘC nhận collaboratorId
   * - Chỉ trả về các sản phẩm thuộc:
   *   a. Cửa hàng mà KOL đã được duyệt làm cộng tác viên chính thức (StoreCollaborator: APPROVED)
   *   b. HOẶC Cửa hàng/Chiến dịch mà KOL đã được duyệt tham gia (CampaignParticipant: ACCEPTED) còn hiệu lực
   *   c. Sản phẩm phải có isAffiliateEnabled = true và tỷ lệ hoa hồng > 0
   */
  async getEligibleProducts(
    collaboratorId: string,
    query: { search?: string; storeId?: string },
  ) {
    // 1. Tìm các Store ID mà KOL đã được Shop duyệt chính thức
    const approvedStoreRelations = await this.prisma.storeCollaborator.findMany({
      where: {
        collaboratorId,
        status: StoreCollaboratorStatus.APPROVED,
      },
      select: { storeId: true },
    });
    const eligibleStoreIds = new Set<string>(approvedStoreRelations.map((r) => r.storeId));

    // 2. Tìm các Store ID mà KOL đã tham gia chiến dịch còn hiệu lực
    const now = new Date();
    const acceptedCampaigns = await this.prisma.campaignParticipant.findMany({
      where: {
        collaboratorId,
        status: CampaignParticipantStatus.ACCEPTED,
        campaign: {
          isActive: true,
          endDate: { gte: now },
        },
      },
      select: {
        campaign: { select: { storeId: true } },
      },
    });
    for (const c of acceptedCampaigns) {
      if (c.campaign?.storeId) {
        eligibleStoreIds.add(c.campaign.storeId);
      }
    }

    if (eligibleStoreIds.size === 0) {
      return [];
    }

    const storeIdsArray = Array.from(eligibleStoreIds);

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      isAffiliateEnabled: true,
      deletedAt: null,
      store: {
        deletedAt: null,
      },
      storeId: query.storeId
        ? { in: storeIdsArray.filter((id) => id === query.storeId) }
        : { in: storeIdsArray },
    };

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { categoryName: { contains: s, mode: 'insensitive' } },
        { sku: { contains: s, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        title: true,
        sku: true,
        categoryName: true,
        imageUrl: true,
        originalPrice: true,
        price: true,
        customCommissionRate: true,
        stockQuantity: true,
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            defaultCommissionRate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return products
      .map((p) => {
        const estimatedRate =
          p.customCommissionRate !== null
            ? Number(p.customCommissionRate)
            : Number(p.store.defaultCommissionRate);
        return {
          ...p,
          estimatedCommissionRate: estimatedRate,
          estimatedCommissionAmount: (Number(p.price) * estimatedRate) / 100,
        };
      })
      .filter((p) => p.estimatedCommissionRate > 0);
  }

  /**
   * 2. Tạo link tiếp thị rút gọn mới cho KOL
   * - Kiểm tra hồ sơ KOL, vai trò COLLABORATOR
   * - Kiểm tra sản phẩm và shop
   * - Kiểm tra quan hệ KOL–Shop hoặc chiến dịch (ACCEPTED)
   * - Kiểm tra hạn mức tạo link (10 link/phút, 500 link/KOL, 20 link/sản phẩm)
   * - Chống race condition với retry lỗi P2002 của PostgreSQL (tối đa 5 lần)
   * - Giao dịch transaction giữa tạo link và AuditLog
   */
  async createReferralLink(
    collaboratorId: string,
    dto: CreateReferralLinkDto,
    ipAddress?: string,
  ) {
    // 2.1 Bắt buộc nhãn và kênh theo quy định mô hình nhiều link
    if (!dto.label || !dto.label.trim()) {
      throw new BadRequestException('Nhãn gợi nhớ (label) là bắt buộc.');
    }
    if (!dto.channel) {
      throw new BadRequestException('Kênh quảng bá (channel) là bắt buộc.');
    }

    // 2.2 Kiểm tra tài khoản KOL hợp lệ
    const collaborator = await this.prisma.user.findUnique({
      where: { id: collaboratorId },
      include: { collaboratorProfile: true },
    });

    if (!collaborator || collaborator.deletedAt) {
      throw new NotFoundException('Tài khoản Cộng tác viên không tồn tại hoặc đã bị xóa.');
    }

    if (!collaborator.isActive) {
      throw new ForbiddenException('Tài khoản Cộng tác viên hiện đang bị khóa.');
    }

    if (collaborator.role !== UserRole.COLLABORATOR) {
      throw new ForbiddenException('Chỉ tài khoản vai trò COLLABORATOR mới được quyền tạo liên kết tiếp thị.');
    }

    // 2.3 Kiểm tra sản phẩm và Cửa hàng
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { store: true },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Sản phẩm không tồn tại hoặc đã bị xóa.');
    }

    if (!product.isActive) {
      throw new BadRequestException('Sản phẩm hiện đang tạm ngừng kinh doanh.');
    }

    if (!product.store || product.store.deletedAt) {
      throw new BadRequestException('Cửa hàng sở hữu sản phẩm này không còn hoạt động.');
    }

    // Kiểm tra sản phẩm có cho affiliate không
    if (!product.isAffiliateEnabled) {
      throw new ForbiddenException('Sản phẩm này hiện không áp dụng chương trình tiếp thị liên kết (403 Forbidden).');
    }

    const commissionRate =
      product.customCommissionRate !== null
        ? Number(product.customCommissionRate)
        : Number(product.store.defaultCommissionRate);

    if (commissionRate <= 0) {
      throw new ForbiddenException('Sản phẩm này hiện có tỷ lệ hoa hồng bằng 0 (403 Forbidden).');
    }

    // 2.4 Kiểm tra chiến dịch và quan hệ KOL–Shop chính thức
    let validatedCampaign: any = null;
    const now = new Date();

    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: dto.campaignId },
      });

      if (!campaign) {
        throw new NotFoundException('Chiến dịch tiếp thị không tồn tại.');
      }

      if (campaign.storeId !== product.storeId) {
        throw new BadRequestException('Chiến dịch không thuộc Cửa hàng sở hữu sản phẩm này.');
      }

      if (!campaign.isActive) {
        throw new BadRequestException('Chiến dịch tiếp thị hiện đang tạm ngừng.');
      }

      if (now < new Date(campaign.startDate)) {
        throw new BadRequestException('Chiến dịch tiếp thị chưa bắt đầu.');
      }

      if (now > new Date(campaign.endDate)) {
        throw new HttpException('Chiến dịch tiếp thị đã hết hạn (409 Conflict).', HttpStatus.CONFLICT);
      }

      // Kiểm tra KOL đã tham gia chiến dịch với trạng thái ACCEPTED chưa
      const participant = await this.prisma.campaignParticipant.findUnique({
        where: {
          campaignId_collaboratorId: {
            campaignId: dto.campaignId,
            collaboratorId,
          },
        },
      });

      if (!participant || participant.status !== CampaignParticipantStatus.ACCEPTED) {
        throw new ForbiddenException(
          'KOL chưa được phê duyệt tham gia chiến dịch này (CampaignParticipantStatus phải là ACCEPTED).',
        );
      }

      // Kiểm tra xem chiến dịch có giới hạn danh mục sản phẩm cụ thể (campaign_products) không
      const campaignProductCount = await this.prisma.campaignProduct.count({
        where: { campaignId: dto.campaignId },
      });
      if (campaignProductCount > 0) {
        const isProductInCampaign = await this.prisma.campaignProduct.findUnique({
          where: {
            campaignId_productId: {
              campaignId: dto.campaignId,
              productId: dto.productId,
            },
          },
        });
        if (!isProductInCampaign) {
          throw new BadRequestException(
            'Sản phẩm đã chọn không nằm trong danh mục áp dụng của chiến dịch này.',
          );
        }
      }

      // Nếu Frontend không gửi expiresAt, Backend tự động gán theo campaign.endDate
      if (!dto.expiresAt) {
        dto.expiresAt = campaign.endDate.toISOString();
      } else {
        const linkExpiry = new Date(dto.expiresAt);
        if (linkExpiry <= now) {
          throw new BadRequestException('Thời hạn hết hạn của liên kết (expiresAt) phải nằm trong tương lai.');
        }
        if (linkExpiry > new Date(campaign.endDate)) {
          throw new BadRequestException('Thời hạn liên kết không được vượt quá thời gian kết thúc của chiến dịch.');
        }
      }

      validatedCampaign = campaign;
    } else {
      // Khi không có campaignId: Kiểm tra quan hệ chính thức giữa KOL và Shop (StoreCollaborator: APPROVED)
      const officialCollab = await this.prisma.storeCollaborator.findFirst({
        where: {
          storeId: product.storeId,
          collaboratorId,
          status: StoreCollaboratorStatus.APPROVED,
        },
      });

      const hasAcceptedCampaign = await this.prisma.campaignParticipant.findFirst({
        where: {
          collaboratorId,
          campaign: { storeId: product.storeId, isActive: true },
          status: CampaignParticipantStatus.ACCEPTED,
        },
      });

      if (!officialCollab && !hasAcceptedCampaign) {
        throw new ForbiddenException(
          'KOL chưa được Cửa hàng duyệt làm cộng tác viên chính thức hoặc chưa có chiến dịch hợp lệ (403 Forbidden).',
        );
      }

      if (dto.expiresAt && new Date(dto.expiresAt) <= now) {
        throw new BadRequestException('Thời hạn hết hạn của liên kết (expiresAt) phải nằm trong tương lai.');
      }
    }

    // 2.5 Kiểm tra giới hạn tạo link (Mục 32)
    // a. Tối đa 10 link / phút / KOL
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const linksInLastMinute = await this.prisma.referralLink.count({
      where: {
        collaboratorId,
        createdAt: { gte: oneMinuteAgo },
      },
    });

    if (linksInLastMinute >= 10) {
      throw new HttpException(
        'Bạn đã vượt quá giới hạn tạo link (tối đa 10 link / phút). Vui lòng thử lại sau giây lát.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // b. Tối đa 500 link đang hoạt động / KOL
    const activeLinksCount = await this.prisma.referralLink.count({
      where: {
        collaboratorId,
        status: ReferralLinkStatus.ACTIVE,
        deletedAt: null,
      },
    });

    if (activeLinksCount >= 500) {
      throw new HttpException(
        'Bạn đã đạt giới hạn tối đa 500 liên kết tiếp thị đang hoạt động. Vui lòng tạm ngừng hoặc xóa các link cũ.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // c. Tối đa 20 link / sản phẩm / KOL
    const productLinksCount = await this.prisma.referralLink.count({
      where: {
        collaboratorId,
        productId: product.id,
        deletedAt: null,
      },
    });

    if (productLinksCount >= 20) {
      throw new HttpException(
        'Bạn đã đạt giới hạn tối đa 20 link cho cùng một sản phẩm này. Hãy tận dụng các link đã tạo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2.6 Sinh shortCode an toàn & Chống Race Condition với retry bắt lỗi P2002
    const publicAppUrl = this.getPublicAppUrl();
    const destinationPath = `/products/${product.id}`;
    let retries = 5;
    let createdLink: any = null;

    while (retries > 0) {
      const shortCode = generateShortCode(8);
      const shortUrl = `${publicAppUrl}/r/${shortCode}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
        shortUrl,
      )}`;

      try {
        // Giao dịch Transaction tạo link và AuditLog cùng nhau
        createdLink = await this.prisma.$transaction(async (tx) => {
          const newLink = await tx.referralLink.create({
            data: {
              collaboratorId,
              storeId: product.storeId,
              productId: product.id,
              campaignId: validatedCampaign?.id ?? null,
              shortCode,
              label: sanitizeUtmString(dto.label, 150),
              channel: dto.channel,
              destinationPath,
              utmSource: dto.utmSource ? sanitizeUtmString(dto.utmSource, 100) : null,
              utmMedium: dto.utmMedium ? sanitizeUtmString(dto.utmMedium, 100) : null,
              utmCampaign: dto.utmCampaign ? sanitizeUtmString(dto.utmCampaign, 100) : null,
              utmContent: dto.utmContent ? sanitizeUtmString(dto.utmContent, 100) : null,
              customCouponCode: dto.customCouponCode?.trim().toUpperCase() || null,
              qrCodeUrl,
              status: ReferralLinkStatus.ACTIVE,
              expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                  price: true,
                },
              },
              store: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          });

          await tx.auditLog.create({
            data: {
              userId: collaboratorId,
              action: 'REFERRAL_LINK_CREATED',
              ipAddress: ipAddress || null,
              details: {
                referralLinkId: newLink.id,
                shortCode: newLink.shortCode,
                productId: newLink.productId,
                storeId: newLink.storeId,
                channel: newLink.channel,
                label: newLink.label,
              },
            },
          });

          return newLink;
        });

        // Tạo thành công, thoát vòng lặp retry
        break;
      } catch (err: any) {
        // Nếu đụng unique constraint P2002 trên shortCode -> retry sinh mã mới
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          retries--;
          this.logger.warn(`Va chạm shortCode ngẫu nhiên. Thử lại sinh mã mới... (còn ${retries} lần)`);
          if (retries === 0) {
            throw new HttpException('Hệ thống bận, không thể sinh mã rút gọn duy nhất. Vui lòng thử lại.', HttpStatus.CONFLICT);
          }
          continue;
        }
        throw err;
      }
    }

    return {
      ...createdLink,
      shortUrl: `${publicAppUrl}/r/${createdLink.shortCode}`,
    };
  }

  /**
   * 3. Lấy danh sách link tiếp thị của KOL (tìm kiếm, lọc, phân trang)
   */
  async getCollaboratorLinks(collaboratorId: string, query: QueryReferralLinksDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ReferralLinkWhereInput = {
      collaboratorId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.channel) {
      where.channel = query.channel;
    }

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.campaignId) {
      where.campaignId = query.campaignId;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { shortCode: { contains: s, mode: 'insensitive' } },
        { label: { contains: s, mode: 'insensitive' } },
        { product: { title: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.ReferralLinkOrderByWithRelationInput = {};
    const validSortFields = ['createdAt', 'totalClicks', 'uniqueClicks', 'totalOrders'];
    const sortField = validSortFields.includes(query.sortBy || '') ? query.sortBy! : 'createdAt';
    orderBy[sortField] = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, items] = await Promise.all([
      this.prisma.referralLink.count({ where }),
      this.prisma.referralLink.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
              price: true,
              customCommissionRate: true,
              store: {
                select: {
                  id: true,
                  name: true,
                  defaultCommissionRate: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const publicAppUrl = this.getPublicAppUrl();
    const formattedItems = items.map((item) => {
      const effectiveStatus = computeEffectiveStatus(item);

      const commissionRate =
        item.product.customCommissionRate !== null
          ? Number(item.product.customCommissionRate)
          : Number(item.product.store.defaultCommissionRate);

      return {
        ...item,
        status: effectiveStatus,
        shortUrl: `${publicAppUrl}/r/${item.shortCode}`,
        commissionRate,
      };
    });

    return {
      data: formattedItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 4. Lấy chi tiết một link tiếp thị
   */
  async getLinkById(id: string, collaboratorId?: string) {
    const link = await this.prisma.referralLink.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(collaboratorId ? { collaboratorId } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            price: true,
            customCommissionRate: true,
            store: {
              select: {
                id: true,
                name: true,
                defaultCommissionRate: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại.');
    }

    const publicAppUrl = this.getPublicAppUrl();
    const effectiveStatus = computeEffectiveStatus(link);

    return {
      ...link,
      status: effectiveStatus,
      shortUrl: `${publicAppUrl}/r/${link.shortCode}`,
    };
  }

  /**
   * 5. Cập nhật nhãn hoặc kênh của link
   */
  async updateLink(
    id: string,
    collaboratorId: string,
    dto: UpdateReferralLinkDto,
    ipAddress?: string,
  ) {
    const link = await this.prisma.referralLink.findFirst({
      where: { id, collaboratorId, deletedAt: null },
    });

    if (!link) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại.');
    }

    if (link.status === ReferralLinkStatus.BLOCKED) {
      throw new ForbiddenException('Liên kết đã bị khóa, không thể chỉnh sửa.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.referralLink.update({
        where: { id },
        data: {
          label: dto.label ? sanitizeUtmString(dto.label, 150) : link.label,
          channel: dto.channel || link.channel,
          customCouponCode: dto.customCouponCode ? dto.customCouponCode.trim().toUpperCase() : link.customCouponCode,
          utmSource: dto.utmSource ? sanitizeUtmString(dto.utmSource, 100) : link.utmSource,
          utmMedium: dto.utmMedium ? sanitizeUtmString(dto.utmMedium, 100) : link.utmMedium,
          utmCampaign: dto.utmCampaign ? sanitizeUtmString(dto.utmCampaign, 100) : link.utmCampaign,
          utmContent: dto.utmContent ? sanitizeUtmString(dto.utmContent, 100) : link.utmContent,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: collaboratorId,
          action: 'REFERRAL_LINK_UPDATED',
          ipAddress: ipAddress || null,
          details: {
            referralLinkId: id,
            changes: JSON.parse(JSON.stringify(dto)),
          },
        },
      });

      return res;
    });

    if (link.shortCode) {
      await this.cacheService.del(`ref_link:${link.shortCode.toLowerCase()}`);
    }

    const publicAppUrl = this.getPublicAppUrl();
    return {
      ...updated,
      shortUrl: `${publicAppUrl}/r/${updated.shortCode}`,
    };
  }

  /**
   * 6. Chuyển đổi trạng thái Tạm ngừng (PAUSED) hoặc Kích hoạt (ACTIVE)
   */
  async toggleLinkStatus(id: string, collaboratorId: string, ipAddress?: string) {
    const link = await this.prisma.referralLink.findFirst({
      where: { id, collaboratorId, deletedAt: null },
    });

    if (!link) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại.');
    }

    if (link.status === ReferralLinkStatus.BLOCKED) {
      throw new BadRequestException(
        `Liên kết đã bị khóa (${link.disabledReason || 'Lý do vi phạm'}). Vui lòng liên hệ Cửa hàng hoặc Quản trị viên.`,
      );
    }

    const newStatus =
      link.status === ReferralLinkStatus.ACTIVE
        ? ReferralLinkStatus.PAUSED
        : ReferralLinkStatus.ACTIVE;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.referralLink.update({
        where: { id },
        data: { status: newStatus },
      });

      const action =
        newStatus === ReferralLinkStatus.PAUSED
          ? 'REFERRAL_LINK_PAUSED'
          : 'REFERRAL_LINK_ACTIVATED';

      await tx.auditLog.create({
        data: {
          userId: collaboratorId,
          action,
          ipAddress: ipAddress || null,
          details: {
            referralLinkId: id,
            previousStatus: link.status,
            currentStatus: newStatus,
          },
        },
      });

      return res;
    });

    if (link.shortCode) {
      await this.cacheService.del(`ref_link:${link.shortCode.toLowerCase()}`);
    }

    const publicAppUrl = this.getPublicAppUrl();
    return {
      ...updated,
      shortUrl: `${publicAppUrl}/r/${updated.shortCode}`,
    };
  }

  /**
   * 7. Xóa mềm link tiếp thị
   */
  async deleteLink(id: string, collaboratorId: string, ipAddress?: string) {
    const link = await this.prisma.referralLink.findFirst({
      where: { id, collaboratorId, deletedAt: null },
    });

    if (!link) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.referralLink.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          userId: collaboratorId,
          action: 'REFERRAL_LINK_DELETED',
          ipAddress: ipAddress || null,
          details: {
            referralLinkId: id,
            shortCode: link.shortCode,
          },
        },
      });
    });

    if (link.shortCode) {
      await this.cacheService.del(`ref_link:${link.shortCode.toLowerCase()}`);
    }

    return {
      success: true,
      message: 'Đã xóa liên kết tiếp thị thành công (Xóa mềm)',
    };
  }

  /**
   * 8. Chủ Cửa hàng xem các link tiếp thị sản phẩm của Shop
   */
  async getStoreReferralLinks(
    storeId: string,
    shopOwnerId: string,
    userRole: UserRole,
    query: QueryReferralLinksDto,
  ) {
    if (userRole === UserRole.SHOP_MANAGER) {
      const store = await this.prisma.store.findFirst({
        where: { id: storeId, ownerId: shopOwnerId, deletedAt: null },
      });
      if (!store) {
        throw new ForbiddenException('Bạn không có quyền quản lý cửa hàng này.');
      }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ReferralLinkWhereInput = {
      storeId,
      deletedAt: null,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.channel) {
      where.channel = query.channel;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { shortCode: { contains: s, mode: 'insensitive' } },
        { label: { contains: s, mode: 'insensitive' } },
        { product: { title: { contains: s, mode: 'insensitive' } } },
        { collaborator: { fullName: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.referralLink.count({ where }),
      this.prisma.referralLink.findMany({
        where,
        include: {
          collaborator: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              imageUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const publicAppUrl = this.getPublicAppUrl();
    return {
      data: items.map((item) => ({
        ...item,
        shortUrl: `${publicAppUrl}/r/${item.shortCode}`,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 9. Chủ Cửa hàng khóa link tiếp thị vi phạm (bắt buộc lý do tiếng Việt)
   */
  async blockLinkByShop(
    linkId: string,
    storeId: string,
    shopOwnerId: string,
    reason: string,
    ipAddress?: string,
  ) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, ownerId: shopOwnerId, deletedAt: null },
    });
    if (!store) {
      throw new ForbiddenException('Bạn không có quyền quản lý cửa hàng này.');
    }

    const link = await this.prisma.referralLink.findFirst({
      where: { id: linkId, storeId, deletedAt: null },
    });
    if (!link) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại trong cửa hàng này.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.referralLink.update({
        where: { id: linkId },
        data: {
          status: ReferralLinkStatus.BLOCKED,
          disabledReason: reason.trim(),
          disabledBy: shopOwnerId,
          disabledAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: shopOwnerId,
          action: 'REFERRAL_LINK_BLOCKED_BY_SHOP',
          ipAddress: ipAddress || null,
          details: {
            referralLinkId: linkId,
            storeId,
            reason,
          },
        },
      });

      return updated;
    });

    if (link.shortCode) {
      await this.cacheService.del(`ref_link:${link.shortCode.toLowerCase()}`);
    }
    return result;
  }

  /**
   * 10. Chủ Cửa hàng mở khóa link tiếp thị
   */
  async unblockLinkByShop(
    linkId: string,
    storeId: string,
    shopOwnerId: string,
    ipAddress?: string,
  ) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, ownerId: shopOwnerId, deletedAt: null },
    });
    if (!store) {
      throw new ForbiddenException('Bạn không có quyền quản lý cửa hàng này.');
    }

    const link = await this.prisma.referralLink.findFirst({
      where: { id: linkId, storeId, deletedAt: null },
    });
    if (!link) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại trong cửa hàng này.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.referralLink.update({
        where: { id: linkId },
        data: {
          status: ReferralLinkStatus.ACTIVE,
          disabledReason: null,
          disabledBy: null,
          disabledAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: shopOwnerId,
          action: 'REFERRAL_LINK_UNBLOCKED_BY_SHOP',
          ipAddress: ipAddress || null,
          details: {
            referralLinkId: linkId,
            storeId,
          },
        },
      });

      return updated;
    });

    if (link.shortCode) {
      await this.cacheService.del(`ref_link:${link.shortCode.toLowerCase()}`);
    }
    return result;
  }

  /**
   * 11. Quản trị viên (Admin) tra cứu danh sách link
   */
  async getAdminReferralLinks(query: QueryReferralLinksDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ReferralLinkWhereInput = {
      deletedAt: null,
    };

    if (query.status) where.status = query.status;
    if (query.channel) where.channel = query.channel;
    if (query.storeId) where.storeId = query.storeId;
    if (query.collaboratorId) where.collaboratorId = query.collaboratorId;

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { shortCode: { contains: s, mode: 'insensitive' } },
        { label: { contains: s, mode: 'insensitive' } },
        { product: { title: { contains: s, mode: 'insensitive' } } },
        { store: { name: { contains: s, mode: 'insensitive' } } },
        { collaborator: { fullName: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.referralLink.count({ where }),
      this.prisma.referralLink.findMany({
        where,
        include: {
          collaborator: { select: { id: true, fullName: true, email: true } },
          store: { select: { id: true, name: true } },
          product: { select: { id: true, title: true, price: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const publicAppUrl = this.getPublicAppUrl();
    return {
      data: items.map((item) => ({
        ...item,
        shortUrl: `${publicAppUrl}/r/${item.shortCode}`,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 12. Quản trị viên (Admin) xem chi tiết link
   */
  async getAdminLinkDetail(id: string) {
    const link = await this.prisma.referralLink.findUnique({
      where: { id },
      include: {
        collaborator: true,
        store: true,
        product: true,
        campaign: true,
        clickTrafficLogs: {
          take: 50,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại.');
    }

    const publicAppUrl = this.getPublicAppUrl();
    return {
      ...link,
      shortUrl: `${publicAppUrl}/r/${link.shortCode}`,
    };
  }

  /**
   * 13. Quản trị viên (Admin) khóa link vi phạm
   */
  async blockLinkByAdmin(
    linkId: string,
    adminId: string,
    reason: string,
    ipAddress?: string,
  ) {
    const link = await this.prisma.referralLink.findFirst({
      where: { id: linkId, deletedAt: null },
    });
    if (!link) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.referralLink.update({
        where: { id: linkId },
        data: {
          status: ReferralLinkStatus.BLOCKED,
          disabledReason: reason.trim(),
          disabledBy: adminId,
          disabledAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'REFERRAL_LINK_BLOCKED_BY_ADMIN',
          ipAddress: ipAddress || null,
          details: {
            referralLinkId: linkId,
            reason,
          },
        },
      });

      return updated;
    });

    if (link.shortCode) {
      await this.cacheService.del(`ref_link:${link.shortCode.toLowerCase()}`);
    }
    return result;
  }

  /**
   * 14. Quản trị viên (Admin) mở khóa link
   */
  async unblockLinkByAdmin(linkId: string, adminId: string, ipAddress?: string) {
    const link = await this.prisma.referralLink.findFirst({
      where: { id: linkId, deletedAt: null },
    });
    if (!link) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.referralLink.update({
        where: { id: linkId },
        data: {
          status: ReferralLinkStatus.ACTIVE,
          disabledReason: null,
          disabledBy: null,
          disabledAt: null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'REFERRAL_LINK_UNBLOCKED_BY_ADMIN',
          ipAddress: ipAddress || null,
          details: {
            referralLinkId: linkId,
          },
        },
      });

      return updated;
    });

    if (link.shortCode) {
      await this.cacheService.del(`ref_link:${link.shortCode.toLowerCase()}`);
    }
    return result;
  }

  /**
   * 15. Xử lý Redirect công khai:
   * - Rate limit theo IP + Session/Fingerprint qua CacheService (tối đa 60 requests/phút)
   * - Caching thông tin short code tối ưu hiệu năng
   * - Bot detection
   * - Phân định DELETED (404), BLOCKED (410), PAUSED/EXPIRED (302 không attribution), ACTIVE (302 có attribution)
   * - Ghi nhận Click traffic log & Cookie attribution 30 ngày
   */
  async handleRedirect(shortCode: string, clientInfo: ClientTrackingInfo) {
    // a. Rate limit theo Session / IP + Device Fingerprint qua CacheService
    const clientKey = clientInfo.sessionId
      ? `rl:sess:${clientInfo.sessionId}`
      : `rl:${clientInfo.ip || '127.0.0.1'}:${clientInfo.fingerprint || 'default'}`;
    const rateLimit = await this.cacheService.checkRateLimit(clientKey, 60, 60);

    if (!rateLimit.allowed) {
      throw new HttpException(
        'Vượt quá giới hạn số lượt truy cập (tối đa 60 lượt/phút). Vui lòng thử lại sau.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const normalizedCode = shortCode.trim().toLowerCase();
    const cacheKey = `ref_link:${normalizedCode}`;
    let link = await this.cacheService.get<any>(cacheKey);

    if (!link) {
      link = await this.prisma.referralLink.findUnique({
        where: { shortCode: normalizedCode },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              imageUrl: true,
              isActive: true,
              isAffiliateEnabled: true,
              deletedAt: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              deletedAt: true,
            },
          },
          collaborator: {
            select: {
              id: true,
              fullName: true,
              isActive: true,
            },
          },
        },
      });

      if (link) {
        // Cache link thông tin hợp lệ trong 300 giây (5 phút)
        await this.cacheService.set(cacheKey, link, 300);
      }
    }

    if (!link || link.deletedAt) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại hoặc đã bị xóa.');
    }

    const effectiveStatus = computeEffectiveStatus(link);

    if (effectiveStatus === 'DELETED') {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại hoặc đã bị xóa.');
    }

    // BLOCKED: HTTP 410 Gone, không redirect và không attribution
    if (effectiveStatus === 'BLOCKED') {
      throw new HttpException(
        `Liên kết tiếp thị này đã bị khóa (${link.disabledReason || 'Vi phạm chính sách'}). Không thể tiếp tục truy cập.`,
        HttpStatus.GONE,
      );
    }

    const destinationPath = link.destinationPath || `/products/${link.productId}`;

    // PAUSED và EXPIRED: vẫn đến sản phẩm nhưng không ghi attribution mới
    let allowAttribution = true;
    if (effectiveStatus === 'PAUSED' || effectiveStatus === 'EXPIRED') {
      allowAttribution = false;
    }

    // Bot detection: bot không nhận attribution
    const isBot = isSearchEngineBot(clientInfo.userAgent);
    if (isBot) {
      allowAttribution = false;
    }

    // Kiểm tra sản phẩm / shop còn hoạt động và cho phép affiliate
    if (
      !link.product ||
      link.product.deletedAt ||
      !link.product.isActive ||
      !link.product.isAffiliateEnabled ||
      !link.store ||
      link.store.deletedAt
    ) {
      allowAttribution = false;
    }

    // Ghi nhận Click Traffic Log & Cập nhật số liệu click bất đồng bộ qua Queue
    if (!isBot) {
      if (this.clickQueue) {
        this.clickQueue.enqueue({
          linkId: link.id,
          ip: clientInfo.ip || '0.0.0.0',
          userAgent: clientInfo.userAgent || null,
          referer: clientInfo.referer || null,
          fingerprint: clientInfo.fingerprint || null,
          deviceType: clientInfo.deviceType || null,
          sessionId: clientInfo.sessionId || null,
          isValid: allowAttribution,
          utmSource: link.utmSource || null,
          utmMedium: link.utmMedium || null,
          utmCampaign: link.utmCampaign || null,
        });
      } else {
        try {
          // Chống spam: kiểm tra lượt click trùng từ cùng IP + link trong vòng 30 giây
          const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
          const duplicateRecentClick = await this.prisma.clickTrafficLog.findFirst({
            where: {
              referralLinkId: link.id,
              ipAddress: clientInfo.ip || '0.0.0.0',
              createdAt: { gte: thirtySecondsAgo },
            },
          });

          const isUnique = !duplicateRecentClick;

          await Promise.all([
            this.prisma.referralLink.update({
              where: { id: link.id },
              data: {
                totalClicks: { increment: 1 },
                ...(isUnique ? { uniqueClicks: { increment: 1 } } : {}),
                lastAccessedAt: new Date(),
              },
            }),
            this.prisma.clickTrafficLog.create({
              data: {
                referralLinkId: link.id,
                ipAddress: clientInfo.ip || '0.0.0.0',
                userAgent: clientInfo.userAgent || null,
                referrer: clientInfo.referer || null,
                deviceFingerprint: clientInfo.fingerprint || null,
                deviceType: clientInfo.deviceType || null,
                sessionId: clientInfo.sessionId || null,
                isValid: allowAttribution,
                utmSource: link.utmSource || null,
                utmMedium: link.utmMedium || null,
                utmCampaign: link.utmCampaign || null,
              },
            }),
          ]);
        } catch (logErr) {
          this.logger.error('Lỗi khi ghi nhận click log:', logErr);
        }
      }
    }

    // Chuẩn bị payload attribution 30 ngày (Last Click)
    const attributionData = allowAttribution
      ? {
          referralLinkId: link.id,
          collaboratorId: link.collaboratorId,
          collaboratorName: link.collaborator.fullName,
          storeId: link.storeId,
          productId: link.productId,
          shortCode: link.shortCode,
          channel: link.channel,
          utmSource: link.utmSource,
          clickedAt: new Date().toISOString(),
        }
      : null;

    return {
      destinationPath,
      allowAttribution,
      attributionData,
      status: effectiveStatus,
      link: {
        id: link.id,
        shortCode: link.shortCode,
        product: link.product,
        store: link.store,
      },
    };
  }

  /**
   * 16. Xác thực tính hợp lệ của attribution khi tạo đơn hàng (Checkout):
   * - Khớp đúng storeId và productId đủ điều kiện
   * - Link bị BLOCKED trước khi tạo đơn => attribution MẤT HIỆU LỰC
   * - Link chỉ bị PAUSED bởi KOL => attribution hợp lệ đã ghi nhận trước đó VẪN CÒN HIỆU LỰC
   * - Snapshot hoa hồng chính xác từ sản phẩm / shop / chiến dịch
   */
  async verifyAttributionForOrder(params: {
    shortCode: string;
    storeId: string;
    productId: string;
  }): Promise<{
    isValid: boolean;
    collaboratorId?: string;
    referralLinkId?: string;
    appliedCommissionRate?: number;
    calculatedCommissionAmount?: number;
    reason?: string;
  }> {
    const link = await this.prisma.referralLink.findUnique({
      where: { shortCode: params.shortCode.toLowerCase() },
      include: {
        product: true,
        store: true,
        campaign: true,
      },
    });

    if (!link || link.deletedAt) {
      return { isValid: false, reason: 'Liên kết không tồn tại hoặc đã bị xóa.' };
    }

    // Link bị BLOCKED trước khi đặt hàng -> mất hiệu lực hoàn toàn
    if (link.status === ReferralLinkStatus.BLOCKED) {
      return {
        isValid: false,
        reason: 'Liên kết tiếp thị đã bị khóa trước thời điểm đặt hàng. Attribution không còn hiệu lực.',
      };
    }

    // Kiểm tra khớp Shop & Sản phẩm
    if (link.storeId !== params.storeId || link.productId !== params.productId) {
      return {
        isValid: false,
        reason: 'Sản phẩm hoặc Cửa hàng không khớp với liên kết tiếp thị này.',
      };
    }

    // Kiểm tra sản phẩm và shop còn hoạt động và có bật affiliate
    if (
      !link.product.isActive ||
      !link.product.isAffiliateEnabled ||
      link.product.deletedAt ||
      link.store.deletedAt
    ) {
      return {
        isValid: false,
        reason: 'Sản phẩm hoặc Cửa hàng không còn đủ điều kiện tính hoa hồng.',
      };
    }

    // Tính tỷ lệ hoa hồng snapshot
    let commissionRate =
      link.product.customCommissionRate !== null
        ? Number(link.product.customCommissionRate)
        : Number(link.store.defaultCommissionRate);

    // Cộng thưởng chiến dịch nếu chiến dịch còn hiệu lực
    if (link.campaign && link.campaign.isActive && new Date(link.campaign.endDate) >= new Date()) {
      commissionRate += Number(link.campaign.bonusCommissionRate || 0);
    }

    const price = Number(link.product.price);
    const calculatedCommissionAmount = (price * commissionRate) / 100;

    return {
      isValid: true,
      collaboratorId: link.collaboratorId,
      referralLinkId: link.id,
      appliedCommissionRate: commissionRate,
      calculatedCommissionAmount,
    };
  }

  /**
   * 17. Ghi nhận đơn hàng chuyển đổi từ liên kết tiếp thị (Checkout Attribution Snapshot):
   * - Gắn referralLinkId và attributedCollaboratorId vào Order
   * - Gắn referralLinkId vào các OrderItem tương ứng với sản phẩm của link
   * - Snapshot hoa hồng: appliedCommissionRate và calculatedCommissionAmount vào OrderItem
   * - Idempotency: Kiểm tra nếu đơn hàng đã được gắn link, KHÔNG tăng totalOrders lần 2
   * - Tăng totalOrders của ReferralLink (+1)
   * - Ghi AuditLog minh bạch
   */
  async recordOrderAttribution(params: {
    orderId: string;
    referralLinkId: string;
    collaboratorId: string;
    appliedCommissionRate?: number;
    calculatedCommissionAmount?: number;
  }) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Kiểm tra đơn hàng & Idempotency
      const order = await tx.order.findUnique({
        where: { id: params.orderId },
        select: { id: true, referralLinkId: true },
      });

      if (!order) {
        throw new NotFoundException('Đơn hàng không tồn tại.');
      }

      // BẢO VỆ ATTRIBUTION: Nếu đơn hàng đã gắn link A, từ chối ghi đè sang link B
      if (order.referralLinkId && order.referralLinkId !== params.referralLinkId) {
        throw new BadRequestException('Đơn hàng đã được ghi nhận attribution cho liên kết khác. Không thể thay đổi.');
      }

      // IDEMPOTENCY: Nếu đơn hàng đã gắn link này rồi, không tăng totalOrders lặp lại
      const isAlreadyAttributed = order.referralLinkId === params.referralLinkId;

      const link = await tx.referralLink.findUnique({
        where: { id: params.referralLinkId },
        include: { product: true },
      });

      if (!link) {
        throw new NotFoundException('Liên kết tiếp thị không tồn tại.');
      }

      // 2. Cập nhật Order
      await tx.order.update({
        where: { id: params.orderId },
        data: {
          referralLinkId: params.referralLinkId,
          attributedCollaboratorId: params.collaboratorId,
          attributionMethod: 'COOKIE',
        },
      });

      // 3. Cập nhật OrderItem CHỈ CHO DÒNG SẢN PHẨM KHỚP VỚI LINK VÀ SNAPSHOT HOA HỒNG
      const rate =
        params.appliedCommissionRate !== undefined
          ? params.appliedCommissionRate
          : (link.product.customCommissionRate !== null
              ? Number(link.product.customCommissionRate)
              : 5);

      const totalCommission =
        params.calculatedCommissionAmount !== undefined
          ? params.calculatedCommissionAmount
          : (Number(link.product.price) * rate) / 100;

      const items = await tx.orderItem.findMany({
        where: {
          orderId: params.orderId,
          productId: link.productId, // CHỈ DÒNG SẢN PHẨM KHỚP
        },
      });

      for (const item of items) {
        const itemAmount =
          params.calculatedCommissionAmount !== undefined && items.length === 1
            ? params.calculatedCommissionAmount
            : (Number(item.quantity) * Number(item.unitPrice) * rate) / 100;

        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            referralLinkId: params.referralLinkId,
            appliedCommissionRate: rate,
            calculatedCommissionAmount: itemAmount,
          },
        });
      }

      // 4. Tăng totalOrders của ReferralLink CHỈ KHI CHƯA TỪNG ĐƯỢC GHI NHẬN (IDEMPOTENCY)
      let updatedLink = link;
      if (!isAlreadyAttributed) {
        updatedLink = await tx.referralLink.update({
          where: { id: params.referralLinkId },
          data: {
            totalOrders: { increment: 1 },
          },
          include: { product: true },
        });

        // 5. Ghi AuditLog
        await tx.auditLog.create({
          data: {
            userId: params.collaboratorId,
            action: 'REFERRAL_ORDER_ATTRIBUTED',
            details: {
              orderId: params.orderId,
              referralLinkId: params.referralLinkId,
              totalOrders: updatedLink.totalOrders,
              appliedCommissionRate: rate,
              calculatedCommissionAmount: totalCommission,
            },
          },
        });
      }

      return updatedLink;
    });
  }
}
