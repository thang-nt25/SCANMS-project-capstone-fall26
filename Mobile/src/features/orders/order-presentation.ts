import type { Order } from "../../types/contracts";

export function orderPayment(order: Order) {
  return {
    method: order.paymentMethod || order.rawPayload?.paymentMethod || "",
    status: order.paymentStatus || order.rawPayload?.paymentStatus || "",
  };
}
export function paymentMethodLabel(method: string) {
  return (
    (
      {
        WALLET: "Ví SCANMS",
        PAYOS: "Chuyển khoản PayOS",
        COD: "Thanh toán khi nhận hàng",
        VIETQR: "Chuyển khoản VietQR",
        BANK_TRANSFER: "Chuyển khoản ngân hàng",
      } as Record<string, string>
    )[method] ||
    method ||
    "Chưa có thông tin"
  );
}
export function paymentStateLabel(status: string) {
  return (
    (
      {
        PAID: "Đã thanh toán",
        UNPAID: "Chưa thanh toán",
        WAITING_PAYMENT: "Chờ thanh toán",
        REFUNDED: "Đã hoàn tiền",
        PARTIALLY_REFUNDED: "Đã hoàn tiền một phần",
        FAILED: "Thanh toán không thành công",
        EXPIRED: "Phiên thanh toán hết hạn",
      } as Record<string, string>
    )[status] || "Chưa có xác nhận thanh toán"
  );
}
export function orderTracking(order: Order) {
  return {
    code:
      order.trackingNumber ||
      order.rawPayload?.ghnOrderCode ||
      order.rawPayload?.trackingNumber ||
      "",
    carrier: order.carrierName || order.rawPayload?.carrierName || "",
    environment: order.ghnEnvironment || order.rawPayload?.ghnEnvironment,
  };
}
export function canConfirmReceipt(order: Order) {
  return order.status === "DELIVERED" && !order.returnRequest;
}
export function orderLines(order: Order) {
  // Customer detail returns orderItems; older managed endpoints return items.
  // Prefer one collection so the same purchased item is never rendered twice.
  if (order.orderItems?.length)
    return order.orderItems.map((item) => ({
      key: item.id,
      productId: item.productId || item.product?.id,
      title: item.product?.title || "Sản phẩm trong đơn",
      imageUrl: item.product?.imageUrl,
      variantName: item.variant?.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
  return (order.items || []).map((item, index) => ({
    key: `${item.productId}:${item.variantId || index}`,
    productId: item.productId,
    title: item.title,
    imageUrl: item.imageUrl,
    variantName: item.variantName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  }));
}
export function orderSubtotal(order: Order) {
  const explicit = order.subtotalAmount ?? order.totalAmount;
  if (explicit !== null && explicit !== undefined) return explicit;
  const lines = orderLines(order);
  if (
    !lines.length ||
    lines.some(
      (item) => item.unitPrice === null || item.unitPrice === undefined,
    )
  )
    return undefined;
  return lines.reduce(
    (sum, item) => sum + Number(item.unitPrice) * item.quantity,
    0,
  );
}
export function latestConfirmedEvent<
  T extends { completed?: boolean; title: string; time?: string | null },
>(events: T[]) {
  return events
    .filter(
      (event) =>
        event.completed === true &&
        event.time &&
        Number.isFinite(Date.parse(event.time)),
    )
    .sort((left, right) => Date.parse(right.time!) - Date.parse(left.time!))[0];
}
