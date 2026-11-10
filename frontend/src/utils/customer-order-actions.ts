import type { CustomerOrder } from '../services/customer.service';

export function getCustomerOrderActions(order: CustomerOrder, now = Date.now(), trackingStatus?: string | null) {
  const requests = order.returnRequests || (order.returnRequest ? [order.returnRequest] : []);
  const hasActiveReturn = requests.some(request => !['COMPLETED', 'CLOSED', 'EXPIRED', 'REFUNDED'].includes(request.status)) || ['RETURN_REQUESTED', 'DISPUTED'].includes(order.status);
  const delivered = ['DELIVERED', 'COMPLETED', 'RETURNED'].includes(order.status);
  const deliveredAt = Date.parse(order.deliveredAt || order.completedAt || '');
  const returnedQuantity = new Map<string, number>();
  for (const request of requests) {
    if (!['COMPLETED', 'REFUNDED'].includes(request.status)) continue;
    for (const item of request.items || [])
      returnedQuantity.set(item.orderItemId, (returnedQuantity.get(item.orderItemId) || 0) + item.quantity);
  }
  const hasRemainingItems = order.orderItems.some(item => (returnedQuantity.get(item.id) || 0) < item.quantity);
  const reviewedIds = new Set((order.productReviews || []).map(review => review.productId));
  const unreviewedProducts = order.orderItems.some(item => item.product && !reviewedIds.has(item.productId));
  return {
    cancel: order.status === 'PENDING',
    confirmReceipt: order.status === 'DELIVERED' && !hasActiveReturn,
    requestReturn: delivered && !hasActiveReturn && hasRemainingItems && Number.isFinite(deliveredAt) && deliveredAt <= now && now <= deliveredAt + 14 * 86400000,
    review: order.status === 'COMPLETED' && !hasActiveReturn && unreviewedProducts,
    reorder: ['DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED'].includes(order.status) ||
      (order.status === 'SHIPPING' && trackingStatus === 'delivered'),
  };
}
