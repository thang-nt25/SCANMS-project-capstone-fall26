import type { OrderConfirmationEmailInput } from '../auth/order-confirmation-email';

type Money = number | string | { toString(): string };
export type ConfirmationEmailStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'PARTIAL' | 'NOT_REQUESTED' | 'UNKNOWN';

export function confirmationEmailState(rawPayload: unknown, email?: string | null) {
  const raw = (rawPayload || {}) as Record<string, unknown>;
  const status = (typeof raw.confirmationEmailStatus === 'string'
    ? raw.confirmationEmailStatus : email ? 'UNKNOWN' : 'NOT_REQUESTED') as ConfirmationEmailStatus;
  return { confirmationEmailStatus: status, confirmationEmailQueued: status === 'QUEUED' || status === 'SENDING' };
}

export function combinedConfirmationEmailState(states: ReturnType<typeof confirmationEmailState>[]) {
  const statuses = states.map(state => state.confirmationEmailStatus);
  const queued = states.some(state => state.confirmationEmailQueued);
  const status: ConfirmationEmailStatus = queued ? 'QUEUED'
    : statuses.every(status => status === 'SENT') ? 'SENT'
    : statuses.some(status => status === 'SENT') ? 'PARTIAL'
    : statuses.every(status => status === 'NOT_REQUESTED') ? 'NOT_REQUESTED'
    : statuses.some(status => status === 'UNKNOWN') ? 'UNKNOWN' : 'FAILED';
  return { confirmationEmailQueued: queued, confirmationEmailStatus: status };
}
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
