import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { ExternalOrderPlatform } from '../dto/order-webhook.dto';
import {
  ExternalOrderNormalizer,
  NormalizedExternalOrder,
} from './external-order-normalizer.interface';
import {
  asArray,
  asMoney,
  asRecord,
  asString,
  joinAddress,
  requireNonNegativeNumber,
  requirePositiveInteger,
  requireString,
  unwrapOrderPayload,
} from './normalizer.utils';

const TIKTOK_STATUS_MAP: Record<string, OrderStatus> = {
  UNPAID: OrderStatus.PENDING,
  ON_HOLD: OrderStatus.PENDING,
  AWAITING_SHIPMENT: OrderStatus.PENDING,
  AWAITING_COLLECTION: OrderStatus.PENDING,
  PARTIALLY_SHIPPING: OrderStatus.SHIPPING,
  IN_TRANSIT: OrderStatus.SHIPPING,
  SHIPPED: OrderStatus.SHIPPING,
  DELIVERED: OrderStatus.DELIVERED,
  COMPLETED: OrderStatus.COMPLETED,
  CANCELLED: OrderStatus.CANCELLED,
  CANCELED: OrderStatus.CANCELLED,
  RETURNED: OrderStatus.RETURNED,
  RETURN_REFUND: OrderStatus.RETURNED,
};

export class TikTokOrderNormalizer implements ExternalOrderNormalizer {
  readonly platform = ExternalOrderPlatform.TIKTOK;

  normalize(payload: Record<string, unknown>): NormalizedExternalOrder {
    const order = unwrapOrderPayload(payload);
    const recipient = asRecord(
      order.recipient_address ?? order.shipping_address,
    );
    const buyer = asRecord(order.buyer_info ?? order.buyer);
    const payment = asRecord(order.payment_info ?? order.payment);
    const rawItems = asArray(
      order.line_items ?? order.item_list ?? order.items,
    );

    if (rawItems.length === 0) {
      throw new BadRequestException(
        'Payload TikTok Shop phải có ít nhất một sản phẩm trong line_items',
      );
    }

    const items = rawItems.map((rawItem, index) => {
      const item = asRecord(rawItem);
      if (!item) {
        throw new BadRequestException(
          `TikTok line_items[${index}] không đúng định dạng`,
        );
      }

      return {
        productId: asString(item.internal_product_id),
        sku: asString(item.seller_sku ?? item.sku ?? item.sku_id),
        name: requireString(
          item.product_name ?? item.display_name ?? item.name,
          `line_items[${index}].product_name`,
        ),
        quantity: requirePositiveInteger(
          item.quantity,
          `line_items[${index}].quantity`,
        ),
        unitPrice: requireNonNegativeNumber(
          asMoney(item.sale_price ?? item.sku_sale_price ?? item.price),
          `line_items[${index}].sale_price`,
        ),
      };
    });

    return {
      externalOrderId: requireString(order.order_id ?? order.id, 'order_id'),
      internalOrderId: asString(order.internal_order_id),
      platform: this.platform,
      status: this.mapStatus(asString(order.status ?? order.order_status)),
      customerName: asString(
        recipient?.name ?? recipient?.full_name ?? buyer?.name,
      ),
      customerPhone: asString(
        recipient?.phone_number ?? recipient?.phone ?? buyer?.phone,
      ),
      shippingAddress: joinAddress(recipient),
      items,
      subtotalAmount: asMoney(
        payment?.subtotal_amount ?? order.subtotal_amount,
      ),
      discountAmount: asMoney(
        payment?.discount_amount ?? order.discount_amount,
      ),
      totalAmount: asMoney(
        payment?.total_amount ?? order.total_amount ?? order.payment_amount,
      ),
    };
  }

  private mapStatus(status: string | undefined): OrderStatus {
    if (!status) {
      return OrderStatus.PENDING;
    }
    return TIKTOK_STATUS_MAP[status.toUpperCase()] ?? OrderStatus.PENDING;
  }
}
