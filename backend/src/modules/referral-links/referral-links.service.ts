import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  ReferralLinkStatus,
  UserRole,
  CampaignParticipantStatus,
  StoreCollaboratorStatus,
  OrderStatus,
  CommissionStatus,
  Prisma,
} from '@prisma/client';
import { CreateReferralLinkDto } from './dto/create-referral-link.dto';
import { UpdateReferralLinkDto } from './dto/update-referral-link.dto';
import { QueryReferralLinksDto } from './dto/query-referral-links.dto';
import {
  QueryTrackingEventsDto,
  AttributionAdjustmentDto,
} from './dto/tracking-analytics.dto';
import {
  generateShortCode,
  sanitizeUtmString,
  isSearchEngineBot,
  hashIpAddress,
  normalizeUserAgent,
  generateDeviceFingerprint,
} from './utils/short-code.generator';
import { CacheService } from '../../core/cache/cache.service';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

export interface ClientTrackingInfo {
  ip: string;
  userAgent?: string;
  referer?: string;
  fingerprint?: string;
  deviceType?: string;
  sessionId?: string;
  accessMethod?: 'QR' | 'LINK';
  isOptedOut?: boolean;
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
    const approvedStoreRelations = await this.prisma.storeCollaborator.findMany(
      {
        where: {
          collaboratorId,
          status: StoreCollaboratorStatus.APPROVED,
        },
        select: { storeId: true },
      },
    );
    const eligibleStoreIds = new Set<string>(
      approvedStoreRelations.map((r) => r.storeId),
    );

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
      throw new NotFoundException(
        'Tài khoản Cộng tác viên không tồn tại hoặc đã bị xóa.',
      );
    }

    if (!collaborator.isActive) {
      throw new ForbiddenException(
        'Tài khoản Cộng tác viên hiện đang bị khóa.',
      );
    }

    if (collaborator.role !== UserRole.COLLABORATOR) {
      throw new ForbiddenException(
        'Chỉ tài khoản vai trò COLLABORATOR mới được quyền tạo liên kết tiếp thị.',
      );
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
      throw new BadRequestException(
        'Cửa hàng sở hữu sản phẩm này không còn hoạt động.',
      );
    }

    // Kiểm tra sản phẩm có cho affiliate không
    if (!product.isAffiliateEnabled) {
      throw new ForbiddenException(
        'Sản phẩm này hiện không áp dụng chương trình tiếp thị liên kết (403 Forbidden).',
      );
    }

    const commissionRate =
      product.customCommissionRate !== null
        ? Number(product.customCommissionRate)
        : Number(product.store.defaultCommissionRate);

    if (commissionRate <= 0) {
      throw new ForbiddenException(
        'Sản phẩm này hiện có tỷ lệ hoa hồng bằng 0 (403 Forbidden).',
      );
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
        throw new BadRequestException(
          'Chiến dịch không thuộc Cửa hàng sở hữu sản phẩm này.',
        );
      }

      if (!campaign.isActive) {
        throw new BadRequestException(
          'Chiến dịch tiếp thị hiện đang tạm ngừng.',
        );
      }

      if (now < new Date(campaign.startDate)) {
        throw new BadRequestException('Chiến dịch tiếp thị chưa bắt đầu.');
      }

      if (now > new Date(campaign.endDate)) {
        throw new HttpException(
          'Chiến dịch tiếp thị đã hết hạn (409 Conflict).',
          HttpStatus.CONFLICT,
        );
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

      if (
        !participant ||
        participant.status !== CampaignParticipantStatus.ACCEPTED
      ) {
        throw new ForbiddenException(
          'KOL chưa được phê duyệt tham gia chiến dịch này (CampaignParticipantStatus phải là ACCEPTED).',
        );
      }

      // Kiểm tra xem chiến dịch có giới hạn danh mục sản phẩm cụ thể (campaign_products) không
      const campaignProductCount = await this.prisma.campaignProduct.count({
        where: { campaignId: dto.campaignId },
      });
      if (campaignProductCount > 0) {
        const isProductInCampaign =
          await this.prisma.campaignProduct.findUnique({
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
          throw new BadRequestException(
            'Thời hạn hết hạn của liên kết (expiresAt) phải nằm trong tương lai.',
          );
        }
        if (linkExpiry > new Date(campaign.endDate)) {
          throw new BadRequestException(
            'Thời hạn liên kết không được vượt quá thời gian kết thúc của chiến dịch.',
          );
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

      const hasAcceptedCampaign =
        await this.prisma.campaignParticipant.findFirst({
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
        throw new BadRequestException(
          'Thời hạn hết hạn của liên kết (expiresAt) phải nằm trong tương lai.',
        );
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
      const linkId = crypto.randomUUID();
      // FR-11: Dùng endpoint nội bộ /api/referral-links/:id/qr, không dùng dịch vụ công cộng bên thứ ba
      const qrCodeUrl = `/api/referral-links/${linkId}/qr`;

      try {
        // Giao dịch Transaction tạo link và AuditLog cùng nhau
        createdLink = await this.prisma.$transaction(async (tx) => {
          const newLink = await tx.referralLink.create({
            data: {
              id: linkId,
              collaboratorId,
              storeId: product.storeId,
              productId: product.id,
              campaignId: validatedCampaign?.id ?? null,
              shortCode,
              label: sanitizeUtmString(dto.label, 150),
              channel: dto.channel,
              destinationPath,
              utmSource: dto.utmSource
                ? sanitizeUtmString(dto.utmSource, 100)
                : null,
              utmMedium: dto.utmMedium
                ? sanitizeUtmString(dto.utmMedium, 100)
                : null,
              utmCampaign: dto.utmCampaign
                ? sanitizeUtmString(dto.utmCampaign, 100)
                : null,
              utmContent: dto.utmContent
                ? sanitizeUtmString(dto.utmContent, 100)
                : null,
              customCouponCode:
                dto.customCouponCode?.trim().toUpperCase() || null,
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
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          retries--;
          this.logger.warn(
            `Va chạm shortCode ngẫu nhiên. Thử lại sinh mã mới... (còn ${retries} lần)`,
          );
          if (retries === 0) {
            throw new HttpException(
              'Hệ thống bận, không thể sinh mã rút gọn duy nhất. Vui lòng thử lại.',
              HttpStatus.CONFLICT,
            );
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
  async getCollaboratorLinks(
    collaboratorId: string,
    query: QueryReferralLinksDto,
  ) {
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
    const validSortFields = [
      'createdAt',
      'totalClicks',
      'uniqueClicks',
      'totalOrders',
    ];
    const sortField = validSortFields.includes(query.sortBy || '')
      ? query.sortBy!
      : 'createdAt';
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
          customCouponCode: dto.customCouponCode
            ? dto.customCouponCode.trim().toUpperCase()
            : link.customCouponCode,
          utmSource: dto.utmSource
            ? sanitizeUtmString(dto.utmSource, 100)
            : link.utmSource,
          utmMedium: dto.utmMedium
            ? sanitizeUtmString(dto.utmMedium, 100)
            : link.utmMedium,
          utmCampaign: dto.utmCampaign
            ? sanitizeUtmString(dto.utmCampaign, 100)
            : link.utmCampaign,
          utmContent: dto.utmContent
            ? sanitizeUtmString(dto.utmContent, 100)
            : link.utmContent,
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
  async toggleLinkStatus(
    id: string,
    collaboratorId: string,
    ipAddress?: string,
  ) {
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
        throw new ForbiddenException(
          'Bạn không có quyền quản lý cửa hàng này.',
        );
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
      throw new NotFoundException(
        'Liên kết tiếp thị không tồn tại trong cửa hàng này.',
      );
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
      throw new NotFoundException(
        'Liên kết tiếp thị không tồn tại trong cửa hàng này.',
      );
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
  async unblockLinkByAdmin(
    linkId: string,
    adminId: string,
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
  /**
   * 15. Xử lý Redirect công khai & Động cơ Attribution (FR-13):
   * - Rate limit kép theo IP/Session qua Redis (tối đa 10 req/giây và 60 req/phút)
   * - Nhận diện bot / crawler tự động
   * - Nếu vượt rate limit hoặc bot: VẪN redirect an toàn nhưng KHÔNG ghi cookie/attribution
   * - Chuẩn hóa subnet IP và tạo server-side HMAC device fingerprint (không lưu fingerprint thô)
   * - Quản lý phiên AttributionSession độc lập cho từng Shop (Multi-Merchant Last-Click Wins)
   * - Hỗ trợ thời hạn cookie theo cấu hình của Shop (attributionWindowDays, mặc định 30 ngày từ 1-365 ngày)
   * - Ghi nhận Click traffic log idempotent và dedup 30 phút qua ClickQueueService
   */
  async handleRedirect(shortCode: string, clientInfo: ClientTrackingInfo) {
    const rawIp = clientInfo.ip || '127.0.0.1';
    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!jwtSecret || !jwtSecret.trim()) {
      throw new InternalServerErrorException(
        'Cấu hình JWT_SECRET bị thiếu trong hệ thống!',
      );
    }

    // 1. Rate limit kép qua Redis: 10 req/giây và 60 req/phút theo IP/Session (FR-13 Mục 25)
    const secKey = `rl:sec:${rawIp}`;
    const minKey = `rl:min:${rawIp}`;
    const [secLimit, minLimit] = await Promise.all([
      this.cacheService.checkRateLimit(secKey, 10, 1),
      this.cacheService.checkRateLimit(minKey, 60, 60),
    ]);

    const isRateLimited = !secLimit.allowed || !minLimit.allowed;

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
              attributionWindowDays: true,
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
        await this.cacheService.set(cacheKey, link, 300);
      }
    }

    if (!link || link.deletedAt) {
      throw new NotFoundException(
        'Liên kết tiếp thị không tồn tại hoặc đã bị xóa.',
      );
    }

    const effectiveStatus = computeEffectiveStatus(link);

    if (effectiveStatus === 'DELETED') {
      throw new NotFoundException(
        'Liên kết tiếp thị không tồn tại hoặc đã bị xóa.',
      );
    }

    // BLOCKED: HTTP 410 Gone, không redirect và không attribution
    if (effectiveStatus === 'BLOCKED') {
      throw new HttpException(
        `Liên kết tiếp thị này đã bị khóa (${link.disabledReason || 'Vi phạm chính sách'}). Không thể tiếp tục truy cập.`,
        HttpStatus.GONE,
      );
    }

    const destinationPath =
      link.destinationPath || `/products/${link.productId}`;

    // Xác định cờ tính hợp lệ & lý do từ chối attribution (nếu có)
    let allowAttribution = true;
    let riskReason: string | null = null;

    // Vượt rate limit: vẫn redirect nhưng không attribution (Mục 25)
    if (isRateLimited) {
      allowAttribution = false;
      riskReason = 'CLICK_RATE_LIMITED';
    }

    // Bot detection (Mục 25)
    const isBot = isSearchEngineBot(clientInfo.userAgent);
    if (isBot) {
      allowAttribution = false;
      riskReason = 'BOT_CRAWLER';
    }

    // Link PAUSED hoặc EXPIRED: vẫn đến sản phẩm nhưng không ghi attribution mới (Mục 20)
    if (effectiveStatus === 'PAUSED' || effectiveStatus === 'EXPIRED') {
      allowAttribution = false;
      riskReason =
        effectiveStatus === 'PAUSED' ? 'LINK_PAUSED' : 'LINK_EXPIRED';
    }

    // Kiểm tra tính hợp lệ của sản phẩm / gian hàng (Mục 4)
    if (
      !link.product ||
      link.product.deletedAt ||
      !link.product.isActive ||
      !link.product.isAffiliateEnabled ||
      !link.store ||
      link.store.deletedAt ||
      !link.collaborator?.isActive
    ) {
      allowAttribution = false;
      riskReason = 'PRODUCT_OR_STORE_INACTIVE';
    }

    // Kiểm tra khách hàng từ chối theo dõi (Privacy Consent: DNT / GPC / Opt-out - Lỗi 6)
    if (clientInfo.isOptedOut) {
      allowAttribution = false;
      riskReason = 'CLIENT_OPTED_OUT_PRIVACY';
    }

    // 2. Chuẩn hóa Subnet IP & Server-Side HMAC Device Fingerprint (Mục 7, 8, 9)
    const { prefix: ipPrefix, hash: ipHash } = hashIpAddress(rawIp, jwtSecret);
    const normalizedUa = normalizeUserAgent(clientInfo.userAgent);
    const fingerprintHash = generateDeviceFingerprint(
      rawIp,
      normalizedUa,
      jwtSecret,
    );
    const clickLogId = crypto.randomUUID();
    const eventId = `evt-${clickLogId}`;

    // Thời hạn attribution theo Shop (mặc định 30 ngày, cho phép 1-365 ngày - Mục 11)
    const storeWindowDays =
      link.store?.attributionWindowDays &&
      link.store.attributionWindowDays >= 1 &&
      link.store.attributionWindowDays <= 365
        ? link.store.attributionWindowDays
        : 30;
    const expiresAt = new Date(
      Date.now() + storeWindowDays * 24 * 60 * 60 * 1000,
    );

    const visitorId = clientInfo.sessionId || crypto.randomUUID();
    const visitorIdHash = crypto
      .createHmac('sha256', jwtSecret)
      .update(visitorId)
      .digest('hex');

    // 3. Quản lý AttributionSession trong Database nếu click hợp lệ (Mục 10, 12, 13)
    let attributionSessionId: string | null = crypto.randomUUID();
    if (allowAttribution && this.prisma.attributionSession) {
      try {
        // Upsert theo (storeId, visitorIdHash) đảm bảo Last-Click Wins cho Shop này
        // Không ảnh hưởng đến attribution của Shop khác (Multi-Merchant Isolation)
        // latestClickId là UUID hợp lệ liên kết tới ClickTrafficLog
        const sessionRecord = await this.prisma.attributionSession.upsert({
          where: {
            storeId_visitorIdHash: {
              storeId: link.storeId,
              visitorIdHash,
            },
          },
          create: {
            id: attributionSessionId,
            storeId: link.storeId,
            collaboratorId: link.collaboratorId,
            referralLinkId: link.id,
            visitorIdHash,
            fingerprintHash,
            latestClickId: clickLogId,
            firstClickedAt: new Date(),
            lastClickedAt: new Date(),
            expiresAt,
            status: 'ACTIVE',
          },
          update: {
            collaboratorId: link.collaboratorId,
            referralLinkId: link.id,
            fingerprintHash,
            latestClickId: clickLogId,
            lastClickedAt: new Date(),
            expiresAt,
            status: 'ACTIVE',
          },
        });
        attributionSessionId = sessionRecord.id;
      } catch (sessionErr: any) {
        this.logger.error(`Lỗi tạo AttributionSession: ${sessionErr.message}`);
        // Không cấp cookie nếu session thất bại để chống việc client nhận cookie nhưng DB không có session (Lỗi 1)
        allowAttribution = false;
        attributionSessionId = null;
      }
    }

    // 4. Ghi nhận Click Traffic Log bất đồng bộ qua Queue với Idempotency & Dedup 30 phút
    if (this.clickQueue) {
      this.clickQueue.enqueue({
        clickLogId,
        eventId,
        linkId: link.id,
        storeId: link.storeId,
        collaboratorId: link.collaboratorId,
        productId: link.productId,
        campaignId: link.campaignId,
        ipSubnet: ipPrefix,
        ipHash,
        userAgent: normalizedUa,
        referer:
          clientInfo.referer ||
          (clientInfo.accessMethod === 'QR' ? 'QR_SCAN' : null),
        fingerprintHash,
        deviceType: clientInfo.deviceType || null,
        visitorIdHash,
        isValid: allowAttribution,
        riskReason,
        requestId: crypto.randomUUID(),
        utmSource: link.utmSource || null,
        utmMedium: link.utmMedium || null,
        utmCampaign: link.utmCampaign || null,
        accessMethod: clientInfo.accessMethod || 'LINK',
        receivedAt: new Date(),
      });
    }

    // 5. Chuẩn bị payload attribution cho Cookie scanms_attr
    const attributionData = allowAttribution
      ? {
          sessionId: attributionSessionId,
          referralLinkId: link.id,
          collaboratorId: link.collaboratorId,
          collaboratorName: link.collaborator.fullName,
          storeId: link.storeId,
          productId: link.productId,
          shortCode: link.shortCode,
          channel: link.channel,
          utmSource: link.utmSource,
          clickedAt: new Date().toISOString(),
          expiresAt: expiresAt.toISOString(),
        }
      : null;

    return {
      destinationPath,
      allowAttribution,
      attributionData,
      visitorId,
      attributionWindowDays: storeWindowDays,
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
   * 15.1 Báo cáo thống kê tracking chi tiết cho KOL (FR-13 Mục 40, 43):
   * - Tách bạch: Raw clicks, Valid clicks, Unique clicks, Suspicious clicks, Conversions, CR%
   * - Phân loại theo kênh và phương thức (Link thường vs Quét QR)
   * - BẢO VỆ RIÊNG TƯ (Mục 37): Tuyệt đối không trả IP, User-Agent hoặc Fingerprint thô
   */
  async getLinkAnalytics(
    linkId: string,
    collaboratorId: string,
    userRole?: string,
    storeId?: string,
  ) {
    const link = await this.prisma.referralLink.findUnique({
      where: { id: linkId },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            imageUrl: true,
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

    if (!link || link.deletedAt) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại.');
    }

    // Nếu là KOL, chỉ được xem link của chính mình
    if (
      userRole === UserRole.COLLABORATOR &&
      link.collaboratorId !== collaboratorId
    ) {
      throw new ForbiddenException(
        'Bạn không có quyền xem thống kê của liên kết này.',
      );
    }

    // Nếu là Chủ Shop, chỉ được xem link thuộc Shop mình (Issue 9)
    if (storeId && link.storeId !== storeId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem thống kê của liên kết này.',
      );
    }
    if (userRole === UserRole.SHOP_MANAGER && link.storeId !== storeId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem thống kê của liên kết này.',
      );
    }

    // Đếm các loại click trong database
    const [
      rawClicks,
      validClicks,
      uniqueClicks,
      suspiciousClicks,
      qrClicks,
      linkClicks,
      attributedOrders,
    ] = await Promise.all([
      this.prisma.clickTrafficLog.count({ where: { referralLinkId: linkId } }),
      this.prisma.clickTrafficLog.count({
        where: { referralLinkId: linkId, isValid: true },
      }),
      this.prisma.clickTrafficLog.count({
        where: { referralLinkId: linkId, isUnique: true },
      }),
      this.prisma.clickTrafficLog.count({
        where: { referralLinkId: linkId, isValid: false },
      }),
      this.prisma.clickTrafficLog.count({
        where: { referralLinkId: linkId, accessMethod: 'QR' },
      }),
      this.prisma.clickTrafficLog.count({
        where: { referralLinkId: linkId, accessMethod: 'LINK' },
      }),
      this.prisma.order.findMany({
        where: {
          referralLinkId: linkId,
          status: { not: OrderStatus.CANCELLED },
        },
        select: {
          id: true,
          finalAmount: true,
          status: true,
          createdAt: true,
          commissions: {
            select: {
              commissionAmount: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const conversions = attributedOrders.length;
    const conversionRate =
      rawClicks > 0 ? Number(((conversions / rawClicks) * 100).toFixed(2)) : 0;
    let totalRevenue = 0;
    let totalCommission = 0;

    for (const ord of attributedOrders) {
      totalRevenue += Number(ord.finalAmount);
      for (const comm of ord.commissions) {
        totalCommission += Number(comm.commissionAmount);
      }
    }

    return {
      linkId: link.id,
      shortCode: link.shortCode,
      label: link.label,
      channel: link.channel,
      status: link.status,
      product: link.product,
      store: link.store,
      clicks: {
        rawClicks,
        validClicks,
        uniqueClicks,
        suspiciousClicks,
        qrClicks,
        linkClicks,
      },
      conversions: {
        totalOrders: conversions,
        conversionRate,
        totalRevenue,
        totalCommission,
      },
    };
  }

  /**
   * 15.2 Thống kê tracking cho Chủ Shop (FR-13 Mục 37, 43):
   * - Xem hiệu quả link của Shop mình
   * - Không truy cập IP / Fingerprint thô của khách
   */
  async getStoreLinkAnalytics(
    storeId: string,
    linkId: string,
    userId: string,
    userRole?: string,
  ) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store || store.deletedAt) {
      throw new NotFoundException('Gian hàng không tồn tại.');
    }

    if (userRole === UserRole.SHOP_MANAGER && store.ownerId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem dữ liệu của gian hàng này.',
      );
    }

    // Xác thực liên kết thực sự thuộc về gian hàng storeId (Issue 9)
    const link = await this.prisma.referralLink.findUnique({
      where: { id: linkId },
      select: { id: true, storeId: true, deletedAt: true },
    });
    if (!link || link.deletedAt) {
      throw new NotFoundException('Liên kết tiếp thị không tồn tại.');
    }
    if (link.storeId !== storeId) {
      throw new ForbiddenException(
        'Bạn không có quyền xem dữ liệu của liên kết thuộc gian hàng khác.',
      );
    }

    return this.getLinkAnalytics(linkId, userId, userRole, storeId);
  }

  /**
   * 15.3 Tra cứu sự kiện Tracking cho Admin phục vụ kiểm toán & chống gian lận (FR-13 Mục 37, 43):
   * - Admin xem danh sách sự kiện click, phát hiện dấu hiệu bất thường
   * - IP được che mờ (masking) để bảo vệ quyền riêng tư
   */
  async getAdminTrackingEvents(query: QueryTrackingEventsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ClickTrafficLogWhereInput = {};

    if (query.storeId) where.storeId = query.storeId;
    if (query.referralLinkId) where.referralLinkId = query.referralLinkId;
    if (query.collaboratorId) where.collaboratorId = query.collaboratorId;
    if (query.isValid !== undefined) where.isValid = query.isValid;
    if (query.accessMethod) where.accessMethod = query.accessMethod;

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [total, items] = await Promise.all([
      this.prisma.clickTrafficLog.count({ where }),
      this.prisma.clickTrafficLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          referralLink: {
            select: {
              shortCode: true,
              label: true,
              channel: true,
              collaborator: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Mask IP address (VD: 192.168.1.***)
    const maskedItems = items.map((item) => {
      const parts = (item.ipAddress || '').split('.');
      const maskedIp =
        parts.length === 4
          ? `${parts[0]}.${parts[1]}.${parts[2]}.***`
          : '***.***.***.***';

      return {
        ...item,
        ipAddress: maskedIp,
        deviceFingerprint: item.fingerprintHash
          ? `${item.fingerprintHash.slice(0, 8)}...`
          : null,
      };
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: maskedItems,
    };
  }

  /**
   * 15.3.1 Xác định KOL attribution hiệu lực cuối cùng (Effective Attribution) của đơn hàng (FR-13 - Issue 3):
   * - Nếu đơn hàng đã từng được điều chỉnh qua AttributionAdjustment, lấy newCollaboratorId của bản ghi mới nhất.
   * - Nếu chưa từng điều chỉnh, lấy attributedCollaboratorId gốc từ Order.
   */
  async resolveEffectiveOrderAttribution(
    orderId: string,
    storeId?: string,
    userId?: string,
    userRole?: UserRole | string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || this.prisma;
    const order = await client.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        storeId: true,
        attributedCollaboratorId: true,
        referralLinkId: true,
        attributionMethod: true,
        status: true,
        createdAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại.');
    }

    // Kiểm tra ràng buộc storeId từ URL nếu có (chống Shop A xem đơn Shop B)
    if (storeId && order.storeId !== storeId) {
      throw new ForbiddenException(
        'Đơn hàng không thuộc gian hàng được chỉ định.',
      );
    }

    // Kiểm tra quyền sở hữu gian hàng nếu người gọi là Chủ Shop (Shop Manager)
    if (userRole === UserRole.SHOP_MANAGER && userId) {
      const store = await client.store.findFirst({
        where: { id: order.storeId, ownerId: userId, deletedAt: null },
      });
      if (!store) {
        throw new ForbiddenException(
          'Bạn không có quyền xem thông tin phân bổ của gian hàng này.',
        );
      }
    }

    const latestAdjustment = await client.attributionAdjustment.findFirst({
      where: { orderId },
      orderBy: { adjustedAt: 'desc' },
      include: {
        admin: {
          select: { id: true, fullName: true, role: true }, // TUYỆT ĐỐI KHÔNG LEAK EMAIL ADMIN (Issue 1)
        },
      },
    });

    const effectiveCollaboratorId =
      latestAdjustment?.newCollaboratorId ?? order.attributedCollaboratorId;

    let effectiveCollaborator: any = null;
    if (effectiveCollaboratorId) {
      const rawCollab = await client.user.findUnique({
        where: { id: effectiveCollaboratorId },
        select: { id: true, fullName: true, email: true, role: true },
      });

      if (rawCollab) {
        // Chỉ Quản trị viên hệ thống mới xem được email gốc đầy đủ; Chủ Shop chỉ xem email đã ẩn danh (Issue 1)
        const isSysAdmin = userRole === UserRole.SYSTEM_ADMIN;
        effectiveCollaborator = {
          id: rawCollab.id,
          fullName: rawCollab.fullName,
          email: isSysAdmin ? rawCollab.email : this.maskEmail(rawCollab.email),
          role: rawCollab.role,
        };
      }
    }

    return {
      orderId: order.id,
      storeId: order.storeId,
      originalCollaboratorId: order.attributedCollaboratorId,
      effectiveCollaboratorId,
      effectiveCollaborator,
      isAdjusted: !!latestAdjustment,
      latestAdjustment: latestAdjustment
        ? {
            id: latestAdjustment.id,
            previousCollaboratorId: latestAdjustment.previousCollaboratorId,
            newCollaboratorId: latestAdjustment.newCollaboratorId,
            reason: latestAdjustment.reason,
            adjustedAt: latestAdjustment.adjustedAt,
            admin: latestAdjustment.admin,
          }
        : null,
    };
  }

  /**
   * Che địa chỉ email để bảo vệ quyền riêng tư (Data Privacy - Issue 1)
   */
  private maskEmail(email?: string | null): string | null {
    if (!email || !email.includes('@')) return null;
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local[0]}***@${domain}`;
    }
    return `${local.substring(0, 2)}***@${domain}`;
  }

  /**
   * 15.4 Điều chỉnh Attribution thủ công bởi Admin khi giải quyết khiếu nại (FR-13 Mục 23, 39):
   * - Đọc KOL hiệu lực từ Adjustment mới nhất (hoặc Order gốc) để cho phép điều chỉnh chuỗi nhiều lần (Issue 3)
   * - Tạo bản ghi AttributionAdjustment bất biến và liên kết trực tiếp hoa hồng cũ/mới
   * - Không sửa đè lịch sử gốc, bảo toàn sổ cái
   */
  async adjustOrderAttribution(
    orderId: string,
    dto: AttributionAdjustmentDto,
    adminId: string,
    ipAddress?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { attributedCollaborator: true },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại.');
    }

    // 1. Kiểm tra KOL mới tồn tại, role là COLLABORATOR và đang hoạt động (Lỗi 9)
    const newCollab = await this.prisma.user.findUnique({
      where: { id: dto.newCollaboratorId },
    });
    if (
      !newCollab ||
      !newCollab.isActive ||
      newCollab.role !== UserRole.COLLABORATOR
    ) {
      throw new BadRequestException(
        'KOL mới không hợp lệ, không phải vai trò COLLABORATOR hoặc đã bị vô hiệu hóa.',
      );
    }

    // 2. Kiểm tra quan hệ với Shop của đơn hàng phải ở trạng thái APPROVED (Lỗi 9)
    const storeCollab = await this.prisma.storeCollaborator.findFirst({
      where: {
        storeId: order.storeId,
        collaboratorId: dto.newCollaboratorId,
        status: StoreCollaboratorStatus.APPROVED,
      },
    });
    if (!storeCollab) {
      throw new BadRequestException(
        'KOL mới chưa được Shop của đơn hàng này phê duyệt liên kết (APPROVED).',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // 3. Xác định KOL hiệu lực hiện tại từ adjustment mới nhất (hoặc order gốc) (Issue 3)
      const effectiveInfo = await this.resolveEffectiveOrderAttribution(
        orderId,
        undefined,
        undefined,
        undefined,
        tx,
      );
      const previousCollabId = effectiveInfo.effectiveCollaboratorId;

      if (previousCollabId === dto.newCollaboratorId) {
        throw new BadRequestException(
          'Đơn hàng hiện tại đã được phân bổ cho KOL này, không thể điều chỉnh trùng lặp.',
        );
      }

      // 4. Đồng bộ tác động hoa hồng / đối soát (Issue 4 - Không xóa bản ghi cũ, chuyển sang REVERSED)
      let previousCommissionId: string | null = null;
      let newCommissionId: string | null = null;
      let commissionImpact: any = null;

      if (previousCollabId) {
        const existingCommission = await tx.commission.findFirst({
          where: {
            orderId,
            collaboratorId: previousCollabId,
          },
        });

        if (existingCommission) {
          previousCommissionId = existingCommission.id;
          if (existingCommission.status === CommissionStatus.PENDING) {
            // KHÔNG XÓA VẬT LÝ! Đổi hoa hồng cũ sang REVERSED để bảo toàn sổ cái và lịch sử tài chính
            await tx.commission.update({
              where: { id: existingCommission.id },
              data: {
                status: CommissionStatus.REVERSED,
              },
            });

            // Tạo hoa hồng mới cho KOL mới
            const newCommission = await tx.commission.upsert({
              where: {
                orderId_collaboratorId: {
                  orderId,
                  collaboratorId: dto.newCollaboratorId,
                },
              },
              create: {
                orderId,
                collaboratorId: dto.newCollaboratorId,
                commissionAmount: existingCommission.commissionAmount,
                status: CommissionStatus.PENDING,
                eligibleAt: existingCommission.eligibleAt,
                availableAt: existingCommission.availableAt,
              },
              update: {
                commissionAmount: existingCommission.commissionAmount,
                status: CommissionStatus.PENDING,
              },
            });
            newCommissionId = newCommission.id;

            commissionImpact = {
              reassigned: true,
              previousCommissionId: existingCommission.id,
              previousCommissionStatus: CommissionStatus.REVERSED,
              newCommissionId: newCommission.id,
              newCommissionStatus: CommissionStatus.PENDING,
              amount: Number(existingCommission.commissionAmount),
              reason: dto.reason,
              performedBy: adminId,
            };
          } else {
            commissionImpact = {
              reassigned: false,
              previousCommissionId: existingCommission.id,
              previousCommissionStatus: existingCommission.status,
              note: `Hoa hồng đã ở trạng thái ${existingCommission.status}, cần đối soát qua kỳ quyết toán tiếp theo.`,
              amount: Number(existingCommission.commissionAmount),
              reason: dto.reason,
              performedBy: adminId,
            };
          }
        }
      }

      // 5. Tạo bản ghi AttributionAdjustment bất biến và liên kết cả 2 bản ghi hoa hồng
      const adjustment = await tx.attributionAdjustment.create({
        data: {
          orderId,
          adminId,
          previousCollaboratorId: previousCollabId,
          newCollaboratorId: dto.newCollaboratorId,
          previousCommissionId,
          newCommissionId,
          reason: dto.reason,
          evidenceUrl: dto.evidenceUrl || null,
        },
      });

      // 6. Ghi AuditLog
      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: 'ATTRIBUTION_ADJUSTED_BY_ADMIN',
          ipAddress: ipAddress || null,
          details: {
            orderId,
            performedBy: adminId,
            previousCollaboratorId: previousCollabId,
            newCollaboratorId: dto.newCollaboratorId,
            reason: dto.reason,
            evidenceUrl: dto.evidenceUrl || null,
            previousCommissionId,
            newCommissionId,
            commissionImpact,
          },
        },
      });

      return {
        ...adjustment,
        effectiveCollaboratorId: dto.newCollaboratorId,
        commissionImpact,
      };
    });
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
      return {
        isValid: false,
        reason: 'Liên kết không tồn tại hoặc đã bị xóa.',
      };
    }

    // Link bị BLOCKED trước khi đặt hàng -> mất hiệu lực hoàn toàn
    if (link.status === ReferralLinkStatus.BLOCKED) {
      return {
        isValid: false,
        reason:
          'Liên kết tiếp thị đã bị khóa trước thời điểm đặt hàng. Attribution không còn hiệu lực.',
      };
    }

    // Kiểm tra khớp Shop & Sản phẩm
    if (
      link.storeId !== params.storeId ||
      link.productId !== params.productId
    ) {
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
    if (
      link.campaign &&
      link.campaign.isActive &&
      new Date(link.campaign.endDate) >= new Date()
    ) {
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
      if (
        order.referralLinkId &&
        order.referralLinkId !== params.referralLinkId
      ) {
        throw new BadRequestException(
          'Đơn hàng đã được ghi nhận attribution cho liên kết khác. Không thể thay đổi.',
        );
      }

      // IDEMPOTENCY: Nếu đơn hàng đã gắn link này rồi, không tăng totalOrders lặp lại
      const isAlreadyAttributed =
        order.referralLinkId === params.referralLinkId;

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
          : link.product.customCommissionRate !== null
            ? Number(link.product.customCommissionRate)
            : 5;

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

  /**
   * ======================================================================
   * FR-11 — TẠO MÃ QR CODE ĐỘNG
   * ======================================================================
   * Sinh ảnh QR chứa duy nhất short URL HTTPS: `${publicAppUrl}/r/${link.shortCode}?via=qr`
   * - Hỗ trợ format: 'png' (mặc định), 'svg'
   * - Hỗ trợ size: 512, 1024 (mặc định), 2048 px
   * - Error Correction Level: 'M' (chuẩn quét tốt)
   * - Quiet Zone (margin): 4 modules
   * - Màu: #1A1612 trên nền trắng #FFFFFF
   * - Phân quyền:
   *   + KOL: chỉ xem/tải link của mình
   *   + Shop: xem/tải link tiếp thị sản phẩm của Shop
   *   + Admin: xem/tải tra cứu toàn hệ thống
   * - Ghi Audit Log khi Shop hoặc Admin xem/tải thay KOL
   * - Ghi nhận lượt tải (qr_download_count)
   * - Cache kết quả render theo (linkId, format, size) để tối ưu CPU (p95 < 200ms)
   * - Hoàn toàn idempotent, không tạo thêm bản ghi link
   */
  async generateQrCode(
    linkIdOrCode: string,
    user: { id: string; role: UserRole },
    options: {
      format?: 'png' | 'svg';
      size?: number;
      download?: boolean;
    },
    ipAddress?: string,
  ): Promise<{
    buffer: Buffer | string;
    contentType: string;
    filename: string;
    shortCode: string;
    shortUrl: string;
  }> {
    const rawFormat = (options.format || 'png').toLowerCase();
    if (rawFormat !== 'png' && rawFormat !== 'svg') {
      throw new BadRequestException(
        'Định dạng ảnh QR không hợp lệ. Hệ thống chỉ hỗ trợ "png" hoặc "svg".',
      );
    }
    const format = rawFormat;

    const rawSize = options.size ? Number(options.size) : 1024;
    if (![512, 1024, 2048].includes(rawSize)) {
      throw new BadRequestException(
        'Kích thước ảnh QR không hợp lệ. Chỉ chấp nhận các kích thước 512, 1024 hoặc 2048 px.',
      );
    }
    const size = rawSize;
    const isDownload = Boolean(options.download);

    // Tìm kiếm referral link theo id hoặc shortCode
    const link = await this.prisma.referralLink.findFirst({
      where: {
        OR: [{ id: linkIdOrCode }, { shortCode: linkIdOrCode.toLowerCase() }],
        deletedAt: null,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            storeId: true,
          },
        },
        store: {
          select: {
            id: true,
            ownerId: true,
            name: true,
          },
        },
        collaborator: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException(
        'Liên kết tiếp thị không tồn tại hoặc đã bị xóa.',
      );
    }

    // Kiểm tra phân quyền sở hữu
    if (user.role === UserRole.COLLABORATOR) {
      if (link.collaboratorId !== user.id) {
        throw new ForbiddenException(
          'Bạn không có quyền xem hoặc tải mã QR của liên kết này.',
        );
      }
    } else if (user.role === UserRole.SHOP_MANAGER) {
      if (link.store?.ownerId !== user.id) {
        throw new ForbiddenException(
          'Bạn không có quyền xem mã QR của liên kết thuộc cửa hàng khác.',
        );
      }
    } else if (user.role === UserRole.SYSTEM_ADMIN) {
      // Cho phép tra cứu/hỗ trợ
    } else {
      throw new ForbiddenException(
        'Vai trò người dùng không có quyền truy cập mã QR.',
      );
    }

    // Rate limiting riêng cho API QR: Preview tối đa 60 req/phút, Render/Download tối đa 20 req/phút
    const maxReq = isDownload ? 20 : 60;
    const rateLimitKey = `qr_rl:${user.id}:${isDownload ? 'dl' : 'prev'}`;
    const rateLimit = await this.cacheService.checkRateLimit(
      rateLimitKey,
      maxReq,
      60,
    );
    if (!rateLimit.allowed) {
      throw new HttpException(
        `Vượt quá giới hạn yêu cầu mã QR (tối đa ${maxReq} yêu cầu/phút). Vui lòng thử lại sau.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Ghi Audit Log nếu Admin hoặc Shop thao tác thay KOL (Mục 24)
    if (
      user.role === UserRole.SYSTEM_ADMIN ||
      (user.role === UserRole.SHOP_MANAGER && link.collaboratorId !== user.id)
    ) {
      await this.prisma.auditLog
        .create({
          data: {
            userId: user.id,
            action: isDownload ? 'QR_DOWNLOAD_AUDIT' : 'QR_VIEW_AUDIT',
            ipAddress: ipAddress || null,
            details: {
              referralLinkId: link.id,
              shortCode: link.shortCode,
              operatorRole: user.role,
              ownerCollaboratorId: link.collaboratorId,
              format,
              size,
            },
          },
        })
        .catch((err) => {
          this.logger.warn(`Lỗi ghi audit log khi thao tác QR: ${err.message}`);
        });
    }

    const publicAppUrl = this.getPublicAppUrl();
    const shortUrl = `${publicAppUrl}/r/${link.shortCode}?via=qr`;
    const filename = `SCANMS-QR-${link.shortCode}.${format}`;

    // Kiểm tra cache đã render trước đó để tối ưu CPU (Mục 26 & 32)
    const cacheKey = `qr_render:${link.id}:${format}:${size}`;
    const cached = await this.cacheService.get<{
      bufferBase64: string;
      contentType: string;
    }>(cacheKey);

    let buffer: Buffer | string;
    let contentType: string;

    if (cached) {
      buffer =
        format === 'png'
          ? Buffer.from(cached.bufferBase64, 'base64')
          : cached.bufferBase64;
      contentType = cached.contentType;
    } else if (format === 'png') {
      buffer = await QRCode.toBuffer(shortUrl, {
        type: 'png',
        width: size,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#1A1612',
          light: '#FFFFFF',
        },
      });
      contentType = 'image/png';

      // Lưu cache 24h
      await this.cacheService.set(
        cacheKey,
        {
          bufferBase64: buffer.toString('base64'),
          contentType,
        },
        86400,
      );
    } else {
      let svgContent = await QRCode.toString(shortUrl, {
        type: 'svg',
        width: size,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#1A1612',
          light: '#FFFFFF',
        },
      });

      // Sanitize SVG chống XSS (Mục 10.2 & 27.7)
      svgContent = svgContent
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript\s*:/gi, '');

      buffer = svgContent;
      contentType = 'image/svg+xml; charset=utf-8';

      // Lưu cache 24h
      await this.cacheService.set(
        cacheKey,
        {
          bufferBase64: svgContent,
          contentType,
        },
        86400,
      );
    }

    // Đếm lượt tải QR (Mục 23 & 37.8 - chỉ tăng sau khi ảnh đã render hoặc lấy cache thành công)
    if (isDownload) {
      const downloadCounterKey = `qr_dl_count:${link.id}`;
      const redis = this.cacheService.getRedis();
      if (redis) {
        if (typeof redis.incr === 'function') {
          await redis.incr(downloadCounterKey).catch(() => {});
        }
        if (typeof redis.expire === 'function') {
          await redis.expire(downloadCounterKey, 86400 * 30).catch(() => {});
        }
      }
      await this.prisma.referralLink
        .update({
          where: { id: link.id },
          data: { qrDownloadCount: { increment: 1 } },
        })
        .catch((err: any) => {
          this.logger.warn(`Lỗi tăng qrDownloadCount trong DB: ${err.message}`);
        });
    }

    return {
      buffer,
      contentType,
      filename,
      shortCode: link.shortCode,
      shortUrl,
    };
  }

  /**
   * Định kỳ ẩn danh hóa và dọn dẹp dữ liệu theo chính sách lưu trữ (Data Retention Policy - Lỗi 6)
   * - Ẩn danh hóa User-Agent và IP của các click logs cũ hơn retentionDays (mặc định 90 ngày)
   * - Dọn dẹp AttributionSession đã hết hạn và cũ hơn retentionDays
   */
  async purgeOldTrackingData(retentionDays = 90) {
    const cutoffDate = new Date(
      Date.now() - retentionDays * 24 * 60 * 60 * 1000,
    );

    // 1. Ẩn danh hóa User-Agent và Subnet IP trong ClickTrafficLog
    const anonymizedLogs = await this.prisma.clickTrafficLog.updateMany({
      where: {
        createdAt: { lt: cutoffDate },
        OR: [{ userAgent: { not: null } }, { ipAddress: { not: '0.0.0.0/0' } }],
      },
      data: {
        userAgent: null,
        ipAddress: '0.0.0.0/0',
        deviceType: null,
      },
    });

    // 2. Dọn dẹp AttributionSession đã hết hạn cũ hơn 90 ngày
    const deletedSessions = await this.prisma.attributionSession.deleteMany({
      where: {
        expiresAt: { lt: cutoffDate },
        status: { in: ['EXPIRED', 'INACTIVE'] },
      },
    });

    this.logger.log(
      `[DATA RETENTION PURGE] Đã ẩn danh hóa ${anonymizedLogs.count} click logs và dọn dẹp ${deletedSessions.count} sessions cũ hơn ${retentionDays} ngày.`,
    );

    return {
      anonymizedLogsCount: anonymizedLogs.count,
      deletedSessionsCount: deletedSessions.count,
      cutoffDate,
    };
  }

  /**
   * Cron Job tự động dọn dẹp và ẩn danh hóa dữ liệu định kỳ mỗi ngày (Issue 1)
   * Chạy vào lúc nửa đêm hàng ngày (hoặc cấu hình qua biến môi trường TRACKING_DATA_RETENTION_CRON)
   * Số ngày lưu trữ cấu hình qua TRACKING_DATA_RETENTION_DAYS (mặc định 90 ngày)
   */
  @Cron(
    process.env.TRACKING_DATA_RETENTION_CRON ||
      CronExpression.EVERY_DAY_AT_MIDNIGHT,
  )
  async handleScheduledDataRetentionCleanup() {
    const rawDays =
      process.env.TRACKING_DATA_RETENTION_DAYS ||
      (this.configService
        ? this.configService.get<string>('TRACKING_DATA_RETENTION_DAYS')
        : '90');
    const retentionDays = parseInt(rawDays || '90', 10) || 90;
    this.logger.log(
      `[DATA_RETENTION_CRON] Bắt đầu quét và dọn dẹp dữ liệu tracking cũ hơn ${retentionDays} ngày...`,
    );
    try {
      const result = await this.purgeOldTrackingData(retentionDays);
      this.logger.log(
        `[DATA_RETENTION_CRON] Hoàn tất: Đã ẩn danh ${result.anonymizedLogsCount} click logs và dọn ${result.deletedSessionsCount} sessions.`,
      );
      return result;
    } catch (err: any) {
      this.logger.error(
        `[DATA_RETENTION_CRON] Lỗi khi chạy dọn dẹp dữ liệu lưu trữ: ${err.message}`,
        err.stack,
      );
    }
  }
}
