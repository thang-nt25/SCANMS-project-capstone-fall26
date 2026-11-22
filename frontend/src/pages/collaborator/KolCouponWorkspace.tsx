import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, History, Plus, Search, Store, Tag } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { couponService, type CouponItem, type CouponStatus } from '../../services/coupon.service';

type Coupon = CouponItem & { totalSales?: number; totalCommission?: number };
type Summary = { totalSales: number; totalCommission: number; totalOrders: number };
const money = (value: unknown) => value == null ? 'Chưa có dữ liệu' : `${Number(value).toLocaleString('vi-VN')} đ`;
const date = (value?: string | null, fallback = 'Không giới hạn') => value ? new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : fallback;
const labels: Record<CouponStatus, string> = { ACTIVE: 'Đang hoạt động', PENDING_APPROVAL: 'Chờ Shop duyệt', PENDING_ADMIN_APPROVAL: 'Chờ Admin duyệt (>10%)', PENDING_BLOCK_APPROVAL: 'Shop xin ngừng (Chờ duyệt)', PAUSED: 'Tạm ngưng', REJECTED: 'Đã từ chối', BLOCKED: 'Đã bị khóa', EXPIRED: 'Hết hạn / Đã thay thế', DELETED: 'Đã xóa' };
const HISTORY_STATUSES = new Set<CouponStatus>(['EXPIRED', 'REJECTED', 'BLOCKED', 'DELETED']);
const filters = [
  ['ALL', 'Tất cả'],
  ['ACTIVE', 'Đang chạy'],
  ['PENDING_APPROVAL', 'Chờ duyệt'],
  ['PAUSED', 'Tạm ngưng'],
  ['HISTORY', 'Lịch sử'],
] as const;
type FilterKey = (typeof filters)[number][0];
const usageLabels: Record<string, string> = { USED: 'Đã dùng', RESERVED: 'Đang giữ lượt', CANCELLED: 'Đã hủy', PARTIALLY_REFUNDED: 'Hoàn một phần', REFUNDED: 'Đã hoàn tiền' };
function effectiveStatus(c: Coupon): CouponStatus {
  return ['ACTIVE', 'PAUSED', 'PENDING_BLOCK_APPROVAL'].includes(c.status) && c.expiresAt && new Date(c.expiresAt).getTime() <= Date.now() ? 'EXPIRED' : c.status;
}
function isHistoryStatus(status: CouponStatus): boolean {
  return HISTORY_STATUSES.has(status);
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
  const [status, setStatus] = useState<FilterKey>('ALL');
  const [selectedStoreId, setSelectedStoreId] = useState('ALL');
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

  const storeOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; logoUrl?: string | null }>();
    for (const c of coupons) {
      const sid = c.store?.id || c.storeId || 'unknown';
      if (!map.has(sid)) {
        map.set(sid, { id: sid, name: c.store?.name || 'Cửa hàng đối tác', logoUrl: c.store?.logoUrl });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [coupons]);

  const historyCount = useMemo(
    () => coupons.filter(c => isHistoryStatus(effectiveStatus(c))).length,
    [coupons]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('vi-VN');
    return coupons.filter(c => {
      const st = effectiveStatus(c);
      const matchesStatus =
        status === 'ALL'
          ? !isHistoryStatus(st)
          : status === 'HISTORY'
            ? isHistoryStatus(st)
            : status === 'PENDING_APPROVAL'
              ? st === 'PENDING_APPROVAL' || st === 'PENDING_ADMIN_APPROVAL'
              : st === status;
      const sid = c.store?.id || c.storeId || 'unknown';
      const matchesStore = selectedStoreId === 'ALL' || sid === selectedStoreId;
      const matchesQuery = !q || `${c.displayCode} ${c.codeNormalized} ${c.store?.name ?? ''}`.toLocaleLowerCase('vi-VN').includes(q);
      return matchesStatus && matchesStore && matchesQuery;
    });
  }, [coupons, search, status, selectedStoreId]);

  const pages = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pages);
  useEffect(() => setPage(1), [search, status, selectedStoreId]);

  const pagedCoupons = useMemo(
    () => filtered.slice((currentPage - 1) * 12, currentPage * 12),
    [filtered, currentPage]
  );

  const groupedByStore = useMemo(() => {
    const groups = new Map<string, { storeId: string; storeName: string; sampleCoupon: Coupon; items: Coupon[] }>();
    for (const c of pagedCoupons) {
      const sid = c.store?.id || c.storeId || 'unknown';
      const existing = groups.get(sid);
      if (existing) {
        existing.items.push(c);
      } else {
        groups.set(sid, {
          storeId: sid,
          storeName: c.store?.name || 'Cửa hàng đối tác',
          sampleCoupon: c,
          items: [c],
        });
      }
    }
    return Array.from(groups.values());
  }, [pagedCoupons]);

  const active = coupons.filter(c => effectiveStatus(c) === 'ACTIVE').length;
  const pending = coupons.filter(c => ['PENDING_APPROVAL', 'PENDING_ADMIN_APPROVAL'].includes(effectiveStatus(c))).length;
  const discount = (c: Coupon) => c.discountType === 'PERCENTAGE' ? `${Number(c.discountValue)}%` : money(c.discountValue);
  const terms = (c: Coupon) => <dl className="kc-terms">
    <div><dt>Mức giảm</dt><dd>{discount(c)}</dd></div>
    <div><dt>Đơn tối thiểu</dt><dd>{Number(c.minimumOrderAmount || 0) > 0 ? money(c.minimumOrderAmount) : 'Không yêu cầu'}</dd></div>
    <div><dt>Hết hạn</dt><dd>{date(c.expiresAt, c.status === 'EXPIRED' ? 'Chưa có ngày hết hạn' : 'Không giới hạn')}</dd></div>
  </dl>;
  return <section className="kc-workspace">
    <div className="kc-summary">
      {[['Doanh số qua mã', money(summary.totalSales)], ['Thù lao dự kiến', money(summary.totalCommission)], ['Đơn được ghi nhận', `${summary.totalOrders} đơn`], ['Mã hoạt động', `${active} / ${coupons.length - historyCount}`]].map(([label, value], i) => <div key={label}><span>{label}</span><strong>{loading && !coupons.length ? '—' : value}</strong>{i === 3 && <small>{pending} mã chờ duyệt · {historyCount} mã lịch sử</small>}</div>)}
    </div>
    <div className="kc-filters">
      <div className="kc-search-row">
        <label><Search size={17} /><input aria-label="Tìm mã ưu đãi hoặc cửa hàng" placeholder="Tìm mã ưu đãi, cửa hàng…" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <button type="button" className="kc-propose-button" onClick={onPropose}><Plus size={16} />Đề xuất mã</button>
      </div>
      <div className="kc-status-filters" style={{ gridTemplateColumns: `repeat(${filters.length}, minmax(0, 1fr))` }} aria-label="Lọc trạng thái mã">
        {filters.map(([key, label]) => (
          <button key={key} type="button" aria-pressed={status === key} onClick={() => setStatus(key)}>
            {key === 'HISTORY' ? (
              <span className="inline-flex items-center justify-center gap-1.5">
                <History size={13} />
                <span>{label} ({historyCount})</span>
              </span>
            ) : label}
          </button>
        ))}
      </div>
      {storeOptions.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#EAE4D7] pt-3" role="group" aria-label="Lọc theo cửa hàng">
          <span className="text-[11px] font-semibold text-[#7D715E] mr-1">Cửa hàng:</span>
          <button
            type="button"
            onClick={() => setSelectedStoreId('ALL')}
            aria-pressed={selectedStoreId === 'ALL'}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              selectedStoreId === 'ALL'
                ? 'border-[#C59B58] bg-[#FBF5EB] text-[#855F2D] font-semibold'
                : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#C59B58] hover:text-[#1A1612]'
            }`}
          >
            Tất cả cửa hàng
          </button>
          {storeOptions.map(st => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStoreId(st.id)}
              aria-pressed={selectedStoreId === st.id}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                selectedStoreId === st.id
                  ? 'border-[#C59B58] bg-[#FBF5EB] text-[#855F2D] font-semibold'
                  : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:border-[#C59B58] hover:text-[#1A1612]'
              }`}
            >
              <Store size={12} className="text-[#B88E4F]" />
              <span>{st.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
    {error ? <div className="kc-empty" role="alert">{error}<button type="button" onClick={onRetry}>Thử lại</button></div> : loading && !coupons.length ? <div className="kc-empty">Đang tải mã ưu đãi…</div> : !filtered.length ? <div className="kc-empty"><Tag size={28} /><strong>{status === 'HISTORY' ? 'Chưa có mã trong lịch sử' : search || status !== 'ALL' || selectedStoreId !== 'ALL' ? 'Không có mã phù hợp' : 'Chưa có mã ưu đãi'}</strong>{status === 'ALL' && historyCount > 0 && <button type="button" onClick={() => setStatus('HISTORY')}>Xem {historyCount} mã trong lịch sử</button>}</div> : <>
      <div className="space-y-5">
        {groupedByStore.map(group => {
          const activeInGroup = group.items.filter(item => effectiveStatus(item) === 'ACTIVE').length;
          return (
            <section key={group.storeId} className="space-y-3 rounded-2xl border border-[#EAE4D7] bg-[#FAF8F5]/60 p-4">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE4D7] pb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <StoreLogo coupon={group.sampleCoupon} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-[#1A1612] truncate m-0">{group.storeName}</h3>
                    <p className="text-[11px] text-[#7D715E] m-0">
                      {group.items.length} mã{status !== 'HISTORY' ? ` · ${activeInGroup} đang chạy` : ' trong lịch sử'}
                    </p>
                  </div>
                </div>
              </header>
              <div className="kc-grid">{group.items.map(c => {
                const state = effectiveStatus(c);
                return <article className="kc-card" key={c.id}>
                  <div className="kc-card-heading"><div><StoreLogo coupon={c} /><span title={c.store?.name}>{c.store?.name || 'Cửa hàng đối tác'}</span></div><span className={`kc-status is-${state.toLowerCase()}`}>{labels[state]}</span></div>
                  <div className="kc-code"><strong title={c.displayCode}>{c.displayCode}</strong><button type="button" aria-label={`Sao chép mã ${c.displayCode}`} onClick={() => onCopy(c.displayCode)}>{copiedCode === c.displayCode ? <Check size={16} /> : <Copy size={16} />}</button></div>
                  {terms(c)}
                  <div className="kc-limits"><span>Lượt đã áp dụng <strong>{c.usageCount} lượt</strong></span><span>Hiệu lực <strong>{c.expiresAt ? `Đến ${date(c.expiresAt)}` : 'Theo chiến dịch'}</strong></span></div>
                  <dl className="kc-results"><div><dt>Doanh số</dt><dd>{money(c.totalSales)}</dd></div><div><dt>Thù lao dự kiến</dt><dd>{money(c.totalCommission)}</dd></div></dl>
                  <footer><button type="button" onClick={() => setDetails(c)}>Xem chi tiết</button>{state === 'ACTIVE' && <button type="button" onClick={() => onToggle(c)}>Tạm ngưng</button>}{state === 'PAUSED' && c.approvedBy && c.approvedAt && <button type="button" onClick={() => onToggle(c)}>Kích hoạt lại</button>}{(state === 'PENDING_APPROVAL' || state === 'REJECTED') && <button type="button" className="is-danger" onClick={() => onDelete(c)}>{state === 'PENDING_APPROVAL' ? 'Hủy đề xuất' : 'Xóa mã'}</button>}</footer>
                </article>;
              })}</div>
            </section>
          );
        })}
      </div>
      <div className="kc-pagination"><span>{(currentPage - 1) * 12 + 1}–{Math.min(currentPage * 12, filtered.length)} / {filtered.length} mã</span><div><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Trước</button><span>Trang {currentPage} / {pages}</span><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Sau</button></div></div>
    </>}
    <Modal isOpen={Boolean(details)} onClose={() => setDetails(null)} title="Chi tiết mã ưu đãi" subtitle={details?.displayCode} maxWidth="2xl" stickyHeader className="kc-detail-modal">
      {details && <div className="kc-detail">
        <strong>{details.store?.name}</strong><span className={`kc-status is-${effectiveStatus(details).toLowerCase()}`}>{labels[effectiveStatus(details)]}</span>
        {terms(details)}
        <dl className="kc-detail-fields">
          <div><dt>Phạm vi áp dụng</dt><dd>{details.scopeType === 'STORE_WIDE' ? 'Toàn cửa hàng' : details.scopeType === 'PRODUCTS' ? details.couponProducts?.map(p => p.product.title).join(', ') || 'Sản phẩm được chỉ định' : details.scopeType === 'CATEGORIES' ? details.couponCategories?.map(c => c.categoryName).join(', ') || 'Ngành hàng được chỉ định' : 'Theo cấu hình mã'}</dd></div>
          <div><dt>Ngày bắt đầu</dt><dd>{date(details.startsAt, 'Không ấn định')}</dd></div>
          <div><dt>Giảm tối đa</dt><dd>{details.discountType === 'FIXED_AMOUNT' ? 'Không áp dụng' : details.maximumDiscountAmount == null ? 'Không giới hạn' : money(details.maximumDiscountAmount)}</dd></div>
          <div><dt>Lượt đã áp dụng</dt><dd>{details.usageCount} lượt (Không giới hạn lượt)</dd></div>
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
