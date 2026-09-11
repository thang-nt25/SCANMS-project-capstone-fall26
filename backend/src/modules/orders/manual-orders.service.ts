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
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateManualOrderDto } from './dto/create-manual-order.dto';

export interface OrderManagerIdentity {
  id: string;
  role: UserRole;
}

@Injectable()
export class ManualOrdersService {
  constructor(private readonly prisma: PrismaService) {}

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
    const externalOrderSn =
      dto.externalOrderSn?.trim() || this.generateManualOrderCode();

    await this.ensureOrderDoesNotExist(store.id, externalOrderSn);

    const resolvedItems = await this.resolveProducts(store.id, dto);
    const subtotalAmount = resolvedItems.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0,
    );
    const discountAmount = dto.discountAmount ?? 0;
    if (discountAmount > subtotalAmount) {
      throw new BadRequestException(
        'Tiền giảm giá không được lớn hơn tiền hàng',
      );
    }

    try {
      const order = await this.prisma.$transaction((tx) =>
        tx.order.create({
          data: {
            storeId: store.id,
            sourcePlatform: OrderSourcePlatform.INTERNAL,
            externalOrderSn,
            customerName: dto.customerName.trim(),
            customerPhone: dto.customerPhone.trim(),
            shippingAddress: dto.shippingAddress.trim(),
            subtotalAmount,
            discountAmount,
            finalAmount: subtotalAmount - discountAmount,
            status: dto.status ?? OrderStatus.PENDING,
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
        }),
      );

      return {
        message: 'Tạo đơn hàng thủ công thành công',
        order,
      };
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          `Mã đơn hàng ${externalOrderSn} đã tồn tại`,
        );
      }
      throw error;
    }
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

  private async resolveProducts(storeId: string, dto: CreateManualOrderDto) {
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

      return {
        productId: product.id,
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
