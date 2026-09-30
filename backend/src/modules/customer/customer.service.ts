import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { OrderStatus, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateCustomerProfileDto } from './dto/update-profile.dto';
import { ChangeCustomerPasswordDto } from './dto/change-password.dto';
import { CreateCustomerAddressDto } from './dto/create-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-address.dto';
import { CustomerOrdersQueryDto } from './dto/customer-orders-query.dto';
import { SyncCustomerCartDto } from './dto/sync-cart.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';

const RETURN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Lấy thông tin hồ sơ khách hàng kèm chỉ số tổng hợp
   */
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    // Điều kiện khớp đơn hàng của user
    const orderFilterOr: any[] = [{ customerId: userId }];
    if (user.email) orderFilterOr.push({ customerEmail: user.email.toLowerCase() });
    if (user.phoneNumber) orderFilterOr.push({ customerPhone: user.phoneNumber.trim() });

    const [totalOrders, pendingOrders, completedOrders] = await Promise.all([
      this.prisma.order.count({ where: { OR: orderFilterOr } }),
      this.prisma.order.count({
        where: {
          OR: orderFilterOr,
          status: OrderStatus.PENDING,
        },
      }),
      this.prisma.order.findMany({
        where: {
          OR: orderFilterOr,
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] },
        },
        select: { finalAmount: true },
      }),
    ]);

    const totalSpending = completedOrders.reduce(
      (sum, o) => sum + Number(o.finalAmount || 0),
      0,
    );

    const wishlistCount = await this.prisma.customerWishlist.count({
      where: { userId },
    });

    return {
      user,
      stats: {
        totalOrders,
        pendingOrders,
        totalSpending,
        wishlistCount,
      },
    };
  }

  /**
   * 2. Cập nhật thông tin họ tên, số điện thoại
   */
  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    const dataToUpdate: any = {};
    if (dto.fullName !== undefined) dataToUpdate.fullName = dto.fullName.trim();
    if (dto.phoneNumber !== undefined) dataToUpdate.phoneNumber = dto.phoneNumber.trim();

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Cập nhật thông tin tài khoản thành công',
      user: updated,
    };
  }

  /**
   * 3. Đổi mật khẩu an toàn
   */
  async changePassword(userId: string, dto: ChangeCustomerPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản người dùng');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return {
      message: 'Đổi mật khẩu tài khoản thành công',
    };
  }

  /**
   * 4. Lấy danh sách đơn mua của khách hàng (lọc theo trạng thái & tìm kiếm)
   */
  async getOrders(userId: string, query: CustomerOrdersQueryDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phoneNumber: true },
    });

    const orderFilterOr: any[] = [{ customerId: userId }];
    if (user?.email) orderFilterOr.push({ customerEmail: user.email.toLowerCase() });
    if (user?.phoneNumber) orderFilterOr.push({ customerPhone: user.phoneNumber.trim() });

    const where: any = {
      OR: orderFilterOr,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.AND = [
        {
          OR: [
            { externalOrderSn: { contains: q, mode: 'insensitive' } },
            { orderItems: { some: { product: { title: { contains: q, mode: 'insensitive' } } } } },
          ],
        },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        store: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        orderItems: {
          include: {
            product: {
              select: { id: true, title: true, imageUrl: true, sku: true },
            },
            variant: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        coupon: {
          select: { displayCode: true, codeNormalized: true, discountValue: true, discountType: true },
        },
        returnRequest: true,
        productReviews: true,
      },
    });

    return {
      total: orders.length,
      orders,
    };
  }

  /**
   * 5. Chi tiết 1 đơn hàng của khách
   */
  async getOrderDetails(userId: string, orderId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phoneNumber: true },
    });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: true,
        orderItems: {
          include: {
            product: true,
            variant: true,
          },
        },
        coupon: true,
        paymentTransactions: true,
        productReviews: true,
        returnRequest: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    const belongsToUser =
      order.customerId === userId ||
      (order.customerEmail && user?.email && order.customerEmail.toLowerCase() === user.email.toLowerCase()) ||
      (order.customerPhone && user?.phoneNumber && order.customerPhone.trim() === user.phoneNumber.trim());

    if (!belongsToUser) {
      throw new ForbiddenException('Bạn không có quyền truy cập đơn hàng này');
    }

    return order;
  }

  /**
   * 6. Khách hàng tự hủy đơn hàng (khi đơn đang PENDING)
   */
  async cancelOrder(userId: string, orderId: string, reason?: string) {
    const order = await this.getOrderDetails(userId, orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Không thể hủy đơn hàng ở trạng thái "${order.status}". Chỉ có thể hủy đơn khi đang Chờ xác nhận.`,
      );
    }

    const cancelledOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        overrideReason: reason || 'Khách hàng yêu cầu hủy đơn trên hệ thống',
      },
    });

    return {
      message: 'Hủy đơn hàng thành công',
      order: cancelledOrder,
    };
  }

  /** Xác nhận giao hàng, đổi trả, đánh giá xác minh và giỏ hàng tập trung. */
  async confirmReceipt(userId: string, orderId: string) {
    const order = await this.getOrderDetails(userId, orderId);
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Chỉ có thể xác nhận khi đơn đang ở trạng thái Đã giao');
    }
    if (order.returnRequest) {
      throw new BadRequestException('Đơn hàng đang có yêu cầu đổi trả nên chưa thể hoàn tất');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.DELIVERED, returnRequest: { is: null } },
        data: { status: OrderStatus.COMPLETED, completedAt: new Date() },
      });
      if (changed.count !== 1) throw new BadRequestException('Đơn đã thay đổi trạng thái hoặc có yêu cầu đổi trả');
      return tx.order.findUniqueOrThrow({ where: { id: orderId } });
    });
    return { message: 'Đã xác nhận nhận hàng. Bạn có thể đánh giá sản phẩm.', order: updated };
  }

  async getReturnRequest(userId: string, orderId: string) {
    await this.getOrderDetails(userId, orderId);
    return this.prisma.returnRequest.findUnique({ where: { orderId } });
  }

  async createReturnRequest(
    userId: string,
    orderId: string,
    dto: CreateReturnRequestDto,
  ) {
    const order = await this.getOrderDetails(userId, orderId);
    if (
      order.status !== OrderStatus.DELIVERED &&
      order.status !== OrderStatus.COMPLETED
    ) {
      throw new BadRequestException('Chỉ đơn đã giao mới được yêu cầu đổi trả/hoàn tiền');
    }
    if (order.returnRequest) {
      throw new BadRequestException('Đơn hàng này đã có yêu cầu đổi trả');
    }

    const deliveredAt = order.deliveredAt || order.completedAt;
    if (!deliveredAt) {
      throw new BadRequestException('Chưa xác định được ngày giao hàng; vui lòng liên hệ hỗ trợ');
    }
    const deadlineAt = new Date(deliveredAt.getTime() + RETURN_WINDOW_MS);
    if (deadlineAt.getTime() < Date.now()) {
      throw new BadRequestException('Đơn hàng đã quá thời hạn đổi trả 14 ngày');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: {
          id: orderId,
          status: order.status,
          returnRequest: { is: null },
        },
        data: { status: OrderStatus.RETURN_REQUESTED },
      });
      if (changed.count !== 1) throw new BadRequestException('Đơn đã thay đổi trạng thái hoặc đã có yêu cầu đổi trả');
      const request = await tx.returnRequest.create({
        data: {
          orderId,
          customerId: userId,
          reason: dto.reason,
          details: dto.details?.trim() || null,
          imageUrls: dto.imageUrls,
          unboxingVideoUrl: dto.unboxingVideoUrl,
          deadlineAt,
          originalOrderStatus: order.status,
        },
      });
      await tx.notification.create({
        data: {
          userId: order.store.ownerId,
          title: 'Yêu cầu đổi trả mới',
          message: `Đơn ${order.externalOrderSn} vừa gửi yêu cầu đổi trả có video mở hộp.`,
          type: 'RETURN_REQUESTED',
          data: { orderId, returnRequestId: request.id },
        },
      });
      return request;
    });

    return { message: 'Đã gửi yêu cầu đổi trả đến Shop', returnRequest: result };
  }

  async createVerifiedReview(
    userId: string,
    orderId: string,
    dto: CreateCustomerReviewDto,
  ) {
    const order = await this.getOrderDetails(userId, orderId);
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException("Bạn cần bấm 'Đã nhận hàng - Hoàn tất' trước khi đánh giá");
    }
    if (order.returnRequest) {
      throw new BadRequestException('Không thể đánh giá khi đơn hàng có yêu cầu đổi trả');
    }
    if (!order.orderItems.some((item) => item.productId === dto.productId)) {
      throw new BadRequestException('Sản phẩm không thuộc đơn hàng này');
    }
    if (order.productReviews.some((review) => review.productId === dto.productId)) {
      throw new BadRequestException('Sản phẩm này đã được đánh giá trong đơn hàng');
    }

    const review = await this.prisma.productReview.create({
      data: {
        orderId,
        productId: dto.productId,
        customerName: order.customerName || 'Khách mua hàng',
        rating: dto.rating,
        comment: dto.comment.trim(),
        images: dto.images || [],
        reviewImageUrl: dto.images?.[0] || null,
        status: ReviewStatus.PENDING,
        isApproved: false,
      },
    });
    return { message: 'Đã gửi đánh giá xác minh, đang chờ Shop duyệt', review };
  }

  async getCart(userId: string) {
    const rows = await this.prisma.customerCartItem.findMany({
      where: { userId },
      orderBy: { updatedAt: 'asc' },
      include: {
        variant: true,
        product: {
          include: { store: true, variants: { orderBy: { createdAt: 'asc' } } },
        },
      },
    });

    return {
      items: rows.map((row) => {
        const variant = row.variant;
        const product = row.product;
        const stockQuantity = variant?.stockQuantity ?? product.stockQuantity;
        const price = variant?.price ?? product.price;
        return {
          id: row.id,
          cartItemId: `${product.id}_${variant?.id || 'base'}`,
          productId: product.id,
          variantId: variant?.id,
          variantName: variant?.name,
          title: product.title,
          sku: variant?.sku || product.sku,
          price: Number(price),
          originalPrice: product.originalPrice ? Number(product.originalPrice) : undefined,
          imageUrl: product.imageUrl || '/assets/product-placeholder.svg',
          quantity: Math.min(row.quantity, Math.max(stockQuantity, 1)),
          stockQuantity,
          isActive: product.isActive && !product.isDeleted && (variant?.isActive ?? true),
          store: {
            id: product.store.id,
            name: product.store.name,
            slug: product.store.slug,
            logoUrl: product.store.logoUrl || undefined,
            policyReturn: product.store.policyReturn || undefined,
            policyWarranty: product.store.policyWarranty || undefined,
            policyShipping: product.store.policyShipping || undefined,
          },
          availableVariants: product.variants.map((item) => ({
            id: item.id,
            name: item.name,
            sku: item.sku,
            price: item.price ? Number(item.price) : null,
            stockQuantity: item.stockQuantity,
            isActive: item.isActive,
          })),
        };
      }),
      syncedAt: new Date().toISOString(),
    };
  }

  async syncCart(userId: string, dto: SyncCustomerCartDto) {
    const unique = new Map<string, (typeof dto.items)[number]>();
    for (const item of dto.items) {
      unique.set(`${item.productId}:${item.variantId || 'base'}`, item);
    }

    const items = Array.from(unique.values());
    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((item) => item.productId) }, isDeleted: false },
      include: { variants: true },
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    const warnings: string[] = [];
    const valid = items.flatMap((item) => {
      const product = productMap.get(item.productId);
      const variant = item.variantId
        ? product?.variants.find((entry) => entry.id === item.variantId)
        : undefined;
      if (!product || !product.isActive || (item.variantId && !variant)) {
        warnings.push('Một sản phẩm không còn khả dụng và đã được bỏ khỏi giỏ hàng.');
        return [];
      }
      const stock = variant?.stockQuantity ?? product.stockQuantity;
      if (stock <= 0) warnings.push(`Sản phẩm "${product.title}" đã hết hàng.`);
      return [{
        userId,
        productId: product.id,
        variantId: variant?.id || null,
        variantKey: variant?.id || 'base',
        quantity: Math.max(1, Math.min(item.quantity, Math.max(stock, 1))),
      }];
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.customerCartItem.deleteMany({ where: { userId } });
      if (valid.length) await tx.customerCartItem.createMany({ data: valid });
    });
    const cart = await this.getCart(userId);
    return { ...cart, warnings };
  }

  async getAddresses(userId: string) {
    return this.prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateCustomerAddressDto) {
    const existingCount = await this.prisma.customerAddress.count({
      where: { userId },
    });

    const shouldBeDefault = dto.isDefault || existingCount === 0;

    if (shouldBeDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newAddress = await this.prisma.customerAddress.create({
      data: {
        userId,
        fullName: dto.fullName.trim(),
        phoneNumber: dto.phoneNumber.trim(),
        provinceCode: dto.provinceCode,
        provinceName: dto.provinceName.trim(),
        districtCode: dto.districtCode,
        districtName: dto.districtName.trim(),
        wardCode: dto.wardCode,
        wardName: dto.wardName.trim(),
        detailAddress: dto.detailAddress.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        isDefault: shouldBeDefault,
      },
    });

    return {
      message: 'Thêm địa chỉ nhận hàng thành công',
      address: newAddress,
    };
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateCustomerAddressDto) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ nhận hàng');
    }

    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        fullName: dto.fullName !== undefined ? dto.fullName.trim() : undefined,
        phoneNumber: dto.phoneNumber !== undefined ? dto.phoneNumber.trim() : undefined,
        provinceCode: dto.provinceCode !== undefined ? dto.provinceCode : undefined,
        provinceName: dto.provinceName !== undefined ? dto.provinceName.trim() : undefined,
        districtCode: dto.districtCode !== undefined ? dto.districtCode : undefined,
        districtName: dto.districtName !== undefined ? dto.districtName.trim() : undefined,
        wardCode: dto.wardCode !== undefined ? dto.wardCode : undefined,
        wardName: dto.wardName !== undefined ? dto.wardName.trim() : undefined,
        detailAddress: dto.detailAddress !== undefined ? dto.detailAddress.trim() : undefined,
        latitude: dto.latitude !== undefined ? dto.latitude : undefined,
        longitude: dto.longitude !== undefined ? dto.longitude : undefined,
        isDefault: dto.isDefault !== undefined ? dto.isDefault : undefined,
      },
    });

    return {
      message: 'Cập nhật địa chỉ nhận hàng thành công',
      address: updated,
    };
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    await this.prisma.customerAddress.delete({
      where: { id: addressId },
    });

    // Nếu xóa địa chỉ mặc định, tự động gán địa chỉ còn lại làm mặc định
    if (address.isDefault) {
      const remaining = await this.prisma.customerAddress.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (remaining) {
        await this.prisma.customerAddress.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Đã xóa địa chỉ thành công' };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    await this.prisma.customerAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return {
      message: 'Đã đặt làm địa chỉ mặc định',
      address: updated,
    };
  }

  /**
   * 8. Quản lý danh sách sản phẩm yêu thích (Wishlist)
   */
  async getWishlist(userId: string) {
    const items = await this.prisma.customerWishlist.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            store: { select: { id: true, name: true, slug: true, logoUrl: true } },
            variants: true,
          },
        },
      },
    });

    return items.map((w) => ({
      wishlistId: w.id,
      createdAt: w.createdAt,
      product: w.product,
    }));
  }

  async toggleWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const existing = await this.prisma.customerWishlist.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      await this.prisma.customerWishlist.delete({
        where: { id: existing.id },
      });
      return { wishlisted: false, message: 'Đã xóa khỏi danh sách yêu thích' };
    }

    await this.prisma.customerWishlist.create({
      data: { userId, productId },
    });

    return { wishlisted: true, message: 'Đã thêm vào danh sách yêu thích' };
  }

  async removeFromWishlist(userId: string, productId: string) {
    await this.prisma.customerWishlist.deleteMany({
      where: { userId, productId },
    });
    return { wishlisted: false, message: 'Đã xóa khỏi danh sách yêu thích' };
  }
}
