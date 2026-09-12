import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';
import { ReferralLinksService } from '../referral-links/referral-links.service';
import { verifyAttributionToken } from '../referral-links/utils/short-code.generator';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly referralLinksService: ReferralLinksService,
  ) {}

  private getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret || !secret.trim()) {
      throw new Error('JWT_SECRET must be configured');
    }
    return secret;
  }

  /**
   * Tạo đơn hàng Checkout thật đọc cookie scanms_attribution:
   * 1. Đọc cookie scanms_attribution
   * 2. Xác minh chữ ký HMAC và thời hạn iat/exp
   * 3. Kiểm tra tính hợp lệ qua verifyAttributionForOrder()
   * 4. Tạo Order & OrderItem trong database
   * 5. Gắn referralLinkId, snapshot hoa hồng và tăng totalOrders
   */
  async processCheckout(dto: CreateOrderDto, attributionCookie?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng không có sản phẩm nào.');
    }

    // 1. Kiểm tra Cửa hàng tồn tại
    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
    });
    if (!store || store.deletedAt) {
      throw new NotFoundException('Cửa hàng không tồn tại hoặc đã bị xóa.');
    }

    // 2. Xác minh Attribution Token từ cookie (nếu có)
    let attributionResult: {
      isValid: boolean;
      collaboratorId?: string;
      referralLinkId?: string;
      appliedCommissionRate?: number;
      calculatedCommissionAmount?: number;
      attributedProductId?: string;
    } = { isValid: false };

    if (attributionCookie && attributionCookie.trim()) {
      const decodedPayload = verifyAttributionToken(
        attributionCookie,
        this.getJwtSecret(),
      );

      if (decodedPayload && decodedPayload.shortCode) {
        // Kiểm tra xem giỏ hàng có chứa sản phẩm trong cookie attribution không
        const matchingItem = dto.items.find(
          (item) =>
            item.productId === decodedPayload.productId &&
            dto.storeId === decodedPayload.storeId,
        );

        if (matchingItem) {
          const verification =
            await this.referralLinksService.verifyAttributionForOrder({
              shortCode: decodedPayload.shortCode,
              storeId: dto.storeId,
              productId: matchingItem.productId,
            });

          if (verification.isValid) {
            attributionResult = {
              isValid: true,
              collaboratorId: verification.collaboratorId,
              referralLinkId: verification.referralLinkId,
              appliedCommissionRate: verification.appliedCommissionRate,
              calculatedCommissionAmount:
                verification.calculatedCommissionAmount,
              attributedProductId: matchingItem.productId,
            };
          }
        }
      }
    }

    // 3. Tính toán tổng tiền
    let subtotal = 0;
    for (const item of dto.items) {
      subtotal += item.quantity * item.unitPrice;
    }

    const externalOrderSn = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // 4. Tạo Order và các OrderItem trong Transaction
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          storeId: dto.storeId,
          externalOrderSn,
          customerName: dto.customerName,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress || 'Địa chỉ mặc định',
          subtotalAmount: subtotal,
          finalAmount: subtotal,
          status: 'PENDING',
        },
      });

      // Tạo OrderItem cho từng sản phẩm
      for (const item of dto.items) {
        const isAttributed =
          attributionResult.isValid &&
          item.productId === attributionResult.attributedProductId;

        const rate = isAttributed
          ? (attributionResult.appliedCommissionRate ?? 5)
          : 0;
        const amount = isAttributed
          ? (item.quantity * item.unitPrice * rate) / 100
          : 0;

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            referralLinkId: isAttributed
              ? attributionResult.referralLinkId
              : null,
            appliedCommissionRate: rate,
            calculatedCommissionAmount: amount,
          },
        });
      }

      return order;
    });

    // 5. Nếu có attribution hợp lệ, gọi recordOrderAttribution để snapshot hoa hồng và tăng totalOrders
    if (
      attributionResult.isValid &&
      attributionResult.referralLinkId &&
      attributionResult.collaboratorId
    ) {
      const matchingOrderItem = dto.items.find(
        (i) => i.productId === attributionResult.attributedProductId,
      );
      const totalLineCommission = matchingOrderItem
        ? (matchingOrderItem.quantity *
            matchingOrderItem.unitPrice *
            (attributionResult.appliedCommissionRate ?? 0)) /
          100
        : attributionResult.calculatedCommissionAmount;

      await this.referralLinksService.recordOrderAttribution({
        orderId: createdOrder.id,
        referralLinkId: attributionResult.referralLinkId,
        collaboratorId: attributionResult.collaboratorId,
        appliedCommissionRate: attributionResult.appliedCommissionRate,
        calculatedCommissionAmount: totalLineCommission,
      });
    }

    // 6. Truy vấn đơn hàng hoàn chỉnh để trả về
    const fullOrder = await this.prisma.order.findUnique({
      where: { id: createdOrder.id },
      include: {
        orderItems: true,
        referralLink: {
          select: {
            id: true,
            shortCode: true,
            label: true,
            totalOrders: true,
          },
        },
      },
    });

    return {
      success: true,
      message: 'Đặt hàng thành công.',
      order: fullOrder,
      attribution: attributionResult.isValid
        ? {
            attributed: true,
            collaboratorId: attributionResult.collaboratorId,
            referralLinkId: attributionResult.referralLinkId,
            appliedCommissionRate: attributionResult.appliedCommissionRate,
          }
        : { attributed: false },
    };
  }
}
