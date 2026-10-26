/** Identity is mandatory; names/phone fragments are not customer ownership. */
export function chatCustomerOrderQuery(storeId?: string, customerId?: string) {
  return storeId && customerId ? { storeId, customerId, limit: 10 } : null;
}

/** Merchant orders use externalOrderSn/finalAmount/trackingNumber on the wire. */
export function chatOrderSummary(order: Record<string, any>) {
  return { ...order,
    orderCode: order.externalOrderSn || order.orderCode || String(order.id || '').slice(0, 8).toUpperCase(),
    totalAmount: order.finalAmount ?? order.totalAmount ?? order.total ?? 0,
    shippingCode: order.trackingNumber || order.shippingCode || null,
  };
}
