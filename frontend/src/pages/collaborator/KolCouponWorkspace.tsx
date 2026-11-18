import { useEffect, useState } from 'react';
import { Check, Copy, Plus, Search, Store, Tag } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { couponService, type CouponItem, type CouponStatus } from '../../services/coupon.service';

type Coupon = CouponItem & { totalSales?: number; totalCommission?: number };
type Summary = { totalSales: number; totalCommission: number; totalOrders: number };
const money = (value: unknown) => value == null ? 'Chưa có dữ liệu' : `${Number(value).toLocaleString('vi-VN')} đ`;
const date = (value?: string | null, fallback = 'Không giới hạn') => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : fallback;
const labels: Record<CouponStatus, string> = { ACTIVE: 'Đang hoạt động', PENDING_APPROVAL: 'Chờ Shop duyệt', PAUSED: 'Tạm ngưng', REJECTED: 'Đã từ chối', BLOCKED: 'Đã bị khóa', EXPIRED: 'Hết hạn / Đã thay thế', DELETED: 'Đã xóa' };
const filters = [['ALL', 'Tất cả'], ['ACTIVE', 'Đang chạy'], ['PENDING_APPROVAL', 'Chờ duyệt'], ['PAUSED', 'Tạm ngưng'], ['EXPIRED', 'Hết hạn'], ['REJECTED', 'Từ chối'], ['BLOCKED', 'Bị khóa']];
const usageLabels: Record<string, string> = { USED: 'Đã dùng', RESERVED: 'Đang giữ lượt', CANCELLED: 'Đã hủy', PARTIALLY_REFUNDED: 'Hoàn một phần', REFUNDED: 'Đã hoàn tiền' };
function effectiveStatus(c: Coupon): CouponStatus {
  return ['ACTIVE', 'PAUSED'].includes(c.status) && c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now() ? 'EXPIRED' : c.status;
}
function StoreLogo({ coupon }: { coupon: Coupon }) {
  const [failed, setFailed] = useState(false);
  return <span className="kc-store-logo">{coupon.store?.logoUrl && !failed ? <img src={coupon.store.logoUrl} alt="" onError={() => setFailed(true)} /> : <Store size={18} />}</span>;
}
export function KolCouponWorkspace({ coupons, summary, loading, error, copiedCode, onCopy, onPropose, onRetry, onToggle, onDelete }: {
  coupons: Coupon[]; summary: Summary; loading: boolean; error: string; copiedCode: string | null;
  onCopy: (code: string) => void; onPropose: () => void; onRetry: () => void; onToggle: (coupon: Coupon) => void; onDelete: (coupon: Coupon) => void;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [details, setDetails] = useState<Coupon | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const detailId = details?.id;
  useEffect(() => {
    if (!detailId) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    couponService.getKolCouponDetail(detailId).then(raw => {
      const fresh = (raw as unknown as { data?: CouponItem }).data ?? raw;
      if (!cancelled) setDetails(current => current?.id === detailId ? { ...current, ...fresh } : current);
    }).catch(() => { if (!cancelled) setDetailError('Không tải được chi tiết mới nhất. Vui lòng mở lại mã.'); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailId]);
  const filtered = coupons.filter(c => (status === 'ALL' || effectiveStatus(c) === status) && `${c.displayCode} ${c.codeNormalized} ${c.store?.name ?? ''}`.toLocaleLowerCase('vi-VN').includes(search.trim().toLocaleLowerCase('vi-VN')));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  useEffect(() => setPage(1), [search, status]);
  const active = coupons.filter(c => effectiveStatus(c) === 'ACTIVE').length;
  const pending = coupons.filter(c => c.status === 'PENDING_APPROVAL').length;
  const discount = (c: Coupon) => c.discountType === 'PERCENTAGE' ? `${Number(c.discountValue)}%` : money(c.discountValue);
  const terms = (c: Coupon) => <dl className="kc-terms">
    <div><dt>Mức giảm</dt><dd>{discount(c)}</dd></div>
    <div><dt>Đơn tối thiểu</dt><dd>{Number(c.minimumOrderAmount || 0) > 0 ? money(c.minimumOrderAmount) : 'Không yêu cầu'}</dd></div>
    <div><dt>Hết hạn</dt><dd>{date(c.expiresAt, c.status === 'EXPIRED' ? 'Chưa có ngày hết hạn' : 'Không giới hạn')}</dd></div>
  </dl>;
  return <section className="kc-workspace">
    <div className="kc-summary">
      {[['Doanh số qua mã', money(summary.totalSales)], ['Thù lao dự kiến', money(summary.totalCommission)], ['Đơn được ghi nhận', `${summary.totalOrders} đơn`], ['Mã hoạt động', `${active} / ${coupons.length}`]].map(([label, value], i) => <div key={label}><span>{label}</span><strong>{loading && !coupons.length ? '—' : value}</strong>{i === 3 && <small>{pending} mã chờ Shop duyệt</small>}</div>)}
    </div>
    <div className="kc-filters"><div className="kc-search-row"><label><Search size={17} /><input aria-label="Tìm mã ưu đãi hoặc cửa hàng" placeholder="Tìm mã ưu đãi, cửa hàng…" value={search} onChange={e => setSearch(e.target.value)} /></label><button type="button" className="kc-propose-button" onClick={onPropose}><Plus size={16} />Đề xuất mã</button></div><div className="kc-status-filters" aria-label="Lọc trạng thái mã">{filters.map(([key, label]) => <button key={key} type="button" aria-pressed={status === key} onClick={() => setStatus(key)}>{label}</button>)}</div></div>
    {error ? <div className="kc-empty" role="alert">{error}<button type="button" onClick={onRetry}>Thử lại</button></div> : loading && !coupons.length ? <div className="kc-empty">Đang tải mã ưu đãi…</div> : !filtered.length ? <div className="kc-empty"><Tag size={28} /><strong>{search || status !== 'ALL' ? 'Không có mã phù hợp' : 'Chưa có mã ưu đãi'}</strong></div> : <>
      <div className="kc-grid">{filtered.slice((currentPage - 1) * 10, currentPage * 10).map(c => {
        const state = effectiveStatus(c);
        return <article className="kc-card" key={c.id}>
          <div className="kc-card-heading"><div><StoreLogo coupon={c} /><span title={c.store?.name}>{c.store?.name || 'Cửa hàng đối tác'}</span></div><span className={`kc-status is-${state.toLowerCase()}`}>{labels[state]}</span></div>
          <div className="kc-code"><strong title={c.displayCode}>{c.displayCode}</strong><button type="button" aria-label={`Sao chép mã ${c.displayCode}`} onClick={() => onCopy(c.displayCode)}>{copiedCode === c.displayCode ? <Check size={16} /> : <Copy size={16} />}</button></div>
          {terms(c)}
          <div className="kc-limits"><span>Lượt dùng <strong>{c.usageCount} / {c.usageLimitTotal == null ? 'Không giới hạn' : c.usageLimitTotal}</strong></span><span>Ngân sách còn <strong>{c.budgetTotal == null ? 'Không giới hạn' : money(Math.max(0, Number(c.budgetTotal) - Number(c.budgetUsed)))}</strong></span></div>
          <dl className="kc-results"><div><dt>Doanh số</dt><dd>{money(c.totalSales)}</dd></div><div><dt>Thù lao dự kiến</dt><dd>{money(c.totalCommission)}</dd></div></dl>
          <footer><button type="button" onClick={() => setDetails(c)}>Xem chi tiết</button>{state === 'ACTIVE' && <button type="button" onClick={() => onToggle(c)}>Tạm ngưng</button>}{state === 'PAUSED' && c.approvedBy && c.approvedAt && <button type="button" onClick={() => onToggle(c)}>Kích hoạt lại</button>}{(state === 'PENDING_APPROVAL' || state === 'REJECTED') && <button type="button" className="is-danger" onClick={() => onDelete(c)}>{state === 'PENDING_APPROVAL' ? 'Hủy đề xuất' : 'Xóa mã'}</button>}</footer>
        </article>;
      })}</div>
      <div className="kc-pagination"><span>{(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, filtered.length)} / {filtered.length} mã</span><div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Trước</button><span>Trang {currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Sau</button></div></div>
    </>}
    <Modal isOpen={Boolean(details)} onClose={() => setDetails(null)} title="Chi tiết mã ưu đãi" subtitle={details?.displayCode} maxWidth="2xl" stickyHeader className="kc-detail-modal">
      {details && <div className="kc-detail">
        <strong>{details.store?.name}</strong><span className={`kc-status is-${effectiveStatus(details).toLowerCase()}`}>{labels[effectiveStatus(details)]}</span>
        {terms(details)}
        <dl className="kc-detail-fields">
          <div><dt>Phạm vi áp dụng</dt><dd>{details.scopeType === 'STORE_WIDE' ? 'Toàn cửa hàng' : details.scopeType === 'PRODUCTS' ? details.couponProducts?.map(p => p.product.title).join(', ') || 'Sản phẩm được chỉ định' : details.scopeType === 'CATEGORIES' ? details.couponCategories?.map(c => c.categoryName).join(', ') || 'Ngành hàng được chỉ định' : 'Theo cấu hình mã'}</dd></div>
          <div><dt>Ngày bắt đầu</dt><dd>{date(details.startsAt, 'Không ấn định')}</dd></div>
          <div><dt>Giảm tối đa</dt><dd>{details.discountType === 'FIXED_AMOUNT' ? 'Không áp dụng' : details.maximumDiscountAmount == null ? 'Không giới hạn' : money(details.maximumDiscountAmount)}</dd></div>
          <div><dt>Giới hạn mỗi khách</dt><dd>{details.usageLimitPerCustomer == null ? 'Không giới hạn' : `${details.usageLimitPerCustomer} lượt`}</dd></div>
          <div><dt>Lượt dùng đã ghi nhận</dt><dd>{details.usageCount}{details.usageLimitTotal != null ? ` / ${details.usageLimitTotal}` : ''}</dd></div>
          <div><dt>Ngân sách đã dùng</dt><dd>{money(details.budgetUsed)} / {details.budgetTotal == null ? 'Không giới hạn' : money(details.budgetTotal)}</dd></div>
          <div><dt>Ngày tạo</dt><dd>{date(details.createdAt)}</dd></div>
          {details.approvedAt && <div><dt>Ngày duyệt</dt><dd>{date(details.approvedAt)}</dd></div>}
          {details.rejectedReason && <div><dt>Lý do từ chối</dt><dd>{details.rejectedReason}</dd></div>}
          {details.blockedReason && <div><dt>Lý do khóa</dt><dd>{details.blockedReason}</dd></div>}
        </dl>
        <section className="kc-history"><h3>Lượt sử dụng gần đây {details.usageHistoryTotal != null && `(${details.usageHistoryTotal})`}</h3>
          {detailLoading ? <p>Đang tải lịch sử…</p> : detailError ? <p role="alert">{detailError}</p> : details.usageHistory ? details.usageHistory.length ? <><p>Tối đa 10 lượt mới nhất</p>{details.usageHistory.map(row => <div key={row.id}><span>{date(row.createdAt)}</span><span>{usageLabels[row.status] ?? 'Chưa xác định'}</span><strong>{money(row.discountAmount)}</strong></div>)}</> : <p>Chưa có lượt sử dụng được ghi nhận.</p> : <p>Chưa có dữ liệu lịch sử.</p>}
        </section><p>Khách sao chép mã và nhập khi thanh toán.</p>
      </div>}
    </Modal>
  </section>;
}
