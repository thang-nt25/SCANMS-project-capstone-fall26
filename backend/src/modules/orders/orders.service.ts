import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { TrackOrderQueryDto } from './dto/track-order.dto';
import { CreateOrderReviewDto } from './dto/create-review.dto';
import {
  OrderStatus,
  AttributionMethod,
  CommissionStatus,
  TransactionType,
} from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tạo đơn hàng mới (Dành cho Guest Storefront hoặc giỏ hàng)
   */
  async createOrder(dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 sản phẩm');
    }

    // 1. Xác định Store
    let store: any = null;
    if (dto.storeId) {
      store = await this.prisma.store.findUnique({ where: { id: dto.storeId } });
    } else if (dto.storeSlug) {
      store = await this.prisma.store.findUnique({ where: { slug: dto.storeSlug } });
    } else {
      store = await this.prisma.store.findFirst({ where: { isDeleted: false } });
    }

    if (!store) {
      throw new NotFoundException('Không tìm thấy gian hàng tương ứng');
    }

    // 2. Nhận diện KOL Attribution (Qua Coupon Code hoặc Link Short Code)
    let attributedCollaboratorId: string | null = null;
    let attributionMethod: AttributionMethod | null = null;
    let matchedLink: any = null;

    if (dto.couponCode?.trim()) {
      const cleanCoupon = dto.couponCode.trim().toUpperCase();
      matchedLink = await this.prisma.referralLink.findFirst({
        where: {
          customCouponCode: { equals: cleanCoupon, mode: 'insensitive' },
          deletedAt: null,
        },
        include: { collaborator: true },
      });

      if (matchedLink) {
        attributedCollaboratorId = matchedLink.collaboratorId;
        attributionMethod = AttributionMethod.COUPON;
      }
    }

    if (!attributedCollaboratorId && dto.cookieRefCode?.trim()) {
      const cleanRef = dto.cookieRefCode.trim();
      matchedLink = await this.prisma.referralLink.findFirst({
        where: {
          shortCode: cleanRef,
          deletedAt: null,
        },
        include: { collaborator: true },
      });

      if (matchedLink) {
        attributedCollaboratorId = matchedLink.collaboratorId;
        attributionMethod = AttributionMethod.COOKIE;
      }
    }

    // Nếu chưa có link nhưng có coupon mẫu "THANGVIP10", fallback tìm tài khoản kol1
    if (!attributedCollaboratorId && dto.couponCode?.trim().toUpperCase() === 'THANGVIP10') {
      const defaultKol = await this.prisma.user.findFirst({
        where: { email: 'kol1@scanms.vn' },
      });
      if (defaultKol) {
        attributedCollaboratorId = defaultKol.id;
        attributionMethod = AttributionMethod.COUPON;
      }
    }

    // 3. Lấy thông tin cấp bậc Tier của KOL để tính thêm % thưởng (nếu có)
    let extraTierRate = 0;
    if (attributedCollaboratorId) {
      const collabProfile = await this.prisma.collaboratorProfile.findUnique({
        where: { userId: attributedCollaboratorId },
        include: { tier: true },
      });
      if (collabProfile?.tier?.extraBonusPercentage) {
        extraTierRate = Number(collabProfile.tier.extraBonusPercentage);
      }
    }

    // 4. Lấy danh sách sản phẩm từ DB và tính toán tiền hàng & hoa hồng
    const productIds = dto.items.map((i) => i.productId);
    const dbProducts = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isDeleted: false,
      },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let subtotalAmount = 0;
    let totalCommissionAmount = 0;
    const orderItemsToCreate: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      appliedCommissionRate: number;
      calculatedCommissionAmount: number;
    }> = [];

    for (const item of dto.items) {
      const prod = productMap.get(item.productId);
      const unitPrice = prod ? Number(prod.price) : (item.unitPrice || 413100);
      const quantity = item.quantity;
      const baseCommissionRate = prod?.customCommissionRate
        ? Number(prod.customCommissionRate)
        : Number(store.defaultCommissionRate || 10);

      const finalCommissionRate = baseCommissionRate + extraTierRate;
      const itemSubtotal = unitPrice * quantity;
      const itemCommission = itemSubtotal * (finalCommissionRate / 100);

      subtotalAmount += itemSubtotal;
      totalCommissionAmount += itemCommission;

      orderItemsToCreate.push({
        productId: prod ? prod.id : item.productId,
        quantity,
        unitPrice,
        appliedCommissionRate: finalCommissionRate,
        calculatedCommissionAmount: itemCommission,
      });
    }

    // Tính chiết khấu nếu áp dụng Coupon (Mặc định giảm 10% nếu có Coupon hợp lệ)
    let discountAmount = 0;
    if (dto.couponCode?.trim()) {
      discountAmount = Math.round(subtotalAmount * 0.1);
    }
    const finalAmount = Math.max(0, subtotalAmount - discountAmount);

    // Sinh mã đơn hàng chuẩn định danh
    const externalOrderSn = `DH-${new Date().getFullYear()}-${Math.floor(
      10000 + Math.random() * 90000,
    )}`;

    // 5. Thực thi Lưu đơn hàng và Phân bổ Hoa hồng trong một Transaction
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // 5.1 Lưu đơn hàng
      const order = await tx.order.create({
        data: {
          storeId: store.id,
          externalOrderSn,
          attributedCollaboratorId,
          attributionMethod,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress,
          subtotalAmount,
          discountAmount,
          finalAmount,
          status: OrderStatus.PENDING,
          orderItems: {
            create: orderItemsToCreate.map((item) => ({
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
        },
      });

      // 5.2 Nếu có KOL được hưởng hoa hồng -> Tạo bản ghi hoa hồng và cộng vào ví chờ
      if (attributedCollaboratorId && totalCommissionAmount > 0) {
        // Ghi bản ghi Commission PENDING (Escrow 14 ngày)
        await tx.commission.create({
          data: {
            orderId: order.id,
            collaboratorId: attributedCollaboratorId,
            commissionAmount: totalCommissionAmount,
            status: CommissionStatus.PENDING,
          },
        });

        // Cộng số dư ví chờ (Pending Balance) của KOL
        await tx.wallet.upsert({
          where: { collaboratorId: attributedCollaboratorId },
          update: {
            pendingBalance: { increment: totalCommissionAmount },
          },
          create: {
            collaboratorId: attributedCollaboratorId,
            availableBalance: 0,
            pendingBalance: totalCommissionAmount,
            version: 1,
          },
        });

        // Tăng đếm lượt chuyển đổi của Link tiếp thị
        if (matchedLink) {
          await tx.referralLink.update({
            where: { id: matchedLink.id },
            data: { totalOrders: { increment: 1 } },
          });
        }
      }

      return order;
    });

    return {
      message: 'Đặt hàng thành công!',
      order: createdOrder,
    };
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
        customerName: dto.customerName || order.customerName || 'Khách mua hàng',
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
