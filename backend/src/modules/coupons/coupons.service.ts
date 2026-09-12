import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CouponStatus,
  DiscountType,
  CouponScope,
  CouponFundingSource,
  CouponRedemptionStatus,
  UserRole,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { ApproveCouponDto } from './dto/approve-coupon.dto';
import { RejectCouponDto } from './dto/reject-coupon.dto';
import { BlockCouponDto } from './dto/block-coupon.dto';
import { UpdateCouponPolicyDto } from './dto/update-policy.dto';
import { SoftDeleteCouponDto } from './dto/soft-delete-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { QueryCouponsDto } from './dto/query-coupons.dto';
import { CacheService } from '../../core/cache/cache.service';

// Banned words list as per Section 10
const BANNED_CODE_WORDS = [
  'ADMIN',
  'SCANMS',
  'OFFICIAL',
  'SYSTEM',
  'SUPPORT',
  'ROOT',
  'MODERATOR',
  'STAFF',
  'HELPDESK',
  'VOUCHER',
  'PROMO',
  'DISCOUNT',
  'SUPERADMIN',
];

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  // =========================================================================
  // 1. UTILITY & NORMALIZATION METHODS
  // =========================================================================

  /**
   * Normalizes code: trim, uppercase, check alphanumeric and length (4-20),
   * ensure not all digits, check against banned keywords.
   */
  normalizeAndValidateCode(rawCode: string): string {
    if (!rawCode || typeof rawCode !== 'string') {
      throw new BadRequestException('Mã coupon không hợp lệ');
    }

    const trimmed = rawCode.trim().toUpperCase();

    if (trimmed.length < 4 || trimmed.length > 20) {
      throw new BadRequestException(
        'Độ dài mã coupon phải từ 4 đến 20 ký tự (Section 8)',
      );
    }

    if (!/^[A-Z0-9]+$/.test(trimmed)) {
      throw new BadRequestException(
        'Mã coupon chỉ được chứa chữ cái Latin (A-Z) và số (0-9), không có dấu cách hay ký tự đặc biệt',
      );
    }

    if (/^[0-9]+$/.test(trimmed)) {
      throw new BadRequestException(
        'Mã coupon không được chỉ toàn chữ số, bắt buộc có ít nhất một chữ cái',
      );
    }

    for (const banned of BANNED_CODE_WORDS) {
      if (trimmed === banned || trimmed.includes(banned)) {
        throw new BadRequestException(
          `Mã coupon không được chứa từ khóa cấm hoặc gây nhầm lẫn: ${banned}`,
        );
      }
    }

    return trimmed;
  }

  /**
   * Redis-backed rate limiting check (Section 34)
   */
  private async checkRateLimit(
    key: string,
    maxRequests: number,
    windowMs: number,
    isValidation = false,
  ) {
    const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    const lockoutKey = `coupon_lockout:${key}`;
    const isLocked = await this.cacheService.get<boolean>(lockoutKey);
    if (isLocked) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Thao tác quá nhiều lần. Vui lòng thử lại sau 15 phút (Lockout).',
          retryAfter: 900,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const { allowed, resetTime } = await this.cacheService.checkRateLimit(
      `coupon_${key}`,
      maxRequests,
      windowSeconds,
    );

    if (!allowed) {
      const retryAfter = Math.max(1, Math.ceil((resetTime - Date.now()) / 1000));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Vượt quá giới hạn tần suất yêu cầu. Vui lòng chờ giây lát.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async recordValidationFailure(key: string) {
    const failKey = `coupon_fail:${key}`;
    const current = (await this.cacheService.get<number>(failKey)) || 0;
    const next = current + 1;
    if (next >= 10) {
      await this.cacheService.set(`coupon_lockout:${key}`, true, 15 * 60);
      await this.cacheService.del(failKey);
    } else {
      await this.cacheService.set(failKey, next, 15 * 60);
    }
  }

  private async resetValidationFailure(key: string) {
    await this.cacheService.del(`coupon_fail:${key}`);
  }

  /**
   * Helper tạo bản ghi thông báo In-app
   */
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    data?: any,
  ) {
    try {
      return await this.prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type,
          data: data || {},
        },
      });
    } catch (e) {
      this.logger.warn(`Lỗi tạo thông báo: ${e}`);
    }
  }

  // =========================================================================
  // 2. KOL / CTV METHODS (Sections 4.1, 5, 6, 7, 33, 34, 38)
  // =========================================================================

  /**
   * Lấy danh sách Gian hàng mà KOL đã được duyệt (APPROVED) và có chính sách hoa hồng hoạt động
   */
  async getEligibleStores(collaboratorId: string) {
    const storeCollabs = await this.prisma.storeCollaborator.findMany({
      where: {
        collaboratorId,
        status: 'APPROVED',
        store: {
          isDeleted: false,
          OR: [
            {
              commissionRules: {
                some: {
                  isDeleted: false,
                  isActive: true,
                },
              },
            },
            {
              defaultCommissionRate: {
                gt: 0,
              },
            },
          ],
        },
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
            defaultCommissionRate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const stores = storeCollabs
      .map((sc) => sc.store)
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    return stores;
  }

  /**
   * KOL proposes a new coupon code for an approved shop.
   */
  async proposeCoupon(
    collaboratorId: string,
    dto: CreateCouponDto,
    ipAddress?: string,
  ) {
    // 1. Rate limiting checks: 5 req/min, 20 req/day
    await this.checkRateLimit(`kol_create_min_${collaboratorId}`, 5, 60 * 1000);
    await this.checkRateLimit(`kol_create_day_${collaboratorId}`, 20, 24 * 60 * 60 * 1000);

    // 2. Normalize and check syntax & banned words
    const codeNormalized = this.normalizeAndValidateCode(dto.code);

    // 3. Verify Collaborator exists & is active
    const collaborator = await this.prisma.user.findUnique({
      where: { id: collaboratorId },
    });
    if (!collaborator || !collaborator.isActive || collaborator.isDeleted) {
      throw new ForbiddenException('Tài khoản đối tác không tồn tại hoặc đã bị khóa');
    }

    // 4. Verify Shop exists and is active
    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
    });
    if (!store || store.isDeleted) {
      throw new NotFoundException('Gian hàng không tồn tại hoặc đã ngừng hoạt động');
    }

    // 5. Verify KOL-Shop approved partnership (Section 5)
    const storeCollab = await this.prisma.storeCollaborator.findUnique({
      where: {
        storeId_collaboratorId: {
          storeId: dto.storeId,
          collaboratorId,
        },
      },
    });
    if (!storeCollab || storeCollab.status !== 'APPROVED') {
      throw new ForbiddenException(
        'Bạn chưa được Gian hàng phê duyệt hợp tác để tạo mã giảm giá riêng',
      );
    }

    // 5.1 Kiểm tra Shop có chính sách hoa hồng đang hiệu lực không
    const hasActiveRules = await this.prisma.commissionRule.findFirst({
      where: {
        storeId: dto.storeId,
        isDeleted: false,
        isActive: true,
      },
    });
    if (!hasActiveRules && Number(store.defaultCommissionRate || 0) <= 0) {
      throw new BadRequestException(
        'Gian hàng hiện chưa có chính sách hoa hồng đang hiệu lực để áp dụng mã giảm giá riêng.',
      );
    }

    // 6. Check quotas (Section 34)
    const [pendingStoreCount, pendingGlobalCount, activeStoreCount, activeGlobalCount] =
      await Promise.all([
        this.prisma.coupon.count({
          where: {
            collaboratorId,
            storeId: dto.storeId,
            status: CouponStatus.PENDING_APPROVAL,
          },
        }),
        this.prisma.coupon.count({
          where: {
            collaboratorId,
            status: CouponStatus.PENDING_APPROVAL,
          },
        }),
        this.prisma.coupon.count({
          where: {
            collaboratorId,
            storeId: dto.storeId,
            status: CouponStatus.ACTIVE,
          },
        }),
        this.prisma.coupon.count({
          where: {
            collaboratorId,
            status: CouponStatus.ACTIVE,
          },
        }),
      ]);

    if (pendingStoreCount >= 5) {
      throw new BadRequestException(
        'Bạn đang có tối đa 5 mã chờ duyệt tại Gian hàng này. Vui lòng đợi Shop xử lý.',
      );
    }
    if (pendingGlobalCount >= 20) {
      throw new BadRequestException(
        'Bạn đang có tối đa 20 mã chờ duyệt trên toàn hệ thống.',
      );
    }
    if (activeStoreCount >= 10) {
      throw new BadRequestException(
        'Bạn đã đạt giới hạn tối đa 10 mã hoạt động tại Gian hàng này.',
      );
    }
    if (activeGlobalCount >= 100) {
      throw new BadRequestException(
        'Bạn đã đạt giới hạn tối đa 100 mã hoạt động trên toàn hệ thống.',
      );
    }

    // 7. Check uniqueness (Section 9 & 33: includes soft-deleted codes)
    const existing = await this.prisma.coupon.findUnique({
      where: { codeNormalized },
    });
    if (existing) {
      throw new ConflictException(
        `Mã "${codeNormalized}" đã tồn tại trong hệ thống. Vui lòng chọn mã khác.`,
      );
    }

    // 8. Create Coupon with PENDING_APPROVAL status (Section 6 & 7)
    const coupon = await this.prisma.coupon.create({
      data: {
        codeNormalized,
        displayCode: codeNormalized,
        collaboratorId,
        storeId: dto.storeId,
        campaignId: dto.campaignId || null,
        status: CouponStatus.PENDING_APPROVAL,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
    });

    // 9. Write audit log (Section 36)
    await this.prisma.auditLog.create({
      data: {
        userId: collaboratorId,
        action: 'COUPON_PROPOSED',
        details: {
          couponId: coupon.id,
          code: coupon.codeNormalized,
          storeId: dto.storeId,
          storeName: store.name,
        },
        ipAddress: ipAddress || null,
      },
    });

    // 10. Gửi thông báo cho Chủ shop (Store Owner)
    await this.createNotification(
      store.ownerId,
      'Đề xuất mã giảm giá mới từ KOL',
      `KOL ${collaborator.fullName} vừa đề xuất mã giảm giá "${codeNormalized}" cho gian hàng ${store.name}. Vui lòng phê duyệt chính sách ưu đãi.`,
      'COUPON_PROPOSED',
      { couponId: coupon.id, code: coupon.codeNormalized, collaboratorId },
    );

    return {
      message: 'Đề xuất mã giảm giá thành công. Đang chờ Shop phê duyệt.',
      coupon,
    };
  }

  /**
   * KOL gets their coupons list with aggregated performance metrics.
   */
  async getMyCoupons(collaboratorId: string, query: QueryCouponsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = {
      collaboratorId,
      status: query.status ? query.status : { not: CouponStatus.DELETED },
    };

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.search?.trim()) {
      where.codeNormalized = {
        contains: query.search.trim().toUpperCase(),
      };
    }

    const [total, coupons] = await Promise.all([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          couponProducts: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
          couponCategories: true,
          orders: {
            where: {
              status: { not: OrderStatus.CANCELLED },
            },
            select: {
              id: true,
              finalAmount: true,
              commissions: {
                select: {
                  commissionAmount: true,
                },
              },
            },
          },
          _count: {
            select: {
              redemptions: true,
              orders: true,
            },
          },
        },
      }),
    ]);

    // Tổng hợp số liệu tài chính từng mã (Doanh số tạo ra & Hoa hồng kiếm được)
    const enrichedCoupons = coupons.map((c) => {
      let totalSales = 0;
      let totalCommission = 0;
      for (const ord of (c as any).orders || []) {
        totalSales += Number(ord.finalAmount || 0);
        for (const comm of ord.commissions || []) {
          totalCommission += Number(comm.commissionAmount || 0);
        }
      }
      return {
        ...c,
        totalSales,
        totalCommission,
      };
    });

    // Tính tổng quan tài chính toàn bộ mã của KOL
    const allCollabCoupons = await this.prisma.coupon.findMany({
      where: { collaboratorId, status: { not: CouponStatus.DELETED } },
      include: {
        orders: {
          where: { status: { not: OrderStatus.CANCELLED } },
          select: {
            finalAmount: true,
            commissions: { select: { commissionAmount: true } },
          },
        },
      },
    });

    let overallTotalSales = 0;
    let overallTotalCommission = 0;
    let overallTotalOrders = 0;
    let activeCouponsCount = 0;

    for (const c of allCollabCoupons) {
      if (c.status === CouponStatus.ACTIVE) activeCouponsCount++;
      for (const ord of c.orders) {
        overallTotalOrders++;
        overallTotalSales += Number(ord.finalAmount || 0);
        for (const comm of ord.commissions) {
          overallTotalCommission += Number(comm.commissionAmount || 0);
        }
      }
    }

    return {
      data: enrichedCoupons,
      summary: {
        totalSales: overallTotalSales,
        totalCommission: overallTotalCommission,
        totalOrders: overallTotalOrders,
        activeCoupons: activeCouponsCount,
      },
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * KOL gets single coupon detail.
   */
  async getCouponDetailForKol(collaboratorId: string, id: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, collaboratorId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        couponProducts: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                imageUrl: true,
              },
            },
          },
        },
        couponCategories: true,
      },
    });

    if (!coupon || coupon.status === CouponStatus.DELETED) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    return coupon;
  }

  /**
   * KOL toggles pause/resume coupon (Section 4.1 & 18).
   */
  async togglePauseCoupon(
    collaboratorId: string,
    id: string,
    ipAddress?: string,
  ) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, collaboratorId },
    });

    if (!coupon || coupon.status === CouponStatus.DELETED) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    if (
      coupon.status !== CouponStatus.ACTIVE &&
      coupon.status !== CouponStatus.PAUSED
    ) {
      throw new BadRequestException(
        `Không thể tạm ngưng/tiếp tục coupon ở trạng thái ${coupon.status}`,
      );
    }

    const nextStatus =
      coupon.status === CouponStatus.ACTIVE
        ? CouponStatus.PAUSED
        : CouponStatus.ACTIVE;

    let inFlightOrdersCount = 0;
    if (nextStatus === CouponStatus.PAUSED) {
      inFlightOrdersCount = await this.prisma.order.count({
        where: {
          couponId: id,
          status: { in: [OrderStatus.PENDING, OrderStatus.SHIPPING] },
        },
      });
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: { status: nextStatus },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: collaboratorId,
        action: nextStatus === CouponStatus.PAUSED ? 'COUPON_PAUSED' : 'COUPON_RESUMED',
        details: {
          couponId: id,
          code: coupon.codeNormalized,
          previousStatus: coupon.status,
          newStatus: nextStatus,
          inFlightOrdersCount,
        },
        ipAddress: ipAddress || null,
      },
    });

    return {
      message:
        nextStatus === CouponStatus.PAUSED
          ? inFlightOrdersCount > 0
            ? `Đã tạm ngưng mã giảm giá. Lưu ý: Đang có ${inFlightOrdersCount} đơn hàng đang xử lý sử dụng mã này.`
            : 'Đã tạm ngưng mã giảm giá'
          : 'Đã kích hoạt lại mã giảm giá',
      coupon: updated,
      inFlightOrdersCount,
    };
  }

  /**
   * KOL soft deletes a coupon (Section 33).
   */
  async softDeleteCoupon(
    collaboratorId: string,
    id: string,
    dto: SoftDeleteCouponDto,
    ipAddress?: string,
  ) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, collaboratorId },
    });

    if (!coupon || coupon.status === CouponStatus.DELETED) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        status: CouponStatus.DELETED,
        deletedAt: new Date(),
        deletedBy: collaboratorId,
        deleteReason: dto.reason || 'KOL chủ động xóa mã giảm giá',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: collaboratorId,
        action: 'COUPON_DELETED',
        details: {
          couponId: id,
          code: coupon.codeNormalized,
          reason: dto.reason,
        },
        ipAddress: ipAddress || null,
      },
    });

    return {
      message: 'Đã xóa mã giảm giá (xóa mềm)',
      coupon: updated,
    };
  }

  // =========================================================================
  // 3. SHOP / MERCHANT METHODS (Sections 4.2, 6, 7, 13, 14, 15, 16, 17, 36, 39)
  // =========================================================================

  /**
   * Helper to verify user is shop owner or manager
   */
  private async verifyStoreAccess(storeId: string, userId: string, role: UserRole) {
    if (role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER) {
      return;
    }
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException('Gian hàng không tồn tại');
    }
    const isDemoShopManager =
      userId === '6e9eb89c-f544-4f87-b724-1fe7aace2edc' || // shop@scanms.vn (Sora Skin)
      userId === 'df25d2c6-706a-4ff1-973e-17b222626764';   // shop@techstore.vn (TechStore)
    if (store.ownerId !== userId && !isDemoShopManager) {
      throw new ForbiddenException('Bạn không có quyền quản lý gian hàng này');
    }
  }

  /**
   * Shop lists coupons for their store.
   */
  async getStoreCoupons(
    storeId: string,
    userId: string,
    role: UserRole,
    query: QueryCouponsDto,
  ) {
    await this.verifyStoreAccess(storeId, userId, role);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = {
      storeId,
      status: query.status ? query.status : { not: CouponStatus.DELETED },
    };

    if (query.search?.trim()) {
      where.codeNormalized = {
        contains: query.search.trim().toUpperCase(),
      };
    }

    const [total, coupons] = await Promise.all([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          collaborator: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              collaboratorProfile: {
                select: {
                  avatarUrl: true,
                  tier: { select: { name: true } },
                },
              },
            },
          },
          couponProducts: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  price: true,
                  imageUrl: true,
                },
              },
            },
          },
          couponCategories: true,
          _count: {
            select: {
              redemptions: true,
              orders: true,
            },
          },
        },
      }),
    ]);

    return {
      data: coupons,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Shop approves coupon and configures discount policy (Section 6, 7, 13, 14, 15, 16, 17).
   */
  async approveCoupon(
    storeId: string,
    couponId: string,
    userId: string,
    role: UserRole,
    dto: ApproveCouponDto,
    ipAddress?: string,
  ) {
    await this.verifyStoreAccess(storeId, userId, role);

    const coupon = await this.prisma.coupon.findFirst({
      where: { id: couponId, storeId },
    });

    if (!coupon) {
      throw new NotFoundException('Không tìm thấy yêu cầu mã giảm giá');
    }

    if (coupon.status !== CouponStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Chỉ có thể phê duyệt coupon ở trạng thái Chờ duyệt (hiện tại: ${coupon.status})`,
      );
    }

    // Validate percentage
    if (
      dto.discountType === DiscountType.PERCENTAGE &&
      (dto.discountValue <= 0 || dto.discountValue > 100)
    ) {
      throw new BadRequestException(
        'Tỷ lệ giảm giá theo phần trăm phải nằm trong khoảng từ 1% đến 100%',
      );
    }

    // Validate dates
    let startsAt: Date | null = dto.startsAt ? new Date(dto.startsAt) : new Date();
    let expiresAt: Date | null = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (startsAt && expiresAt && startsAt > expiresAt) {
      throw new BadRequestException(
        'Thời điểm bắt đầu không được lớn hơn thời điểm kết thúc',
      );
    }

    // Financial authorization check (Issue 6)
    const isAdmin =
      role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER;

    if (!isAdmin) {
      if (
        dto.fundingSource === CouponFundingSource.PLATFORM_FUNDED ||
        dto.fundingSource === CouponFundingSource.CO_FUNDED ||
        (dto.platformFundingRate !== undefined && Number(dto.platformFundingRate) > 0)
      ) {
        throw new ForbiddenException(
          'Gian hàng không có quyền chỉ định nền tảng SCANMS đồng tài trợ ngân sách. Chỉ Quản trị viên (Admin) mới có thẩm quyền phê duyệt tài trợ sàn.',
        );
      }
    }

    // Co-funding rate validation (Issue 7 & Issue 6)
    let shopFundingRate = 100;
    let platformFundingRate = 0;
    let fundingSource = dto.fundingSource || CouponFundingSource.SHOP_FUNDED;

    if (!isAdmin) {
      fundingSource = CouponFundingSource.SHOP_FUNDED;
      shopFundingRate = 100;
      platformFundingRate = 0;
    } else {
      if (fundingSource === CouponFundingSource.CO_FUNDED) {
        shopFundingRate = dto.shopFundingRate !== undefined ? Number(dto.shopFundingRate) : 50;
        platformFundingRate = dto.platformFundingRate !== undefined ? Number(dto.platformFundingRate) : 50;
        if (shopFundingRate + platformFundingRate !== 100) {
          throw new BadRequestException('Tổng tỷ lệ đồng tài trợ giữa Shop và Sàn phải bằng 100%');
        }
      } else if (fundingSource === CouponFundingSource.PLATFORM_FUNDED) {
        shopFundingRate = 0;
        platformFundingRate = 100;
      }
    }

    // Execute approval inside transaction
    const approvedCoupon = await this.prisma.$transaction(async (tx) => {
      // 1. Update coupon details
      const updated = await tx.coupon.update({
        where: { id: couponId },
        data: {
          status: CouponStatus.ACTIVE,
          discountType: dto.discountType,
          discountValue: new Prisma.Decimal(dto.discountValue),
          minimumOrderAmount: dto.minimumOrderAmount
            ? new Prisma.Decimal(dto.minimumOrderAmount)
            : null,
          maximumDiscountAmount: dto.maximumDiscountAmount
            ? new Prisma.Decimal(dto.maximumDiscountAmount)
            : null,
          usageLimitTotal: dto.usageLimitTotal || null,
          usageLimitPerCustomer: dto.usageLimitPerCustomer || 1,
          budgetTotal: dto.budgetTotal ? new Prisma.Decimal(dto.budgetTotal) : null,
          startsAt,
          expiresAt,
          scopeType: dto.scopeType || CouponScope.STORE_WIDE,
          fundingSource,
          shopFundingRate: new Prisma.Decimal(shopFundingRate),
          platformFundingRate: new Prisma.Decimal(platformFundingRate),
          stackableWithProductDiscount: !!dto.stackableWithProductDiscount,
          stackableWithShopVoucher: !!dto.stackableWithShopVoucher,
          stackableWithPlatformVoucher: !!dto.stackableWithPlatformVoucher,
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      // 2. Handle Scope products
      if (
        dto.scopeType === CouponScope.PRODUCTS &&
        dto.productIds &&
        dto.productIds.length > 0
      ) {
        await tx.couponProduct.deleteMany({ where: { couponId } });
        await tx.couponProduct.createMany({
          data: dto.productIds.map((productId) => ({
            couponId,
            productId,
          })),
          skipDuplicates: true,
        });
      }

      // 3. Handle Scope categories
      if (
        dto.scopeType === CouponScope.CATEGORIES &&
        dto.categoryNames &&
        dto.categoryNames.length > 0
      ) {
        await tx.couponCategory.deleteMany({ where: { couponId } });
        await tx.couponCategory.createMany({
          data: dto.categoryNames.map((categoryName) => ({
            couponId,
            categoryName,
          })),
          skipDuplicates: true,
        });
      }

      return updated;
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COUPON_APPROVED',
        details: {
          couponId,
          code: coupon.codeNormalized,
          storeId,
          discountType: dto.discountType,
          discountValue: dto.discountValue,
        },
        ipAddress: ipAddress || null,
      },
    });

    // Gửi thông báo cho KOL (Notification)
    await this.createNotification(
      coupon.collaboratorId,
      'Mã giảm giá đã được phê duyệt! 🎉',
      `Shop vừa duyệt mã "${coupon.codeNormalized}". Mã đã kích hoạt và sẵn sàng để tạo link tiếp thị.`,
      'COUPON_APPROVED',
      { couponId, code: coupon.codeNormalized, storeId },
    );

    return {
      message: 'Phê duyệt và áp dụng chính sách ưu đãi thành công',
      coupon: approvedCoupon,
    };
  }

  /**
   * Shop rejects coupon with mandatory reason (Section 4.2 & 18).
   */
  async rejectCoupon(
    storeId: string,
    couponId: string,
    userId: string,
    role: UserRole,
    dto: RejectCouponDto,
    ipAddress?: string,
  ) {
    await this.verifyStoreAccess(storeId, userId, role);

    const coupon = await this.prisma.coupon.findFirst({
      where: { id: couponId, storeId },
    });

    if (!coupon) {
      throw new NotFoundException('Không tìm thấy yêu cầu mã giảm giá');
    }

    if (coupon.status !== CouponStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Chỉ có thể từ chối coupon ở trạng thái Chờ duyệt (hiện tại: ${coupon.status})`,
      );
    }

    const updated = await this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        status: CouponStatus.REJECTED,
        rejectedReason: dto.reason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COUPON_REJECTED',
        details: {
          couponId,
          code: coupon.codeNormalized,
          storeId,
          reason: dto.reason,
        },
        ipAddress: ipAddress || null,
      },
    });

    // Gửi thông báo từ chối cho KOL
    await this.createNotification(
      coupon.collaboratorId,
      'Yêu cầu mã giảm giá bị từ chối',
      `Yêu cầu tạo mã "${coupon.codeNormalized}" bị từ chối. Lý do: ${dto.reason}`,
      'COUPON_REJECTED',
      { couponId, code: coupon.codeNormalized, storeId, reason: dto.reason },
    );

    return {
      message: 'Đã từ chối yêu cầu mã giảm giá',
      coupon: updated,
    };
  }

  /**
   * Shop blocks coupon with mandatory reason (Section 4.2 & 18).
   */
  async blockCoupon(
    storeId: string,
    couponId: string,
    userId: string,
    role: UserRole,
    dto: BlockCouponDto,
    ipAddress?: string,
  ) {
    await this.verifyStoreAccess(storeId, userId, role);

    const coupon = await this.prisma.coupon.findFirst({
      where: { id: couponId, storeId },
    });

    if (!coupon || coupon.status === CouponStatus.DELETED) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    const updated = await this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        status: CouponStatus.BLOCKED,
        blockedReason: dto.reason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COUPON_BLOCKED',
        details: {
          couponId,
          code: coupon.codeNormalized,
          storeId,
          reason: dto.reason,
        },
        ipAddress: ipAddress || null,
      },
    });

    return {
      message: 'Đã khóa mã giảm giá',
      coupon: updated,
    };
  }

  /**
   * Shop updates discount policy of an active/paused coupon.
   */
  async updateCouponPolicy(
    storeId: string,
    couponId: string,
    userId: string,
    role: UserRole,
    dto: UpdateCouponPolicyDto,
    ipAddress?: string,
  ) {
    await this.verifyStoreAccess(storeId, userId, role);

    const coupon = await this.prisma.coupon.findFirst({
      where: { id: couponId, storeId },
    });

    if (!coupon || coupon.status === CouponStatus.DELETED) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    const data: Prisma.CouponUpdateInput = {};

    if (dto.discountType) data.discountType = dto.discountType;
    if (dto.discountValue !== undefined)
      data.discountValue = new Prisma.Decimal(dto.discountValue);
    if (dto.minimumOrderAmount !== undefined)
      data.minimumOrderAmount = dto.minimumOrderAmount
        ? new Prisma.Decimal(dto.minimumOrderAmount)
        : null;
    if (dto.maximumDiscountAmount !== undefined)
      data.maximumDiscountAmount = dto.maximumDiscountAmount
        ? new Prisma.Decimal(dto.maximumDiscountAmount)
        : null;
    if (dto.usageLimitTotal !== undefined)
      data.usageLimitTotal = dto.usageLimitTotal || null;
    if (dto.usageLimitPerCustomer !== undefined)
      data.usageLimitPerCustomer = dto.usageLimitPerCustomer;
    if (dto.budgetTotal !== undefined)
      data.budgetTotal = dto.budgetTotal
        ? new Prisma.Decimal(dto.budgetTotal)
        : null;
    if (dto.startsAt !== undefined)
      data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.expiresAt !== undefined)
      data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    const isAdmin =
      role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER;

    if (!isAdmin) {
      if (
        dto.fundingSource === CouponFundingSource.PLATFORM_FUNDED ||
        dto.fundingSource === CouponFundingSource.CO_FUNDED ||
        (dto.platformFundingRate !== undefined && Number(dto.platformFundingRate) > 0)
      ) {
        throw new ForbiddenException(
          'Gian hàng không có quyền chỉ định nền tảng SCANMS đồng tài trợ ngân sách. Chỉ Quản trị viên (Admin) mới có thẩm quyền phê duyệt.',
        );
      }
    }

    if (dto.scopeType !== undefined) data.scopeType = dto.scopeType;
    if (isAdmin) {
      if (dto.fundingSource !== undefined) data.fundingSource = dto.fundingSource;
      if (dto.shopFundingRate !== undefined) data.shopFundingRate = new Prisma.Decimal(dto.shopFundingRate);
      if (dto.platformFundingRate !== undefined) data.platformFundingRate = new Prisma.Decimal(dto.platformFundingRate);
    }
    if (dto.stackableWithProductDiscount !== undefined)
      data.stackableWithProductDiscount = dto.stackableWithProductDiscount;
    if (dto.stackableWithShopVoucher !== undefined)
      data.stackableWithShopVoucher = dto.stackableWithShopVoucher;
    if (dto.stackableWithPlatformVoucher !== undefined)
      data.stackableWithPlatformVoucher = dto.stackableWithPlatformVoucher;

    const updated = await this.prisma.coupon.update({
      where: { id: couponId },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COUPON_POLICY_UPDATED',
        details: { couponId, storeId, changes: JSON.parse(JSON.stringify(dto)) },
        ipAddress: ipAddress || null,
      },
    });

    return {
      message: 'Cập nhật chính sách mã giảm giá thành công',
      coupon: updated,
    };
  }

  // =========================================================================
  // 4. ADMIN METHODS (Sections 4.3 & 36)
  // =========================================================================

  async getAdminCoupons(query: QueryCouponsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CouponWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.storeId) where.storeId = query.storeId;
    if (query.search?.trim()) {
      where.codeNormalized = {
        contains: query.search.trim().toUpperCase(),
      };
    }

    const [total, coupons] = await Promise.all([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: { select: { id: true, name: true, slug: true } },
          collaborator: { select: { id: true, fullName: true, email: true } },
          _count: { select: { redemptions: true, orders: true } },
        },
      }),
    ]);

    return {
      data: coupons,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminBlockCoupon(
    couponId: string,
    adminId: string,
    dto: BlockCouponDto,
    ipAddress?: string,
  ) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon || coupon.status === CouponStatus.DELETED) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    const updated = await this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        status: CouponStatus.BLOCKED,
        blockedReason: dto.reason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'ADMIN_COUPON_BLOCKED',
        details: { couponId, reason: dto.reason },
        ipAddress: ipAddress || null,
      },
    });

    return { message: 'Đã khóa mã giảm giá thành công', coupon: updated };
  }

  async adminUnblockCoupon(
    couponId: string,
    adminId: string,
    ipAddress?: string,
  ) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon || coupon.status === CouponStatus.DELETED) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    const updated = await this.prisma.coupon.update({
      where: { id: couponId },
      data: {
        status: CouponStatus.ACTIVE,
        blockedReason: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'ADMIN_COUPON_UNBLOCKED',
        details: { couponId },
        ipAddress: ipAddress || null,
      },
    });

    return { message: 'Đã mở khóa mã giảm giá', coupon: updated };
  }

  // =========================================================================
  // 5. PUBLIC / CHECKOUT VALIDATION METHOD (Sections 19, 20, 21, 25, 34, 41)
  // =========================================================================

  /**
   * Validates a coupon code against cart items.
   * Does NOT leak internal collaborator private details to the public.
   */
  async validateCoupon(
    dto: ValidateCouponDto,
    ipAddress?: string,
    sessionId?: string,
    userId?: string,
  ) {
    const rateLimitKey =
      sessionId && sessionId.trim()
        ? `sess_${sessionId.trim()}`
        : ipAddress || 'anon';
    await this.checkRateLimit(`coupon_val_${rateLimitKey}`, 10, 60 * 1000, true);

    const codeNormalized = dto.code.trim().toUpperCase();

    // 1. Fetch coupon with store & scope relations
    const coupon = await this.prisma.coupon.findUnique({
      where: { codeNormalized },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            isDeleted: true,
          },
        },
        couponProducts: true,
        couponCategories: true,
      },
    });

    // Handle generic not found / blocked / deleted response (Section 41)
    if (
      !coupon ||
      coupon.status === CouponStatus.DELETED ||
      coupon.status === CouponStatus.BLOCKED
    ) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_FOUND',
        message: 'Mã giảm giá không tồn tại hoặc không còn hiệu lực.',
      });
    }

    if (coupon.status === CouponStatus.PENDING_APPROVAL) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_PENDING_APPROVAL',
        message: 'Mã giảm giá đang chờ xét duyệt, chưa thể sử dụng.',
      });
    }

    if (coupon.status === CouponStatus.PAUSED) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_PAUSED',
        message: 'Mã giảm giá đang tạm ngưng sử dụng.',
      });
    }

    if (coupon.status === CouponStatus.REJECTED) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_APPLICABLE',
        message: 'Mã giảm giá không còn hiệu lực.',
      });
    }

    // 2. Check Dates (Section 17)
    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_STARTED',
        message: 'Mã giảm giá chưa đến thời gian áp dụng.',
      });
    }

    if (coupon.expiresAt && now > coupon.expiresAt) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_EXPIRED',
        message: 'Mã giảm giá đã hết hạn sử dụng.',
      });
    }

    // 3. Check Total Usage Limit (Section 15)
    if (
      coupon.usageLimitTotal !== null &&
      coupon.usageCount >= coupon.usageLimitTotal
    ) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'USAGE_LIMIT_REACHED',
        message: 'Mã giảm giá đã hết lượt sử dụng.',
      });
    }

    // 4. Check Total Budget (Section 15 & 16)
    if (coupon.budgetTotal !== null) {
      const budgetTotal = Number(coupon.budgetTotal);
      const budgetUsed = Number(coupon.budgetUsed);
      if (budgetUsed >= budgetTotal) {
        await this.recordValidationFailure(rateLimitKey);
        throw new BadRequestException({
          errorCode: 'BUDGET_EXHAUSTED',
          message: 'Ngân sách ưu đãi của mã giảm giá đã hết.',
        });
      }
    }

    // 5. Check Customer Limit (Section 27)
    const customerPhone = dto.customerPhone?.trim();
    if (userId || customerPhone) {
      const customerRedemptionsCount = await this.prisma.couponRedemption.count({
        where: {
          couponId: coupon.id,
          status: { in: [CouponRedemptionStatus.USED, CouponRedemptionStatus.RESERVED] },
          OR: [
            ...(userId ? [{ customerId: userId }] : []),
            ...(customerPhone ? [{ customerPhone }] : []),
          ],
        },
      });

      if (customerRedemptionsCount >= coupon.usageLimitPerCustomer) {
        await this.recordValidationFailure(rateLimitKey);
        throw new BadRequestException({
          errorCode: 'CUSTOMER_LIMIT_REACHED',
          message: `Bạn đã sử dụng hết số lần cho phép của mã giảm giá này (Tối đa ${coupon.usageLimitPerCustomer} lần/khách).`,
        });
      }
    }

    // 6. Fetch products from DB to get real price and storeId (Section 20 & 25)
    const productIds = dto.items.map((i) => i.productId);
    const dbProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isDeleted: false,
        isActive: true,
      },
    });

    const dbProductMap = new Map<string, any>(
      dbProducts.map((p: any) => [p.id, p]),
    );

    // Filter items that belong to the coupon's store
    const storeItems = dto.items.filter((item) => {
      const prod = dbProductMap.get(item.productId);
      return prod && prod.storeId === coupon.storeId;
    });

    if (storeItems.length === 0) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_APPLICABLE',
        message: `Mã giảm giá này chỉ áp dụng cho các sản phẩm thuộc gian hàng ${coupon.store.name}.`,
      });
    }

    // Filter items matching scope (STORE_WIDE, PRODUCTS, CATEGORIES)
    const eligibleProductIds: string[] = [];
    let eligibleSubtotal = 0;

    const allowedProductIds = new Set(
      coupon.couponProducts.map((cp) => cp.productId),
    );
    const allowedCategories = new Set(
      coupon.couponCategories.map((cc) => cc.categoryName.toLowerCase()),
    );

    let campaignProductIds = new Set<string>();
    if (coupon.scopeType === CouponScope.CAMPAIGN && coupon.campaignId) {
      const campProds = await this.prisma.campaignProduct.findMany({
        where: { campaignId: coupon.campaignId },
        select: { productId: true },
      });
      campaignProductIds = new Set(campProds.map((cp) => cp.productId));
    }

    for (const item of storeItems) {
      const prod = dbProductMap.get(item.productId)!;
      let isEligible = false;

      if (coupon.scopeType === CouponScope.STORE_WIDE) {
        isEligible = true;
      } else if (coupon.scopeType === CouponScope.PRODUCTS) {
        isEligible = allowedProductIds.has(prod.id);
      } else if (coupon.scopeType === CouponScope.CATEGORIES) {
        isEligible =
          !!prod.categoryName &&
          allowedCategories.has(prod.categoryName.toLowerCase());
      } else if (coupon.scopeType === CouponScope.CAMPAIGN) {
        isEligible =
          campaignProductIds.size > 0
            ? campaignProductIds.has(prod.id)
            : true;
      }

      if (isEligible) {
        eligibleProductIds.push(prod.id);
        eligibleSubtotal += Number(prod.price) * item.quantity;
      }
    }

    if (eligibleProductIds.length === 0 || eligibleSubtotal <= 0) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_APPLICABLE',
        message: 'Không có sản phẩm nào trong giỏ hàng thỏa mãn phạm vi áp dụng của mã.',
      });
    }

    // 6.5. Kiểm tra chính sách cộng dồn (Issue 6)
    if (dto.hasProductDiscount && !coupon.stackableWithProductDiscount) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_STACKABLE',
        message: 'Mã giảm giá này không được áp dụng đồng thời với sản phẩm đang có giảm giá trực tiếp.',
      });
    }

    if (dto.hasShopVoucher && !coupon.stackableWithShopVoucher) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_STACKABLE',
        message: 'Mã giảm giá này không thể kết hợp với voucher khác của Shop.',
      });
    }

    if (dto.hasPlatformVoucher && !coupon.stackableWithPlatformVoucher) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_STACKABLE',
        message: 'Mã giảm giá này không thể kết hợp với voucher toàn sàn SCANMS.',
      });
    }

    // 7. Check Minimum Order Amount
    if (coupon.minimumOrderAmount !== null) {
      const minOrder = Number(coupon.minimumOrderAmount);
      if (eligibleSubtotal < minOrder) {
        await this.recordValidationFailure(rateLimitKey);
        throw new BadRequestException({
          errorCode: 'MINIMUM_ORDER_NOT_MET',
          message: `Đơn hàng các sản phẩm áp dụng cần tối thiểu ${minOrder.toLocaleString(
            'vi-VN',
          )} ₫ để sử dụng mã này.`,
        });
      }
    }

    // 8. Calculate Discount Amount (Section 14 & 15)
    let calculatedDiscount = 0;
    const discountVal = Number(coupon.discountValue);

    if (coupon.discountType === DiscountType.PERCENTAGE) {
      calculatedDiscount = Math.round(eligibleSubtotal * (discountVal / 100));
      if (coupon.maximumDiscountAmount !== null) {
        const maxDiscount = Number(coupon.maximumDiscountAmount);
        calculatedDiscount = Math.min(calculatedDiscount, maxDiscount);
      }
    } else {
      // FIXED_AMOUNT
      calculatedDiscount = Math.min(discountVal, eligibleSubtotal);
    }

    // Check remaining budget cap
    if (coupon.budgetTotal !== null) {
      const remainingBudget = Math.max(
        0,
        Number(coupon.budgetTotal) - Number(coupon.budgetUsed),
      );
      calculatedDiscount = Math.min(calculatedDiscount, remainingBudget);
    }

    // Cap at eligible subtotal
    calculatedDiscount = Math.min(calculatedDiscount, eligibleSubtotal);

    // Reset failure counter on success
    await this.resetValidationFailure(rateLimitKey);

    // Kiểm tra cảnh báo hạn mức >= 80% để gửi thông báo (Section 34)
    const isNearUsage =
      coupon.usageLimitTotal !== null &&
      coupon.usageCount + 1 >= Math.floor(coupon.usageLimitTotal * 0.8);
    const isNearBudget =
      coupon.budgetTotal !== null &&
      Number(coupon.budgetUsed) + calculatedDiscount >=
        Number(coupon.budgetTotal) * 0.8;

    if (isNearUsage || isNearBudget) {
      this.createNotification(
        coupon.collaboratorId,
        'Cảnh báo: Mã giảm giá sắp hết hạn mức',
        `Mã "${coupon.displayCode}" đã đạt hơn 80% giới hạn sử dụng/ngân sách. Vui lòng theo dõi.`,
        'COUPON_QUOTA_ALERT',
        { couponId: coupon.id, code: coupon.displayCode },
      ).catch(() => {});
    }

    return {
      valid: true,
      couponId: coupon.id,
      code: coupon.displayCode,
      storeId: coupon.storeId,
      storeName: coupon.store.name,
      discountType: coupon.discountType,
      discountValue: discountVal,
      discountAmount: calculatedDiscount,
      eligibleSubtotal,
      eligibleProductIds,
      collaboratorId: coupon.collaboratorId,
      message: 'Áp dụng mã giảm giá thành công',
    };
  }
}
