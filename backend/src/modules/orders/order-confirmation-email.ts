import type { OrderConfirmationEmailInput } from '../auth/order-confirmation-email';

type Money = number | string | { toString(): string };
export interface OrderConfirmationSnapshot {
  externalOrderSn: string;
  createdAt: Date;
  subtotalAmount: Money;
  shippingFee: Money;
  discountAmount: Money;
  finalAmount: Money;
  rawPayload: unknown;
  store: { name: string };
  orderItems: Array<{
    quantity: number; unitPrice: Money;
    product?: { title: string; sku?: string } | null;
    variant?: { name: string; sku?: string } | null;
  }>;
}

export function orderConfirmationEmailInput(order: OrderConfirmationSnapshot, recipient: {
  email: string; customerName: string; customerPhone: string; shippingAddress: string;
}): OrderConfirmationEmailInput {
  const raw = (order.rawPayload || {}) as Record<string, unknown>;
  return {
    ...recipient, publicOrderCode: order.externalOrderSn, createdAt: order.createdAt,
    subtotalAmount: Number(order.subtotalAmount), shippingFee: Number(order.shippingFee),
    discountAmount: Number(order.discountAmount), finalAmount: Number(order.finalAmount),
    paymentMethod: String(raw.paymentMethod || 'COD'), paymentStatus: String(raw.paymentStatus || 'UNPAID'),
    storeName: order.store.name,
    items: order.orderItems.map(item => ({
      title: item.product?.title || 'Sản phẩm trong đơn hàng', variantName: item.variant?.name,
      sku: item.variant?.sku || item.product?.sku, quantity: item.quantity, unitPrice: Number(item.unitPrice),
    })),
  };
}
