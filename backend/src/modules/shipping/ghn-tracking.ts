export const GHN_STATUS_LABELS: Record<string, string> = {
  ready_to_pick: 'Chờ lấy hàng', picking: 'Bưu tá đang đến lấy hàng',
  money_collect_picking: 'Thu tiền khi lấy hàng', picked: 'Bưu tá đã lấy hàng tại kho Shop',
  storing: 'Nhập kho trung chuyển', sorting: 'Đang phân loại tại kho trung chuyển',
  transporting: 'Đang vận chuyển giữa các kho', delivering: 'Shipper đang đi giao',
  money_collect_delivering: 'Đang thu tiền khi giao hàng', delivered: 'Giao hàng thành công',
  delivery_fail: 'Giao hàng chưa thành công', waiting_to_return: 'Chờ chuyển hoàn',
  return: 'Đã yêu cầu chuyển hoàn', return_transporting: 'Đang vận chuyển hàng hoàn',
  return_sorting: 'Đang phân loại hàng hoàn', returning: 'Đang giao hàng hoàn cho Shop',
  return_fail: 'Chuyển hoàn chưa thành công', returned: 'Đã hoàn trả', cancel: 'Đã hủy',
  exception: 'Có sự cố vận chuyển', lost: 'Thất lạc hàng', damage: 'Hàng bị hư hỏng', scrap: 'Đã tiêu hủy',
};

export function ghnTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim().replace(' ', 'T');
  const ms = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}+07:00`);
  return Number.isFinite(ms) && ms > 0 && ms <= Date.now() + 300000 ? new Date(ms).toISOString() : null;
}

export function ghnText(value: unknown, max = 150): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
}

export interface GhnEvent {
  status: string; title: string; time: string | null; completed: boolean;
  warehouse?: string | null; shipperName?: string | null; shipperPhone?: string | null;
}

export function normalizeGhnEvents(input: unknown): GhnEvent[] {
  const events = new Map<string, GhnEvent>();
  for (const row of Array.isArray(input) ? input : []) {
    if (!row || typeof row !== 'object') continue;
    const status = typeof row.status === 'string' ? row.status.trim().toLowerCase() : '';
    if (!Object.hasOwn(GHN_STATUS_LABELS, status)) continue;
    const time = ghnTime(row.time || row.created_date || row.updated_date);
    const key = `${status}:${time || ''}`;
    const previous = events.get(key);
    events.set(key, { status, title: GHN_STATUS_LABELS[status], time, completed: true,
      warehouse: ghnText(row.warehouse || row.Warehouse) || previous?.warehouse || null,
      shipperName: ghnText(row.shipperName || row.shipper_name || row.ShipperName) || previous?.shipperName || null,
      shipperPhone: ghnText(row.shipperPhone || row.shipper_phone || row.ShipperPhone, 30) || previous?.shipperPhone || null });
  }
  return [...events.values()].sort((a, b) => (a.time ? Date.parse(a.time) : Infinity) - (b.time ? Date.parse(b.time) : Infinity));
}
