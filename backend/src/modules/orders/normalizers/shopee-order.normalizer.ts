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

const SHOPEE_STATUS_MAP: Record<string, OrderStatus> = {
  UNPAID: OrderStatus.PENDING,
  READY_TO_SHIP: OrderStatus.PENDING,
  PROCESSED: OrderStatus.PENDING,
  RETRY_SHIP: OrderStatus.SHIPPING,
  SHIPPED: OrderStatus.SHIPPING,
  TO_CONFIRM_RECEIVE: OrderStatus.SHIPPING,
  COMPLETED: OrderStatus.COMPLETED,
  CANCELLED: OrderStatus.CANCELLED,
  IN_CANCEL: OrderStatus.CANCELLED,
  TO_RETURN: OrderStatus.RETURNED,
  RETURNED: OrderStatus.RETURNED,
};

export class ShopeeOrderNormalizer implements ExternalOrderNormalizer {
  readonly platform = ExternalOrderPlatform.SHOPEE;

  normalize(payload: Record<string, unknown>): NormalizedExternalOrder {
    const order = unwrapOrderPayload(payload);
    const recipient = asRecord(order.recipient_address);
    const rawItems = asArray(order.item_list ?? order.items);

    if (rawItems.length === 0) {
      throw new BadRequestException(
        'Payload Shopee phải có ít nhất một sản phẩm trong item_list',
      );
    }

    const items = rawItems.map((rawItem, index) => {
      const item = asRecord(rawItem);
      if (!item) {
        throw new BadRequestException(
          `Shopee item_list[${index}] không đúng định dạng`,
        );
      }

      return {
        productId: asString(item.internal_product_id),
        sku: asString(item.model_sku ?? item.item_sku ?? item.sku),
        name: requireString(
          item.model_name ?? item.item_name ?? item.name,
          `item_list[${index}].item_name`,
        ),
        quantity: requirePositiveInteger(
          item.model_quantity ?? item.quantity,
          `item_list[${index}].quantity`,
        ),
        unitPrice: requireNonNegativeNumber(
          asMoney(
            item.model_discounted_price ?? item.discounted_price ?? item.price,
          ),
          `item_list[${index}].price`,
        ),
      };
    });

    const externalStatus = asString(order.order_status ?? order.status);

    return {
      externalOrderId: requireString(
        order.order_sn ?? order.order_id,
        'order_sn',
      ),
      internalOrderId: asString(order.internal_order_id),
      platform: this.platform,
      status: this.mapStatus(externalStatus),
      customerName: asString(
        recipient?.name ?? order.buyer_username ?? order.customer_name,
      ),
      customerPhone: asString(
        recipient?.phone ?? recipient?.phone_number ?? order.customer_phone,
      ),
      shippingAddress: joinAddress(recipient),
      items,
      subtotalAmount: asMoney(order.subtotal_amount),
      discountAmount: asMoney(
        order.discount_amount ?? order.buyer_total_amount_reduction,
      ),
      totalAmount: asMoney(
        order.total_amount ?? order.order_total_amount ?? order.total_payable,
      ),
    };
  }

  private mapStatus(status: string | undefined): OrderStatus {
    if (!status) {
      return OrderStatus.PENDING;
    }
    return SHOPEE_STATUS_MAP[status.toUpperCase()] ?? OrderStatus.PENDING;
  }
}
