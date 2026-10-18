export const isGhnCarrier = (carrier: unknown): boolean =>
  typeof carrier === 'string' && /\bGHN\b|giao\s*hàng\s*nhanh/i.test(carrier);

export function getGhnTrackingCode(raw: Record<string, any> | null | undefined): string | null {
  const official = typeof raw?.ghnOrderCode === 'string' ? raw.ghnOrderCode.trim() : '';
  if (official) return official;
  const manual = typeof raw?.trackingNumber === 'string' ? raw.trackingNumber.trim() : '';
  return manual && isGhnCarrier(raw?.carrierName || raw?.shippingCarrier || raw?.carrier) ? manual : null;
}

export const GHN_MILESTONES = [
  { title: 'Bưu tá đã lấy hàng tại kho Shop', statuses: ['picked'] },
  { title: 'Nhập kho trung chuyển', statuses: ['storing', 'sorting', 'transporting'] },
  { title: 'Shipper đang đi giao', statuses: ['delivering', 'money_collect_delivering'] },
  { title: 'Giao hàng thành công', statuses: ['delivered'] },
];

export function trackingMismatch(orderStatus: string | undefined, ghnStatus: string, stale: boolean): string | null {
  if (stale || !orderStatus || ghnStatus === 'unavailable') return null;
  if (['DELIVERED', 'COMPLETED'].includes(orderStatus) && !['delivered', 'returned', 'cancel'].includes(ghnStatus)) {
    return 'Đơn trên sàn đã được đánh dấu đã giao/hoàn tất, nhưng GHN chưa xác nhận giao thành công. Hành trình bên dưới hiển thị theo dữ liệu GHN mới nhất.';
  }
  if (ghnStatus === 'delivered' && ['PENDING', 'SHIPPING'].includes(orderStatus)) {
    return 'GHN đã xác nhận giao thành công. Trạng thái đơn trên sàn đang chờ đồng bộ.';
  }
  return null;
}
