import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TrackOrderQueryDto } from './dto/track-order.dto';
import { CreateOrderReviewDto } from './dto/create-review.dto';
import { CancelOrderDto, GuestCancelOrderDto } from './dto/cancel-order.dto';
import * as crypto from 'crypto';
import {
  OrderStatus,
  AttributionMethod,
  CommissionStatus,
  CouponStatus,
  TransactionType,
  CouponRedemptionStatus,
  UserRole,
  ReferralLinkStatus,
  StoreCollaboratorStatus,
  OrderSourcePlatform,
  Prisma,
} from '@prisma/client';
import {
  ExternalOrderPlatform,
  OrderWebhookDto,
} from './dto/order-webhook.dto';
import { OrderWebhookNormalizerService } from './normalizers/order-webhook-normalizer.service';
import { NormalizedExternalOrder } from './normalizers/external-order-normalizer.interface';

import { ConfigService } from '@nestjs/config';
import { CouponsService } from '../coupons/coupons.service';
import {
  verifyMultiShopAttributionToken,
  verifyOpaqueVisitorToken,
  generateDeviceFingerprint,
} from '../referral-links/utils/short-code.generator';

const WEBHOOK_PLATFORM_MAP: Record<ExternalOrderPlatform, OrderSourcePlatform> =
  {
    [ExternalOrderPlatform.SHOPEE]: OrderSourcePlatform.SHOPEE,
    [ExternalOrderPlatform.TIKTOK]: OrderSourcePlatform.TIKTOK,
    [ExternalOrderPlatform.SHOPIFY]: OrderSourcePlatform.SHOPIFY,
  };

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookNormalizer: OrderWebhookNormalizerService,
    private readonly couponsService: CouponsService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * FR-19: Tiếp nhận đơn từ sàn ngoài theo cơ chế idempotent.
   * Việc tính hoa hồng và cập nhật ví thuộc FR-21, không được thực hiện tại đây.
   */
  async receiveWebhook(dto: OrderWebhookDto) {
    let normalizedOrder: NormalizedExternalOrder;

    try {
      normalizedOrder = this.webhookNormalizer.normalize(
        dto.source,
        dto.payload,
      );
      this.validateNormalizedOrder(normalizedOrder);
    } catch (error: unknown) {
      this.logger.warn(
        `Rejected invalid order webhook: source=${dto.source}, reason=${this.getErrorMessage(error)}`,
      );
      throw error;
    }

    const store = await this.findWebhookStore(dto);
    const sourcePlatform = WEBHOOK_PLATFORM_MAP[normalizedOrder.platform];
    const logContext = `source=${dto.source}, externalOrderId=${normalizedOrder.externalOrderId}, storeId=${store.id}`;

    this.logger.log(`Received order webhook: ${logContext}`);

    const existingOrder = await this.findWebhookOrder(
      store.id,
      sourcePlatform,
      normalizedOrder.externalOrderId,
    );
    if (existingOrder) {
      this.logger.log(`Ignored duplicate order webhook: ${logContext}`);
      return this.buildWebhookResponse(existingOrder, false);
    }

    const resolvedItems = await this.resolveWebhookProducts(
      store.id,
      normalizedOrder,
    );
    const calculatedSubtotal = resolvedItems.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0,
    );
    const subtotalAmount = normalizedOrder.subtotalAmount ?? calculatedSubtotal;
    const finalAmount =
      normalizedOrder.totalAmount ??
      Math.max(0, subtotalAmount - (normalizedOrder.discountAmount ?? 0));
    const discountAmount =
      normalizedOrder.discountAmount ??
      Math.max(0, subtotalAmount - finalAmount);

    try {
      const createdOrder = await this.prisma.$transaction((tx) =>
        tx.order.create({
          data: {
            storeId: store.id,
            sourcePlatform,
            externalOrderSn: normalizedOrder.externalOrderId,
            rawPayload: dto.payload as Prisma.InputJsonValue,
            customerName: normalizedOrder.customerName,
            customerPhone: normalizedOrder.customerPhone,
            shippingAddress: normalizedOrder.shippingAddress,
            subtotalAmount,
            discountAmount,
            finalAmount,
            status: normalizedOrder.status,
            orderItems: {
              create: resolvedItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                // FR-21 will calculate and persist commission values later.
                appliedCommissionRate: 0,
                calculatedCommissionAmount: 0,
              })),
            },
          },
          select: this.webhookOrderSelect,
        }),
      );

      this.logger.log(`Created order from webhook: ${logContext}`);
      return this.buildWebhookResponse(createdOrder, true);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        const concurrentOrder = await this.findWebhookOrder(
          store.id,
          sourcePlatform,
          normalizedOrder.externalOrderId,
        );
        if (concurrentOrder) {
          this.logger.log(
            `Ignored concurrent duplicate order webhook: ${logContext}`,
          );
          return this.buildWebhookResponse(concurrentOrder, false);
        }
      }

      this.logger.error(
        `Failed to persist order webhook: ${logContext}, reason=${this.getErrorMessage(error)}`,
      );
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Không thể tiếp nhận đơn hàng từ webhook',
      );
    }
  }

  private readonly webhookOrderSelect = {
    id: true,
    storeId: true,
    sourcePlatform: true,
    externalOrderSn: true,
    customerName: true,
    customerPhone: true,
    shippingAddress: true,
    subtotalAmount: true,
    discountAmount: true,
    finalAmount: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    orderItems: {
      select: {
        id: true,
        quantity: true,
        unitPrice: true,
        product: {
          select: {
            id: true,
            sku: true,
            title: true,
          },
        },
      },
    },
  } satisfies Prisma.OrderSelect;

  private async findWebhookStore(dto: OrderWebhookDto) {
    if (!dto.storeId && !dto.storeSlug?.trim()) {
      throw new BadRequestException(
        'Webhook phải cung cấp storeId hoặc storeSlug',
      );
    }

    const store = dto.storeId
      ? await this.prisma.store.findUnique({ where: { id: dto.storeId } })
      : await this.prisma.store.findUnique({
          where: { slug: dto.storeSlug?.trim() },
        });

    if (!store || store.isDeleted) {
      throw new BadRequestException('Không tìm thấy cửa hàng nhận webhook');
    }
    return store;
  }

  private findWebhookOrder(
    storeId: string,
    sourcePlatform: OrderSourcePlatform,
    externalOrderSn: string,
  ) {
    return this.prisma.order.findFirst({
      where: { storeId, sourcePlatform, externalOrderSn },
      select: this.webhookOrderSelect,
    });
  }

  private async resolveWebhookProducts(
    storeId: string,
    order: NormalizedExternalOrder,
  ) {
    const productIds = order.items
      .map((item) => item.productId)
      .filter((id): id is string => Boolean(id));
    const skus = order.items
      .map((item) => item.sku)
      .filter((sku): sku is string => Boolean(sku));

    if (order.items.some((item) => !item.productId && !item.sku)) {
      throw new BadRequestException(
        'Mỗi sản phẩm webhook phải có SKU hoặc internal_product_id',
      );
    }

    const skuFilters = skus.map((sku) => ({
      sku: { equals: sku, mode: 'insensitive' as const },
    }));
    const products = await this.prisma.product.findMany({
      where: {
        storeId,
        isDeleted: false,
        OR: [
          ...(productIds.length > 0 ? [{ id: { in: productIds } }] : []),
          ...skuFilters,
        ],
      },
      select: { id: true, sku: true, title: true },
    });
    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );
    const productsBySku = new Map(
      products.map((product) => [product.sku.toUpperCase(), product]),
    );

    const unresolvedItems: string[] = [];
    const resolvedItems = order.items.map((item) => {
      const product =
        (item.productId ? productsById.get(item.productId) : undefined) ??
        (item.sku ? productsBySku.get(item.sku.toUpperCase()) : undefined);

      if (!product) {
        unresolvedItems.push(item.sku ?? item.productId ?? item.name);
      }

      return {
        productId: product?.id ?? '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      };
    });

    if (unresolvedItems.length > 0) {
      throw new BadRequestException(
        `Không tìm thấy sản phẩm trong cửa hàng theo SKU/ID: ${unresolvedItems.join(', ')}`,
      );
    }

    return resolvedItems;
  }

  private validateNormalizedOrder(order: NormalizedExternalOrder): void {
    if (order.externalOrderId.length > 100) {
      throw new BadRequestException(
        'Mã đơn hàng từ sàn không được vượt quá 100 ký tự',
      );
    }
    if (order.customerName && order.customerName.length > 150) {
      throw new BadRequestException(
        'Tên khách hàng không được vượt quá 150 ký tự',
      );
    }
    if (order.customerPhone && order.customerPhone.length > 20) {
      throw new BadRequestException(
        'Số điện thoại khách hàng không được vượt quá 20 ký tự',
      );
    }

    const amounts = [
      order.subtotalAmount,
      order.discountAmount,
      order.totalAmount,
    ];
    if (
      amounts.some(
        (amount) =>
          amount !== undefined && (!Number.isFinite(amount) || amount < 0),
      )
    ) {
      throw new BadRequestException(
        'Các giá trị tiền trong payload không hợp lệ',
      );
    }
  }

  private buildWebhookResponse(
    order: Awaited<ReturnType<OrdersService['findWebhookOrder']>>,
    created: boolean,
  ) {
    return {
      message: created
        ? 'Tiếp nhận đơn hàng từ webhook thành công'
        : 'Đơn hàng đã tồn tại, không tạo bản ghi trùng',
      created,
      idempotent: !created,
      order,
    };
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  /**
   * Tạo đơn hàng mới (Dành cho Guest Storefront hoặc giỏ hàng)
   * Phân xử Attribution theo chuẩn FR-13: Coupon > Cookie (scanms_attr) > Fingerprint (24h) > Organic
   */
  async createOrder(
    dto: CreateOrderDto,
    clientContext?: {
      cookieAttr?: string;
      ip?: string;
      userAgent?: string;
    },
  ) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    // 0. Kiểm tra Idempotency chống đặt đơn trùng lặp (Issue 3 & 4)
    if (!dto.idempotencyKey || !dto.idempotencyKey.trim()) {
      throw new BadRequestException('Thiếu idempotencyKey cho phiên đặt hàng.');
    }

    const existingOrder = await this.prisma.order.findUnique({
      where: { idempotencyKey: dto.idempotencyKey.trim() },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                sku: true,
                imageUrl: true,
                categoryName: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        attributedCollaborator: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    if (existingOrder) {
      return {
        message: 'Đơn hàng đã được ghi nhận thành công (Idempotent replay)',
        order: existingOrder,
      };
    }

    // 1. Xác định Store
    let store: any = null;
    if (dto.storeId) {
      store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
      });
    } else if (dto.storeSlug) {
      store = await this.prisma.store.findUnique({
        where: { slug: dto.storeSlug },
      });
    } else {
      store = await this.prisma.store.findFirst({
        where: { isDeleted: false },
      });
    }

    if (!store) {
      throw new NotFoundException('Không tìm thấy gian hàng tương ứng');
    }

    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!jwtSecret || !jwtSecret.trim()) {
      throw new InternalServerErrorException(
        'Cấu hình JWT_SECRET bị thiếu trong hệ thống!',
      );
    }

    // 2. Lấy danh sách sản phẩm từ DB và xác thực tính hợp lệ
    const productIds = dto.items.map((i) => i.productId);
    const dbProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        storeId: store.id,
        isDeleted: false,
        isActive: true,
      },
    });

    if (dbProducts.length !== dto.items.length) {
      throw new BadRequestException(
        'Một hoặc nhiều sản phẩm trong giỏ hàng không tồn tại, đã ngừng kinh doanh hoặc không thuộc gian hàng này.',
      );
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let rawSubtotalAmount = 0;
    let anyProductHasDirectDiscount = false;
    for (const item of dto.items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        throw new BadRequestException(
          `Sản phẩm ${item.productId} không hợp lệ.`,
        );
      }
      const unitPrice = Number(prod.price);
      rawSubtotalAmount += unitPrice * item.quantity;

      if (prod.originalPrice && Number(prod.originalPrice) > unitPrice) {
        anyProductHasDirectDiscount = true;
      }
    }

    // 3. Pre-validate Coupon nếu client có gửi mã (để phản hồi lỗi sớm trước khi mở transaction)
    let couponValidationResult: any = null;
    if (dto.couponCode?.trim()) {
      couponValidationResult = await this.couponsService.validateCoupon(
        {
          code: dto.couponCode.trim(),
          storeId: store.id,
          customerPhone: dto.customerPhone,
          items: dto.items,
          hasProductDiscount:
            dto.hasProductDiscount || anyProductHasDirectDiscount,
          hasShopVoucher: dto.hasShopVoucher,
          hasPlatformVoucher: dto.hasPlatformVoucher,
        },
        undefined,
        undefined,
        undefined,
      );
    }

    // Sinh mã đơn hàng chuẩn định danh
    const externalOrderSn = `DH-${new Date().getFullYear()}-${Math.floor(
      10000 + Math.random() * 90000,
    )}`;

    // Save attribution and coupon snapshots atomically; FR-21 creates commissions after delivery.
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      let shopFundedAmount = 0;
      let platformFundedAmount = 0;
      let appliedDiscountAmount = 0;

      // 4.1 Khóa và kiểm tra trạng thái gian hàng trong Transaction (Issue 7)
      const lockedStore = await tx.store.findUnique({
        where: { id: store.id },
      });
      if (!lockedStore || lockedStore.deletedAt || lockedStore.isDeleted) {
        throw new BadRequestException(
          'Gian hàng không tồn tại hoặc đã ngừng kinh doanh.',
        );
      }

      // 6.1 Khóa hàng và kiểm tra toàn diện quy tắc Coupon trong Transaction (Issue 2 & 3)
      if (couponValidationResult) {
        // Khóa độc quyền hàng Coupon trên cơ sở dữ liệu
        await tx.$queryRaw`
          SELECT id FROM coupons
          WHERE id = ${couponValidationResult.couponId}::uuid
          FOR UPDATE
        `;

        const lockedCoupon = await tx.coupon.findUnique({
          where: { id: couponValidationResult.couponId },
          include: {
            couponProducts: true,
            couponCategories: true,
          },
        });

        if (!lockedCoupon) {
          throw new ConflictException('Mã giảm giá không tồn tại');
        }

        if (lockedCoupon.status !== CouponStatus.ACTIVE) {
          throw new ConflictException(
            'Mã giảm giá không còn ở trạng thái hiệu lực',
          );
        }

        // Kiểm tra thời hạn hiệu lực trong transaction (Issue 3)
        const now = new Date();
        if (lockedCoupon.startsAt && now < lockedCoupon.startsAt) {
          throw new ConflictException('Mã giảm giá chưa đến thời điểm áp dụng');
        }
        if (lockedCoupon.expiresAt && now > lockedCoupon.expiresAt) {
          throw new ConflictException('Mã giảm giá đã hết hạn sử dụng');
        }

        // Kiểm tra chính sách cộng dồn trong transaction (Issue 3)
        if (
          !lockedCoupon.stackableWithProductDiscount &&
          (dto.hasProductDiscount || anyProductHasDirectDiscount)
        ) {
          throw new ConflictException(
            'Mã giảm giá này không được áp dụng đồng thời với sản phẩm đang giảm giá trực tiếp',
          );
        }
        if (!lockedCoupon.stackableWithShopVoucher && dto.hasShopVoucher) {
          throw new ConflictException(
            'Mã giảm giá này không được cộng dồn với voucher khác của Shop',
          );
        }
        if (
          !lockedCoupon.stackableWithPlatformVoucher &&
          dto.hasPlatformVoucher
        ) {
          throw new ConflictException(
            'Mã giảm giá này không được cộng dồn với voucher toàn sàn SCANMS',
          );
        }

        // Kiểm tra phạm vi áp dụng sản phẩm/danh mục/chiến dịch trong transaction (Issue 3)
        let campaignProductIds = new Set<string>();
        if (lockedCoupon.scopeType === 'CAMPAIGN' && lockedCoupon.campaignId) {
          const campProds = await tx.campaignProduct.findMany({
            where: { campaignId: lockedCoupon.campaignId },
            select: { productId: true },
          });
          campaignProductIds = new Set(campProds.map((cp) => cp.productId));
        }

        let eligibleSubtotalInTx = 0;
        for (const item of dto.items) {
          const prod = productMap.get(item.productId)!;
          const unitPrice = Number(prod.price);
          let isItemEligible = false;

          if (lockedCoupon.scopeType === 'STORE_WIDE') {
            isItemEligible = true;
          } else if (lockedCoupon.scopeType === 'PRODUCTS') {
            isItemEligible = lockedCoupon.couponProducts.some(
              (cp) => cp.productId === prod.id,
            );
          } else if (lockedCoupon.scopeType === 'CATEGORIES') {
            const prodCategory = (prod.categoryName || '').toLowerCase();
            isItemEligible = lockedCoupon.couponCategories.some(
              (cc) => cc.categoryName.toLowerCase() === prodCategory,
            );
          } else if (lockedCoupon.scopeType === 'CAMPAIGN') {
            isItemEligible =
              campaignProductIds.size > 0
                ? campaignProductIds.has(prod.id)
                : true;
          }

          if (isItemEligible) {
            eligibleSubtotalInTx += unitPrice * item.quantity;
          }
        }

        if (eligibleSubtotalInTx <= 0) {
          throw new ConflictException(
            'Không có sản phẩm nào trong giỏ hàng đủ điều kiện áp dụng mã giảm giá này',
          );
        }

        // Kiểm tra đơn tối thiểu trong transaction (Issue 3)
        if (
          lockedCoupon.minimumOrderAmount &&
          eligibleSubtotalInTx < Number(lockedCoupon.minimumOrderAmount)
        ) {
          throw new ConflictException(
            `Đơn hàng chưa đạt giá trị tối thiểu ${Number(
              lockedCoupon.minimumOrderAmount,
            ).toLocaleString('vi-VN')} ₫ để áp dụng mã này`,
          );
        }

        // Tính toán lại giá trị giảm giá chính xác theo cấu hình mới nhất trong transaction (Issue 3)
        let txDiscount = 0;
        if (lockedCoupon.discountType === 'PERCENTAGE') {
          txDiscount = Math.round(
            eligibleSubtotalInTx * (Number(lockedCoupon.discountValue) / 100),
          );
          if (lockedCoupon.maximumDiscountAmount) {
            txDiscount = Math.min(
              txDiscount,
              Number(lockedCoupon.maximumDiscountAmount),
            );
          }
        } else {
          txDiscount = Math.min(
            eligibleSubtotalInTx,
            Number(lockedCoupon.discountValue),
          );
        }
        txDiscount = Math.max(0, txDiscount);

        // Kiểm tra quota tổng trong transaction
        if (
          lockedCoupon.usageLimitTotal !== null &&
          lockedCoupon.usageCount >= lockedCoupon.usageLimitTotal
        ) {
          throw new ConflictException(
            'Mã giảm giá đã đạt giới hạn lượt sử dụng',
          );
        }

        // Kiểm tra ngân sách tổng trong transaction
        if (lockedCoupon.budgetTotal !== null) {
          const currentBudgetUsed = Number(lockedCoupon.budgetUsed);
          const totalBudget = Number(lockedCoupon.budgetTotal);
          if (currentBudgetUsed + txDiscount > totalBudget) {
            throw new ConflictException(
              'Mã giảm giá đã vượt quá ngân sách cho phép',
            );
          }
        }

        // Kiểm tra quota trên từng khách hàng trong transaction
        if (dto.customerPhone?.trim()) {
          const customerPhone = dto.customerPhone.trim();
          const customerRedemptionCount = await tx.couponRedemption.count({
            where: {
              couponId: lockedCoupon.id,
              customerPhone,
              status: {
                in: [
                  CouponRedemptionStatus.USED,
                  CouponRedemptionStatus.RESERVED,
                ],
              },
            },
          });
          if (customerRedemptionCount >= lockedCoupon.usageLimitPerCustomer) {
            throw new ConflictException(
              `Khách hàng đã sử dụng tối đa ${lockedCoupon.usageLimitPerCustomer} lượt cho mã này.`,
            );
          }
        }

        // Cập nhật tăng atomic quota và ngân sách theo giá trị giảm giá đã xác minh trong tx
        await tx.coupon.update({
          where: { id: lockedCoupon.id },
          data: {
            usageCount: { increment: 1 },
            budgetUsed: { increment: txDiscount },
          },
        });

        // Tính phân bổ tỷ lệ đồng tài trợ
        const shopRate = Number(lockedCoupon.shopFundingRate || 100) / 100;
        const platformRate =
          Number(lockedCoupon.platformFundingRate || 0) / 100;
        shopFundedAmount = Math.round(txDiscount * shopRate);
        platformFundedAmount = txDiscount - shopFundedAmount;

        appliedDiscountAmount = txDiscount;
      }

      // 4.2 Nhận diện ứng viên Attribution TRONG TRANSACTION (Issue 6 & 7)
      let candidateCookieCollaboratorId: string | null = null;
      let candidateCookieReferralLinkId: string | null = null;
      let candidateCookieSessionId: string | null = null;
      let candidateCookieClickId: string | null = null;
      let candidateCookieClickedAt: Date | null = null;
      let candidateVia: string = 'LINK';

      // (A) Đọc Cookie scanms_attr / scanms_attribution (Opaque Visitor Token & Database AttributionSession)
      let hasStoreCookieTracking = false;
      if (clientContext?.cookieAttr?.trim()) {
        const cookieStr = clientContext.cookieAttr.trim();
        const visitorId = verifyOpaqueVisitorToken(cookieStr, jwtSecret);

        if (visitorId) {
          const visitorIdHash = crypto
            .createHmac('sha256', jwtSecret)
            .update(visitorId)
            .digest('hex');

          const session = await tx.attributionSession.findUnique({
            where: {
              storeId_visitorIdHash: {
                storeId: lockedStore.id,
                visitorIdHash,
              },
            },
          });

          if (session) {
            hasStoreCookieTracking = true;
          }

          if (
            session &&
            session.status === 'ACTIVE' &&
            new Date(session.expiresAt) > new Date()
          ) {
            const link = await tx.referralLink.findUnique({
              where: { id: session.referralLinkId },
              include: { collaborator: true },
            });

            // Kiểm tra toàn diện trạng thái link tại checkout (Issue 7):
            // - Link không bị xóa mềm
            // - Status phải là ACTIVE (loại bỏ BLOCKED, PAUSED)
            // - Chưa hết hạn (expiresAt > now)
            // - Link thuộc đúng Store trong database
            // - KOL còn hoạt động
            // - Quan hệ StoreCollaborator được APPROVED
            if (
              link &&
              !link.deletedAt &&
              link.status === ReferralLinkStatus.ACTIVE &&
              (!link.expiresAt || new Date(link.expiresAt) > new Date()) &&
              link.storeId === lockedStore.id &&
              link.collaborator?.isActive
            ) {
              const storeCollab = await tx.storeCollaborator.findFirst({
                where: {
                  storeId: lockedStore.id,
                  collaboratorId: link.collaboratorId,
                  status: StoreCollaboratorStatus.APPROVED,
                },
              });

              if (storeCollab) {
                // Lấy collaboratorId trực tiếp từ link trong DB (không tin cookie/client)
                candidateCookieCollaboratorId = link.collaboratorId;
                candidateCookieReferralLinkId = link.id;
                candidateCookieSessionId = session.id;
                candidateCookieClickId = session.latestClickId;
                candidateCookieClickedAt = session.lastClickedAt;
                candidateVia = 'LINK';
              }
            }
          }
        } else {
          // Tương thích ngược: Thử giải mã token Multi-Shop định dạng cũ
          const legacyDecoded = verifyMultiShopAttributionToken(
            cookieStr,
            jwtSecret,
          );
          if (legacyDecoded?.shops?.[lockedStore.id]) {
            hasStoreCookieTracking = true;
            const shopEntry = legacyDecoded.shops[lockedStore.id];
            if (new Date(shopEntry.expiresAt) > new Date()) {
              const link = await tx.referralLink.findUnique({
                where: { id: shopEntry.referralLinkId },
                include: { collaborator: true },
              });

              if (
                link &&
                !link.deletedAt &&
                link.status === ReferralLinkStatus.ACTIVE &&
                (!link.expiresAt || new Date(link.expiresAt) > new Date()) &&
                link.storeId === lockedStore.id &&
                link.collaborator?.isActive
              ) {
                const storeCollab = await tx.storeCollaborator.findFirst({
                  where: {
                    storeId: lockedStore.id,
                    collaboratorId: link.collaboratorId,
                    status: StoreCollaboratorStatus.APPROVED,
                  },
                });

                if (storeCollab) {
                  candidateCookieCollaboratorId = link.collaboratorId;
                  candidateCookieReferralLinkId = link.id;
                  candidateCookieSessionId = shopEntry.sessionId;
                  candidateCookieClickId = null;
                  candidateCookieClickedAt = shopEntry.clickedAt
                    ? new Date(shopEntry.clickedAt)
                    : null;
                  candidateVia = shopEntry.via || 'LINK';
                }
              }
            }
          }
        }
      }

      // (B) Ứng viên Fingerprint Fallback 24 giờ với kiểm tra mơ hồ (Issue 8)
      // Chỉ áp dụng khi KHÔNG có Cookie attribution cho gian hàng này
      let candidateFpCollaboratorId: string | null = null;
      let candidateFpReferralLinkId: string | null = null;
      let candidateFpClickId: string | null = null;
      let candidateFpClickedAt: Date | null = null;
      let isAmbiguousFingerprint = false;

      if (
        !hasStoreCookieTracking &&
        !candidateCookieCollaboratorId &&
        clientContext?.ip
      ) {
        const fingerprintHash = generateDeviceFingerprint(
          clientContext.ip,
          clientContext.userAgent || '',
          jwtSecret,
        );
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentClicks = await tx.clickTrafficLog.findMany({
          where: {
            storeId: lockedStore.id,
            fingerprintHash,
            isValid: true,
            createdAt: { gte: twentyFourHoursAgo },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            referralLink: {
              include: { collaborator: true },
            },
          },
        });

        const validRecentClicks: typeof recentClicks = [];
        for (const click of recentClicks) {
          if (
            click.referralLink &&
            !click.referralLink.deletedAt &&
            click.referralLink.status === ReferralLinkStatus.ACTIVE &&
            (!click.referralLink.expiresAt ||
              new Date(click.referralLink.expiresAt) > new Date()) &&
            click.referralLink.storeId === lockedStore.id &&
            click.referralLink.collaborator?.isActive
          ) {
            const storeCollab = await tx.storeCollaborator.findFirst({
              where: {
                storeId: lockedStore.id,
                collaboratorId: click.referralLink.collaboratorId,
                status: StoreCollaboratorStatus.APPROVED,
              },
            });
            if (storeCollab) {
              validRecentClicks.push(click);
            }
          }
        }

        const distinctCollabIds = Array.from(
          new Set(validRecentClicks.map((c) => c.referralLink.collaboratorId)),
        );

        if (distinctCollabIds.length > 1) {
          // Nhiều KOL cùng chung fingerprint trong 24h -> Mơ hồ, không tự ý gán bản ghi gần nhất (Issue 8)
          isAmbiguousFingerprint = true;
        } else if (distinctCollabIds.length === 1) {
          const matchedClick = validRecentClicks[0];
          candidateFpCollaboratorId = distinctCollabIds[0];
          candidateFpReferralLinkId = matchedClick.referralLinkId;
          candidateFpClickId = matchedClick.id;
          candidateFpClickedAt = matchedClick.createdAt;
        }
      }

      // (C) Phân xử thứ tự ưu tiên Attribution: P1 (Coupon) > P2 (Cookie) > P3 (Fingerprint) > P4 (Organic)
      let attributedCollaboratorId: string | null = null;
      let attributionMethod: AttributionMethod = AttributionMethod.ORGANIC;
      let referralLinkId: string | null = null;
      let attributionSessionId: string | null = null;
      let clickId: string | null = null;
      let clickedAt: Date | null = null;
      let attributionConfidence: string = 'ORGANIC';
      let overrideReason: string | null = null;
      let originalAttributionMethod: AttributionMethod | null = null;
      let originalCollaboratorId: string | null = null;

      // P1: Coupon KOL hợp lệ
      if (couponValidationResult && couponValidationResult.collaboratorId) {
        attributedCollaboratorId = couponValidationResult.collaboratorId;
        attributionMethod = AttributionMethod.COUPON;
        attributionConfidence = 'HIGH';
        referralLinkId =
          candidateCookieReferralLinkId || candidateFpReferralLinkId || null;
        attributionSessionId = candidateCookieSessionId || null;
        clickId = candidateCookieClickId || candidateFpClickId || null;
        clickedAt = candidateCookieClickedAt || candidateFpClickedAt || null;

        if (
          candidateCookieCollaboratorId &&
          candidateCookieCollaboratorId !==
            couponValidationResult.collaboratorId
        ) {
          originalCollaboratorId = candidateCookieCollaboratorId;
          originalAttributionMethod = AttributionMethod.COOKIE;
          overrideReason = 'COUPON_OVERRIDE_COOKIE';
        } else if (
          candidateFpCollaboratorId &&
          candidateFpCollaboratorId !== couponValidationResult.collaboratorId
        ) {
          originalCollaboratorId = candidateFpCollaboratorId;
          originalAttributionMethod = AttributionMethod.FINGERPRINT;
          overrideReason = 'COUPON_OVERRIDE_FINGERPRINT';
        }
      }
      // P2: Cookie Last-Click hợp lệ
      else if (candidateCookieCollaboratorId && candidateCookieReferralLinkId) {
        attributedCollaboratorId = candidateCookieCollaboratorId;
        attributionMethod = AttributionMethod.COOKIE;
        referralLinkId = candidateCookieReferralLinkId;
        attributionSessionId = candidateCookieSessionId;
        clickId = candidateCookieClickId;
        clickedAt = candidateCookieClickedAt;
        attributionConfidence = 'HIGH';
      }
      // P3: Fingerprint Fallback 24h
      else if (candidateFpCollaboratorId && candidateFpReferralLinkId) {
        attributedCollaboratorId = candidateFpCollaboratorId;
        attributionMethod = AttributionMethod.FINGERPRINT;
        referralLinkId = candidateFpReferralLinkId;
        clickId = candidateFpClickId;
        clickedAt = candidateFpClickedAt;
        attributionConfidence = 'MEDIUM';
        overrideReason = 'FINGERPRINT_FALLBACK_24H';
      }
      // P4: Organic / Unattributed / Ambiguous
      else {
        attributedCollaboratorId = null;
        attributionMethod = AttributionMethod.ORGANIC;
        referralLinkId = null;
        attributionConfidence = isAmbiguousFingerprint
          ? 'AMBIGUOUS'
          : 'ORGANIC';
        if (isAmbiguousFingerprint) {
          overrideReason = 'ATTRIBUTION_AMBIGUOUS_MULTIPLE_KOLS';
        }
      }

      // 4.3 Lấy thông tin cấp bậc Tier của KOL trong Transaction
      let extraTierRate = 0;
      if (attributedCollaboratorId) {
        const collabProfile = await tx.collaboratorProfile.findUnique({
          where: { userId: attributedCollaboratorId },
          include: { tier: true },
        });
        if (collabProfile?.tier?.extraBonusPercentage) {
          extraTierRate = Number(collabProfile.tier.extraBonusPercentage);
        }
      }

      // 4.4 Tính toán phân bổ Hoa hồng & Chi tiết Order Items trong Transaction
      const subtotalAmount = rawSubtotalAmount;
      const txDiscountRatio =
        subtotalAmount > 0
          ? (subtotalAmount - appliedDiscountAmount) / subtotalAmount
          : 1;

      let finalCommissionAmountToUse = 0;
      const finalOrderItemsToSave: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        appliedCommissionRate: number;
        calculatedCommissionAmount: number;
      }> = [];

      for (const item of dto.items) {
        const prod = productMap.get(item.productId)!;
        const unitPrice = Number(prod.price);
        const quantity = item.quantity;
        const baseCommissionRate = prod.customCommissionRate
          ? Number(prod.customCommissionRate)
          : Number(lockedStore.defaultCommissionRate || 10);

        const finalCommissionRate = baseCommissionRate + extraTierRate;
        const itemSubtotal = unitPrice * quantity;
        const netItemSubtotal = itemSubtotal * txDiscountRatio;
        const calculatedCommission =
          netItemSubtotal * (finalCommissionRate / 100);

        finalCommissionAmountToUse += calculatedCommission;
        finalOrderItemsToSave.push({
          productId: prod.id,
          quantity,
          unitPrice,
          appliedCommissionRate: finalCommissionRate,
          calculatedCommissionAmount: calculatedCommission,
        });
      }

      const orderFinalAmount = Math.max(
        0,
        subtotalAmount - appliedDiscountAmount,
      );
      const cancellationToken = randomUUID();

      const snapshotPayload = {
        attributionType: attributionMethod,
        storeId: lockedStore.id,
        collaboratorId: attributedCollaboratorId,
        referralLinkId: referralLinkId || null,
        sessionId: attributionSessionId || null,
        clickId: clickId || null,
        attributedAt: attributedCollaboratorId
          ? new Date().toISOString()
          : null,
        clickedAt: clickedAt ? clickedAt.toISOString() : null,
        attributionWindowDays: lockedStore.attributionWindowDays || 30,
        via: candidateVia || 'LINK',
        confidence: attributionConfidence,
        overrideReason: overrideReason || null,
        originalAttributionMethod: originalAttributionMethod || null,
        originalCollaboratorId: originalCollaboratorId || null,
        couponCode: couponValidationResult?.code || null,
      };

      // 6.2 Lưu đơn hàng kèm đầy đủ snapshot coupon & attribution & idempotencyKey (Issue 3 & 4)
      const order = await tx.order.create({
        data: {
          storeId: store.id,
          externalOrderSn,
          idempotencyKey: dto.idempotencyKey?.trim() || null,
          cancellationToken,
          attributedCollaboratorId,
          attributionMethod,
          referralLinkId,
          attributionSessionId: attributionSessionId || null,
          clickId: clickId || null,
          attributionConfidence,
          attributionSnapshot: snapshotPayload,
          attributedAt: attributedCollaboratorId ? new Date() : null,
          clickedAt: clickedAt || null,
          couponId: couponValidationResult?.couponId || null,
          couponCodeSnapshot: couponValidationResult?.code || null,
          couponDiscountAmount: appliedDiscountAmount,
          overrideReason,
          originalAttributionMethod,
          originalCollaboratorId,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress,
          subtotalAmount,
          discountAmount: appliedDiscountAmount,
          finalAmount: orderFinalAmount,
          status: OrderStatus.PENDING,
          orderItems: {
            create: finalOrderItemsToSave.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              appliedCommissionRate: item.appliedCommissionRate,
              calculatedCommissionAmount: item.calculatedCommissionAmount,
            })),
          },
        },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  sku: true,
                  imageUrl: true,
                  categoryName: true,
                },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
          attributedCollaborator: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      // 6.3 Ghi nhận bản ghi Coupon Redemption (Issue 7: Phân bổ tài trợ rõ ràng)
      if (couponValidationResult) {
        await tx.couponRedemption.create({
          data: {
            couponId: couponValidationResult.couponId,
            orderId: order.id,
            collaboratorId: couponValidationResult.collaboratorId,
            storeId: couponValidationResult.storeId,
            customerPhone: dto.customerPhone || null,
            status: CouponRedemptionStatus.USED,
            discountAmount: new Prisma.Decimal(appliedDiscountAmount),
            shopFundedAmount: new Prisma.Decimal(shopFundedAmount),
            platformFundedAmount: new Prisma.Decimal(platformFundedAmount),
            eligibleSubtotal: new Prisma.Decimal(
              couponValidationResult.eligibleSubtotal,
            ),
            couponCodeSnapshot: couponValidationResult.code,
            discountTypeSnapshot: couponValidationResult.discountType,
            discountValueSnapshot: new Prisma.Decimal(
              couponValidationResult.discountValue,
            ),
          },
        });
      }

      // FR-21 owns commission creation and wallet credits after delivery.
      if (referralLinkId) {
        await tx.referralLink.update({
          where: { id: referralLinkId },
          data: { totalOrders: { increment: 1 } },
        });
      }

      return order;
    });

    return {
      message: 'Đặt hàng thành công!',
      order: createdOrder,
      cancellationToken: (createdOrder as any).cancellationToken || undefined,
    };
  }

  /**
   * Hủy đơn hàng an toàn cho người dùng đã xác thực (Admin, Chủ Shop, Người mua sở hữu đơn) (Issue 2 & 4)
   */
  async cancelOrder(
    orderId: string,
    dto: CancelOrderDto,
    currentUser: { id: string; role: UserRole },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    // Phân quyền hủy đơn (Issue 2)
    const isAdmin =
      currentUser.role === UserRole.SYSTEM_ADMIN ||
      currentUser.role === UserRole.SYSTEM_MANAGER;

    if (!isAdmin) {
      if (currentUser.role === UserRole.SHOP_MANAGER) {
        if (order.store.ownerId !== currentUser.id) {
          throw new ForbiddenException(
            'Bạn không phải chủ sở hữu gian hàng chứa đơn hàng này',
          );
        }
      } else {
        throw new ForbiddenException(
          'Chỉ Quản trị viên hoặc Chủ gian hàng mới có quyền hủy đơn tại cổng này. Khách hàng vui lòng dùng chức năng hủy đơn bằng số điện thoại.',
        );
      }
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xử lý (PENDING). Trạng thái hiện tại: ${order.status}`,
      );
    }

    return this.executeOrderCancellation(
      orderId,
      dto.reason || 'Người dùng yêu cầu hủy đơn',
      currentUser.id,
    );
  }

  /**
   * Khách mua hàng vãng lai yêu cầu hủy đơn (Xác thực bằng Cancellation Token + Số điện thoại + Rate Limit) (Issue 2)
   */
  async guestCancelOrder(
    orderId: string,
    dto: GuestCancelOrderDto,
    clientIp?: string,
  ) {
    // 1. Rate limit chống Brute-Force: Tối đa 5 lần thử trong 15 phút
    const rateLimitKey = `guest_cancel_${orderId}_${clientIp || 'unknown'}`;
    const isAllowed = await this.cacheService.checkRateLimit(
      rateLimitKey,
      5,
      900,
    );
    if (!isAllowed) {
      throw new HttpException(
        'Bạn đã thử hủy đơn quá nhiều lần. Vui lòng thử lại sau 15 phút.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    // 2. Xác thực bằng Cancellation Token được cấp bảo mật lúc tạo đơn
    if (
      !dto.cancellationToken ||
      !order.cancellationToken ||
      dto.cancellationToken.trim() !== order.cancellationToken.trim()
    ) {
      throw new ForbiddenException(
        'Mã xác thực hủy đơn (Cancellation Token) không chính xác',
      );
    }

    // 3. Xác thực kép cùng số điện thoại đặt hàng
    if (
      !dto.customerPhone ||
      !order.customerPhone ||
      dto.customerPhone.trim() !== order.customerPhone.trim()
    ) {
      throw new ForbiddenException(
        'Số điện thoại xác minh không khớp với số điện thoại đặt hàng',
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xử lý (PENDING). Trạng thái hiện tại: ${order.status}`,
      );
    }

    return this.executeOrderCancellation(
      orderId,
      dto.reason || 'Khách vãng lai yêu cầu hủy đơn',
    );
  }

  /**
   * Thực hiện hủy đơn, hoàn lại Coupon và thu hồi hoa hồng trong Transaction
   */
  private async executeOrderCancellation(
    orderId: string,
    reason?: string,
    actorId?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          commissions: true,
          referralLink: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Không thể hủy đơn hàng đang ở trạng thái ${order.status}`,
        );
      }

      // 1. Chuyển trạng thái đơn hàng sang CANCELLED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      // 2. Xử lý hoàn trả Coupon (Issue 4)
      const redemption = await tx.couponRedemption.findUnique({
        where: { orderId },
      });

      if (redemption && redemption.status === CouponRedemptionStatus.USED) {
        // Chuyển redemption status sang CANCELLED
        await tx.couponRedemption.update({
          where: { id: redemption.id },
          data: { status: CouponRedemptionStatus.CANCELLED },
        });

        // Hoàn lại usageCount và budgetUsed
        await tx.coupon.update({
          where: { id: redemption.couponId },
          data: {
            usageCount: { decrement: 1 },
            budgetUsed: { decrement: redemption.discountAmount },
          },
        });
      }

      // 3. Thu hồi hoa hồng (Clawback) của KOL
      if (order.attributedCollaboratorId) {
        for (const comm of order.commissions) {
          if (comm.status === CommissionStatus.PENDING) {
            await tx.commission.update({
              where: { id: comm.id },
              data: { status: CommissionStatus.REVERSED },
            });

            // Trừ lại số dư ví chờ của KOL sở hữu hoa hồng này
            await tx.wallet.update({
              where: { collaboratorId: comm.collaboratorId },
              data: {
                pendingBalance: { decrement: comm.commissionAmount },
              },
            });
          }
        }

        // Giảm totalOrders trên ReferralLink nếu có
        if (order.referralLinkId) {
          await tx.referralLink.update({
            where: { id: order.referralLinkId },
            data: { totalOrders: { decrement: 1 } },
          });
        }
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: actorId || null,
          action: 'ORDER_CANCELLED',
          details: {
            orderId,
            orderSn: order.externalOrderSn,
            reason: reason || 'Khách hủy hoặc Shop hủy',
            couponRedemptionReversed: !!redemption,
          },
        },
      });

      return {
        message: 'Đã hủy đơn hàng và hoàn trả ưu đãi thành công',
        order: updatedOrder,
      };
    });
  }

  /**
   * FR-17: Tra cứu tiến độ đơn hàng công khai bằng SĐT hoặc Mã đơn hàng
   */
  async trackOrderByPhoneOrSn(query: TrackOrderQueryDto) {
    const { phone, orderSn } = query;

    if (!phone?.trim() && !orderSn?.trim()) {
      throw new BadRequestException(
        'Vui lòng nhập số điện thoại hoặc mã đơn hàng để tra cứu tiến trình đơn hàng.',
      );
    }

    const whereConditions: any = {};
    if (phone?.trim()) {
      whereConditions.customerPhone = {
        contains: phone.trim(),
      };
    }
    if (orderSn?.trim()) {
      whereConditions.externalOrderSn = {
        contains: orderSn.trim(),
        mode: 'insensitive',
      };
    }

    const orders = await this.prisma.order.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                sku: true,
                imageUrl: true,
                categoryName: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
        attributedCollaborator: {
          select: {
            id: true,
            fullName: true,
          },
        },
        productReviews: true,
      },
    });

    // Thêm metadata Timeline cho từng đơn hàng
    const formattedOrders = orders.map((order) => {
      let timelineStep = 1;
      let statusLabel = 'Đã tiếp nhận đơn';
      let statusColor = '#B88E4F'; // Sand Gold

      switch (order.status) {
        case OrderStatus.PENDING:
          timelineStep = 1;
          statusLabel = 'Đã tiếp nhận • Đang chuẩn bị hàng';
          statusColor = '#B88E4F';
          break;
        case OrderStatus.SHIPPING:
          timelineStep = 2;
          statusLabel = 'Đang giao hàng (Đơn vị GHN / GHTK)';
          statusColor = '#2563EB';
          break;
        case OrderStatus.DELIVERED:
          timelineStep = 3;
          statusLabel = 'Giao hàng thành công • Khách đã nhận';
          statusColor = '#16A34A';
          break;
        case OrderStatus.COMPLETED:
          timelineStep = 4;
          statusLabel = 'Đơn hàng hoàn tất';
          statusColor = '#16A34A';
          break;
        case OrderStatus.CANCELLED:
          timelineStep = 0;
          statusLabel = 'Đơn hàng đã bị hủy';
          statusColor = '#DC2626';
          break;
        case OrderStatus.RETURNED:
          timelineStep = -1;
          statusLabel = 'Đơn hàng đã hoàn trả (Return & Refund)';
          statusColor = '#9333EA';
          break;
      }

      return {
        id: order.id,
        externalOrderSn: order.externalOrderSn,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        shippingAddress: order.shippingAddress,
        subtotalAmount: Number(order.subtotalAmount),
        discountAmount: Number(order.discountAmount),
        finalAmount: Number(order.finalAmount),
        status: order.status,
        statusLabel,
        statusColor,
        timelineStep,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        store: order.store,
        attributedCollaborator: order.attributedCollaborator,
        items: order.orderItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          productTitle: item.product.title,
          sku: item.product.sku,
          imageUrl: item.product.imageUrl,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.unitPrice) * item.quantity,
        })),
        reviews: order.productReviews,
      };
    });

    return {
      totalFound: formattedOrders.length,
      orders: formattedOrders,
    };
  }

  /**
   * FR-18: Gửi đánh giá 1-5 sao và nhận xét sau khi nhận hàng thành công
   */
  async addOrderReview(orderId: string, dto: CreateOrderReviewDto) {
    // 1. Kiểm tra đơn hàng tồn tại
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng yêu cầu');
    }

    // 2. Nghiệp vụ FR-18: Đơn hàng phải ở trạng thái DELIVERED hoặc COMPLETED mới được review
    if (
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'Chỉ có thể gửi đánh giá khi đơn hàng đã được giao nhận thành công (Trạng thái DELIVERED hoặc COMPLETED).',
      );
    }

    // 3. Kiểm tra sản phẩm có thuộc đơn hàng này không
    const itemInOrder = order.orderItems.find(
      (item) => item.productId === dto.productId,
    );
    if (!itemInOrder) {
      throw new BadRequestException(
        'Sản phẩm này không nằm trong danh mục sản phẩm của đơn hàng.',
      );
    }

    // 4. Chống gửi review trùng lặp cho cùng 1 sản phẩm trong 1 đơn hàng
    const existingReview = await this.prisma.productReview.findFirst({
      where: {
        orderId: order.id,
        productId: dto.productId,
      },
    });

    if (existingReview) {
      throw new BadRequestException(
        'Bạn đã gửi đánh giá cho sản phẩm này trong đơn hàng rồi.',
      );
    }

    // 5. Lưu đánh giá vào bảng product_reviews
    const review = await this.prisma.productReview.create({
      data: {
        orderId: order.id,
        productId: dto.productId,
        customerName:
          dto.customerName || order.customerName || 'Khách mua hàng',
        rating: dto.rating,
        comment: dto.comment,
        reviewImageUrl: dto.reviewImageUrl || null,
        isApproved: true,
      },
    });

    return {
      message: 'Cảm ơn bạn đã gửi đánh giá sản phẩm thành công!',
      review,
    };
  }
}
