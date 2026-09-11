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

export class ShopifyOrderNormalizer implements ExternalOrderNormalizer {
  readonly platform = ExternalOrderPlatform.SHOPIFY;

  normalize(payload: Record<string, unknown>): NormalizedExternalOrder {
    const order = unwrapOrderPayload(payload);
    const customer = asRecord(order.customer);
    const shippingAddress = asRecord(order.shipping_address);
    const rawItems = asArray(order.line_items ?? order.items);

    if (rawItems.length === 0) {
      throw new BadRequestException(
        'Payload Shopify phải có ít nhất một sản phẩm trong line_items',
      );
    }

    const items = rawItems.map((rawItem, index) => {
      const item = asRecord(rawItem);
      if (!item) {
        throw new BadRequestException(
          `Shopify line_items[${index}] không đúng định dạng`,
        );
      }

      return {
        productId: asString(
          item.product_id_internal ?? item.internal_product_id,
        ),
        sku: asString(item.sku ?? item.variant_sku),
        name: requireString(
          item.title ?? item.name ?? item.variant_title,
          `line_items[${index}].title`,
        ),
        quantity: requirePositiveInteger(
          item.quantity,
          `line_items[${index}].quantity`,
        ),
        unitPrice: requireNonNegativeNumber(
          asMoney(item.price ?? item.discounted_price),
          `line_items[${index}].price`,
        ),
      };
    });

    const firstName = asString(
      shippingAddress?.first_name ?? customer?.first_name,
    );
    const lastName = asString(
      shippingAddress?.last_name ?? customer?.last_name,
    );

    return {
      externalOrderId: requireString(
        order.id ?? order.order_number ?? order.name,
        'id',
      ),
      internalOrderId: asString(order.internal_order_id),
      platform: this.platform,
      status: this.mapStatus(order),
      customerName:
        [firstName, lastName].filter(Boolean).join(' ') ||
        asString(order.customer_name),
      customerPhone: asString(
        shippingAddress?.phone ?? customer?.phone ?? order.phone,
      ),
      shippingAddress: joinAddress(shippingAddress),
      items,
      subtotalAmount: asMoney(order.subtotal_price),
      discountAmount: asMoney(order.total_discounts),
      totalAmount: asMoney(order.total_price ?? order.current_total_price),
    };
  }

  private mapStatus(order: Record<string, unknown>): OrderStatus {
    if (order.cancelled_at || asString(order.cancel_reason)) {
      return OrderStatus.CANCELLED;
    }

    const fulfillmentStatus = asString(order.fulfillment_status)?.toLowerCase();
    if (fulfillmentStatus === 'fulfilled') {
      return OrderStatus.DELIVERED;
    }
    if (fulfillmentStatus === 'partial' || fulfillmentStatus === 'in_transit') {
      return OrderStatus.SHIPPING;
    }
    if (fulfillmentStatus === 'restocked') {
      return OrderStatus.RETURNED;
    }

    const financialStatus = asString(order.financial_status)?.toLowerCase();
    if (financialStatus === 'voided' || financialStatus === 'refunded') {
      return OrderStatus.CANCELLED;
    }
    if (financialStatus === 'partially_refunded') {
      return OrderStatus.RETURNED;
    }

    return OrderStatus.PENDING;
  }
}
