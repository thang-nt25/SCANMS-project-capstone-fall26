import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
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
import { CreateStoreCouponDto } from './dto/create-store-coupon.dto';
import { CreatePlatformCouponDto } from './dto/create-platform-coupon.dto';
import { PreviewStackedVoucherDto } from './dto/preview-stacked-voucher.dto';
import { RecordPlatformReimbursementDto } from './dto/record-platform-reimbursement.dto';
import { ApproveCouponDto } from './dto/approve-coupon.dto';
import { RejectCouponDto } from './dto/reject-coupon.dto';
import { BlockCouponDto } from './dto/block-coupon.dto';
import { UpdateCouponPolicyDto } from './dto/update-policy.dto';
import { SoftDeleteCouponDto } from './dto/soft-delete-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { QueryCouponsDto } from './dto/query-coupons.dto';
import { CacheService } from '../../core/cache/cache.service';
import { liveVoucherActive } from './voucher-pricing';
import { ProductCouponQueryDto } from './dto/product-coupon-query.dto';
import { voucherMatchesProduct, voucherProductWhere } from './voucher-discovery';

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

  private async updateCurrentCoupon(
    coupon: { id: string; status: CouponStatus; updatedAt?: Date; fundingSource?: CouponFundingSource },
    data: Prisma.CouponUpdateArgs['data'],
    client: Pick<Prisma.TransactionClient, 'coupon'> = this.prisma,
  ) {
    try {
      return await client.coupon.update({
        // PostgreSQL stores microseconds; JS Dates retain only milliseconds.
        where: { id: coupon.id, status: coupon.status, fundingSource: coupon.fundingSource,
          updatedAt: coupon.updatedAt ? { gte: coupon.updatedAt, lt: new Date(coupon.updatedAt.getTime() + 1) } : undefined },
        data,
      });
    } catch (error: any) {
      if (error?.code === 'P2025') throw new ConflictException('Voucher vừa được thay đổi hoặc khóa ở nơi khác. Vui lòng tải lại.');
      throw error;
    }
  }

  private assertShopFundedPolicy(coupon: { fundingSource?: CouponFundingSource; platformFundingRate?: unknown }, role: UserRole) {
    if (role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER) return;
    if ((coupon.fundingSource && coupon.fundingSource !== CouponFundingSource.SHOP_FUNDED) || Number(coupon.platformFundingRate || 0) > 0) {
      throw new ForbiddenException('Chỉ quản trị viên được sửa voucher do Sàn tài trợ hoặc đồng tài trợ.');
    }
  }

  private blockCurrentCoupon(coupon: { id: string; status: CouponStatus; updatedAt?: Date; fundingSource?: CouponFundingSource }, reason: string) {
    if (coupon.status === CouponStatus.BLOCKED) throw new BadRequestException('Voucher đã bị khóa.');
    return this.updateCurrentCoupon(coupon, {
      status: CouponStatus.BLOCKED, statusBeforeBlock: coupon.status, blockedReason: reason,
    });
  }

  private async assertVoucherCampaign(storeId: string, campaignId?: string | null) {
    if (!campaignId) throw new BadRequestException('Cần chọn chiến dịch cho voucher.');
    const campaign = await this.prisma.campaign.findFirst({ where: { id: campaignId, storeId }, select: { isActive: true, startDate: true, endDate: true } });
    if (!campaign || !campaign.isActive || campaign.endDate <= new Date()) throw new BadRequestException('Chiến dịch không còn hiệu lực.');
  }

  async previewStackedVoucher(dto: PreviewStackedVoucherDto) {
    const voucher = await this.prisma.coupon.findUnique({ where: { codeNormalized: dto.code.trim().toUpperCase() } });
    const now = new Date();
    if (!voucher || voucher.storeId !== dto.storeId || voucher.benefitType !== dto.benefitType ||
        voucher.scopeType !== CouponScope.STORE_WIDE || voucher.status !== CouponStatus.ACTIVE || voucher.deletedAt ||
        (voucher.startsAt && now < voucher.startsAt) || (voucher.expiresAt && now >= voucher.expiresAt) ||
        (dto.benefitType === 'GOODS' && voucher.fundingSource !== CouponFundingSource.PLATFORM_FUNDED) ||
        (voucher.usageLimitTotal !== null && voucher.usageCount >= voucher.usageLimitTotal)) {
      throw new BadRequestException('Voucher không áp dụng được cho đơn này.');
    }
    if (voucher.minimumOrderAmount && dto.goodsSubtotal < Number(voucher.minimumOrderAmount)) throw new BadRequestException('Chưa đạt giá trị đơn tối thiểu.');
    const base = dto.benefitType === 'SHIPPING' ? dto.shippingFee : Math.max(0, dto.goodsSubtotal - dto.shopDiscount);
    if (base <= 0) throw new BadRequestException('Không có giá trị áp dụng voucher.');
    const raw = voucher.discountType === DiscountType.PERCENTAGE ? Math.round(base * Number(voucher.discountValue) / 100) : Number(voucher.discountValue);
    const discountAmount = Math.max(0, Math.min(base, raw, voucher.maximumDiscountAmount === null ? Infinity : Number(voucher.maximumDiscountAmount)));
    if (voucher.budgetTotal !== null && Number(voucher.budgetUsed) + discountAmount > Number(voucher.budgetTotal)) throw new BadRequestException('Voucher đã hết ngân sách.');
    if (dto.customerPhone?.trim()) {
      const used = await this.prisma.stackedVoucherRedemption.count({ where: { couponId: voucher.id, customerPhone: dto.customerPhone.trim(), status: { in: [CouponRedemptionStatus.USED, CouponRedemptionStatus.PARTIALLY_REFUNDED] } } });
      if (used >= voucher.usageLimitPerCustomer) throw new BadRequestException('Bạn đã dùng hết lượt voucher này.');
    }
    return { code: voucher.displayCode, benefitType: voucher.benefitType, discountAmount };
  }

  async getSavedCouponIds(userId: string) {
    const rows = await this.prisma.customerSavedCoupon.findMany({
      where: { userId }, select: { couponId: true }, orderBy: { savedAt: 'desc' },
    });
    return rows.map((row) => row.couponId);
  }

  async getSavedAvailableCoupons(userId: string) {
    const ids = await this.getSavedCouponIds(userId);
    return ids.length ? this.getPublicAvailableCoupons(ids) : [];
  }

  async getSavedExpiredCoupons(userId: string) {
    const ids = await this.getSavedCouponIds(userId);
    if (!ids.length) return [];
    const coupons = await this.prisma.coupon.findMany({
      where: {
        id: { in: ids }, deletedAt: null, expiresAt: { lte: new Date() },
        status: { in: [CouponStatus.ACTIVE, CouponStatus.EXPIRED, CouponStatus.PAUSED, CouponStatus.BLOCKED] },
      },
      select: {
        id: true, displayCode: true, discountType: true, discountValue: true,
        minimumOrderAmount: true, maximumDiscountAmount: true,
        usageLimitTotal: true, usageCount: true, expiresAt: true,
        scopeType: true, fundingSource: true, benefitType: true,
        store: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ expiresAt: 'desc' }, { id: 'asc' }],
    });
    return coupons.map((coupon) => ({
      id: coupon.id, code: coupon.displayCode, discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue), minimumOrderAmount: Number(coupon.minimumOrderAmount || 0),
      maximumDiscountAmount: coupon.maximumDiscountAmount === null ? null : Number(coupon.maximumDiscountAmount),
      remainingUses: coupon.usageLimitTotal === null ? null : Math.max(0, coupon.usageLimitTotal - coupon.usageCount),
      expiresAt: coupon.expiresAt, scopeType: coupon.scopeType, fundingSource: coupon.fundingSource,
      benefitType: coupon.benefitType, store: coupon.store,
    }));
  }

  async saveCoupon(userId: string, couponId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId, status: CouponStatus.ACTIVE, deletedAt: null,
        store: { isActive: true, isDeleted: false },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
        ],
      },
      select: { id: true, usageLimitTotal: true, usageCount: true, liveSession: { select: { status: true, inviteStatus: true, startsAt: true, endsAt: true } } },
    });
    if (!coupon ||
      (coupon.usageLimitTotal !== null && coupon.usageCount >= coupon.usageLimitTotal) ||
      !liveVoucherActive(coupon.liveSession)) {
      throw new NotFoundException('Voucher không còn khả dụng.');
    }
    await this.prisma.customerSavedCoupon.upsert({
      where: { userId_couponId: { userId, couponId } },
      create: { userId, couponId }, update: {},
    });
    return { saved: true, couponId };
  }

  async removeSavedCoupon(userId: string, couponId: string) {
    await this.prisma.customerSavedCoupon.deleteMany({ where: { userId, couponId } });
    return { saved: false, couponId };
  }

  async getPublicAvailableCoupons(ids?: string[]) {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        ...(ids ? { id: { in: ids } } : {}),
        status: CouponStatus.ACTIVE,
        deletedAt: null,
        store: { isActive: true, isDeleted: false },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      select: {
        id: true, displayCode: true, discountType: true, discountValue: true,
        minimumOrderAmount: true, maximumDiscountAmount: true,
        usageLimitTotal: true, usageCount: true, expiresAt: true,
        budgetTotal: true, budgetUsed: true,
        scopeType: true, fundingSource: true, benefitType: true,
        campaign: { select: { isActive: true, startDate: true, endDate: true } },
        liveSession: { select: { status: true, inviteStatus: true, startsAt: true, endsAt: true } },
        store: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
      ...(!ids ? { take: 100 } : {}),
    });
    return coupons.filter((coupon) =>
      (coupon.usageLimitTotal === null || coupon.usageCount < coupon.usageLimitTotal) &&
      (coupon.budgetTotal === null || Number(coupon.budgetUsed) < Number(coupon.budgetTotal)) &&
      liveVoucherActive(coupon.liveSession, now) &&
      (coupon.scopeType !== CouponScope.CAMPAIGN || (coupon.campaign?.isActive && coupon.campaign.startDate <= now && coupon.campaign.endDate > now)))
      .map((coupon) => ({
        id: coupon.id,
        code: coupon.displayCode,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minimumOrderAmount: Number(coupon.minimumOrderAmount || 0),
        maximumDiscountAmount: coupon.maximumDiscountAmount === null ? null : Number(coupon.maximumDiscountAmount),
        remainingUses: coupon.usageLimitTotal === null ? null : coupon.usageLimitTotal - coupon.usageCount,
        expiresAt: coupon.expiresAt,
        scopeType: coupon.scopeType,
        fundingSource: coupon.fundingSource,
        benefitType: coupon.benefitType,
        store: coupon.store,
      }));
  }

  async getEligibleProductCoupons(storeId: string, query: ProductCouponQueryDto, userId?: string, ip?: string) {
    await this.checkRateLimit(`suggest_${userId || ip || 'anon'}`, 60, 60000);
    const product = await this.prisma.product.findFirst({
      where: {
        id: query.productId, storeId, isDeleted: false, isActive: true, moderationStatus: 'APPROVED',
        store: { isActive: true, isDeleted: false, isVerified: true, onboardingStatus: 'VERIFIED', owner: { isActive: true, isDeleted: false } },
      }, include: { variants: true },
    });
    if (!product) return [];
    const variant = query.variantId ? product.variants.find(row => row.id === query.variantId && row.isActive) : null;
    if ((product.variants.length && !variant) || (query.variantId && !variant) ||
        query.quantity > (variant?.stockQuantity ?? product.stockQuantity)) return [];
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        storeId, status: CouponStatus.ACTIVE, deletedAt: null,
        benefitType: 'GOODS', fundingSource: { not: CouponFundingSource.PLATFORM_FUNDED },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
        OR: [
          { scopeType: CouponScope.STORE_WIDE },
          { scopeType: CouponScope.PRODUCTS, couponProducts: { some: { productId: product.id } } },
          { scopeType: CouponScope.CATEGORIES, couponCategories: { some: { categoryName: { equals: product.categoryName || '', mode: 'insensitive' } } } },
          { scopeType: CouponScope.CAMPAIGN },
        ],
      },
      include: {
        store: { select: { id: true, name: true, isDeleted: true } }, couponProducts: true, couponCategories: true,
        campaign: { include: { campaignProducts: { select: { productId: true } } } },
        liveSession: { include: { products: { select: { productId: true, variantId: true } } } },
      }, orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }], take: 100,
    });
    const account = userId ? await this.prisma.user.findUnique({ where: { id: userId }, select: { phoneNumber: true } }) : null;
    const phone = account?.phoneNumber?.trim();
    const used = userId && coupons.length ? await this.prisma.couponRedemption.groupBy({
      by: ['couponId'], where: {
        couponId: { in: coupons.map(coupon => coupon.id) }, status: { in: [CouponRedemptionStatus.USED, CouponRedemptionStatus.RESERVED] },
        OR: [{ customerId: userId }, ...(phone ? [{ customerPhone: phone }] : [])],
      }, _count: { _all: true },
    }) : [];
    const counts = new Map(used.map(row => [row.couponId, row._count._all]));
    const results = await Promise.all(coupons.map(async coupon => {
      try {
        const evaluated = await this.evaluateCoupon({
          code: coupon.displayCode, storeId, customerPhone: phone,
          items: [{ productId: product.id, variantId: variant?.id, quantity: query.quantity }],
        }, undefined, userId, { coupon, products: [product], variants: variant ? [variant] : [], redemptions: counts.get(coupon.id) || 0 });
        if (evaluated.discountAmount <= 0) return null;
        return {
          id: coupon.id, displayCode: coupon.displayCode, code: coupon.displayCode,
          discountAmount: evaluated.discountAmount, discountType: coupon.discountType,
          discountValue: Number(coupon.discountValue), minimumOrderAmount: Number(coupon.minimumOrderAmount || 0),
          maximumDiscountAmount: coupon.maximumDiscountAmount === null ? null : Number(coupon.maximumDiscountAmount),
          expiresAt: coupon.expiresAt, fundingSource: coupon.fundingSource, benefitType: coupon.benefitType,
        };
      } catch (error) {
        if (error instanceof BadRequestException) return null;
        throw error;
      }
    }));
    return results.filter((result): result is NonNullable<typeof result> => result !== null)
      .sort((left, right) => right.discountAmount - left.discountAmount);
  }

  async getVoucherProducts(couponId: string, page = 1) {
    if (!Number.isInteger(page) || page < 1 || page > 10000) throw new BadRequestException('Trang sản phẩm không hợp lệ.');
    const available = await this.getPublicAvailableCoupons([couponId]);
    if (!available.length) throw new NotFoundException('Voucher đã hết hạn hoặc không còn khả dụng.');
    const coupon = await this.prisma.coupon.findUnique({
      where: { id: couponId },
      include: { couponCategories: true, campaign: { include: { campaignProducts: true } } },
    });
    if (!coupon) throw new NotFoundException('Không tìm thấy voucher.');
    const products = await this.prisma.product.findMany({
      where: voucherProductWhere(coupon),
      select: { id: true, title: true, imageUrl: true, price: true, stockQuantity: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * 24,
      take: 25,
    });
    return { voucher: available[0], products: products.slice(0, 24), page, hasMore: products.length > 24 };
  }

  async getPublicStoreCoupons(storeId: string, productId?: string) {
    const now = new Date();
    let selectedProduct: { id: string; categoryName: string | null } | null = null;
    if (productId) {
      selectedProduct = await this.prisma.product.findFirst({
        where: { id: productId, storeId, isActive: true, isDeleted: false, moderationStatus: 'APPROVED' },
        select: { id: true, categoryName: true },
      });
      if (!selectedProduct) throw new NotFoundException('Sản phẩm không thuộc gian hàng hoặc không còn bán.');
    }
    const coupons = await this.prisma.coupon.findMany({
      where: {
        storeId,
        status: CouponStatus.ACTIVE,
        deletedAt: null,
        store: {
          isDeleted: false,
          isActive: true,
          owner: { isActive: true, isDeleted: false },
        },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
      select: {
        id: true,
        displayCode: true,
        codeNormalized: true,
        discountType: true,
        discountValue: true,
        minimumOrderAmount: true,
        maximumDiscountAmount: true,
        usageLimitTotal: true,
        usageCount: true,
        budgetTotal: true,
        budgetUsed: true,
        storeId: true,
        campaignId: true,
        liveSessionId: true,
        expiresAt: true,
        scopeType: true,
        fundingSource: true,
        benefitType: true,
        campaign: { select: { isActive: true, startDate: true, endDate: true, campaignProducts: { select: { productId: true } } } },
        liveSession: { select: { status: true, inviteStatus: true, startsAt: true, endsAt: true, products: { select: { productId: true, variantId: true } } } },
        couponProducts: {
          where: { product: { isDeleted: false, isActive: true } },
          select: { product: { select: { id: true, title: true } } },
        },
        couponCategories: { select: { categoryName: true } },
        store: { select: { name: true } },
      },
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    });

    return coupons
      .filter(
        (coupon) =>
          (!selectedProduct || voucherMatchesProduct(coupon, selectedProduct)) &&
          (coupon.budgetTotal === null || Number(coupon.budgetUsed) < Number(coupon.budgetTotal)) &&
          (coupon.usageLimitTotal === null ||
          coupon.usageCount < coupon.usageLimitTotal) &&
          liveVoucherActive(coupon.liveSession, now) &&
          (coupon.scopeType !== CouponScope.CAMPAIGN || (coupon.campaign?.isActive && coupon.campaign.startDate <= now && coupon.campaign.endDate > now)),
      )
      .map((coupon) => ({
        id: coupon.id,
        code: coupon.displayCode,
        displayCode: coupon.displayCode,
        codeNormalized: coupon.codeNormalized,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minimumOrderAmount: coupon.minimumOrderAmount
          ? Number(coupon.minimumOrderAmount)
          : null,
        maximumDiscountAmount: coupon.maximumDiscountAmount
          ? Number(coupon.maximumDiscountAmount)
          : null,
        remainingUses:
          coupon.usageLimitTotal === null
            ? null
            : Math.max(0, coupon.usageLimitTotal - coupon.usageCount),
        expiresAt: coupon.expiresAt,
        scopeType: coupon.scopeType,
        fundingSource: coupon.fundingSource,
        benefitType: coupon.benefitType,
        products: coupon.couponProducts.map((item) => item.product),
        categories: coupon.couponCategories.map((item) => item.categoryName),
        storeName: coupon.store.name,
      }));
  }

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
          message:
            'Thao tác quá nhiều lần. Vui lòng thử lại sau 15 phút (Lockout).',
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
      const retryAfter = Math.max(
        1,
        Math.ceil((resetTime - Date.now()) / 1000),
      );
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

  private async recordValidationFailure(key?: string) {
    if (!key) return;
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

  private async resetValidationFailure(key?: string) {
    if (!key) return;
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
            owner: {
              select: { avatarUrl: true },
            },
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
    await this.checkRateLimit(
      `kol_create_day_${collaboratorId}`,
      20,
      24 * 60 * 60 * 1000,
    );

    // 2. Normalize and check syntax & banned words
    const codeNormalized = this.normalizeAndValidateCode(dto.code);

    // 3. Verify Collaborator exists & is active
    const collaborator = await this.prisma.user.findUnique({
      where: { id: collaboratorId },
    });
    if (!collaborator || !collaborator.isActive || collaborator.isDeleted) {
      throw new ForbiddenException(
        'Tài khoản đối tác không tồn tại hoặc đã bị khóa',
      );
    }

    // 4. Verify Shop exists and is active
    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
    });
    if (!store || store.isDeleted) {
      throw new NotFoundException(
        'Gian hàng không tồn tại hoặc đã ngừng hoạt động',
      );
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
    const [
      pendingStoreCount,
      pendingGlobalCount,
      activeStoreCount,
      activeGlobalCount,
    ] = await Promise.all([
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
        stackableWithShopVoucher: false,
        stackableWithPlatformVoucher: true,
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
      liveSessionId: null,
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

    if (coupon?.liveSessionId) {
      throw new BadRequestException(
        'Hãy quản lý voucher này trong trang Phiên Livestream.',
      );
    }

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

    if (nextStatus === CouponStatus.ACTIVE && (!coupon.approvedBy || !coupon.approvedAt)) {
      throw new ForbiddenException('Voucher chưa được chủ Shop duyệt nên không thể kích hoạt.');
    }
    if (nextStatus === CouponStatus.ACTIVE && coupon.expiresAt && coupon.expiresAt <= new Date()) {
      throw new BadRequestException('Voucher đã hết hạn, không thể kích hoạt lại.');
    }

    let inFlightOrdersCount = 0;
    if (nextStatus === CouponStatus.PAUSED) {
      inFlightOrdersCount = await this.prisma.order.count({
        where: {
          couponId: id,
          status: { in: [OrderStatus.PENDING, OrderStatus.SHIPPING] },
        },
      });
    }

    const updated = await this.updateCurrentCoupon(coupon, { status: nextStatus });

    await this.prisma.auditLog.create({
      data: {
        userId: collaboratorId,
        action:
          nextStatus === CouponStatus.PAUSED
            ? 'COUPON_PAUSED'
            : 'COUPON_RESUMED',
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

    if (coupon.status !== CouponStatus.PENDING_APPROVAL && coupon.status !== CouponStatus.REJECTED) {
      throw new BadRequestException('Chỉ xóa đề xuất đang chờ duyệt hoặc đã bị từ chối.');
    }

    const updated = await this.updateCurrentCoupon(coupon, {
        status: CouponStatus.DELETED,
        deletedAt: new Date(),
        deletedBy: collaboratorId,
        deleteReason: dto.reason || 'KOL chủ động xóa mã giảm giá',
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
  private async verifyStoreAccess(
    storeId: string,
    userId: string,
    role: UserRole,
  ) {
    if (role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER) {
      return;
    }
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store) {
      throw new NotFoundException('Gian hàng không tồn tại');
    }
    if (role !== UserRole.SHOP_MANAGER || store.ownerId !== userId) {
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
      liveSessionId: null,
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
          campaign: { select: { id: true, name: true, isActive: true, startDate: true, endDate: true } },
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
   * Shop chủ động phát hành mã giảm giá (Voucher) riêng của gian hàng để kích cầu
   */
  async createStoreCoupon(
    storeId: string,
    userId: string,
    role: UserRole,
    dto: CreateStoreCouponDto,
    ipAddress?: string,
  ) {
    if (role !== UserRole.SHOP_MANAGER) throw new ForbiddenException('Chỉ chủ Shop được phát hành voucher từ ngân sách Shop.');
    await this.verifyStoreAccess(storeId, userId, role);

    // Rate limit: 10 requests / minute
    await this.checkRateLimit(`shop_create_min_${storeId}`, 10, 60 * 1000);

    const codeNormalized = this.normalizeAndValidateCode(dto.code);

    // Check code uniqueness across the whole system
    const existing = await this.prisma.coupon.findUnique({
      where: { codeNormalized },
    });
    if (existing) {
      throw new ConflictException(
        `Mã giảm giá "${codeNormalized}" đã tồn tại trong hệ thống. Vui lòng chọn một mã khác.`,
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
    if (dto.benefitType === 'SHIPPING' && dto.scopeType && dto.scopeType !== CouponScope.STORE_WIDE) {
      throw new BadRequestException('Voucher vận chuyển chỉ áp dụng toàn gian hàng.');
    }
    if (dto.scopeType === CouponScope.CAMPAIGN) {
      await this.assertVoucherCampaign(storeId, dto.campaignId);
    }

    // Validate dates
    const startsAt: Date | null = dto.startsAt
      ? new Date(dto.startsAt)
      : new Date();
    const expiresAt: Date | null = dto.expiresAt
      ? new Date(dto.expiresAt)
      : null;
    if (startsAt && expiresAt && startsAt > expiresAt) {
      throw new BadRequestException(
        'Thời điểm bắt đầu không được lớn hơn thời điểm kết thúc',
      );
    }

    // Execute in transaction
    const newCoupon = await this.prisma.$transaction(async (tx) => {
      const created = await tx.coupon.create({
        data: {
          storeId,
          collaboratorId: userId,
          codeNormalized,
          displayCode: dto.code.trim().toUpperCase(),
          status: CouponStatus.ACTIVE,
          discountType: dto.discountType,
          benefitType: dto.benefitType ?? 'GOODS',
          discountValue: new Prisma.Decimal(dto.discountValue),
          minimumOrderAmount: dto.minimumOrderAmount
            ? new Prisma.Decimal(dto.minimumOrderAmount)
            : null,
          maximumDiscountAmount: dto.maximumDiscountAmount
            ? new Prisma.Decimal(dto.maximumDiscountAmount)
            : null,
          usageLimitTotal: dto.usageLimitTotal || null,
          usageLimitPerCustomer: dto.usageLimitPerCustomer || 1,
          budgetTotal: dto.budgetTotal
            ? new Prisma.Decimal(dto.budgetTotal)
            : null,
          budgetUsed: new Prisma.Decimal(0),
          startsAt,
          expiresAt,
          scopeType: dto.scopeType || CouponScope.STORE_WIDE,
          campaignId: dto.scopeType === CouponScope.CAMPAIGN ? dto.campaignId : null,
          fundingSource: CouponFundingSource.SHOP_FUNDED,
          shopFundingRate: new Prisma.Decimal(100),
          platformFundingRate: new Prisma.Decimal(0),
          stackableWithProductDiscount:
            dto.stackableWithProductDiscount ?? true,
          stackableWithShopVoucher: false,
          stackableWithPlatformVoucher: true,
          approvedBy: userId,
          approvedAt: new Date(),
        },
      });

      // Handle product scope
      if (
        dto.scopeType === CouponScope.PRODUCTS &&
        dto.productIds &&
        dto.productIds.length > 0
      ) {
        await tx.couponProduct.createMany({
          data: dto.productIds.map((productId) => ({
            couponId: created.id,
            productId,
          })),
          skipDuplicates: true,
        });
      }

      // Handle category scope
      if (
        dto.scopeType === CouponScope.CATEGORIES &&
        dto.categoryNames &&
        dto.categoryNames.length > 0
      ) {
        await tx.couponCategory.createMany({
          data: dto.categoryNames.map((categoryName) => ({
            couponId: created.id,
            categoryName,
          })),
          skipDuplicates: true,
        });
      }

      return created;
    });

    // Invalidate caches
    await this.cacheService.del(`coupon_code_${codeNormalized}`);
    await this.cacheService.del(`store_coupons_${storeId}`);

    this.logger.log(
      `Shop ${storeId} created store voucher "${codeNormalized}" successfully by user ${userId}`,
    );

    return newCoupon;
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
    if (role !== UserRole.SHOP_MANAGER) throw new ForbiddenException('Đề xuất KOL chỉ được kích hoạt khi chủ Shop duyệt.');
    await this.verifyStoreAccess(storeId, userId, role);

    const coupon = await this.prisma.coupon.findFirst({
      where: { id: couponId, storeId },
    });

    if (!coupon) {
      throw new NotFoundException('Không tìm thấy yêu cầu mã giảm giá');
    }

    this.assertShopFundedPolicy(coupon, role);

    if (coupon.status !== CouponStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        `Chỉ có thể phê duyệt coupon ở trạng thái Chờ duyệt (hiện tại: ${coupon.status})`,
      );
    }

    if (dto.scopeType === CouponScope.CAMPAIGN) await this.assertVoucherCampaign(storeId, dto.campaignId ?? coupon.campaignId);

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
    const startsAt: Date | null = dto.startsAt
      ? new Date(dto.startsAt)
      : new Date();
    const expiresAt: Date | null = dto.expiresAt
      ? new Date(dto.expiresAt)
      : null;
    if (startsAt && expiresAt && startsAt > expiresAt) {
      throw new BadRequestException(
        'Thời điểm bắt đầu không được lớn hơn thời điểm kết thúc',
      );
    }

    // Only the Shop owner approves a proposal and accepts its entire cost.
    if (dto.fundingSource === CouponFundingSource.PLATFORM_FUNDED || dto.fundingSource === CouponFundingSource.CO_FUNDED
      || (dto.shopFundingRate !== undefined && Number(dto.shopFundingRate) !== 100)
      || Number(dto.platformFundingRate || 0) > 0) {
      throw new ForbiddenException('Voucher Shop phải do Shop tài trợ 100%. Voucher Sàn được phát hành riêng bởi quản trị viên.');
    }
    const shopFundingRate = 100;
    const platformFundingRate = 0;
    const fundingSource = CouponFundingSource.SHOP_FUNDED;

    // Execute approval inside transaction
    const approvedCoupon = await this.prisma.$transaction(async (tx) => {
      // 1. Update coupon details
      const updated = await this.updateCurrentCoupon(coupon, {
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
          budgetTotal: dto.budgetTotal
            ? new Prisma.Decimal(dto.budgetTotal)
            : null,
          startsAt,
          expiresAt,
          scopeType: dto.scopeType || CouponScope.STORE_WIDE,
          fundingSource,
          campaignId: dto.scopeType === CouponScope.CAMPAIGN ? dto.campaignId ?? coupon.campaignId : null,
          shopFundingRate: new Prisma.Decimal(shopFundingRate),
          platformFundingRate: new Prisma.Decimal(platformFundingRate),
          stackableWithProductDiscount: !!dto.stackableWithProductDiscount,
          stackableWithShopVoucher: false,
          stackableWithPlatformVoucher: true,
          approvedBy: userId,
          approvedAt: new Date(),
        }, tx);

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

    const updated = await this.updateCurrentCoupon(coupon, { status: CouponStatus.REJECTED, rejectedReason: dto.reason });

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

    const updated = await this.blockCurrentCoupon(coupon, dto.reason);

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

    this.assertShopFundedPolicy(coupon, role);
    if (role === UserRole.SHOP_MANAGER && coupon.status !== CouponStatus.ACTIVE && coupon.status !== CouponStatus.PAUSED) {
      throw new BadRequestException('Chỉ sửa chính sách voucher đang hoạt động hoặc tạm dừng; đề xuất mới cần được Shop duyệt.');
    }

    const data: Prisma.CouponUpdateInput = {};

    if ((dto.scopeType ?? coupon.scopeType) === CouponScope.CAMPAIGN) {
      await this.assertVoucherCampaign(storeId, dto.campaignId ?? coupon.campaignId);
      data.campaign = { connect: { id: (dto.campaignId ?? coupon.campaignId)! } };
    } else if (dto.scopeType !== undefined && coupon.campaignId) {
      data.campaign = { disconnect: true };
    }

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
        (dto.shopFundingRate !== undefined && Number(dto.shopFundingRate) !== 100) ||
        (dto.platformFundingRate !== undefined &&
          Number(dto.platformFundingRate) > 0)
      ) {
        throw new ForbiddenException(
          'Gian hàng không có quyền chỉ định nền tảng SCANMS đồng tài trợ ngân sách. Chỉ Quản trị viên (Admin) mới có thẩm quyền phê duyệt.',
        );
      }
    }

    if (dto.scopeType !== undefined) data.scopeType = dto.scopeType;
    if (isAdmin) {
      if (dto.fundingSource !== undefined)
        data.fundingSource = dto.fundingSource;
      if (dto.shopFundingRate !== undefined)
        data.shopFundingRate = new Prisma.Decimal(dto.shopFundingRate);
      if (dto.platformFundingRate !== undefined)
        data.platformFundingRate = new Prisma.Decimal(dto.platformFundingRate);
    } else {
      data.fundingSource = CouponFundingSource.SHOP_FUNDED;
      data.shopFundingRate = new Prisma.Decimal(100);
      data.platformFundingRate = new Prisma.Decimal(0);
    }
    if (dto.stackableWithProductDiscount !== undefined)
      data.stackableWithProductDiscount = dto.stackableWithProductDiscount;
    data.stackableWithShopVoucher = (data.fundingSource ?? coupon.fundingSource) === CouponFundingSource.PLATFORM_FUNDED && coupon.benefitType !== 'SHIPPING';
    data.stackableWithPlatformVoucher = true;

    const updated = await this.updateCurrentCoupon(coupon, data);

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'COUPON_POLICY_UPDATED',
        details: {
          couponId,
          storeId,
          changes: JSON.parse(JSON.stringify(dto)),
        },
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

  async getStorePlatformSubsidies(storeId: string, userId: string, role: UserRole) {
    await this.verifyStoreAccess(storeId, userId, role);
    return this.getPlatformSubsidies(storeId);
  }

  async getPlatformSubsidies(storeId?: string) {
    const orderStatus = { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] };
    const orderFilter = { status: orderStatus, ...(storeId ? { storeId } : {}) };
    const [primary, stacked, paymentResult] = await Promise.all([
      this.prisma.couponRedemption.findMany({
        where: { platformFundedAmount: { gt: 0 }, status: { in: [CouponRedemptionStatus.USED, CouponRedemptionStatus.PARTIALLY_REFUNDED] }, order: orderFilter },
        select: { orderId: true, platformFundedAmount: true, order: { select: { externalOrderSn: true, storeId: true, store: { select: { name: true } } } } },
      }),
      this.prisma.stackedVoucherRedemption.findMany({
        where: { platformFundedAmount: { gt: 0 }, status: { in: [CouponRedemptionStatus.USED, CouponRedemptionStatus.PARTIALLY_REFUNDED] }, order: orderFilter },
        select: { orderId: true, platformFundedAmount: true, order: { select: { externalOrderSn: true, storeId: true, store: { select: { name: true } } } } },
      }),
      this.prisma.platformVoucherReimbursement.findMany({ where: storeId ? { storeId } : {}, select: { orderId: true, amount: true, bankReference: true, paidAt: true, order: { select: { externalOrderSn: true, storeId: true, store: { select: { name: true } } } } } })
        .then((rows) => ({ rows, ready: true }))
        .catch((error) => {
          if (error?.code === 'P2021') return { rows: [], ready: false };
          throw error;
        }),
    ]);
    const payments = paymentResult.rows;
    const paidByOrder = new Map<string, number>();
    const paymentDetailsByOrder = new Map<string, Array<{ amount: number; bankReference: string; paidAt: Date }>>();
    for (const payment of payments) {
      paidByOrder.set(payment.orderId, (paidByOrder.get(payment.orderId) || 0) + Number(payment.amount));
      const details = paymentDetailsByOrder.get(payment.orderId) || [];
      details.push({ amount: Number(payment.amount), bankReference: payment.bankReference, paidAt: payment.paidAt });
      paymentDetailsByOrder.set(payment.orderId, details);
    }
    const byStore = new Map<string, { storeId: string; storeName: string; amount: number; orders: Map<string, { orderId: string; orderCode: string; amount: number; paidAmount: number; outstandingAmount: number }> }>();
    for (const redemption of [...primary, ...stacked]) {
      const storeId = redemption.order.storeId;
      const item = byStore.get(storeId) || { storeId, storeName: redemption.order.store.name, amount: 0, orders: new Map() };
      item.amount += Number(redemption.platformFundedAmount);
      const order = item.orders.get(redemption.orderId) || { orderId: redemption.orderId, orderCode: redemption.order.externalOrderSn, amount: 0, paidAmount: 0, outstandingAmount: 0 };
      order.amount += Number(redemption.platformFundedAmount);
      item.orders.set(redemption.orderId, order);
      byStore.set(storeId, item);
    }
    for (const payment of payments) {
      const storeId = payment.order.storeId;
      const item = byStore.get(storeId) || { storeId, storeName: payment.order.store.name, amount: 0, orders: new Map() };
      if (!item.orders.has(payment.orderId)) item.orders.set(payment.orderId, { orderId: payment.orderId, orderCode: payment.order.externalOrderSn, amount: 0, paidAmount: 0, outstandingAmount: 0 });
      byStore.set(storeId, item);
    }
    return [...byStore.values()].map(({ storeId, storeName, amount, orders }) => {
      const orderRows = [...orders.values()].map((order) => {
        const paidAmount = paidByOrder.get(order.orderId) || 0;
        return { ...order, amount: Math.round(order.amount), paidAmount: Math.round(paidAmount), outstandingAmount: Math.max(0, Math.round(order.amount - paidAmount)), payments: paymentDetailsByOrder.get(order.orderId) || [] };
      });
      return { storeId, storeName, amount: Math.round(amount), paidAmount: orderRows.reduce((sum, order) => sum + order.paidAmount, 0), outstandingAmount: orderRows.reduce((sum, order) => sum + order.outstandingAmount, 0), orderCount: orders.size, orders: orderRows, reimbursementReady: paymentResult.ready };
    }).sort((a, b) => b.amount - a.amount);
  }

  async recordPlatformReimbursement(adminId: string, orderId: string, dto: RecordPlatformReimbursementDto) {
    const reference = dto.bankReference.trim().toUpperCase();
    if (!reference || !Number.isFinite(dto.amount) || dto.amount <= 0) throw new BadRequestException('Số tiền và mã giao dịch không hợp lệ.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
        const order = await tx.order.findUnique({ where: { id: orderId }, select: { storeId: true, status: true } });
        if (!order || (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.DELIVERED)) throw new BadRequestException('Đơn chưa đủ điều kiện đối soát.');
        const [primary, stacked, paid] = await Promise.all([
          tx.couponRedemption.findMany({ where: { orderId, platformFundedAmount: { gt: 0 }, status: { in: [CouponRedemptionStatus.USED, CouponRedemptionStatus.PARTIALLY_REFUNDED] } }, select: { platformFundedAmount: true } }),
          tx.stackedVoucherRedemption.findMany({ where: { orderId, platformFundedAmount: { gt: 0 }, status: { in: [CouponRedemptionStatus.USED, CouponRedemptionStatus.PARTIALLY_REFUNDED] } }, select: { platformFundedAmount: true } }),
          tx.platformVoucherReimbursement.aggregate({ where: { orderId }, _sum: { amount: true } }),
        ]);
        const entitlement = [...primary, ...stacked].reduce((sum, row) => sum.plus(row.platformFundedAmount), new Prisma.Decimal(0));
        const outstanding = entitlement.minus(paid._sum.amount || 0);
        if (new Prisma.Decimal(dto.amount).greaterThan(outstanding)) throw new ConflictException('Số tiền ghi nhận vượt khoản sàn còn phải hoàn cho Shop.');
        if (await tx.platformVoucherReimbursement.findFirst({ where: { orderId, bankReference: reference }, select: { id: true } })) throw new ConflictException('Mã giao dịch này đã được ghi nhận cho đơn hàng.');
        const payment = await tx.platformVoucherReimbursement.create({ data: { orderId, storeId: order.storeId, amount: dto.amount, bankReference: reference, markedBy: adminId } });
        await tx.auditLog.create({ data: { userId: adminId, action: 'PLATFORM_VOUCHER_REIMBURSED', details: { orderId, storeId: order.storeId, amount: dto.amount, bankReference: reference, reimbursementId: payment.id } } });
        return payment;
      });
    } catch (error: any) {
      if (error?.code === 'P2021') throw new ServiceUnavailableException('Chức năng đối soát đang chờ áp dụng migration database.');
      throw error;
    }
  }

  async createPlatformCoupon(adminId: string, dto: CreatePlatformCouponDto) {
    const store = await this.prisma.store.findFirst({ where: { id: dto.storeId, isActive: true, isDeleted: false }, select: { id: true } });
    if (!store) throw new NotFoundException('Gian hàng không hoạt động.');
    if (dto.discountType === DiscountType.PERCENTAGE && dto.discountValue > 100) throw new BadRequestException('Mức giảm không được vượt quá 100%.');
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : new Date();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && expiresAt <= startsAt) throw new BadRequestException('Hạn dùng phải sau ngày bắt đầu.');
    const codeNormalized = dto.code.trim().toUpperCase();
    if (await this.prisma.coupon.findUnique({ where: { codeNormalized }, select: { id: true } })) throw new ConflictException('Mã voucher đã tồn tại.');
    return this.prisma.$transaction(async (tx) => {
      const coupon = await tx.coupon.create({ data: {
        storeId: dto.storeId, collaboratorId: adminId, codeNormalized, displayCode: codeNormalized,
        status: CouponStatus.ACTIVE, benefitType: dto.benefitType,
        discountType: dto.discountType, discountValue: dto.discountValue,
        minimumOrderAmount: dto.minimumOrderAmount ?? null,
        maximumDiscountAmount: dto.maximumDiscountAmount ?? null,
        usageLimitTotal: dto.usageLimitTotal, usageLimitPerCustomer: dto.usageLimitPerCustomer ?? 1,
        budgetTotal: dto.budgetTotal, budgetUsed: 0, startsAt, expiresAt,
        scopeType: CouponScope.STORE_WIDE, fundingSource: CouponFundingSource.PLATFORM_FUNDED,
        shopFundingRate: 0, platformFundingRate: 100,
        stackableWithProductDiscount: true, stackableWithShopVoucher: dto.benefitType === 'GOODS',
        stackableWithPlatformVoucher: true, approvedBy: adminId, approvedAt: new Date(),
      } });
      await tx.auditLog.create({ data: { userId: adminId, action: 'ADMIN_PLATFORM_COUPON_CREATED', details: { couponId: coupon.id, storeId: dto.storeId, benefitType: dto.benefitType, budgetTotal: dto.budgetTotal } } });
      return coupon;
    });
  }

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

    const updated = await this.blockCurrentCoupon(coupon, dto.reason);

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

    if (coupon.status !== CouponStatus.BLOCKED) throw new BadRequestException('Chỉ mở khóa voucher đang bị khóa.');
    const wasApproved = Boolean(coupon.approvedBy && coupon.approvedAt);
    const previous = coupon.statusBeforeBlock;
    let restoredStatus: CouponStatus = CouponStatus.PENDING_APPROVAL;
    if (previous === CouponStatus.REJECTED || previous === CouponStatus.EXPIRED) restoredStatus = previous;
    else if (wasApproved) {
      restoredStatus = previous === CouponStatus.ACTIVE ? CouponStatus.ACTIVE : CouponStatus.PAUSED;
      if (previous === CouponStatus.PENDING_APPROVAL) restoredStatus = CouponStatus.PENDING_APPROVAL;
    }
    if (restoredStatus === CouponStatus.ACTIVE && coupon.expiresAt && coupon.expiresAt <= new Date()) restoredStatus = CouponStatus.EXPIRED;

    const updated = await this.updateCurrentCoupon(coupon, { status: restoredStatus, statusBeforeBlock: null, blockedReason: null });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'ADMIN_COUPON_UNBLOCKED',
        details: { couponId, restoredStatus, statusBeforeBlock: previous, wasApproved },
        ipAddress: ipAddress || null,
      },
    });

    const labels: Partial<Record<CouponStatus, string>> = {
      PENDING_APPROVAL: 'Chờ chủ Shop duyệt', ACTIVE: 'Đang hoạt động', PAUSED: 'Tạm dừng', REJECTED: 'Đã từ chối', EXPIRED: 'Đã hết hạn',
    };
    return { message: `Đã mở khóa voucher. Trạng thái: ${labels[restoredStatus]}.`, coupon: updated };
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
    await this.checkRateLimit(
      `coupon_val_${rateLimitKey}`,
      10,
      60 * 1000,
      true,
    );

    return this.evaluateCoupon(dto, rateLimitKey, userId);
  }

  private async evaluateCoupon(
    dto: ValidateCouponDto,
    rateLimitKey?: string,
    userId?: string,
    preview?: { coupon: any; products: any[]; variants: any[]; redemptions: number },
  ) {

    const codeNormalized = dto.code.trim().toUpperCase();

    // 1. Fetch coupon with store & scope relations
    const coupon = preview?.coupon ?? await this.prisma.coupon.findUnique({
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
        liveSession: {
          select: {
            id: true,
            status: true,
            inviteStatus: true,
            commissionRate: true,
            startsAt: true,
            endsAt: true,
            products: { select: { productId: true, variantId: true } },
          },
        },
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

    if (coupon.benefitType === 'SHIPPING' || coupon.fundingSource === CouponFundingSource.PLATFORM_FUNDED) {
      throw new BadRequestException('Mã này cần nhập ở ô voucher Sàn hoặc voucher vận chuyển.');
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

    if (coupon.expiresAt && now >= coupon.expiresAt) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_EXPIRED',
        message: 'Mã giảm giá đã hết hạn sử dụng.',
      });
    }
    if (
      !liveVoucherActive(coupon.liveSession, now)
    ) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'LIVE_SESSION_NOT_ACTIVE',
        message: 'Voucher của phiên live hiện không được mở.',
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
      const customerRedemptionsCount = preview?.redemptions ?? await this.prisma.couponRedemption.count(
        {
          where: {
            couponId: coupon.id,
            status: {
              in: [
                CouponRedemptionStatus.USED,
                CouponRedemptionStatus.RESERVED,
              ],
            },
            OR: [
              ...(userId ? [{ customerId: userId }] : []),
              ...(customerPhone ? [{ customerPhone }] : []),
            ],
          },
        },
      );

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
    const dbProducts = preview?.products ?? await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isDeleted: false,
        isActive: true,
        moderationStatus: 'APPROVED',
      },
    });

    const dbProductMap = new Map<string, any>(
      dbProducts.map((p: any) => [p.id, p]),
    );
    const variantIds = dto.items
      .map((item) => item.variantId)
      .filter(Boolean) as string[];
    const dbVariants = preview?.variants ?? (variantIds.length
      ? await this.prisma.productVariant.findMany({
          where: { id: { in: variantIds }, isActive: true },
          select: { id: true, productId: true, price: true },
        })
      : []);
    const dbVariantMap = new Map(
      dbVariants.map((variant) => [variant.id, variant]),
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
    if (coupon.scopeType === CouponScope.CAMPAIGN) {
      if (!coupon.campaignId) throw new BadRequestException('Voucher chưa được gắn với chiến dịch hợp lệ.');
      const campaign = coupon.campaign ?? await this.prisma.campaign.findUnique({ where: { id: coupon.campaignId }, select: { isActive: true, startDate: true, endDate: true, storeId: true } });
      if (!campaign || !campaign.isActive || campaign.storeId !== coupon.storeId || campaign.startDate > new Date() || campaign.endDate <= new Date()) {
        throw new BadRequestException('Chiến dịch của voucher không còn hiệu lực.');
      }
      const campProds = coupon.campaign?.campaignProducts ?? await this.prisma.campaignProduct.findMany({
        where: { campaignId: coupon.campaignId },
        select: { productId: true },
      });
      campaignProductIds = new Set(campProds.map((cp) => cp.productId));
    }

    for (const item of storeItems) {
      const prod = dbProductMap.get(item.productId)!;
      const variant = item.variantId
        ? dbVariantMap.get(item.variantId)
        : undefined;
      if (item.variantId && (!variant || variant.productId !== prod.id))
        continue;
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
          campaignProductIds.size > 0 ? campaignProductIds.has(prod.id) : true;
      }

      if (isEligible && coupon.liveSession) {
        isEligible = coupon.liveSession.products.some(
          (liveProduct) =>
            liveProduct.productId === prod.id &&
            (!liveProduct.variantId ||
              liveProduct.variantId === item.variantId),
        );
      }

      if (isEligible) {
        eligibleProductIds.push(prod.id);
        eligibleSubtotal +=
          Number(variant?.price ?? prod.price) * item.quantity;
      }
    }

    if (eligibleProductIds.length === 0 || eligibleSubtotal <= 0) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_APPLICABLE',
        message:
          'Không có sản phẩm nào trong giỏ hàng thỏa mãn phạm vi áp dụng của mã.',
      });
    }

    // 6.5. Kiểm tra chính sách cộng dồn (Issue 6)
    const hasDirectDiscount = storeItems.some(item => {
      const product = dbProductMap.get(item.productId)!;
      const price = item.variantId ? dbVariantMap.get(item.variantId)?.price ?? product.price : product.price;
      return Number(product.originalPrice || 0) > Number(price);
    });
    if ((dto.hasProductDiscount || hasDirectDiscount) && !coupon.stackableWithProductDiscount) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_STACKABLE',
        message:
          'Mã giảm giá này không được áp dụng đồng thời với sản phẩm đang có giảm giá trực tiếp.',
      });
    }

    if (dto.hasShopVoucher) {
      await this.recordValidationFailure(rateLimitKey);
      throw new BadRequestException({
        errorCode: 'COUPON_NOT_STACKABLE',
        message: 'Mã giảm giá này không thể kết hợp với voucher khác của Shop.',
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

    if (rateLimitKey && (isNearUsage || isNearBudget)) {
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
      sessionCommissionRate: coupon.liveSession
        ? Number(coupon.liveSession.commissionRate)
        : null,
      message: 'Áp dụng mã giảm giá thành công',
    };
  }
}
