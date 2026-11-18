import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { authService } from '@/services/auth.service';
import type { CouponItem } from '@/services/coupon.service';
import { formatMoney } from '@/utils/marketplace.utils';

export const couponDate = (value?: string | null, fallback = 'Không giới hạn') => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : fallback;
export const couponLimit = (value?: number | string | null) => value == null ? 'Không giới hạn' : formatMoney(Number(value));
export const couponExpiry = (coupon: CouponItem) => coupon.expiresAt ? couponDate(coupon.expiresAt) : coupon.status === 'EXPIRED' ? 'Chưa có ngày hết hạn' : 'Không giới hạn';
export const couponScope: Record<string, string> = { STORE_WIDE: 'Toàn cửa hàng', PRODUCTS: 'Sản phẩm chỉ định', CATEGORIES: 'Ngành hàng chỉ định', CAMPAIGN: 'Phạm vi theo thỏa thuận' };
const redemptionLabels: Record<string, string> = { RESERVED: 'Đang giữ lượt', USED: 'Đã sử dụng', CANCELLED: 'Đã hủy', PARTIALLY_REFUNDED: 'Hoàn một phần', REFUNDED: 'Đã hoàn' };
type Oversight = { coupon: CouponItem & { approver?: { fullName: string } | null }; history: { orderId: string; orderCode: string; status: string; discountAmount: string; createdAt: string }[]; meta: { page: number; total: number; totalPages: number } };

export function CouponOversightDetails({ item, shop }: { item: CouponItem; shop: boolean }) {
  const [page, setPage] = useState(1);
  const user = authService.getCurrentUser();
  const query = useQuery({ queryKey: [user?.id, 'coupon-oversight', item.id, shop, item.storeId, page], queryFn: async () => {
    const response = await api.get(shop ? `/stores/${item.storeId}/coupons/${item.id}/oversight` : `/admin/coupons/${item.id}/oversight`, { params: { page }, headers: { 'x-skip-cache': 'true' } });
    const body = response.data ?? response;
    return ((body as { data?: Oversight }).data ?? body) as Oversight;
  } });
  if (query.isPending) return <p role="status">Đang tải điều kiện và lịch sử sử dụng…</p>;
  if (query.isError) return <p role="alert">Không tải được hồ sơ mã. <button type="button" onClick={() => void query.refetch()}>Thử lại</button></p>;
  const { coupon, history, meta } = query.data;
  const time = (value?: string | null) => value ? `${couponDate(value)} · ${new Date(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}` : 'Chưa ghi nhận';
  return <div className="coupon-oversight-details">
    <dl className="coupon-detail-grid">{[
      ['KOL', coupon.collaborator?.fullName ?? 'Chưa có thông tin'], ['Cửa hàng', coupon.store?.name ?? 'Chưa có thông tin'],
      ['Mức giảm', coupon.discountType === 'PERCENTAGE' ? `${Number(coupon.discountValue)}%` : formatMoney(Number(coupon.discountValue))],
      ['Đơn tối thiểu', Number(coupon.minimumOrderAmount ?? 0) === 0 ? 'Không yêu cầu' : formatMoney(Number(coupon.minimumOrderAmount))],
      ['Giảm tối đa', couponLimit(coupon.maximumDiscountAmount)], ['Lượt / khách', String(coupon.usageLimitPerCustomer)],
      ['Bắt đầu', coupon.startsAt ? time(coupon.startsAt) : 'Không ấn định'], ['Hết hạn', coupon.expiresAt ? time(coupon.expiresAt) : couponExpiry(coupon)],
      ['Lượt đã dùng / giới hạn', `${coupon.usageCount} / ${coupon.usageLimitTotal ?? 'Không giới hạn'}`],
      ['Ngân sách đã dùng / giới hạn', `${formatMoney(Number(coupon.budgetUsed))} / ${couponLimit(coupon.budgetTotal)}`],
      ['Ngân sách còn lại', coupon.budgetTotal == null ? 'Không giới hạn' : formatMoney(Math.max(0, Number(coupon.budgetTotal) - Number(coupon.budgetUsed)))],
      ['Phạm vi', couponScope[coupon.scopeType] ?? 'Chưa xác định'],
    ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {coupon.scopeType === 'PRODUCTS' && <section className="coupon-detail-section"><h3>Sản phẩm áp dụng</h3>{coupon.couponProducts?.length ? <ul>{coupon.couponProducts.map(row => <li key={row.id}>{row.product.title}</li>)}</ul> : <p>Chưa có sản phẩm trong hồ sơ.</p>}</section>}
    {coupon.scopeType === 'CATEGORIES' && <section className="coupon-detail-section"><h3>Ngành hàng áp dụng</h3><p>{coupon.couponCategories?.map(row => row.categoryName).join(', ') || 'Chưa có ngành hàng trong hồ sơ.'}</p></section>}
    {coupon.status === 'EXPIRED' && !coupon.expiresAt && <p className="coupon-detail-reasons">Mã đang được ghi nhận hết hạn nhưng hồ sơ chưa có ngày hết hạn. Cần đối soát dữ liệu.</p>}
    {(coupon.rejectedReason || coupon.blockedReason || coupon.deleteReason) && <section className="coupon-detail-reasons"><h3>Lý do xử lý</h3>{coupon.rejectedReason && <p>Từ chối: {coupon.rejectedReason}</p>}{coupon.blockedReason && <p>Khóa mã: {coupon.blockedReason}</p>}{coupon.deleteReason && <p>Xóa mã: {coupon.deleteReason}</p>}</section>}
    <section className="coupon-detail-section"><h3>Phê duyệt</h3><p>{coupon.approver?.fullName ?? (coupon.approvedBy ? 'Chưa có tên người duyệt' : 'Chưa ghi nhận người duyệt')} · {time(coupon.approvedAt)}</p></section>
    <section className="coupon-detail-section"><h3>Lịch sử sử dụng <span>{meta.total} lượt ghi nhận</span></h3>
      {history.length ? <div className="coupon-history-list">{history.map(row => <article key={row.orderId}><div><strong>{row.orderCode}</strong><span>{formatMoney(Number(row.discountAmount))}</span></div><div><time>{time(row.createdAt)}</time><span>{redemptionLabels[row.status] ?? row.status}</span></div></article>)}</div> : <p>Chưa có lịch sử sử dụng mã.</p>}
      {meta.totalPages > 1 && <nav className="coupon-history-pagination" aria-label="Trang lịch sử mã"><button type="button" disabled={page <= 1 || query.isFetching} onClick={() => setPage(value => value - 1)}>Trước</button><span>{page} / {meta.totalPages}</span><button type="button" disabled={page >= meta.totalPages || query.isFetching} onClick={() => setPage(value => value + 1)}>Sau</button></nav>}
    </section>
  </div>;
}
