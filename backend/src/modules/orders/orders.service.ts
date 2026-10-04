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
import { ValidateCartDto } from './dto/validate-cart.dto';
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
  ReturnRequestStatus,
  Prisma,
} from '@prisma/client';
import { RespondReturnRequestDto, ReturnDecision } from './dto/respond-return-request.dto';
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
            deliveredAt: normalizedOrder.receivedAt,
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
        RETURN_REQUESTED: [
          OrderStatus.RETURN_REQUESTED,
          OrderStatus.DISPUTED,
          OrderStatus.RETURNED,
          OrderStatus.COMPLETED,
        ],
        DISPUTED: [
          OrderStatus.DISPUTED,
          OrderStatus.RETURNED,
          OrderStatus.COMPLETED,
        ],
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
          ...(normalized.receivedAt ? { deliveredAt: normalized.receivedAt } : {}),
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
    const isPayos = normalizedPaymentMethod === PaymentMethod.PAYOS;
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

    const uniqueProductIds = Array.from(new Set(productIds));
    if (dbProducts.length !== uniqueProductIds.length) {
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

    // Đảm bảo đơn hàng thuộc các gian hàng hợp lệ (Hỗ trợ Multi-Merchant Orders tách đơn tự động)
    const distinctStoreIds = Array.from(
      new Set(dbProducts.map((p) => p.storeId)),
    );
    if (distinctStoreIds.length > 1) {
      return this.createMultiStoreOrders(dto, dbProducts, clientContext);
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

    // 4. THỰC THI GIAO DỊCH ĐƠN HÀNG ĐƠN GIAN HÀNG
    const { order, rawCancellationToken, vietqrData } =
      await this.prisma.$transaction(
        async (tx) => {
          return this.executeStoreOrderInTransaction(tx, {
            dto,
            store,
            dbProducts,
            variantMap,
            rawSubtotalAmount,
            anyProductHasDirectDiscount,
            couponValidationResult,
            customerName,
            customerPhone,
            customerEmail,
            shippingAddress,
            orderNotes,
            cleanIdempotencyKey,
            currentPayloadHash,
            jwtSecret,
            clientContext,
          });
        },
        {
          timeout: 15000,
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );

    const raw = (order.rawPayload as Record<string, any>) || {};

    let confirmationEmailQueued = false;
    if (customerEmail && this.mailService) {
      confirmationEmailQueued = true;
      void this.mailService
        .sendOrderConfirmation({
          email: customerEmail,
          customerName,
          publicOrderCode: order.externalOrderSn,
          finalAmount: Number(order.finalAmount),
          paymentMethod: raw.paymentMethod || 'COD',
          storeName: order.store.name,
        })
        .catch((error: unknown) => {
          this.logger.error(
            `Không thể gửi email xác nhận đơn ${order.externalOrderSn}: ${this.getErrorMessage(error)}`,
          );
        });
    }

    const singleResult = {
      message: 'Đặt hàng thành công!',
      publicOrderCode: order.externalOrderSn,
      status: order.status,
      subtotalAmount: Number(order.subtotalAmount),
      discountAmount: Number(order.discountAmount),
      shippingFee: Number(order.shippingFee),
      shippingFeePolicy: 'NATIONWIDE_FREE_SHIPPING',
      finalAmount: Number(order.finalAmount),
      paymentMethod: raw.paymentMethod || 'COD',
      paymentStatus: raw.paymentStatus || 'UNPAID',
      vietqr: raw.vietqr || null,
      cancellationToken: rawCancellationToken,
      trackingUrl: `/tracking?sn=${order.externalOrderSn}`,
      confirmationEmailQueued,
      items: order.orderItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        title: item.product?.title || '',
        sku: item.product?.sku || '',
        imageUrl: item.product?.imageUrl || '',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      store: {
        id: order.storeId,
        name: order.store.name,
        slug: order.store.slug,
        logoUrl: order.store.logoUrl || undefined,
      },
    };

    return {
      ...singleResult,
      orders: [singleResult],
    };
  }

  /**
   * Thực thi logic đặt hàng cho một gian hàng bên trong Prisma Transaction
   * Dùng chung cho cả đơn đơn lẻ và đơn đa gian hàng để đảm bảo tính nhất quán và nguyên tử (ACID).
   */
  private async executeStoreOrderInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      dto: CreateOrderDto;
      store: any;
      dbProducts: any[];
      variantMap: Map<string, any>;
      rawSubtotalAmount: number;
      anyProductHasDirectDiscount: boolean;
      couponValidationResult: Awaited<
        ReturnType<CouponsService['validateCoupon']>
      > | null;
      customerName: string;
      customerPhone: string;
      customerEmail: string | null;
      shippingAddress: string;
      orderNotes?: string | null;
      cleanIdempotencyKey: string;
      currentPayloadHash: string;
      jwtSecret: string;
      clientContext?: {
        cookieAttr?: string;
        legacyCookieRef?: string;
        ip?: string;
        userAgent?: string;
      };
    },
  ) {
    const {
      dto,
      store,
      dbProducts,
      variantMap,
      rawSubtotalAmount,
      anyProductHasDirectDiscount,
      couponValidationResult,
      customerName,
      customerPhone,
      customerEmail,
      shippingAddress,
      orderNotes,
      cleanIdempotencyKey,
      currentPayloadHash,
      jwtSecret,
      clientContext,
    } = params;

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    let shopFundedAmount = 0;
    let platformFundedAmount = 0;
    let appliedDiscountAmount = 0;

    // 4.1 Khóa và kiểm tra trạng thái gian hàng trong Transaction
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
        `Gian hàng "${lockedStore?.name || store.name}" không tồn tại, đã tạm ngưng hoạt động hoặc đã ngừng kinh doanh.`,
      );
    }

    // 4.2 Trừ kho an toàn: hỗ trợ tồn kho variant hoặc sản phẩm
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
            `PRODUCT_OUT_OF_STOCK: Phân loại sản phẩm "${variant?.name || prod.title}" của gian hàng "${store.name}" không đủ số lượng tồn kho (yêu cầu: ${item.quantity}).`,
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
            `PRODUCT_OUT_OF_STOCK: Sản phẩm "${prod.title}" của gian hàng "${store.name}" không đủ số lượng tồn kho (yêu cầu: ${item.quantity}).`,
          );
        }
      }
    }

    // 6.1 Khóa hàng và kiểm tra toàn diện quy tắc Coupon trong Transaction
    if (couponValidationResult) {
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

      const now = new Date();
      if (lockedCoupon.startsAt && now < lockedCoupon.startsAt) {
        throw new ConflictException('Mã giảm giá chưa đến thời điểm áp dụng');
      }
      if (lockedCoupon.expiresAt && now > lockedCoupon.expiresAt) {
        throw new ConflictException('Mã giảm giá đã hết hạn sử dụng');
      }

      if (
        !lockedCoupon.stackableWithProductDiscount &&
        anyProductHasDirectDiscount
      ) {
        throw new ConflictException(
          'Mã giảm giá này không được áp dụng đồng thời với sản phẩm đang giảm giá trực tiếp',
        );
      }

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
        let unitPrice = Number(prod.price);
        if (item.variantId) {
          const variant = variantMap.get(item.variantId);
          if (variant?.price !== null && variant?.price !== undefined) {
            unitPrice = Number(variant.price);
          }
        }
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

      if (
        lockedCoupon.usageLimitTotal !== null &&
        lockedCoupon.usageCount >= lockedCoupon.usageLimitTotal
      ) {
        throw new ConflictException(
          'Mã giảm giá đã đạt giới hạn lượt sử dụng',
        );
      }

      if (lockedCoupon.budgetTotal !== null) {
        const currentBudgetUsed = Number(lockedCoupon.budgetUsed);
        const totalBudget = Number(lockedCoupon.budgetTotal);
        if (currentBudgetUsed + txDiscount > totalBudget) {
          throw new ConflictException(
            'Mã giảm giá đã vượt quá ngân sách cho phép',
          );
        }
      }

      if (dto.customerPhone?.trim()) {
        const cPhone = dto.customerPhone.trim();
        const customerRedemptionCount = await tx.couponRedemption.count({
          where: {
            couponId: lockedCoupon.id,
            customerPhone: cPhone,
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

      await tx.coupon.update({
        where: { id: lockedCoupon.id },
        data: {
          usageCount: { increment: 1 },
          budgetUsed: { increment: txDiscount },
        },
      });

      const shopRate = Number(lockedCoupon.shopFundingRate || 100) / 100;
      shopFundedAmount = Math.round(txDiscount * shopRate);
      platformFundedAmount = txDiscount - shopFundedAmount;

      appliedDiscountAmount = txDiscount;
    }

    // 4.2 Nhận diện ứng viên Attribution TRONG TRANSACTION
    let candidateCookieCollaboratorId: string | null = null;
    let candidateCookieReferralLinkId: string | null = null;
    let candidateCookieSessionId: string | null = null;
    let candidateCookieClickId: string | null = null;
    let candidateCookieClickedAt: Date | null = null;
    let candidateVia: string = 'LINK';

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

          if (
            link &&
            !link.deletedAt &&
            link.status === ReferralLinkStatus.ACTIVE &&
            (!link.expiresAt || new Date(link.expiresAt) > new Date()) &&
            link.storeId === lockedStore.id &&
            link.collaborator?.isActive
          ) {
            candidateCookieCollaboratorId = link.collaboratorId;
            candidateCookieReferralLinkId = link.id;
            candidateCookieSessionId = session.id;
            candidateCookieClickId = session.latestClickId;
            candidateCookieClickedAt = session.lastClickedAt;
            candidateVia = 'LINK';
          }
        }
      } else {
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
        hasStoreCookieTracking = true;
        candidateCookieCollaboratorId = link.collaboratorId;
        candidateCookieReferralLinkId = link.id;
        candidateCookieSessionId = null;
        candidateCookieClickId = null;
        candidateCookieClickedAt = new Date();
        candidateVia = 'LINK';
      }
    }

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
          validRecentClicks.push(click);
        }
      }

      const distinctCollabIds = Array.from(
        new Set(validRecentClicks.map((c) => c.referralLink.collaboratorId)),
      );

      if (distinctCollabIds.length > 1) {
        isAmbiguousFingerprint = true;
      } else if (distinctCollabIds.length === 1) {
        const matchedClick = validRecentClicks[0];
        candidateFpCollaboratorId = distinctCollabIds[0];
        candidateFpReferralLinkId = matchedClick.referralLinkId;
        candidateFpClickId = matchedClick.id;
        candidateFpClickedAt = matchedClick.createdAt;
      }
    }

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
    } else if (candidateCookieCollaboratorId && candidateCookieReferralLinkId) {
      attributedCollaboratorId = candidateCookieCollaboratorId;
      attributionMethod = AttributionMethod.COOKIE;
      referralLinkId = candidateCookieReferralLinkId;
      attributionSessionId = candidateCookieSessionId;
      clickId = candidateCookieClickId;
      clickedAt = candidateCookieClickedAt;
      attributionConfidence = 'HIGH';
    } else if (candidateFpCollaboratorId && candidateFpReferralLinkId) {
      attributedCollaboratorId = candidateFpCollaboratorId;
      attributionMethod = AttributionMethod.FINGERPRINT;
      referralLinkId = candidateFpReferralLinkId;
      clickId = candidateFpClickId;
      clickedAt = candidateFpClickedAt;
      attributionConfidence = 'MEDIUM';
      overrideReason = 'FINGERPRINT_FALLBACK_24H';
    } else {
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

    const attributedReferralLink = referralLinkId
      ? await tx.referralLink.findFirst({
          where: {
            id: referralLinkId,
            collaboratorId: attributedCollaboratorId || undefined,
            storeId: lockedStore.id,
            deletedAt: null,
          },
          include: { exclusiveDeal: true },
        })
      : null;
    const isOpenOfferLink = Boolean(
      attributedReferralLink &&
        !attributedReferralLink.campaignId &&
        !attributedReferralLink.exclusiveDealId,
    );
    const approvedExclusiveDeals = attributedCollaboratorId
      ? await tx.exclusiveDealProposal.findMany({
          where: {
            collaboratorId: attributedCollaboratorId,
            productId: { in: [...new Set(dto.items.map((item) => item.productId))] },
            status: 'APPROVED',
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            collaboratorId: true,
            storeId: true,
            productId: true,
            approvedCommissionRate: true,
          },
        })
      : [];
    const currentDealByProduct = new Map<string, (typeof approvedExclusiveDeals)[number]>();
    for (const deal of approvedExclusiveDeals) {
      if (!currentDealByProduct.has(deal.productId)) {
        currentDealByProduct.set(deal.productId, deal);
      }
    }

    for (const item of dto.items) {
      const prod = productMap.get(item.productId)!;
      let unitPrice = Number(prod.price);
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (variant?.price !== null && variant?.price !== undefined) {
          unitPrice = Number(variant.price);
        }
      }
      const quantity = item.quantity;
      const baseCommissionRate = prod.customCommissionRate
        ? Number(prod.customCommissionRate)
        : Number(lockedStore.defaultCommissionRate || 10);
      const approvedExclusiveDeal = currentDealByProduct.get(prod.id);

      let finalCommissionRate = baseCommissionRate + extraTierRate;
      if (isOpenOfferLink) {
        // Open Offer dùng đúng mức công khai; tier bonus không làm thay đổi rate offer.
        finalCommissionRate = baseCommissionRate;
      }
      if (
        attributedReferralLink?.exclusiveDealId &&
        approvedExclusiveDeal &&
        approvedExclusiveDeal.productId === prod.id &&
        attributedReferralLink?.productId === prod.id &&
        approvedExclusiveDeal.collaboratorId === attributedCollaboratorId &&
        approvedExclusiveDeal.storeId === lockedStore.id &&
        approvedExclusiveDeal.approvedCommissionRate !== null
      ) {
        // VIP là tỷ lệ cuối cùng đã thỏa thuận, thay thế mức Open Offer.
        finalCommissionRate = Number(
          approvedExclusiveDeal.approvedCommissionRate,
        );
      }
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

    const shippingFee = 0;
    const orderFinalAmount = Math.max(
      0,
      subtotalAmount - appliedDiscountAmount + shippingFee,
    );

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

    const normalizedPaymentMethod = (dto.paymentMethod || PaymentMethod.COD).toUpperCase();
    const isVietQr = normalizedPaymentMethod === PaymentMethod.VIETQR;
    const isPayos = normalizedPaymentMethod === PaymentMethod.PAYOS;
    const paymentMethod = normalizedPaymentMethod;

    const externalOrderSn = generateCryptographicOrderSn();

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
            paymentStatus: isVietQr || isPayos ? 'WAITING_PAYMENT' : 'UNPAID',
            vietqr: vietqrData,
            requestHash: currentPayloadHash,
          },
          policyAcceptedAt: new Date(),
          policySnapshot: {
            storeId: lockedStore.id,
            storeName: lockedStore.name,
            returnPolicy: lockedStore.policyReturn || 'Quy định SCANMS: yêu cầu đổi trả trong 14 ngày kể từ khi giao, kèm ảnh và video mở hộp.',
            returnPolicySource: lockedStore.policyReturn ? 'SHOP' : 'SCANMS',
            warrantyPolicy: lockedStore.policyWarranty || null,
            shippingPolicy: lockedStore.policyShipping || null,
            accepted: dto.policyAccepted === true,
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
        customerId: dto.customerId || null,
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

    return {
      order,
      rawCancellationToken,
      vietqrData,
      subtotalAmount,
      appliedDiscountAmount,
      shippingFee,
      orderFinalAmount,
    };
  }

  /**
   * Tạo nhiều đơn hàng con theo từng Gian hàng (Multi-Merchant Cart Checkout - FR-Orders)
   * Đảm bảo tính cô lập Multi-merchant: Mỗi Shop chỉ quản lý và xem đơn hàng của Shop mình.
   * XỬ LÝ NGUYÊN TỬ (ATOMIC TRANSACTION): Toàn bộ nhóm đơn hàng được tạo trong 1 transaction thống nhất.
   * Nếu bất kỳ đơn con của Shop nào gặp lỗi, toàn bộ transaction tự động rollback, không để lại đơn dở dang.
   */
  private async createMultiStoreOrders(
    dto: CreateOrderDto,
    dbProducts: any[],
    clientContext?: {
      cookieAttr?: string;
      legacyCookieRef?: string;
      ip?: string;
      userAgent?: string;
    },
  ) {
    const customerName = validateCustomerName(dto.customerName);
    const customerPhone = normalizeCustomerPhone(dto.customerPhone);
    const customerEmail = dto.customerEmail?.trim().toLowerCase() || null;
    const shippingAddress = validateShippingAddress(dto.shippingAddress);
    const orderNotes = validateOrderNotes(dto.orderNotes);
    const baseIdempotencyKey = (dto.idempotencyKey || `idem-${Date.now()}`).trim();
    const normalizedPaymentMethod = (dto.paymentMethod || PaymentMethod.COD).toUpperCase();

    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!jwtSecret || !jwtSecret.trim()) {
      throw new InternalServerErrorException(
        'Cấu hình JWT_SECRET bị thiếu trong hệ thống!',
      );
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    const distinctStoreIds = Array.from(
      new Set(dbProducts.map((p) => p.storeId)),
    );

    // 0. Idempotency Check & Safe Recovery Mechanism for Multi-Store Orders
    const expectedKeys = distinctStoreIds.map(
      (sid) => `${baseIdempotencyKey}_store_${sid}`,
    );
    const existingSubOrders = await this.prisma.order.findMany({
      where: { idempotencyKey: { in: expectedKeys } },
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
            variant: { select: { id: true, name: true, sku: true } },
          },
        },
        store: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });

    if (existingSubOrders.length === distinctStoreIds.length) {
      this.checkoutMetrics.recordIdempotentReplay();
      const subtotalAmount = existingSubOrders.reduce(
        (sum, o) => sum + (Number(o.subtotalAmount) || 0),
        0,
      );
      const discountAmount = existingSubOrders.reduce(
        (sum, o) => sum + (Number(o.discountAmount) || 0),
        0,
      );
      const shippingFee = existingSubOrders.reduce(
        (sum, o) => sum + (Number(o.shippingFee) || 0),
        0,
      );
      const finalAmount = existingSubOrders.reduce(
        (sum, o) => sum + (Number(o.finalAmount) || 0),
        0,
      );
      const firstRaw = (existingSubOrders[0]?.rawPayload as Record<string, any>) || {};

      return {
        message: 'Đơn hàng đã được ghi nhận thành công (Idempotent replay)',
        isMultiStore: true,
        totalOrders: existingSubOrders.length,
        publicOrderCode: existingSubOrders.map((o) => o.externalOrderSn).join(', '),
        status: existingSubOrders[0].status,
        subtotalAmount,
        discountAmount,
        shippingFee,
        shippingFeePolicy: 'NATIONWIDE_FREE_SHIPPING',
        finalAmount,
        paymentMethod: firstRaw.paymentMethod || 'COD',
        paymentStatus: firstRaw.paymentStatus || 'UNPAID',
        vietqr: firstRaw.vietqr || null,
        canRequestCancellationOtp: true,
        cancellationRecovery: 'OTP_VERIFICATION_AVAILABLE',
        trackingUrl: `/tracking?sn=${existingSubOrders[0]?.externalOrderSn}`,
        confirmationEmailQueued: false,
        orders: existingSubOrders.map((o) => {
          const raw = (o.rawPayload as Record<string, any>) || {};
          return {
            publicOrderCode: o.externalOrderSn,
            status: o.status,
            subtotalAmount: Number(o.subtotalAmount),
            discountAmount: Number(o.discountAmount),
            shippingFee: Number(o.shippingFee),
            finalAmount: Number(o.finalAmount),
            vietqr: raw.vietqr || null,
            items: o.orderItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || undefined,
              title: item.product?.title || '',
              sku: item.product?.sku || '',
              imageUrl: item.product?.imageUrl || '',
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
            })),
            store: {
              id: o.storeId,
              name: o.store.name,
              slug: o.store.slug,
              logoUrl: o.store.logoUrl || undefined,
            },
          };
        }),
        items: existingSubOrders.flatMap((o) =>
          o.orderItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || undefined,
            title: item.product?.title || '',
            sku: item.product?.sku || '',
            imageUrl: item.product?.imageUrl || '',
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
          })),
        ),
        store: {
          id: 'multi-store',
          name: `Nhiều gian hàng (${existingSubOrders.length} Shop)`,
          slug: 'multi-store',
        },
      };
    }

    // Cơ chế khôi phục: Nếu một phiên trước bị gián đoạn để lại đơn con dở dang, đánh dấu hủy để không bị treo
    if (existingSubOrders.length > 0 && existingSubOrders.length < distinctStoreIds.length) {
      this.logger.warn(
        `[MultiStoreCheckout] Phát hiện ${existingSubOrders.length}/${distinctStoreIds.length} đơn con dở dang từ phiên trước (${baseIdempotencyKey}). Đang kích hoạt cơ chế khôi phục hủy bỏ đơn dở dang...`,
      );
      await this.prisma.order.updateMany({
        where: {
          id: { in: existingSubOrders.map((o) => o.id) },
          status: OrderStatus.PENDING,
        },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });
    }

    // 1. Phân nhóm items theo storeId & Pre-validate toàn bộ gian hàng
    const itemsByStore = new Map<string, typeof dto.items>();
    for (const item of dto.items) {
      const prod = productMap.get(item.productId);
      if (!prod) continue;
      const list = itemsByStore.get(prod.storeId) || [];
      list.push(item);
      itemsByStore.set(prod.storeId, list);
    }

    const storeContexts: Array<{
      storeId: string;
      store: any;
      storeItems: typeof dto.items;
      storeProducts: any[];
      storeVariantMap: Map<string, any>;
      rawSubtotalAmount: number;
      anyProductHasDirectDiscount: boolean;
      couponValidationResult: any;
      subDto: CreateOrderDto;
      subIdempotencyKey: string;
      subPayloadHash: string;
    }> = [];

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    for (const storeId of distinctStoreIds) {
      const storeProducts = dbProducts.filter((p) => p.storeId === storeId);
      const targetStore = storeProducts[0]?.store;
      if (!targetStore || targetStore.isDeleted || !targetStore.isActive) {
        throw new BadRequestException(
          `STORE_INACTIVE: Gian hàng "${targetStore?.name || storeId}" hiện không hoạt động hoặc đã bị đóng.`,
        );
      }

      const storeItems = itemsByStore.get(storeId) || [];
      if (storeItems.length === 0) continue;

      const storeProdMap = new Map(storeProducts.map((p) => [p.id, p]));
      const variantIds = storeItems
        .map((i) => i.variantId)
        .filter((v): v is string => Boolean(v && v.trim()));

      if (variantIds.some((variantId) => !uuidPattern.test(variantId))) {
        throw new BadRequestException(
          `VARIANT_NOT_FOUND: Mã phân loại sản phẩm không hợp lệ tại gian hàng "${targetStore.name}".`,
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
      const storeVariantMap = new Map(dbVariants.map((v) => [v.id, v]));

      let rawSubtotalAmount = 0;
      let anyProductHasDirectDiscount = false;
      for (const item of storeItems) {
        const prod = storeProdMap.get(item.productId);
        if (!prod) {
          throw new BadRequestException(
            `Sản phẩm ${item.productId} không hợp lệ tại gian hàng "${targetStore.name}".`,
          );
        }
        let itemPrice = Number(prod.price);
        if (item.variantId) {
          const variant = storeVariantMap.get(item.variantId);
          if (!variant || variant.productId !== prod.id) {
            throw new BadRequestException(
              `Phân loại sản phẩm ${item.variantId} không thuộc sản phẩm "${prod.title}" hoặc không tồn tại.`,
            );
          }
          if (variant.price !== null && variant.price !== undefined) {
            itemPrice = Number(variant.price);
          }
        }
        rawSubtotalAmount += itemPrice * item.quantity;
        if (prod.originalPrice && Number(prod.originalPrice) > itemPrice) {
          anyProductHasDirectDiscount = true;
        }
      }

      const storeCoupon =
        dto.couponsByStore?.[storeId] || dto.couponCode || undefined;
      let couponValidationResult: any = null;
      if (storeCoupon?.trim()) {
        couponValidationResult = await this.couponsService.validateCoupon(
          {
            code: storeCoupon.trim(),
            storeId,
            customerPhone: customerPhone || undefined,
            items: storeItems,
            hasProductDiscount: anyProductHasDirectDiscount,
            hasShopVoucher: false,
            hasPlatformVoucher: false,
          },
          undefined,
          undefined,
          undefined,
        );
      }

      const subIdempotencyKey = `${baseIdempotencyKey}_store_${storeId}`;
      const subDto: CreateOrderDto = {
        ...dto,
        storeId,
        items: storeItems,
        couponCode: storeCoupon,
        idempotencyKey: subIdempotencyKey,
      };
      const subPayloadHash = computeOrderPayloadHash(
        subDto,
        customerName,
        customerPhone,
        normalizedPaymentMethod,
      );

      storeContexts.push({
        storeId,
        store: targetStore,
        storeItems,
        storeProducts,
        storeVariantMap,
        rawSubtotalAmount,
        anyProductHasDirectDiscount,
        couponValidationResult,
        subDto,
        subIdempotencyKey,
        subPayloadHash,
      });
    }

    // 2. THỰC THI GIAO DỊCH NGUYÊN TỬ THỐNG NHẤT CHO CẢ NHÓM ĐƠN HÀNG (Unified Atomic Transaction)
    // Nếu đơn Shop A tạo xong nhưng Shop B lỗi, toàn bộ transaction tự động ROLLBACK!
    let createdResults: any[] = [];
    try {
      createdResults = await this.prisma.$transaction(
        async (tx) => {
          const subOrders: any[] = [];
          for (const sCtx of storeContexts) {
            const subResult = await this.executeStoreOrderInTransaction(tx, {
              dto: sCtx.subDto,
              store: sCtx.store,
              dbProducts: sCtx.storeProducts,
              variantMap: sCtx.storeVariantMap,
              rawSubtotalAmount: sCtx.rawSubtotalAmount,
              anyProductHasDirectDiscount: sCtx.anyProductHasDirectDiscount,
              couponValidationResult: sCtx.couponValidationResult,
              customerName,
              customerPhone,
              customerEmail,
              shippingAddress,
              orderNotes,
              cleanIdempotencyKey: sCtx.subIdempotencyKey,
              currentPayloadHash: sCtx.subPayloadHash,
              jwtSecret,
              clientContext,
            });
            subOrders.push(subResult);
          }
          return subOrders;
        },
        {
          timeout: 25000,
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );
    } catch (error: any) {
      this.logger.error(
        `[MultiStoreCheckout] Đặt hàng đa gian hàng thất bại, toàn bộ đơn hàng con đã được hoàn tác giao dịch an toàn (Atomic Rollback): ${this.getErrorMessage(error)}`,
      );
      throw error;
    }

    // 3. Post-Transaction Email Queue & Kết xuất dữ liệu đơn hàng
    for (const res of createdResults) {
      if (customerEmail && this.mailService) {
        void this.mailService
          .sendOrderConfirmation({
            email: customerEmail,
            customerName,
            publicOrderCode: res.order.externalOrderSn,
            finalAmount: Number(res.order.finalAmount),
            paymentMethod: normalizedPaymentMethod,
            storeName: res.order.store.name,
          })
          .catch((error: unknown) => {
            this.logger.error(
              `Không thể gửi email xác nhận đơn ${res.order.externalOrderSn}: ${this.getErrorMessage(error)}`,
            );
          });
      }
    }

    const createdOrders = createdResults.map((res) => ({
      message: 'Đặt hàng thành công!',
      publicOrderCode: res.order.externalOrderSn,
      status: res.order.status,
      subtotalAmount: Number(res.order.subtotalAmount),
      discountAmount: Number(res.order.discountAmount),
      shippingFee: Number(res.order.shippingFee),
      shippingFeePolicy: 'NATIONWIDE_FREE_SHIPPING',
      finalAmount: Number(res.order.finalAmount),
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: (res.order.rawPayload as Record<string, any>)?.paymentStatus || 'UNPAID',
      vietqr: res.vietqrData,
      cancellationToken: res.rawCancellationToken,
      trackingUrl: `/tracking?sn=${res.order.externalOrderSn}`,
      confirmationEmailQueued: Boolean(customerEmail && this.mailService),
      items: res.order.orderItems.map((item: any) => ({
        productId: item.productId,
        variantId: item.variantId || undefined,
        title: item.product?.title || '',
        sku: item.product?.sku || '',
        imageUrl: item.product?.imageUrl || '',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
      store: {
        id: res.order.storeId,
        name: res.order.store.name,
        slug: res.order.store.slug,
        logoUrl: res.order.store.logoUrl || undefined,
      },
    }));

    const subtotalAmount = createdOrders.reduce(
      (sum, o) => sum + (Number(o.subtotalAmount) || 0),
      0,
    );
    const discountAmount = createdOrders.reduce(
      (sum, o) => sum + (Number(o.discountAmount) || 0),
      0,
    );
    const shippingFee = createdOrders.reduce(
      (sum, o) => sum + (Number(o.shippingFee) || 0),
      0,
    );
    const finalAmount = createdOrders.reduce(
      (sum, o) => sum + (Number(o.finalAmount) || 0),
      0,
    );

    const allPublicCodes = createdOrders
      .map((o) => o.publicOrderCode)
      .filter(Boolean)
      .join(', ');

    return {
      message: `Đơn hàng đã được tách và ghi nhận thành công cho ${createdOrders.length} gian hàng.`,
      isMultiStore: true,
      totalOrders: createdOrders.length,
      publicOrderCode: allPublicCodes,
      status: 'PENDING',
      subtotalAmount,
      discountAmount,
      shippingFee,
      shippingFeePolicy: 'NATIONWIDE_FREE_SHIPPING',
      finalAmount,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: 'UNPAID',
      vietqr: createdOrders[0]?.vietqr || null,
      canRequestCancellationOtp: true,
      cancellationRecovery: 'OTP_VERIFICATION_AVAILABLE',
      trackingUrl: `/tracking?sn=${createdOrders[0]?.publicOrderCode}`,
      confirmationEmailQueued: Boolean(customerEmail && this.mailService),
      orders: createdOrders,
      items: createdOrders.flatMap((o) => o.items || []),
      store: {
        id: 'multi-store',
        name: `Nhiều gian hàng (${createdOrders.length} Shop)`,
        slug: 'multi-store',
      },
    };
  }

  /**
   * Kiểm tra tính hợp lệ của giỏ hàng, tồn kho thực tế và biến động giá (FR-Checkout Requirement 6)
   */
  async validateCart(dto: ValidateCartDto) {
    if (!dto.items || dto.items.length === 0) {
      return {
        isValid: true,
        hasPriceChange: false,
        hasOutOfStock: false,
        items: [],
        warnings: [],
      };
    }

    const productIds = dto.items.map((i) => i.productId);
    const dbProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isDeleted: false,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            isActive: true,
            isDeleted: true,
          },
        },
        variants: {
          where: { isActive: true },
        },
      },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));
    const validatedItems: any[] = [];
    const warnings: string[] = [];
    let hasPriceChange = false;
    let hasOutOfStock = false;

    for (const reqItem of dto.items) {
      const prod = productMap.get(reqItem.productId);
      if (!prod) {
        warnings.push(`Sản phẩm (ID: ${reqItem.productId}) không còn tồn tại trên hệ thống.`);
        hasOutOfStock = true;
        validatedItems.push({
          productId: reqItem.productId,
          variantId: reqItem.variantId,
          title: 'Sản phẩm không còn khả dụng',
          sku: '',
          currentPrice: 0,
          stockQuantity: 0,
          isAvailable: false,
          isActive: false,
          priceChanged: false,
          outOfStock: true,
          store: { id: '', name: 'Không xác định' },
        });
        continue;
      }

      if (!prod.isActive || prod.store?.isDeleted || !prod.store?.isActive) {
        warnings.push(`Sản phẩm "${prod.title}" hoặc Gian hàng hiện đã tạm ngưng hoạt động.`);
        hasOutOfStock = true;
        validatedItems.push({
          productId: prod.id,
          variantId: reqItem.variantId,
          title: prod.title,
          sku: prod.sku || '',
          currentPrice: Number(prod.price),
          stockQuantity: 0,
          isAvailable: false,
          isActive: false,
          priceChanged: false,
          outOfStock: true,
          store: {
            id: prod.store.id,
            name: prod.store.name,
            slug: prod.store.slug,
          },
        });
        continue;
      }

      let currentPrice = Number(prod.price);
      let availableStock = prod.stockQuantity;
      let variantName: string | undefined;

      if (reqItem.variantId) {
        const variant = prod.variants.find((v) => v.id === reqItem.variantId);
        if (!variant) {
          warnings.push(`Phân loại đã chọn của sản phẩm "${prod.title}" không tồn tại.`);
          hasOutOfStock = true;
          availableStock = 0;
        } else {
          variantName = variant.name;
          if (variant.price !== null && variant.price !== undefined) {
            currentPrice = Number(variant.price);
          }
          availableStock = variant.stockQuantity;
        }
      }

      const isStockSufficient = availableStock >= reqItem.quantity;
      if (!isStockSufficient) {
        hasOutOfStock = true;
        warnings.push(
          `Sản phẩm "${prod.title}"${variantName ? ` (${variantName})` : ''} chỉ còn ${availableStock} sản phẩm trong kho (bạn đang chọn ${reqItem.quantity}).`,
        );
      }

      let priceChanged = false;
      if (reqItem.clientPrice !== undefined && Number(reqItem.clientPrice) !== currentPrice) {
        priceChanged = true;
        hasPriceChange = true;
        warnings.push(
          `Giá của "${prod.title}" đã được cập nhật từ ${Number(reqItem.clientPrice).toLocaleString('vi-VN')} ₫ thành ${currentPrice.toLocaleString('vi-VN')} ₫.`,
        );
      }

      validatedItems.push({
        productId: prod.id,
        variantId: reqItem.variantId,
        variantName,
        title: prod.title,
        sku: prod.sku || '',
        imageUrl: prod.imageUrl || '',
        currentPrice,
        originalPrice: prod.originalPrice ? Number(prod.originalPrice) : undefined,
        stockQuantity: availableStock,
        isAvailable: prod.isActive && isStockSufficient,
        isActive: prod.isActive,
        priceChanged,
        outOfStock: !isStockSufficient,
        store: {
          id: prod.store.id,
          name: prod.store.name,
          slug: prod.store.slug,
          logoUrl: prod.store.logoUrl || undefined,
        },
      });
    }

    const isValid = !hasOutOfStock && !hasPriceChange;

    return {
      success: true,
      isValid,
      hasPriceChange,
      hasOutOfStock,
      items: validatedItems,
      warnings,
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

    // 2. Nghiệp vụ FR-18: Khách đã xác nhận nhận hàng (COMPLETED) mới được review.
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Vui lòng xác nhận đã nhận hàng trước khi gửi đánh giá (trạng thái COMPLETED).',
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
      if (!freshOrder || freshOrder.status !== OrderStatus.COMPLETED)
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

  /**
   * FR-16/FR-20: Lấy danh sách đơn hàng thực tế của Gian Hàng (Merchant Orders)
   */
  async getMyStoreOrders(
    userId: string,
    userRole: string,
    query: {
      status?: OrderStatus;
      search?: string;
      page?: number | string;
      limit?: number | string;
      storeId?: string;
    },
  ) {
    let targetStoreId = query.storeId;
    if (
      targetStoreId &&
      userRole !== UserRole.SYSTEM_ADMIN &&
      userRole !== UserRole.SYSTEM_MANAGER
    ) {
      const ownedStore = await this.prisma.store.findFirst({
        where: { id: targetStoreId, ownerId: userId, isDeleted: false },
        select: { id: true },
      });
      if (!ownedStore) throw new ForbiddenException('Bạn không quản lý gian hàng này');
    }
    if (!targetStoreId) {
      if (userRole === UserRole.SYSTEM_ADMIN || userRole === UserRole.SYSTEM_MANAGER) {
        // Admin xem toàn bộ hoặc storeId truyền vào
      } else {
        const userStore = await this.prisma.store.findFirst({
          where: { ownerId: userId, isDeleted: false },
        });
        if (!userStore) {
          return {
            items: [],
            pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
          };
        }
        targetStoreId = userStore.id;
      }
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    if (targetStoreId) {
      where.storeId = targetStoreId;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { externalOrderSn: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          store: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
          attributedCollaborator: {
            select: { id: true, fullName: true, email: true },
          },
          orderItems: {
            include: {
              product: {
                select: { id: true, title: true, sku: true, imageUrl: true },
              },
            },
          },
          coupon: {
            select: { id: true, displayCode: true, discountType: true, discountValue: true },
          },
          commissions: {
            select: { id: true, commissionAmount: true, status: true },
          },
          returnRequest: true,
        },
      }),
    ]);

    return {
      items: orders.map((order) => {
        const raw = (order.rawPayload as Record<string, any>) || {};
        return {
          id: order.id,
          externalOrderSn: order.externalOrderSn,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          completedAt: order.completedAt,
          deliveredAt: order.deliveredAt,
          status: order.status,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          shippingAddress: order.shippingAddress,
          subtotalAmount: Number(order.subtotalAmount),
          discountAmount: Number(order.discountAmount),
          shippingFee: Number(order.shippingFee),
          finalAmount: Number(order.finalAmount),
          paymentMethod: raw.paymentMethod || 'COD',
          paymentStatus: raw.paymentStatus || 'UNPAID',
          trackingNumber: raw.trackingNumber || raw.ghnOrderCode || null,
          carrierName: raw.carrierName || (raw.ghnOrderCode ? 'Giao Hàng Nhanh (GHN)' : null),
          store: order.store,
          attributedCollaborator: order.attributedCollaborator,
          couponCode: order.couponCodeSnapshot || order.coupon?.displayCode || null,
          totalCommission: order.commissions.reduce(
            (sum, c) => sum + Number(c.commissionAmount || 0),
            0,
          ),
          returnRequest: order.returnRequest,
          items: order.orderItems.map((item) => ({
            productId: item.productId,
            title: item.product?.title || 'Sản phẩm',
            sku: item.product?.sku || '',
            imageUrl: item.product?.imageUrl || '',
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            appliedCommissionRate: Number(item.appliedCommissionRate || 0),
            calculatedCommissionAmount: Number(item.calculatedCommissionAmount || 0),
          })),
        };
      }),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async respondReturnRequest(
    orderId: string,
    userId: string,
    userRole: string,
    dto: RespondReturnRequestDto,
  ) {
    if (dto.decision !== ReturnDecision.APPROVE && dto.decision !== ReturnDecision.REJECT) {
      throw new BadRequestException('Quyết định xử lý không hợp lệ');
    }
    const response = dto.response?.trim();
    if (!response || response.length < 10) {
      throw new BadRequestException('Phản hồi phải có ít nhất 10 ký tự');
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { ownerId: true } }, returnRequest: true },
    });
    if (!order?.returnRequest) throw new NotFoundException('Không tìm thấy yêu cầu đổi trả');
    if (
      userRole !== UserRole.SYSTEM_ADMIN &&
      userRole !== UserRole.SYSTEM_MANAGER &&
      order.store.ownerId !== userId
    ) {
      throw new ForbiddenException('Bạn không quản lý gian hàng của đơn này');
    }
    if (order.status !== OrderStatus.RETURN_REQUESTED) {
      throw new ConflictException('Đơn hàng không còn ở trạng thái chờ xử lý đổi trả');
    }

    const approved = dto.decision === ReturnDecision.APPROVE;
    const result = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.returnRequest.updateMany({
        where: { id: order.returnRequest!.id, status: ReturnRequestStatus.REQUESTED },
        data: {
          status: approved ? ReturnRequestStatus.SHOP_APPROVED : ReturnRequestStatus.SHOP_REJECTED,
          shopResponse: response,
          shopRespondedAt: new Date(),
        },
      });
      if (changed.count !== 1) throw new ConflictException('Yêu cầu đã được xử lý trước đó');
      if (!approved) {
        const restored = await tx.order.updateMany({
          where: { id: orderId, status: OrderStatus.RETURN_REQUESTED },
          data: { status: order.returnRequest!.originalOrderStatus },
        });
        if (restored.count !== 1) throw new ConflictException('Đơn hàng đã thay đổi trạng thái');
      }
      await tx.notification.create({
        data: {
          userId: order.returnRequest!.customerId,
          title: approved ? 'Shop đã chấp thuận yêu cầu đổi trả' : 'Shop đã từ chối yêu cầu đổi trả',
          message: approved
            ? `Đơn ${order.externalOrderSn}: Shop đã đồng ý xử lý. Đây chưa phải xác nhận đã hoàn tiền. Phản hồi: ${response}`
            : `Đơn ${order.externalOrderSn}: ${response}`,
          type: approved ? 'RETURN_APPROVED' : 'RETURN_REJECTED',
          data: { orderId, returnRequestId: order.returnRequest!.id },
        },
      });
      return tx.returnRequest.findUniqueOrThrow({ where: { id: order.returnRequest!.id } });
    });
    return { message: approved ? 'Đã duyệt yêu cầu, chờ hoàn tất xử lý/hoàn tiền' : 'Đã từ chối yêu cầu', returnRequest: result };
  }

  /**
   * Cập nhật trạng thái giao hàng & mã vận đơn bưu cục của Shop
   */
  async updateOrderFulfillment(
    orderId: string,
    userId: string,
    userRole: string,
    dto: {
      status: OrderStatus;
      trackingNumber?: string;
      carrierName?: string;
      note?: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true, commissions: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng cần cập nhật');
    }

    if (
      userRole !== UserRole.SYSTEM_ADMIN &&
      userRole !== UserRole.SYSTEM_MANAGER &&
      order.store.ownerId !== userId
    ) {
      throw new ForbiddenException('Bạn không có quyền cập nhật đơn hàng của gian hàng này');
    }

    if (
      (dto.status !== OrderStatus.SHIPPING && dto.status !== OrderStatus.DELIVERED) ||
      (dto.status === OrderStatus.SHIPPING && order.status !== OrderStatus.PENDING) ||
      (dto.status === OrderStatus.DELIVERED && order.status !== OrderStatus.SHIPPING)
    ) {
      throw new BadRequestException('Chỉ được cập nhật đơn từ Chờ lấy hàng → Đang giao → Đã giao');
    }

    const currentRaw = (order.rawPayload as Record<string, any>) || {};
    const updatedRaw = {
      ...currentRaw,
      trackingNumber: dto.trackingNumber || currentRaw.trackingNumber,
      carrierName: dto.carrierName || currentRaw.carrierName || 'GHTK Express',
      fulfillmentNote: dto.note || currentRaw.fulfillmentNote,
      fulfillmentUpdatedAt: new Date().toISOString(),
    };

    const updateData: Prisma.OrderUpdateInput = {
      status: dto.status,
      rawPayload: updatedRaw,
      sourceUpdatedAt: new Date(),
    };

    if (dto.status === OrderStatus.DELIVERED && !order.deliveredAt) {
      updateData.deliveredAt = new Date();
      if (!order.completedAt) updateData.completedAt = new Date();
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    return {
      success: true,
      message: `Đã cập nhật trạng thái đơn hàng ${order.externalOrderSn} sang ${dto.status}`,
      orderId: updated.id,
      status: updated.status,
      trackingNumber: updatedRaw.trackingNumber,
      carrierName: updatedRaw.carrierName,
    };
  }

  // =========================================================================
  // NHIỆM VỤ 4: CỔNG PHÂN XỬ TRỌNG TÀI KHIẾU NẠI ĐỔI TRẢ ĐỘC LẬP (Leader Thắng)
  // =========================================================================

  /**
   * Khách hàng nộp hồ sơ khiếu nại (kèm video mở kiện unbox & ảnh bằng chứng)
   */
  async raiseDispute(
    orderId: string,
    customerId: string,
    dto: {
      reason: string;
      customerProofVideoUrl?: string;
      customerProofImages?: string[];
      notes?: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng cần khiếu nại');
    }

    if (order.customerId && order.customerId !== customerId) {
      throw new ForbiddenException('Bạn không sở hữu đơn hàng này');
    }

    const currentRaw = (order.rawPayload as Record<string, any>) || {};
    const disputeData = {
      status: 'OPENED',
      openedAt: new Date().toISOString(),
      customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      reason: dto.reason,
      customerProofVideoUrl: dto.customerProofVideoUrl || null,
      customerProofImages: dto.customerProofImages || [],
      customerNotes: dto.notes || null,
      storeResponse: null,
      arbitration: null,
    };

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        rawPayload: {
          ...currentRaw,
          dispute: disputeData,
        },
      },
    });

    if (order.store?.ownerId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: order.store.ownerId,
            title: `Khiếu nại đổi trả mới cho đơn ${order.externalOrderSn}`,
            message: `Khách hàng ${order.customerName} đã mở khiếu nại tranh chấp: "${dto.reason}". Vui lòng gửi giải trình.`,
            type: 'DISPUTE_OPENED',
            data: { orderId: order.id, externalOrderSn: order.externalOrderSn },
          },
        });
      } catch (e) {
        this.logger.warn(`Lỗi tạo thông báo: ${e}`);
      }
    }

    return {
      success: true,
      message: 'Hồ sơ khiếu nại đã được tiếp nhận và chuyển đến Cổng Trọng Tài độc lập.',
      dispute: disputeData,
    };
  }

  /**
   * Shop gửi phản hồi & chứng cứ đóng hàng/xuất kho
   */
  async respondDispute(
    orderId: string,
    shopOwnerId: string,
    dto: {
      storeResponse: string;
      storeProofImages?: string[];
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.store.ownerId !== shopOwnerId) {
      throw new ForbiddenException('Bạn không phải chủ gian hàng của đơn này');
    }

    const currentRaw = (order.rawPayload as Record<string, any>) || {};
    const existingDispute = currentRaw.dispute || {
      status: 'OPENED',
      openedAt: new Date().toISOString(),
    };

    const updatedDispute = {
      ...existingDispute,
      storeResponse: dto.storeResponse,
      storeProofImages: dto.storeProofImages || [],
      storeRespondedAt: new Date().toISOString(),
    };

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        rawPayload: {
          ...currentRaw,
          dispute: updatedDispute,
        },
      },
    });

    return {
      success: true,
      message: 'Gian hàng đã gửi phản hồi và chứng minh xuất kho thành công.',
      dispute: updatedDispute,
    };
  }

  /**
   * Quản trị viên (Admin) lấy danh sách tranh chấp
   */
  async getAdminDisputes() {
    const orders = await this.prisma.order.findMany({
      where: {
        rawPayload: {
          path: ['dispute'],
          not: Prisma.JsonNullValueFilter.JsonNull,
        },
      },
      include: {
        store: { select: { id: true, name: true, logoUrl: true } },
        orderItems: {
          include: {
            product: { select: { id: true, title: true, imageUrl: true } },
          },
        },
        commissions: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return orders.map((o) => {
      const raw = (o.rawPayload as Record<string, any>) || {};
      const dispute = raw.dispute || {};
      return {
        orderId: o.id,
        externalOrderSn: o.externalOrderSn,
        finalAmount: Number(o.finalAmount),
        status: o.status,
        createdAt: o.createdAt,
        store: o.store,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        orderItems: o.orderItems,
        commissions: o.commissions,
        dispute,
      };
    });
  }

  /**
   * Trọng tài tối cao (Admin) đưa ra Phán quyết Tranh chấp cuối cùng
   */
  async arbitrateDispute(
    orderId: string,
    adminUser: { id: string; fullName?: string; email: string },
    adminIp: string,
    dto: {
      ruling: 'REFUND_BUYER' | 'REJECT_BUYER';
      notes: string;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
        commissions: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng cần phán quyết');
    }

    const currentRaw = (order.rawPayload as Record<string, any>) || {};
    const existingDispute = currentRaw.dispute || {};

    const arbitrationRecord = {
      ruling: dto.ruling,
      notes: dto.notes,
      ruledAt: new Date().toISOString(),
      ruledBy: adminUser.fullName || adminUser.email,
      ruledById: adminUser.id,
    };

    let newStatus: OrderStatus = order.status;

    if (dto.ruling === 'REFUND_BUYER') {
      newStatus = OrderStatus.RETURNED;
      if (order.commissions && order.commissions.length > 0) {
        for (const comm of order.commissions) {
          if (comm.status === CommissionStatus.PENDING) {
            try {
              await this.prisma.$transaction(async (tx) => {
                await this.walletsService.reversePendingBalance(
                  tx,
                  comm.collaboratorId,
                  comm.commissionAmount,
                  { id: comm.id, type: 'ORDER_REFUND' },
                  comm.storeWalletTracked ? order.storeId : undefined,
                );
                await tx.commission.update({
                  where: { id: comm.id },
                  data: {
                    status: CommissionStatus.REVERSED,
                    reversedAt: new Date(),
                  },
                });
              });
            } catch (err) {
              this.logger.error(`Lỗi thu hồi hoa hồng khi hoàn tiền tranh chấp: ${err}`);
            }
          }
        }
      }
    }

    const updatedDispute = {
      ...existingDispute,
      status: dto.ruling === 'REFUND_BUYER' ? 'RESOLVED_REFUND' : 'RESOLVED_REJECTED',
      arbitration: arbitrationRecord,
    };

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        rawPayload: {
          ...currentRaw,
          dispute: updatedDispute,
        },
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: `DISPUTE_ARBITRATION_${dto.ruling}`,
          ipAddress: adminIp,
          details: {
            orderId,
            orderSn: order.externalOrderSn,
            ruling: dto.ruling,
            notes: dto.notes,
            storeId: order.storeId,
            customerId: order.customerId,
          },
        },
      });
    } catch (e) {
      this.logger.warn(`Không thể ghi AuditLog phán quyết: ${e}`);
    }

    if (order.customerId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: order.customerId,
            title: `Phán quyết khiếu nại đơn hàng ${order.externalOrderSn}`,
            message:
              dto.ruling === 'REFUND_BUYER'
                ? `Trọng tài SCANMS đã chấp thuận yêu cầu hoàn tiền của bạn. Căn cứ: "${dto.notes}".`
                : `Trọng tài SCANMS đã bác bỏ khiếu nại. Căn cứ: "${dto.notes}".`,
            type: 'DISPUTE_RESOLVED',
            data: { orderId, ruling: dto.ruling },
          },
        });
      } catch (e) {}
    }

    if (order.store?.ownerId) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: order.store.ownerId,
            title: `Kết quả trọng tài tranh chấp đơn ${order.externalOrderSn}`,
            message:
              dto.ruling === 'REFUND_BUYER'
                ? `Trọng tài quyết định hoàn tiền cho khách. Ghi chú: "${dto.notes}".`
                : `Trọng tài đã bảo vệ gian hàng, bác bỏ khiếu nại của khách.`,
            type: 'DISPUTE_RESOLVED',
            data: { orderId, ruling: dto.ruling },
          },
        });
      } catch (e) {}
    }

    return {
      success: true,
      message:
        dto.ruling === 'REFUND_BUYER'
          ? 'Đã ban hành phán quyết chấp thuận hoàn tiền cho người mua.'
          : 'Đã ban hành phán quyết bác bỏ khiếu nại, bảo vệ gian hàng.',
      orderStatus: newStatus,
      dispute: updatedDispute,
    };
  }
}
