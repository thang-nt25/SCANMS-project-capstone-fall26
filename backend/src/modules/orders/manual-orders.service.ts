import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderSourcePlatform,
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { randomUUID, createHash } from 'crypto';
import {
  normalizeCustomerPhone,
  validateOrderMoney,
  MAX_ORDER_ITEMS,
} from './order-input.utils';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';
import { CouponsService } from '../coupons/coupons.service';
import { ManualOrderDiscountDto } from './dto/manual-order-discount.dto';

export interface OrderManagerIdentity {
  id: string;
  role: UserRole;
}

@Injectable()
export class ManualOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponsService: CouponsService,
  ) {}

  private readonly orderSelect = {
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
    shippingFee: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    orderItems: {
      select: {
        id: true,
        quantity: true,
        unitPrice: true,
        product: {
          select: { id: true, sku: true, title: true },
        },
      },
    },
  } satisfies Prisma.OrderSelect;

  async createManualOrder(
    manager: OrderManagerIdentity,
    dto: CreateManualOrderDto,
  ) {
    const store = await this.resolveManagedStore(manager, dto.storeId);
    return this.createManualOrderForStore(store.id, dto);
  }

  async createManualOrderForStore(storeId: string, dto: CreateManualOrderDto) {
    if (dto.customer) {
      dto = {
        ...dto,
        customerName: dto.customer.name,
        customerPhone: dto.customer.phone,
        shippingAddress: [
          dto.customer.address,
          dto.customer.ward,
          dto.customer.district,
          dto.customer.province,
        ]
          .filter(Boolean)
          .join(', '),
      };
    }
    const customerPhone = normalizeCustomerPhone(dto.customerPhone);
    if (!dto.items.length || dto.items.length > MAX_ORDER_ITEMS) {
      throw new BadRequestException('Số dòng sản phẩm không hợp lệ');
    }
    dto.items.forEach((item) => {
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 2147483647
      )
        throw new BadRequestException('Số lượng sản phẩm không hợp lệ');
      if (item.unitPrice !== undefined)
        validateOrderMoney(item.unitPrice, 'Đơn giá');
      if (item.unitPrice !== undefined && item.unitPrice <= 0)
        throw new BadRequestException('Đơn giá phải lớn hơn 0');
    });
    validateOrderMoney(dto.discountAmount ?? 0, 'Giảm giá');
    validateOrderMoney(dto.shippingFee ?? 0, 'Phí vận chuyển');
    if ((dto.shippingFee ?? 0) > 9999999999.99)
      throw new BadRequestException('Phí vận chuyển vượt giới hạn');
    const externalOrderSn =
      dto.externalOrderSn?.trim() ||
      (dto.requestId
        ? `MANUAL-${dto.requestId}`
        : this.generateManualOrderCode());

    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ ...dto, customerPhone }))
      .digest('hex');
    if (dto.requestId && !dto.externalOrderSn?.trim()) {
      const existing = await this.prisma.order.findFirst({
        where: {
          storeId,
          sourcePlatform: OrderSourcePlatform.INTERNAL,
          externalOrderSn,
        },
        select: { ...this.orderSelect, rawPayload: true },
      });
      if (existing) {
        if (
          (existing.rawPayload as { requestFingerprint?: string } | null)
            ?.requestFingerprint !== fingerprint
        )
          throw new ConflictException(
            'requestId đã được dùng với nội dung khác',
          );
        return { message: 'Đơn hàng đã được tiếp nhận', order: existing };
      }
    }

    if (!dto.requestId || dto.externalOrderSn?.trim())
      await this.ensureOrderDoesNotExist(storeId, externalOrderSn);

    const resolvedItems = await this.resolveProducts(storeId, dto);
    const subtotalAmount = resolvedItems.reduce(
      (total, item) =>
        total.plus(new Prisma.Decimal(item.unitPrice).times(item.quantity)),
      new Prisma.Decimal(0),
    );
    let discountAmount = dto.discountAmount ?? 0;
    const shippingFee = new Prisma.Decimal(dto.shippingFee ?? 0);
    validateOrderMoney(subtotalAmount.toNumber(), 'Tổng tiền hàng');
    if (subtotalAmount.lessThan(discountAmount)) {
      throw new BadRequestException(
        'Tiền giảm giá không được lớn hơn tiền hàng',
      );
    }

    // Validate outside the transaction: the existing validator uses its own Prisma connection.
    // Capture a version first, then reject any coupon mutation while waiting for the lock.
    const couponSnapshot = dto.discountCode
      ? await this.prisma.coupon.findUnique({
          where: { codeNormalized: dto.discountCode.trim().toUpperCase() },
          select: {
            id: true,
            storeId: true,
            updatedAt: true,
            usageCount: true,
            budgetUsed: true,
          },
        })
      : undefined;
    if (
      dto.discountCode &&
      (!couponSnapshot || couponSnapshot.storeId !== storeId)
    )
      throw new BadRequestException('Mã giảm giá không thuộc cửa hàng này');
    const preparedCoupon = dto.discountCode
      ? await this.validateManualCoupon(
          storeId,
          dto.customerPhone,
          dto.discountCode,
          resolvedItems,
        )
      : undefined;

    try {
      const order = await this.prisma.$transaction(
        async (tx) => {
          // Check the aggregate quantity, including repeated product rows, under a row lock.
          // FR-20 reconciles orders: this checks stock but does not reserve/decrement inventory.
          const quantities = new Map<string, number>();
          for (const item of resolvedItems)
            quantities.set(
              item.productId,
              (quantities.get(item.productId) ?? 0) + item.quantity,
            );
          const lockedProducts = await tx.$queryRaw<
            Array<{
              id: string;
              stock_quantity: number;
              is_active: boolean;
              is_deleted: boolean;
            }>
          >(Prisma.sql`
          SELECT id, stock_quantity, is_active, is_deleted FROM products
          WHERE store_id = ${storeId}::uuid AND id IN (${Prisma.join([...quantities.keys()].map((id) => Prisma.sql`${id}::uuid`))})
          ORDER BY id FOR UPDATE
        `);
          if (lockedProducts.length !== quantities.size)
            throw new BadRequestException('Sản phẩm không còn thuộc cửa hàng');
          for (const product of lockedProducts) {
            if (!product.is_active || product.is_deleted)
              throw new BadRequestException('Sản phẩm đã ngừng bán');
            if ((quantities.get(product.id) ?? 0) > product.stock_quantity)
              throw new BadRequestException(
                `Sản phẩm ${resolvedItems.find((item) => item.productId === product.id)?.sku}: số lượng vượt tồn kho (${product.stock_quantity})`,
              );
          }

          const coupon = preparedCoupon;
          if (coupon && couponSnapshot) {
            await tx.$queryRaw`SELECT id FROM coupons WHERE id = ${couponSnapshot.id}::uuid FOR UPDATE`;
            const lockedCoupon = await tx.coupon.findUnique({
              where: { id: couponSnapshot.id },
              select: {
                updatedAt: true,
                startsAt: true,
                expiresAt: true,
                usageCount: true,
                budgetUsed: true,
              },
            });
            if (
              !lockedCoupon ||
              lockedCoupon.updatedAt.getTime() !==
                couponSnapshot.updatedAt.getTime() ||
              lockedCoupon.usageCount !== couponSnapshot.usageCount ||
              !lockedCoupon.budgetUsed.equals(couponSnapshot.budgetUsed) ||
              (lockedCoupon.startsAt && lockedCoupon.startsAt > new Date()) ||
              (lockedCoupon.expiresAt && lockedCoupon.expiresAt <= new Date())
            )
              throw new BadRequestException(
                'Mã giảm giá đã thay đổi hoặc hết hạn. Vui lòng áp dụng lại mã',
              );
            discountAmount = coupon.discountAmount;
            if (
              dto.discountAmount !== undefined &&
              !new Prisma.Decimal(dto.discountAmount).equals(discountAmount)
            )
              throw new BadRequestException(
                'Giảm giá đã thay đổi. Vui lòng áp dụng lại mã',
              );
          }
          const finalAmount = subtotalAmount
            .plus(shippingFee)
            .minus(discountAmount);
          validateOrderMoney(finalAmount.toNumber(), 'Tổng đơn hàng');
          if (
            dto.totalAmount !== undefined &&
            !finalAmount.equals(dto.totalAmount)
          )
            throw new BadRequestException(
              'Tổng đơn hàng không khớp với số tiền backend tính',
            );
          const order = await tx.order.create({
            data: {
              storeId,
              sourcePlatform: OrderSourcePlatform.INTERNAL,
              externalOrderSn,
              customerName: dto.customerName.trim(),
              customerPhone,
              rawPayload: {
                requestFingerprint: fingerprint,
                ...(dto.customer ? { customer: { ...dto.customer } } : {}),
                ...(dto.paymentMethod
                  ? { paymentMethod: dto.paymentMethod }
                  : {}),
                ...(dto.note ? { note: dto.note.trim() } : {}),
              },
              shippingAddress: dto.shippingAddress.trim(),
              subtotalAmount,
              discountAmount,
              shippingFee,
              finalAmount,
              ...(coupon
                ? {
                    couponId: coupon.couponId,
                    couponCodeSnapshot: coupon.code,
                    couponDiscountAmount: discountAmount,
                  }
                : {}),
              status: dto.status ?? OrderStatus.PENDING,
              completedAt:
                dto.status === OrderStatus.DELIVERED ||
                dto.status === OrderStatus.COMPLETED
                  ? new Date()
                  : undefined,
              orderItems: {
                create: resolvedItems.map((item) => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  // FR-21 owns commission calculation and wallet mutations.
                  appliedCommissionRate: 0,
                  calculatedCommissionAmount: 0,
                })),
              },
            },
            select: this.orderSelect,
          });
          if (coupon) {
            const funding = await tx.coupon.findUniqueOrThrow({
              where: { id: coupon.couponId },
              select: { shopFundingRate: true, platformFundingRate: true },
            });
            const shopFundedAmount = new Prisma.Decimal(discountAmount)
              .times(funding.shopFundingRate)
              .div(100)
              .toDecimalPlaces(2);
            await tx.coupon.update({
              where: { id: coupon.couponId },
              data: {
                usageCount: { increment: 1 },
                budgetUsed: { increment: discountAmount },
              },
            });
            await tx.couponRedemption.create({
              data: {
                couponId: coupon.couponId,
                orderId: order.id,
                collaboratorId: coupon.collaboratorId,
                storeId,
                customerPhone,
                discountAmount,
                eligibleSubtotal: coupon.eligibleSubtotal,
                shopFundedAmount,
                platformFundedAmount: new Prisma.Decimal(discountAmount).minus(
                  shopFundedAmount,
                ),
                couponCodeSnapshot: coupon.code,
                discountTypeSnapshot: coupon.discountType,
                discountValueSnapshot: coupon.discountValue,
              },
            });
          }
          return order;
        },
        { timeout: 30000 },
      );

      return {
        message: 'Tạo đơn hàng thủ công thành công',
        order,
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        if (dto.requestId && !dto.externalOrderSn?.trim()) {
          const existing = await this.prisma.order.findFirst({
            where: {
              storeId,
              sourcePlatform: OrderSourcePlatform.INTERNAL,
              externalOrderSn,
            },
            select: { ...this.orderSelect, rawPayload: true },
          });
          if (
            (existing?.rawPayload as { requestFingerprint?: string } | null)
              ?.requestFingerprint === fingerprint
          )
            return { message: 'Đơn hàng đã được tiếp nhận', order: existing! };
        }
        throw new ConflictException(
          `Mã đơn hàng ${externalOrderSn} đã tồn tại`,
        );
      }
      throw error;
    }
  }

  async quoteDiscount(
    manager: OrderManagerIdentity,
    dto: ManualOrderDiscountDto,
  ) {
    const store = await this.resolveManagedStore(manager, dto.storeId);
    const items = await this.resolveProducts(store.id, { items: dto.items });
    const coupon = await this.validateManualCoupon(
      store.id,
      dto.customerPhone,
      dto.discountCode,
      items,
    );
    return {
      code: coupon.code,
      discountAmount: coupon.discountAmount,
      message: coupon.message,
    };
  }

  private async validateManualCoupon(
    storeId: string,
    phone: string,
    code: string,
    items: Awaited<ReturnType<ManualOrdersService['resolveProducts']>>,
  ) {
    // Existing coupon validation calculates against catalog prices. Do not silently apply it to overridden prices.
    if (
      items.some(
        (item) => !new Prisma.Decimal(item.unitPrice).equals(item.catalogPrice),
      )
    )
      throw new BadRequestException(
        'Đơn dùng mã giảm giá phải giữ đơn giá niêm yết. Xóa mã nếu muốn chỉnh giá',
      );
    return this.couponsService.validateCoupon(
      {
        storeId,
        code,
        customerPhone: normalizeCustomerPhone(phone),
        items: items.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
      },
      `manual_${storeId}`,
    );
  }

  async resolveManagedStore(
    manager: OrderManagerIdentity,
    requestedStoreId?: string,
  ) {
    if (manager.role === UserRole.SHOP_MANAGER) {
      const store = await this.prisma.store.findFirst({
        where: {
          ownerId: manager.id,
          isDeleted: false,
          ...(requestedStoreId ? { id: requestedStoreId } : {}),
        },
      });
      if (!store && requestedStoreId) {
        throw new ForbiddenException(
          'Bạn không có quyền tạo đơn cho cửa hàng này',
        );
      }
      if (!store) {
        throw new NotFoundException('Không tìm thấy cửa hàng của bạn');
      }
      return store;
    }

    if (!requestedStoreId) {
      throw new BadRequestException(
        'Quản trị viên phải cung cấp storeId khi tạo đơn hàng',
      );
    }

    const store = await this.prisma.store.findFirst({
      where: { id: requestedStoreId, isDeleted: false },
    });
    if (!store) {
      throw new NotFoundException('Không tìm thấy cửa hàng');
    }
    return store;
  }

  private async ensureOrderDoesNotExist(
    storeId: string,
    externalOrderSn: string,
  ): Promise<void> {
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        storeId,
        sourcePlatform: OrderSourcePlatform.INTERNAL,
        externalOrderSn,
      },
      select: { id: true },
    });
    if (existingOrder) {
      throw new ConflictException(`Mã đơn hàng ${externalOrderSn} đã tồn tại`);
    }
  }

  private async resolveProducts(
    storeId: string,
    dto: Pick<CreateManualOrderDto, 'items'>,
  ) {
    if (dto.items.some((item) => !item.productId && !item.sku?.trim())) {
      throw new BadRequestException('Mỗi sản phẩm phải có productId hoặc SKU');
    }

    const productIds = dto.items
      .map((item) => item.productId)
      .filter((id): id is string => Boolean(id));
    const skus = dto.items
      .map((item) => item.sku?.trim())
      .filter((sku): sku is string => Boolean(sku));
    const products = await this.prisma.product.findMany({
      where: {
        storeId,
        isDeleted: false,
        isActive: true,
        OR: [
          ...(productIds.length > 0 ? [{ id: { in: productIds } }] : []),
          ...skus.map((sku) => ({
            sku: { equals: sku, mode: 'insensitive' as const },
          })),
        ],
      },
      select: { id: true, sku: true, title: true, price: true },
    });
    const productsById = new Map(
      products.map((product) => [product.id, product]),
    );
    const productsBySku = new Map(
      products.map((product) => [product.sku.toUpperCase(), product]),
    );

    return dto.items.map((item, index) => {
      const product =
        (item.productId ? productsById.get(item.productId) : undefined) ??
        (item.sku
          ? productsBySku.get(item.sku.trim().toUpperCase())
          : undefined);
      if (!product) {
        throw new BadRequestException(
          `Không tìm thấy sản phẩm ở dòng ${index + 1}: ${item.sku ?? item.productId}`,
        );
      }

      if (
        item.sku &&
        product.sku.toUpperCase() !== item.sku.trim().toUpperCase()
      )
        throw new BadRequestException(
          `SKU không khớp sản phẩm ở dòng ${index + 1}`,
        );
      if (Number(item.unitPrice ?? product.price) <= 0)
        throw new BadRequestException(
          `Đơn giá phải lớn hơn 0 ở dòng ${index + 1}`,
        );

      return {
        productId: product.id,
        sku: product.sku,
        catalogPrice: product.price,
        quantity: item.quantity,
        unitPrice: item.unitPrice ?? Number(product.price),
      };
    });
  }

  private generateManualOrderCode(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `MANUAL-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
