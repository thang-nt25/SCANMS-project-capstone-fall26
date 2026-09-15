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
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { CreateOrderDto, PaymentMethod } from './dto/create-order.dto';
import { TrackOrderQueryDto } from './dto/track-order.dto';
import { CreateOrderReviewDto } from './dto/create-review.dto';
import {
  CancelOrderDto,
  GuestCancelOrderDto,
  RequestCancellationOtpDto,
} from './dto/cancel-order.dto';
import {
  OrderCreatedResponseDto,
  PublicOrderDetailResponseDto,
  PaymentWebhookDto,
} from './dto/order-response.dto';
import { CheckoutMetricsService } from './checkout-metrics.service';
import * as crypto from 'crypto';
import {
  OrderStatus,
  AttributionMethod,
  CommissionStatus,
  CouponStatus,
  CouponRedemptionStatus,
  UserRole,
  ReferralLinkStatus,
  StoreCollaboratorStatus,
  OrderSourcePlatform,
  ReviewStatus,
  Prisma,
} from '@prisma/client';
import {
  ExternalOrderPlatform,
  OrderWebhookDto,
} from './dto/order-webhook.dto';
import { OrderWebhookNormalizerService } from './normalizers/order-webhook-normalizer.service';
import { NormalizedExternalOrder } from './normalizers/external-order-normalizer.interface';

import { ConfigService } from '@nestjs/config';
import { WalletsService } from '../wallets/wallets.service';
import { CouponsService } from '../coupons/coupons.service';
import {
  normalizeCustomerPhone,
  validateOrderMoney,
  validateCustomerName,
  validateShippingAddress,
  validateOrderNotes,
  MAX_ORDER_ITEMS,
  computeOrderPayloadHash,
  generateCryptographicOrderSn,
  hashCancellationToken,
  verifyCancellationToken,
} from './order-input.utils';
import {
  createReviewToken,
  verifyReviewToken,
  verifyWebhookSecret,
} from './order-security.utils';
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

import { MailService } from '../auth/mail.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookNormalizer: OrderWebhookNormalizerService,
    private readonly couponsService: CouponsService,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
    private readonly walletsService: WalletsService,
    private readonly checkoutMetrics: CheckoutMetricsService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  /**
   * FR-19: Tiếp nhận đơn từ sàn ngoài theo cơ chế idempotent.
   * Việc tính hoa hồng và cập nhật ví thuộc FR-21, không được thực hiện tại đây.
   */
  async receiveWebhook(dto: OrderWebhookDto, secret?: string) {
    const store = await this.findWebhookStore(dto);
    verifyWebhookSecret(this.configService, store.id, dto.source, secret);
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

    const sourcePlatform = WEBHOOK_PLATFORM_MAP[normalizedOrder.platform];
    const logContext = `source=${dto.source}, externalOrderId=${normalizedOrder.externalOrderId}, storeId=${store.id}`;

    this.logger.log(`Received order webhook: ${logContext}`);

    const existingOrder = await this.findWebhookOrder(
      store.id,
      sourcePlatform,
      normalizedOrder.externalOrderId,
    );
    if (existingOrder) {
      // Creation is idempotent. Status synchronization requires a versioned event contract.
      this.logger.log(`Ignored duplicate order webhook: ${logContext}`);
      return this.buildWebhookResponse(
        await this.syncWebhookStatus(
          existingOrder,
          normalizedOrder,
          dto.payload,
        ),
        false,
      );
    }

    const resolvedItems = await this.resolveWebhookProducts(
      store.id,
      normalizedOrder,
    );
    const calculatedSubtotal = resolvedItems.reduce(
      (total, item) =>
        total.plus(new Prisma.Decimal(item.unitPrice).times(item.quantity)),
      new Prisma.Decimal(0),
    );
    const subtotalAmount = new Prisma.Decimal(
      normalizedOrder.subtotalAmount ?? calculatedSubtotal,
    );
    const finalAmount =
      normalizedOrder.totalAmount ??
      Prisma.Decimal.max(
        0,
        subtotalAmount.minus(normalizedOrder.discountAmount ?? 0),
      )
        .plus(normalizedOrder.shippingAmount ?? 0)
        .plus(normalizedOrder.taxAmount ?? 0)
        .toNumber();
    const discountAmount =
      normalizedOrder.discountAmount ??
      Prisma.Decimal.max(
        0,
        subtotalAmount
          .plus(normalizedOrder.shippingAmount ?? 0)
          .plus(normalizedOrder.taxAmount ?? 0)
          .minus(finalAmount),
      ).toNumber();
    validateOrderMoney(subtotalAmount.toNumber(), 'Tổng tiền hàng');
    validateOrderMoney(finalAmount, 'Tổng thanh toán');
    if (
      subtotalAmount.lessThan(discountAmount) ||
      !subtotalAmount
        .minus(discountAmount)
        .plus(normalizedOrder.shippingAmount ?? 0)
        .plus(normalizedOrder.taxAmount ?? 0)
        .toDecimalPlaces(2)
        .equals(finalAmount)
    )
      throw new BadRequestException(
        'Tổng thanh toán không khớp tiền hàng, giảm giá, phí giao hàng và thuế',
      );

    try {
      const createdOrder = await this.prisma.$transaction((tx) =>
        tx.order.create({
          data: {
            storeId: store.id,
            sourcePlatform,
            externalOrderSn: normalizedOrder.externalOrderId,
            rawPayload: dto.payload as Prisma.InputJsonValue,
            sourceUpdatedAt: normalizedOrder.eventAt,
            customerName: normalizedOrder.customerName,
            customerPhone: normalizedOrder.customerPhone
              ? normalizeCustomerPhone(normalizedOrder.customerPhone)
              : undefined,
            shippingAddress: normalizedOrder.shippingAddress,
            subtotalAmount,
            discountAmount,
            finalAmount,
            status: normalizedOrder.status,
            completedAt: normalizedOrder.receivedAt,
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
          return this.buildWebhookResponse(
            await this.syncWebhookStatus(
              concurrentOrder,
              normalizedOrder,
              dto.payload,
            ),
            false,
          );
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
    sourceUpdatedAt: true,
    completedAt: true,
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

  private async syncWebhookStatus(
    existing: NonNullable<
      Awaited<ReturnType<OrdersService['findWebhookOrder']>>
    >,
    normalized: NormalizedExternalOrder,
    payload: Record<string, unknown>,
  ) {
    if (!normalized.eventAt) return existing;
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM orders WHERE id = ${existing.id}::uuid FOR UPDATE`,
      );
      const current = await tx.order.findUniqueOrThrow({
        where: { id: existing.id },
        select: this.webhookOrderSelect,
      });
      if (
        current.sourceUpdatedAt &&
        current.sourceUpdatedAt >= normalized.eventAt!
      )
        return current;
      const transitions: Record<OrderStatus, OrderStatus[]> = {
        PENDING: [
          OrderStatus.PENDING,
          OrderStatus.SHIPPING,
          OrderStatus.DELIVERED,
          OrderStatus.COMPLETED,
          OrderStatus.CANCELLED,
          OrderStatus.RETURNED,
        ],
        SHIPPING: [
          OrderStatus.SHIPPING,
          OrderStatus.DELIVERED,
          OrderStatus.COMPLETED,
          OrderStatus.CANCELLED,
          OrderStatus.RETURNED,
        ],
        DELIVERED: [
          OrderStatus.DELIVERED,
          OrderStatus.COMPLETED,
          OrderStatus.RETURNED,
        ],
        COMPLETED: [OrderStatus.COMPLETED, OrderStatus.RETURNED],
        CANCELLED: [OrderStatus.CANCELLED],
        RETURNED: [OrderStatus.RETURNED],
      };
      if (!transitions[current.status].includes(normalized.status))
        throw new ConflictException(
          'Sự kiện không được phép lùi trạng thái đơn hàng',
        );
      // Refund amount changes are reconciled through the refund transaction, never silently overwritten.
      return tx.order.update({
        where: { id: current.id },
        data: {
          status: normalized.status,
          rawPayload: payload as Prisma.InputJsonValue,
          sourceUpdatedAt: normalized.eventAt,
          ...(normalized.receivedAt && !current.completedAt
            ? { completedAt: normalized.receivedAt }
            : {}),
        },
        select: this.webhookOrderSelect,
      });
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
    if (order.currency && order.currency.toUpperCase() !== 'VND')
      throw new BadRequestException('Hệ thống hiện chỉ tiếp nhận đơn bằng VND');
    if (order.items.length > MAX_ORDER_ITEMS)
      throw new BadRequestException('Đơn hàng có quá nhiều dòng sản phẩm');
    order.items.forEach((item) =>
      validateOrderMoney(item.unitPrice, 'Đơn giá'),
    );
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
      order.shippingAmount,
      order.taxAmount,
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
    amounts.forEach((amount) => {
      if (amount !== undefined) validateOrderMoney(amount, 'Số tiền');
    });
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
      legacyCookieRef?: string;
      ip?: string;
      userAgent?: string;
    },
  ) {
    // 0. Kiểm tra thông tin người nhận và giỏ hàng theo chuẩn FR-16
    const customerName = validateCustomerName(dto.customerName);
    const customerPhone = normalizeCustomerPhone(dto.customerPhone);
    const customerEmail = dto.customerEmail?.trim().toLowerCase() || null;
    const shippingAddress = validateShippingAddress(dto.shippingAddress);
    const orderNotes = validateOrderNotes(dto.orderNotes);

    if (!dto.items || !Array.isArray(dto.items) || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 sản phẩm');
    }
    for (const it of dto.items) {
      if (!it.productId || typeof it.productId !== 'string') {
        throw new BadRequestException('Mã sản phẩm không hợp lệ');
      }
      if (!it.quantity || !Number.isInteger(it.quantity) || it.quantity < 1) {
        throw new BadRequestException(
          'Số lượng sản phẩm phải là số nguyên lớn hơn hoặc bằng 1',
        );
      }
    }

    // 0.1 Kiểm tra Idempotency chống đặt đơn trùng lặp (Issue 3 & 4)
    if (!dto.idempotencyKey || !dto.idempotencyKey.trim()) {
      throw new BadRequestException('Thiếu idempotencyKey cho phiên đặt hàng.');
    }
    const cleanIdempotencyKey = dto.idempotencyKey.trim();

    const normalizedPaymentMethod = (dto.paymentMethod || PaymentMethod.COD).toUpperCase();
    const isVietQr = normalizedPaymentMethod === PaymentMethod.VIETQR;
    const currentPayloadHash = computeOrderPayloadHash(
      dto,
      customerName,
      customerPhone,
      normalizedPaymentMethod,
    );

    const existingOrder = await this.prisma.order.findUnique({
      where: { idempotencyKey: cleanIdempotencyKey },
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
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
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
      },
    });

    if (existingOrder) {
      const rawPayload =
        (existingOrder.rawPayload as Record<string, any>) || {};
      const existingHash = rawPayload.requestHash;

      // 0.2 So sánh toàn bộ payload canonical hash (Lỗi 2 & Quyết định Idempotency)
      if (existingHash) {
        if (existingHash !== currentPayloadHash) {
          this.checkoutMetrics.recordIdempotencyConflict(cleanIdempotencyKey);
          throw new ConflictException(
            'IDEMPOTENCY_CONFLICT: Khóa idempotencyKey đã tồn tại nhưng dữ liệu payload đơn hàng đã bị thay đổi.',
          );
        }
      } else {
        // Fallback kiểm tra cho các đơn cũ chưa lưu requestHash
        const existingItems = existingOrder.orderItems || [];
        const itemsMatch =
          existingItems.length === dto.items.length &&
          dto.items.every((it) =>
            existingItems.some(
              (ei) =>
                ei.productId === it.productId &&
                ei.quantity === it.quantity &&
                (it.variantId ? ei.variantId === it.variantId : true),
            ),
          );
        const phoneMatch =
          !existingOrder.customerPhone ||
          existingOrder.customerPhone.trim() === customerPhone.trim();
        const nameMatch =
          !existingOrder.customerName ||
          existingOrder.customerName.trim().toLowerCase() ===
            customerName.trim().toLowerCase();

        if (!itemsMatch || !phoneMatch || !nameMatch) {
          this.checkoutMetrics.recordIdempotencyConflict(cleanIdempotencyKey);
          throw new ConflictException(
            'IDEMPOTENCY_CONFLICT: Khóa idempotencyKey đã tồn tại nhưng dữ liệu giỏ hàng hoặc người nhận khác với đơn ban đầu.',
          );
        }
      }

      this.checkoutMetrics.recordIdempotentReplay();

      // Loại bỏ hoàn toàn trường nội bộ `order`, UUID và dữ liệu nhạy cảm PII khỏi public response (Lỗi 1)
      // Cung cấp cờ khôi phục OTP để khách hủy đơn khi response lần đầu timeout (Lỗi 2)
      return {
        message: 'Đơn hàng đã được ghi nhận thành công (Idempotent replay)',
        publicOrderCode: existingOrder.externalOrderSn,
        status: existingOrder.status,
        subtotalAmount: Number(existingOrder.subtotalAmount),
        discountAmount: Number(existingOrder.discountAmount),
        shippingFee: Number(existingOrder.shippingFee),
        shippingFeePolicy: 'NATIONWIDE_FREE_SHIPPING',
        finalAmount: Number(existingOrder.finalAmount),
        paymentMethod: rawPayload.paymentMethod || 'COD',
        paymentStatus: rawPayload.paymentStatus || 'UNPAID',
        vietqr: rawPayload.vietqr || null,
        canRequestCancellationOtp: true,
        cancellationRecovery: 'OTP_VERIFICATION_AVAILABLE',
        trackingUrl: `/tracking?sn=${existingOrder.externalOrderSn}`,
        confirmationEmailQueued: false,
        items: existingOrder.orderItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || undefined,
          title: item.product?.title || '',
          sku: item.product?.sku || '',
          imageUrl: item.product?.imageUrl || '',
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
        store: {
          name: existingOrder.store.name,
          slug: existingOrder.store.slug,
          logoUrl: existingOrder.store.logoUrl || undefined,
        },
      };
    }


    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!jwtSecret || !jwtSecret.trim()) {
      throw new InternalServerErrorException(
        'Cấu hình JWT_SECRET bị thiếu trong hệ thống!',
      );
    }

    // 1. Xác thực tính hợp lệ của sản phẩm và kiểm tra ranh giới Multi-merchant
    const productIds = dto.items.map((i) => i.productId);
    const dbProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isDeleted: false,
      },
      include: {
        store: true,
      },
    });

    if (dbProducts.length !== dto.items.length) {
      throw new BadRequestException(
        'Một hoặc nhiều sản phẩm trong giỏ hàng không tồn tại hoặc đã bị xóa.',
      );
    }

    for (const p of dbProducts) {
      if (!p.isActive) {
        throw new BadRequestException(
          `Sản phẩm "${p.title}" đã ngừng kinh doanh.`,
        );
      }
    }

    // Đảm bảo đơn hàng chỉ thuộc một gian hàng duy nhất (Multi-Merchant Isolation)
    const distinctStoreIds = Array.from(
      new Set(dbProducts.map((p) => p.storeId)),
    );
    if (distinctStoreIds.length > 1) {
      throw new BadRequestException(
        'MULTI_STORE_ORDER_NOT_ALLOWED: Đơn hàng chỉ được chứa sản phẩm của cùng một Gian hàng. Vui lòng tách đơn cho từng Shop.',
      );
    }

    const targetStore = dbProducts[0].store;
    if (!targetStore || targetStore.isDeleted || !targetStore.isActive) {
      throw new BadRequestException(
        'STORE_INACTIVE: Gian hàng của sản phẩm hiện không hoạt động hoặc đã bị đóng.',
      );
    }

    if (dto.storeId && dto.storeId !== targetStore.id) {
      throw new BadRequestException(
        'STORE_MISMATCH: Sản phẩm đã chọn không thuộc gian hàng được chỉ định.',
      );
    }

    const store = targetStore;


    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // 1.1 Hỗ trợ phân loại sản phẩm variant/SKU (Lỗi 4)
    const variantIds = dto.items
      .map((i) => i.variantId)
      .filter((v): v is string => Boolean(v && v.trim()));

    // PostgreSQL stores variant IDs as UUID. Reject malformed/client-only IDs
    // before Prisma builds the query so public checkout receives a safe 400
    // instead of leaking an internal database error as HTTP 500.
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (variantIds.some((variantId) => !uuidPattern.test(variantId))) {
      throw new BadRequestException(
        'VARIANT_NOT_FOUND: Mã phân loại sản phẩm không hợp lệ.',
      );
    }

    let dbVariants: any[] = [];
    if (variantIds.length > 0) {
      dbVariants = await this.prisma.productVariant.findMany({
        where: {
          id: { in: variantIds },
          isActive: true,
        },
      });
    }
    const variantMap = new Map(dbVariants.map((v) => [v.id, v]));

    let rawSubtotalAmount = 0;
    let anyProductHasDirectDiscount = false;
    for (const item of dto.items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        throw new BadRequestException(
          `Sản phẩm ${item.productId} không hợp lệ.`,
        );
      }
      let itemPrice = Number(prod.price);
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant || variant.productId !== prod.id) {
          throw new BadRequestException(
            `Phân loại sản phẩm (variant) ${item.variantId} không thuộc sản phẩm "${prod.title}" hoặc không tồn tại.`,
          );
        }
        if (variant.price) {
          itemPrice = Number(variant.price);
        }
      }
      rawSubtotalAmount += itemPrice * item.quantity;

      if (prod.originalPrice && Number(prod.originalPrice) > itemPrice) {
        anyProductHasDirectDiscount = true;
      }
    }

    // 3. Pre-validate Coupon nếu client có gửi mã (Backend tự tính toán cờ, không tin client)
    let couponValidationResult: Awaited<
      ReturnType<CouponsService['validateCoupon']>
    > | null = null;
    if (dto.couponCode?.trim()) {
      couponValidationResult = await this.couponsService.validateCoupon(
        {
          code: dto.couponCode.trim(),
          storeId: store.id,
          customerPhone: dto.customerPhone
            ? normalizeCustomerPhone(dto.customerPhone)
            : undefined,
          items: dto.items,
          hasProductDiscount: anyProductHasDirectDiscount,
          hasShopVoucher: false,
          hasPlatformVoucher: false,
        },
        undefined,
        undefined,
        undefined,
      );
    }

    // Sinh mã đơn hàng bằng mật mã an toàn chống đoán/trùng lặp
    const externalOrderSn = generateCryptographicOrderSn();

    // Save attribution and coupon snapshots atomically; FR-21 creates commissions after delivery.
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      let shopFundedAmount = 0;
      let platformFundedAmount = 0;
      let appliedDiscountAmount = 0;

      // 4.1 Khóa và kiểm tra trạng thái gian hàng trong Transaction (Issue 7 & Quyết định Multi-merchant)
      const lockedStore = await tx.store.findUnique({
        where: { id: store.id },
      });
      if (
        !lockedStore ||
        lockedStore.deletedAt ||
        lockedStore.isDeleted ||
        !lockedStore.isActive
      ) {
        throw new BadRequestException(
          'Gian hàng không tồn tại, đã tạm ngưng hoạt động hoặc đã ngừng kinh doanh.',
        );
      }

      // 4.2 Trừ kho an toàn: hỗ trợ tồn kho variant hoặc sản phẩm (Lỗi 4 & Quyết định 10)
      for (const item of dto.items) {
        const prod = productMap.get(item.productId)!;
        if (item.variantId) {
          const variant = variantMap.get(item.variantId);
          const updatedVarCount = await tx.$executeRaw`
            UPDATE product_variants
            SET stock_quantity = stock_quantity - ${item.quantity}, updated_at = NOW()
            WHERE id = ${item.variantId}::uuid
              AND stock_quantity >= ${item.quantity}
              AND is_active = true
          `;
          if (updatedVarCount === 0) {
            this.checkoutMetrics.recordStockAnomaly(item.productId, item.quantity, 0);
            throw new BadRequestException(
              `PRODUCT_OUT_OF_STOCK: Phân loại sản phẩm "${variant?.name || prod.title}" không đủ số lượng tồn kho (yêu cầu: ${item.quantity}).`,
            );
          }
        } else {
          const updatedCount = await tx.$executeRaw`
            UPDATE products
            SET stock_quantity = stock_quantity - ${item.quantity}, updated_at = NOW()
            WHERE id = ${item.productId}::uuid
              AND stock_quantity >= ${item.quantity}
              AND is_deleted = false
              AND is_active = true
          `;
          if (updatedCount === 0) {
            this.checkoutMetrics.recordStockAnomaly(item.productId, item.quantity, 0);
            throw new BadRequestException(
              `PRODUCT_OUT_OF_STOCK: Sản phẩm "${prod.title}" không đủ số lượng tồn kho (yêu cầu: ${item.quantity}).`,
            );
          }
        }
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

        // Kiểm tra chính sách cộng dồn: Backend tự xác thực trực tiếp (không tin cậy cờ từ client)
        if (
          !lockedCoupon.stackableWithProductDiscount &&
          anyProductHasDirectDiscount
        ) {
          throw new ConflictException(
            'Mã giảm giá này không được áp dụng đồng thời với sản phẩm đang giảm giá trực tiếp',
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

      // (A.2) Tương thích ngược: Nếu request có gửi cookie scanms_referral_link
      if (
        !candidateCookieCollaboratorId &&
        clientContext?.legacyCookieRef?.trim()
      ) {
        const refCodeOrId = clientContext.legacyCookieRef.trim();
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            refCodeOrId,
          );

        const link = await tx.referralLink.findFirst({
          where: {
            OR: [
              ...(isUuid ? [{ id: refCodeOrId }] : []),
              { shortCode: refCodeOrId },
            ],
            storeId: lockedStore.id,
            deletedAt: null,
            status: ReferralLinkStatus.ACTIVE,
          },
          include: { collaborator: true },
        });

        if (
          link &&
          (!link.expiresAt || new Date(link.expiresAt) > new Date()) &&
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
            hasStoreCookieTracking = true;
            candidateCookieCollaboratorId = link.collaboratorId;
            candidateCookieReferralLinkId = link.id;
            candidateCookieSessionId = null;
            candidateCookieClickId = null;
            candidateCookieClickedAt = new Date();
            candidateVia = 'LINK';
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

      const finalOrderItemsToSave: Array<{
        productId: string;
        variantId?: string | null;
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

        finalOrderItemsToSave.push({
          productId: prod.id,
          variantId: item.variantId || null,
          quantity,
          unitPrice,
          appliedCommissionRate: finalCommissionRate,
          calculatedCommissionAmount: calculatedCommission,
        });
      }

      // Chính sách phí vận chuyển rõ ràng: Miễn phí toàn quốc (Lỗi 7)
      const shippingFee = 0;
      const orderFinalAmount = Math.max(
        0,
        subtotalAmount - appliedDiscountAmount + shippingFee,
      );

      // Sinh và băm cancellation token an toàn trước khi lưu DB
      const rawCancellationToken = randomUUID();
      const hashedCancellationToken = hashCancellationToken(rawCancellationToken);

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

      const paymentMethod = normalizedPaymentMethod;
      let vietqrData: any = null;
      if (isVietQr) {
        const bankCode =
          this.configService.get<string>('VIETQR_BANK_CODE') ||
          process.env.VIETQR_BANK_CODE;
        const accountNumber =
          this.configService.get<string>('VIETQR_ACCOUNT_NUMBER') ||
          process.env.VIETQR_ACCOUNT_NUMBER;
        const accountName =
          this.configService.get<string>('VIETQR_ACCOUNT_NAME') ||
          process.env.VIETQR_ACCOUNT_NAME;

        if (!bankCode || !accountNumber || !accountName) {
          throw new InternalServerErrorException(
            'Cấu hình tài khoản nhận thanh toán VietQR của sàn chưa được thiết lập. Vui lòng liên hệ quản trị viên!',
          );
        }
        const memo = externalOrderSn;

        const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${orderFinalAmount}&addInfo=${encodeURIComponent(memo)}&accountName=${encodeURIComponent(accountName)}`;
        vietqrData = {
          bankCode,
          accountNumber,
          accountName,
          amount: orderFinalAmount,
          memo,
          qrUrl,
        };
      }

      // 6.2 Lưu đơn hàng (Không đưa clientIp, userAgent vào rawPayload - Lỗi 8)
      const order = await tx.order.create({
        data: {
          storeId: store.id,
          externalOrderSn,
          idempotencyKey: cleanIdempotencyKey,
          cancellationToken: hashedCancellationToken,
          shippingFee: new Prisma.Decimal(shippingFee),
          finalAmount: new Prisma.Decimal(orderFinalAmount),
          rawPayload: {
            orderNotes: orderNotes || null,
            paymentMethod,
            paymentStatus: isVietQr ? 'WAITING_PAYMENT' : 'UNPAID',
            vietqr: vietqrData,
            requestHash: currentPayloadHash,
          },
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
          customerName,
          customerPhone,
          customerEmail,
          shippingAddress,
          subtotalAmount,
          discountAmount: appliedDiscountAmount,
          status: OrderStatus.PENDING,
          orderItems: {
            create: finalOrderItemsToSave.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              appliedCommissionRate: item.appliedCommissionRate,
              calculatedCommissionAmount: item.calculatedCommissionAmount,
              commissionSnapshotAt: new Date(),
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
              variant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
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
        },
      });

      // 6.3 Ghi nhận bản ghi Coupon Redemption
      if (couponValidationResult) {
        await tx.couponRedemption.create({
          data: {
            couponId: couponValidationResult.couponId,
            orderId: order.id,
            collaboratorId: couponValidationResult.collaboratorId,
            storeId: couponValidationResult.storeId,
            customerPhone: customerPhone || null,
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

      if (referralLinkId) {
        await tx.referralLink.update({
          where: { id: referralLinkId },
          data: { totalOrders: { increment: 1 } },
        });
      }

      return { order, rawCancellationToken };
    });

    const raw = (createdOrder.order.rawPayload as Record<string, any>) || {};

    let confirmationEmailQueued = false;
    if (customerEmail && this.mailService) {
      confirmationEmailQueued = true;
      void this.mailService
        .sendOrderConfirmation({
          email: customerEmail,
          customerName,
          publicOrderCode: createdOrder.order.externalOrderSn,
          finalAmount: Number(createdOrder.order.finalAmount),
          paymentMethod: raw.paymentMethod || 'COD',
          storeName: createdOrder.order.store.name,
        })
        .catch((error: unknown) => {
          this.logger.error(
            `Không thể gửi email xác nhận đơn ${createdOrder.order.externalOrderSn}: ${this.getErrorMessage(error)}`,
          );
        });
    }

    return {
      message: 'Đặt hàng thành công!',
      publicOrderCode: createdOrder.order.externalOrderSn,
      status: createdOrder.order.status,
      subtotalAmount: Number(createdOrder.order.subtotalAmount),
      discountAmount: Number(createdOrder.order.discountAmount),
      shippingFee: Number(createdOrder.order.shippingFee),
      shippingFeePolicy: 'NATIONWIDE_FREE_SHIPPING',
      finalAmount: Number(createdOrder.order.finalAmount),
      paymentMethod: raw.paymentMethod || 'COD',
      paymentStatus: raw.paymentStatus || 'UNPAID',
      vietqr: raw.vietqr || null,
      cancellationToken: createdOrder.rawCancellationToken,
      trackingUrl: `/tracking?sn=${createdOrder.order.externalOrderSn}`,
      confirmationEmailQueued,
      items: createdOrder.order.orderItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        title: item.product?.title || '',
        sku: item.product?.sku || '',
        imageUrl: item.product?.imageUrl || '',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      store: {
        name: createdOrder.order.store.name,
        slug: createdOrder.order.store.slug,
        logoUrl: createdOrder.order.store.logoUrl || undefined,
      },
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
   * FR-16: Yêu cầu mã OTP hủy đơn công khai qua SMS/ZNS khi không còn cancellationToken (Lỗi 2)
   */
  async requestCancellationOtp(
    orderIdentifier: string,
    dto: RequestCancellationOtpDto,
    clientIp?: string,
  ) {
    if (process.env.NODE_ENV !== 'test') {
      const rateLimitKey = `orders:cancel_otp_req:${orderIdentifier}_${clientIp || 'unknown'}`;
      const isAllowed = await this.cacheService.checkRateLimit(
        rateLimitKey,
        3,
        900,
      ); // 3 lần/15 phút
      if (!isAllowed) {
        throw new HttpException(
          'Bạn đã yêu cầu gửi OTP quá nhiều lần. Vui lòng thử lại sau 15 phút.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        orderIdentifier,
      );
    if (isUuid) {
      throw new BadRequestException(
        'API công khai chỉ chấp nhận mã đơn hàng công khai (VD: DH-2026-XXXX).',
      );
    }

    const order = await this.prisma.order.findFirst({
      where: { externalOrderSn: orderIdentifier },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Không thể yêu cầu OTP cho đơn hàng đang ở trạng thái ${order.status}. Chỉ hỗ trợ đơn Chờ xử lý (PENDING).`,
      );
    }

    const inputPhone = normalizeCustomerPhone(dto.customerPhone);
    if (!order.customerPhone || inputPhone !== order.customerPhone.trim()) {
      throw new ForbiddenException(
        'Số điện thoại không khớp với số điện thoại đã đặt đơn hàng này.',
      );
    }

    // Sinh mã OTP 6 chữ số ngẫu nhiên
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Lưu hash OTP vào CacheService với TTL 300s (5 phút)
    await this.cacheService.set(`cancel_otp:${order.id}`, otpHash, 300);

    // Gửi OTP thực sự:
    // 1. Dispatch SMS/ZNS tới SĐT khách hàng
    if (this.mailService) {
      await this.mailService.sendOrderCancellationSms(inputPhone, otp, order.externalOrderSn);
    }
    // 2. Gửi Email nếu đơn hàng có customerEmail
    if (order.customerEmail && this.mailService) {
      await this.mailService.sendOrderCancellationOtp(order.customerEmail, otp, order.externalOrderSn);
    }

    this.logger.log(
      `[CANCELLATION_OTP] Dispatched OTP for order ${order.externalOrderSn} to phone ${inputPhone} and email ${order.customerEmail || 'N/A'}`,
    );

    return {
      message:
        'Mã xác thực hủy đơn (OTP) gồm 6 chữ số đã được gửi tới số điện thoại/email của bạn và có hiệu lực trong 5 phút.',
      expiresIn: 300,
      publicOrderCode: order.externalOrderSn,
      // Trong môi trường dev/test, trả về devOtp để kiểm thử tự động
      devOtp:
        process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development'
          ? otp
          : undefined,
    };
  }

  /**
   * Khách mua hàng vãng lai yêu cầu hủy đơn (Xác thực bằng Cancellation Token HOẶC OTP + Số điện thoại + Rate Limit) (FR-16 Mục 28, 31 & Lỗi 2)
   */
  async guestCancelOrder(
    orderIdentifier: string,
    dto: GuestCancelOrderDto,
    clientIp?: string,
  ) {
    // 1. Rate limit chống Brute-Force: Tối đa 5 lần thử trong 15 phút (bỏ qua trong môi trường test)
    if (process.env.NODE_ENV !== 'test') {
      const rateLimitKey = `guest_cancel_${orderIdentifier}_${clientIp || 'unknown'}`;
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
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        orderIdentifier,
      );
    if (isUuid) {
      throw new BadRequestException(
        'API công khai chỉ chấp nhận mã đơn hàng công khai (VD: DH-2026-XXXX), không sử dụng ID nội bộ.',
      );
    }
    const order = await this.prisma.order.findFirst({
      where: { externalOrderSn: orderIdentifier },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    // Idempotent: Nếu đơn đã hủy trước đó, trả kết quả thành công mà không trừ kho lần 2
    if (order.status === OrderStatus.CANCELLED) {
      return {
        message: 'Đơn hàng đã được hủy trước đó (Idempotent replay)',
        publicOrderCode: order.externalOrderSn,
        status: OrderStatus.CANCELLED,
      };
    }

    // 2. Xác thực số điện thoại đặt hàng (FR-16 Mục 28)
    const inputPhone = normalizeCustomerPhone(dto.customerPhone);
    if (!order.customerPhone || inputPhone !== order.customerPhone.trim()) {
      throw new ForbiddenException(
        'Số điện thoại xác minh không khớp với số điện thoại đặt hàng',
      );
    }

    // 3. Xác thực kép bằng Cancellation Token HOẶC mã OTP phục hồi an toàn (Lỗi 2)
    let credentialValid = false;

    // Kiểm tra cancellationToken nếu có
    if (dto.cancellationToken && order.cancellationToken) {
      if (verifyCancellationToken(dto.cancellationToken, order.cancellationToken)) {
        credentialValid = true;
      }
    }

    // Kiểm tra OTP nếu chưa hợp lệ và có cung cấp otp
    if (!credentialValid && dto.otp) {
      const storedOtpHash = await this.cacheService.get<string>(
        `cancel_otp:${order.id}`,
      );
      if (storedOtpHash) {
        const inputOtpHash = crypto
          .createHash('sha256')
          .update(dto.otp.trim())
          .digest('hex');
        const inputBuf = Buffer.from(inputOtpHash, 'utf8');
        const storedBuf = Buffer.from(storedOtpHash, 'utf8');
        if (
          inputBuf.length === storedBuf.length &&
          crypto.timingSafeEqual(inputBuf, storedBuf)
        ) {
          credentialValid = true;
          // Xóa OTP sau khi sử dụng thành công (One-time use)
          await this.cacheService.del(`cancel_otp:${order.id}`);
        }
      }
    }

    if (!credentialValid) {
      throw new ForbiddenException(
        'Mã xác thực hủy đơn (Cancellation Token hoặc mã OTP) không chính xác hoặc đã hết hạn',
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ có thể hủy đơn hàng khi đang ở trạng thái Chờ xử lý (PENDING). Trạng thái hiện tại: ${order.status}`,
      );
    }

    return this.executeOrderCancellation(
      order.id,
      dto.reason || 'Khách vãng lai yêu cầu hủy đơn',
    );
  }


  /**
   * Tra cứu thông tin chi tiết đơn hàng công khai cho khách (FR-16 Mục 27 & 28)
   */
  async getPublicOrderDetail(
    publicCode: string,
    phone?: string,
    token?: string,
  ) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        publicCode,
      );
    if (isUuid) {
      throw new BadRequestException(
        'API công khai chỉ chấp nhận mã đơn hàng công khai (VD: DH-2026-XXXX), không sử dụng ID nội bộ.',
      );
    }
    const order = await this.prisma.order.findFirst({
      where: { externalOrderSn: publicCode },
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
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
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
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng tương ứng.');
    }

    // Xác minh quyền truy cập: token hoặc số điện thoại trùng khớp (FR-16 Mục 28)
    let isAuthorized = false;
    if (
      token &&
      order.cancellationToken &&
      verifyCancellationToken(token, order.cancellationToken)
    ) {
      isAuthorized = true;
    } else if (phone && order.customerPhone) {
      const canonicalPhone = normalizeCustomerPhone(phone);
      if (canonicalPhone === order.customerPhone.trim()) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Yêu cầu cung cấp đúng số điện thoại đặt hàng hoặc mã token để tra cứu thông tin đơn hàng.',
      );
    }

    const raw = (order.rawPayload as Record<string, any>) || {};

    // Che số điện thoại bảo mật PII (FR-16 Mục 32): 098****321
    const rawPhone = order.customerPhone || '';
    const maskedPhone =
      rawPhone.length >= 7
        ? `${rawPhone.slice(0, 3)}****${rawPhone.slice(-3)}`
        : rawPhone;

    return {
      publicOrderCode: order.externalOrderSn,
      status: order.status,
      subtotalAmount: Number(order.subtotalAmount),
      discountAmount: Number(order.discountAmount),
      shippingFee: Number(order.shippingFee),
      finalAmount: Number(order.finalAmount),
      customerName: order.customerName || 'Khách mua hàng',
      customerPhone: maskedPhone,
      customerPhoneMasked: maskedPhone,
      shippingAddress: order.shippingAddress || '',
      orderNotes: raw.orderNotes || null,
      paymentMethod: raw.paymentMethod || 'COD',
      paymentStatus: raw.paymentStatus || 'UNPAID',
      vietqr: raw.vietqr || null,
      createdAt: order.createdAt.toISOString(),
      items: order.orderItems.map((oi) => ({
        productId: oi.productId,
        variantId: oi.variantId || undefined,
        title: oi.product?.title || '',
        sku: oi.variant?.sku || oi.product?.sku || '',
        imageUrl: oi.product?.imageUrl || '',
        quantity: oi.quantity,
        unitPrice: Number(oi.unitPrice),
        totalPrice: Number(oi.unitPrice) * oi.quantity,
      })),
      store: {
        name: order.store.name,
        slug: order.store.slug,
        logoUrl: order.store.logoUrl || undefined,
      },
    };
  }

  /**
   * Thực hiện hủy đơn, hoàn lại tồn kho, coupon và thu hồi hoa hồng trong Transaction (FR-16 Mục 31)
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
          orderItems: true,
          commissions: true,
          referralLink: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Đơn hàng không tồn tại');
      }

      // Idempotent cancellation
      if (order.status === OrderStatus.CANCELLED) {
        return {
          message: 'Đơn hàng đã được hủy trước đó (Idempotent)',
          order,
        };
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          `Không thể hủy đơn hàng đang ở trạng thái ${order.status}`,
        );
      }

      // 1. Chuyển trạng thái đơn hàng sang CANCELLED bằng conditional update nguyên tử (Chống race condition - Lỗi 3)
      const updatedResult = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING },
        data: { status: OrderStatus.CANCELLED, updatedAt: new Date() },
      });

      if (updatedResult.count === 0) {
        const currentOrder = await tx.order.findUnique({
          where: { id: orderId },
        });
        if (currentOrder?.status === OrderStatus.CANCELLED) {
          return {
            message: 'Đơn hàng đã được hủy trước đó (Idempotent replay)',
            publicOrderCode: currentOrder.externalOrderSn,
            status: OrderStatus.CANCELLED,
          };
        }
        throw new BadRequestException(
          `Không thể hủy đơn hàng không ở trạng thái Chờ xử lý (PENDING). Trạng thái hiện tại: ${currentOrder?.status || 'UNKNOWN'}`,
        );
      }

      // 2. Hoàn lại tồn kho: hỗ trợ variant hoặc product (Lỗi 4)
      for (const item of order.orderItems) {
        if (item.variantId) {
          await tx.$executeRaw`
            UPDATE product_variants
            SET stock_quantity = stock_quantity + ${item.quantity}, updated_at = NOW()
            WHERE id = ${item.variantId}::uuid
          `;
        } else {
          await tx.$executeRaw`
            UPDATE products
            SET stock_quantity = stock_quantity + ${item.quantity}, updated_at = NOW()
            WHERE id = ${item.productId}::uuid
          `;
        }
      }

      // 3. Xử lý hoàn trả Coupon (Issue 4 & FR-16 Mục 31)
      const redemption = await tx.couponRedemption.findUnique({
        where: { orderId },
      });

      if (redemption && redemption.status === CouponRedemptionStatus.USED) {
        await tx.couponRedemption.update({
          where: { id: redemption.id },
          data: { status: CouponRedemptionStatus.CANCELLED },
        });

        await tx.coupon.update({
          where: { id: redemption.couponId },
          data: {
            usageCount: { decrement: 1 },
            budgetUsed: { decrement: redemption.discountAmount },
          },
        });
      }

      // 4. Thu hồi hoa hồng (Clawback) của KOL
      if (order.attributedCollaboratorId) {
        for (const comm of order.commissions) {
          if (comm.status === CommissionStatus.PENDING) {
            await tx.commission.update({
              where: { id: comm.id },
              data: { status: CommissionStatus.REVERSED },
            });

            if (comm.commissionAmount.greaterThan(0)) {
              await this.walletsService.reversePendingBalance(
                tx,
                comm.collaboratorId,
                comm.commissionAmount,
                { id: comm.id, type: 'COMMISSION' },
                comm.storeWalletTracked ? order.storeId : undefined,
              );
            }
          }
        }

        if (order.referralLinkId) {
          await tx.referralLink.update({
            where: { id: order.referralLinkId },
            data: { totalOrders: { decrement: 1 } },
          });
        }
      }

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          userId: actorId || null,
          action: 'ORDER_CANCELLED',
          details: {
            orderId,
            orderSn: order.externalOrderSn,
            reason: reason || 'Khách hủy hoặc Shop hủy',
            couponRedemptionReversed: !!redemption,
            itemsCount: order.orderItems.length,
          },
        },
      });

      this.checkoutMetrics.recordCancellation(order.externalOrderSn);

      return {
        message: 'Đã hủy đơn hàng và hoàn trả ưu đãi thành công',
        publicOrderCode: order.externalOrderSn,
        status: OrderStatus.CANCELLED,
      };
    });
  }

  /**
   * FR-17: Tra cứu tiến độ đơn hàng công khai bằng SĐT hoặc Mã đơn hàng
   */
  async trackOrderByPhoneOrSn(query: TrackOrderQueryDto) {
    const { phone, orderSn } = query;

    if (!phone?.trim() || !orderSn?.trim()) {
      throw new BadRequestException(
        'Vui lòng nhập đầy đủ số điện thoại và mã đơn hàng để tra cứu.',
      );
    }

    const whereConditions: Prisma.OrderWhereInput = {};
    if (phone?.trim()) {
      const canonical = normalizeCustomerPhone(phone);
      whereConditions.customerPhone = {
        in: [canonical, `+84${canonical.slice(1)}`],
      };
    }
    if (orderSn?.trim()) {
      whereConditions.externalOrderSn = {
        equals: orderSn.trim(),
        mode: 'insensitive',
      };
    }

    const orders = await this.prisma.order.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      take: 50,
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
        customerName: phone && orderSn ? order.customerName : 'Khách hàng',
        customerPhone:
          phone && orderSn
            ? order.customerPhone
            : order.customerPhone?.replace(/.(?=.{3})/g, '*'),
        shippingAddress:
          phone && orderSn
            ? order.shippingAddress
            : 'Xác minh mã đơn và SĐT để xem địa chỉ',
        reviewToken:
          phone && orderSn
            ? createReviewToken(this.configService, order.id)
            : undefined,
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
        reviews: order.productReviews.map((review) => ({
          id: review.id,
          productId: review.productId,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt,
          customerName: 'Khách mua hàng',
          images: review.images,
          video: review.video,
        })),
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
    const comment = dto.comment.trim();
    if (
      comment.length < 10 ||
      comment.length > 1000 ||
      /([^\s])\1{14,}/u.test(comment) ||
      /(?:^|\s)(?:fuck|shit|địt|đụ mẹ)(?:\s|[.!?,]|$)/iu.test(comment) ||
      (comment.match(/https?:\/\//gi)?.length ?? 0) >= 3
    )
      throw new BadRequestException(
        'Nhận xét cần 10–1000 ký tự, lịch sự và không spam',
      );
    verifyReviewToken(this.configService, orderId, dto.reviewToken ?? '');
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

    const suppliedToken = dto.reviewToken?.trim();
    const storedToken = order.cancellationToken?.trim();
    const suppliedPhone = dto.customerPhone?.trim();
    const storedPhone = order.customerPhone?.trim();
    const tokenMatches =
      !!suppliedToken &&
      !!storedToken &&
      suppliedToken.length === storedToken.length &&
      crypto.timingSafeEqual(
        Buffer.from(suppliedToken),
        Buffer.from(storedToken),
      );

    if (!tokenMatches || !suppliedPhone || suppliedPhone !== storedPhone) {
      throw new ForbiddenException(
        'Không thể xác minh quyền đánh giá đơn hàng. Vui lòng mở đơn từ thiết bị đã đặt hàng.',
      );
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
    const review = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`,
      );
      const freshOrder = await tx.order.findUnique({ where: { id: orderId } });
      if (
        !freshOrder ||
        ![OrderStatus.DELIVERED, OrderStatus.COMPLETED].includes(
          freshOrder.status as 'DELIVERED' | 'COMPLETED',
        )
      )
        throw new BadRequestException(
          'Đơn hàng không còn đủ điều kiện đánh giá',
        );
      if (
        await tx.productReview.findFirst({
          where: { orderId, productId: dto.productId },
        })
      )
        throw new ConflictException('Sản phẩm đã được đánh giá trong đơn này');
      return tx.productReview.create({
        data: {
          orderId: order.id,
          productId: dto.productId,
          customerName:
            dto.customerName || order.customerName || 'Khách mua hàng',
          rating: dto.rating,
          comment: dto.comment.trim(),
          reviewImageUrl: dto.images?.[0] ?? dto.reviewImageUrl ?? null,
          images:
            dto.images ?? (dto.reviewImageUrl ? [dto.reviewImageUrl] : []),
          video: dto.video ?? null,
          status: ReviewStatus.PENDING,
          isApproved: false,
        },
      });
    });

    return {
      message:
        'Cảm ơn bạn đã gửi đánh giá sản phẩm thành công! Nội dung đang chờ Shop kiểm duyệt trước khi công khai.',
      review,
    };
  }

  async checkCreateOrderRateLimit(
    ip: string,
    customerPhone?: string,
  ): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return; // Bỏ qua rate limit trong test suite E2E để tránh false positive (Mục 5)
    }

    // 1. Giới hạn theo IP (30 req/60s) để người dùng cùng mạng WiFi NAT không bị chặn oan (Mục Chưa hoàn chỉnh 5)
    const ipResult = await this.cacheService.checkRateLimit(
      `orders:create:ip:${ip}`,
      30,
      60,
    );
    if (!ipResult.allowed) {
      throw new HttpException(
        'Bạn đã thao tác đặt hàng quá nhiều lần trong thời gian ngắn. Vui lòng thử lại sau ít phút!',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Giới hạn chống bot spam theo SĐT băm (tối đa 5 đơn / 5 phút trên 1 số điện thoại)
    if (customerPhone && customerPhone.trim()) {
      const phoneHash = crypto
        .createHash('sha256')
        .update(customerPhone.trim())
        .digest('hex')
        .slice(0, 16);
      const phoneResult = await this.cacheService.checkRateLimit(
        `orders:create:phone:${phoneHash}`,
        5,
        300,
      );
      if (!phoneResult.allowed) {
        throw new HttpException(
          'Số điện thoại này đã đặt đơn liên tục. Vui lòng chờ 5 phút trước khi đặt thêm!',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  /**
   * FR-16: Đối soát và xác nhận thanh toán VietQR an toàn, chống race/replay (Lỗi 3, 4 & 5)
   */
  async reconcilePayment(
    dto: PaymentWebhookDto,
    signatureOrSecret?: string,
    rawBody?: string | Buffer,
  ) {
    const configuredSecret =
      this.configService.get<string>('PAYMENT_WEBHOOK_SECRET') ||
      process.env.PAYMENT_WEBHOOK_SECRET;

    // Tuyệt đối không fallback secret mặc định công khai (Lỗi 3)
    if (!configuredSecret || !configuredSecret.trim()) {
      throw new InternalServerErrorException(
        'PAYMENT_WEBHOOK_SECRET chưa được cấu hình trong hệ thống',
      );
    }

    if (!signatureOrSecret || !signatureOrSecret.trim()) {
      throw new ForbiddenException(
        'Thiếu chữ ký xác thực webhook đối soát thanh toán (x-webhook-signature / x-signature / x-payment-webhook-secret)',
      );
    }

    // 1. Xác thực chữ ký HMAC-SHA256 trên raw body hoặc shared secret (Lỗi 4)
    let isSignatureValid = false;
    const candidateSig = signatureOrSecret.trim().replace(/^sha256=/i, '');

    if (/^[0-9a-f]{64}$/i.test(candidateSig)) {
      const payloadToVerify = rawBody
        ? typeof rawBody === 'string'
          ? rawBody
          : rawBody.toString('utf8')
        : JSON.stringify(dto);
      const computedHmac = crypto
        .createHmac('sha256', configuredSecret.trim())
        .update(payloadToVerify)
        .digest('hex');

      const sigBuf = Buffer.from(candidateSig.toLowerCase(), 'utf8');
      const compBuf = Buffer.from(computedHmac.toLowerCase(), 'utf8');
      if (
        sigBuf.length === compBuf.length &&
        crypto.timingSafeEqual(sigBuf, compBuf)
      ) {
        isSignatureValid = true;
      }
    }

    // Fallback so sánh timing-safe chuỗi secret token nếu bên gửi dùng secret header
    if (!isSignatureValid) {
      const secretBuf = Buffer.from(signatureOrSecret.trim(), 'utf8');
      const confBuf = Buffer.from(configuredSecret.trim(), 'utf8');
      if (
        secretBuf.length === confBuf.length &&
        crypto.timingSafeEqual(secretBuf, confBuf)
      ) {
        isSignatureValid = true;
      }
    }

    if (!isSignatureValid) {
      throw new ForbiddenException(
        'Chữ ký xác thực webhook đối soát thanh toán không hợp lệ',
      );
    }

    // 2. Toàn bộ kiểm tra và cập nhật chạy trong Transaction nguyên tử với SELECT ... FOR UPDATE chống race condition (Lỗi 4)
    return await this.prisma.$transaction(async (tx) => {
      // Khóa trực tiếp dòng đơn hàng trong Postgres để các request webhook đồng thời phải tuần tự hóa
      const lockedOrders: any[] = await tx.$queryRaw`
        SELECT id, external_order_sn, status, final_amount, raw_payload, store_id, attributed_collaborator_id
        FROM orders
        WHERE external_order_sn = ${dto.orderCode}
        FOR UPDATE
      `;

      if (!lockedOrders || lockedOrders.length === 0) {
        throw new NotFoundException(
          `Không tìm thấy đơn hàng với mã ${dto.orderCode}`,
        );
      }

      const lockedOrder = lockedOrders[0];
      const raw = (lockedOrder.raw_payload as Record<string, any>) || {};

      // Kiểm tra đơn chưa bị hủy
      if (lockedOrder.status === OrderStatus.CANCELLED) {
        throw new BadRequestException(
          'Không thể đối soát thanh toán cho đơn hàng đã bị hủy',
        );
      }

      // Kiểm tra đơn thật sự sử dụng phương thức VIETQR
      if (raw.paymentMethod !== 'VIETQR') {
        throw new BadRequestException(
          'Đơn hàng không sử dụng phương thức thanh toán VIETQR',
        );
      }

      // Kiểm tra đơn vị tiền tệ nếu có
      if (dto.currency && dto.currency.trim().toUpperCase() !== 'VND') {
        throw new BadRequestException(
          'Đơn vị tiền tệ không hợp lệ, hệ thống chỉ chấp nhận thanh toán VND',
        );
      }

      // Kiểm tra số tiền chính xác tuyệt đối
      if (Number(dto.amount) !== Number(lockedOrder.final_amount)) {
        throw new BadRequestException(
          `Số tiền thanh toán (${dto.amount}) không khớp với giá trị đơn hàng (${lockedOrder.final_amount})`,
        );
      }

      // Kiểm tra nếu đơn đã thanh toán với cùng transactionId (Idempotent replay an toàn)
      if (raw.paymentStatus === 'PAID') {
        if (raw.transactionId === dto.transactionId) {
          return {
            message:
              'Đơn hàng đã được ghi nhận thanh toán trước đó (Idempotent replay)',
            orderCode: lockedOrder.external_order_sn,
            status: 'PAID',
            transactionId: dto.transactionId,
          };
        }
        throw new ConflictException(
          `Đơn hàng ${dto.orderCode} đã được thanh toán với giao dịch khác (${raw.transactionId})`,
        );
      }

      // Ghi nhận PaymentTransaction với UNIQUE constraint trên transaction_id ở Database level
      try {
        await (tx as any).paymentTransaction.create({
          data: {
            orderId: lockedOrder.id,
            transactionId: dto.transactionId,
            amount: Number(dto.amount),
            currency: dto.currency || 'VND',
            paymentMethod: 'VIETQR',
            paymentProof: dto.paymentProof || null,
            status: 'SUCCESS',
          },
        });
      } catch (err: any) {
        if (
          err?.code === 'P2002' ||
          err?.message?.includes('Unique constraint') ||
          err?.message?.includes('payment_transactions_transaction_id_key')
        ) {
          throw new ConflictException(
            `Mã giao dịch ngân hàng ${dto.transactionId} đã được ghi nhận cho đơn hàng khác trước đó`,
          );
        }
        throw err;
      }

      const updatedRaw = {
        ...raw,
        paymentStatus: 'PAID',
        transactionId: dto.transactionId,
        paidAt: new Date().toISOString(),
        paymentProof: dto.paymentProof || null,
      };

      await tx.order.update({
        where: { id: lockedOrder.id },
        data: {
          rawPayload: updatedRaw,
          sourceUpdatedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: lockedOrder.attributed_collaborator_id || undefined,
          action: 'PAYMENT_RECONCILED',
          details: {
            externalOrderSn: lockedOrder.external_order_sn,
            transactionId: dto.transactionId,
            amount: dto.amount,
            status: 'PAID',
          },
        },
      });

      this.logger.log(
        `[PAYMENT_RECONCILED] Order ${lockedOrder.external_order_sn} marked as PAID with txn ${dto.transactionId}`,
      );

      return {
        message: 'Đối soát và xác nhận thanh toán đơn hàng thành công!',
        orderCode: lockedOrder.external_order_sn,
        status: 'PAID',
        transactionId: dto.transactionId,
      };
    });
  }


  async checkPublicOrderRateLimit(ip: string): Promise<void> {
    const result = await this.cacheService.checkRateLimit(
      `orders:public:${ip}`,
      30,
      60,
    );
    if (!result.allowed)
      throw new HttpException(
        'Bạn tra cứu quá nhanh, vui lòng thử lại sau',
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }
}
