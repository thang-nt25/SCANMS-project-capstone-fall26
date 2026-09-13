import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { ExternalOrderPlatform } from '../dto/order-webhook.dto';
import {
  ExternalOrderNormalizer,
  NormalizedExternalOrder,
} from './external-order-normalizer.interface';
import {
  asArray,
  asPlatformDate,
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
      currency: asString(order.currency),
      eventAt: asPlatformDate(order.updated_at),
      status: this.mapStatus(order),
      customerName:
        [firstName, lastName].filter(Boolean).join(' ') ||
        asString(order.customer_name),
      customerPhone: asString(
        shippingAddress?.phone ?? customer?.phone ?? order.phone,
      ),
      shippingAddress: joinAddress(shippingAddress),
      items,
      // Shopify subtotal_price is already discounted; internal subtotal is gross item value.
      subtotalAmount: items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      ),
      discountAmount: asMoney(order.total_discounts),
      totalAmount: asMoney(order.total_price ?? order.current_total_price),
      shippingAmount: asArray(order.shipping_lines).reduce<number>(
        (sum, line) => sum + (asMoney(asRecord(line)?.price) ?? 0),
        0,
      ),
      taxAmount: order.taxes_included === true ? 0 : asMoney(order.total_tax),
      receivedAt:
        this.mapStatus(order) === OrderStatus.DELIVERED
          ? (asPlatformDate(order.delivered_at) ?? new Date())
          : undefined,
    };
  }

  private mapStatus(order: Record<string, unknown>): OrderStatus {
    if (order.cancelled_at || asString(order.cancel_reason)) {
      return OrderStatus.CANCELLED;
    }

    const financialStatus = asString(order.financial_status)?.toLowerCase();
    if (financialStatus === 'voided' || financialStatus === 'refunded')
      return OrderStatus.RETURNED;
    // Partial refunds require amount reconciliation; do not reverse the entire order.
    const shipment = asArray(order.fulfillments).map(asRecord);
    if (
      shipment.length &&
      shipment.every((item) => item?.shipment_status === 'delivered')
    )
      return OrderStatus.DELIVERED;

    const fulfillmentStatus = asString(order.fulfillment_status)?.toLowerCase();
    if (fulfillmentStatus === 'fulfilled') {
      return OrderStatus.SHIPPING;
    }
    if (fulfillmentStatus === 'partial' || fulfillmentStatus === 'in_transit') {
      return OrderStatus.SHIPPING;
    }
    if (fulfillmentStatus === 'restocked') {
      return OrderStatus.RETURNED;
    }

    return OrderStatus.PENDING;
  }
}
