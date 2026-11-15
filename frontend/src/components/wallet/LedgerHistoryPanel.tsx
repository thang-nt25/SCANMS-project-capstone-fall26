import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ArrowUpRight, ReceiptText, Clock3, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { analyticsService, type ReferralOrderItem } from '@/services/analytics.service';
import { KolReferralOrderDialog } from '../affiliate/KolReferralOrderDialog';
import type { LedgerEntry, LedgerHistory } from '@/types/wallet.types';
import './ledger-history.css';

export type LedgerFilters = { search?: string; transactionType?: string; balanceBucket?: string; days?: number };
const labels: Record<string,string> = { COMMISSION_PENDING: 'Thù lao chờ đối soát', COMMISSION_APPROVED: 'Mở khóa thù lao', PAYOUT_WITHDRAW: 'Yêu cầu rút tiền', REVERSAL: 'Thu hồi thù lao', PAYOUT_REJECT_REFUND: 'Hoàn tiền yêu cầu rút' };
const label = (entry: LedgerEntry) => entry.referenceType === 'WALLET_RECONCILIATION' ? 'Điều chỉnh đối soát' : entry.referenceType === 'RECONCILIATION_ORDER' ? 'Ghi nhận thanh toán cũ' : entry.referenceType === 'MONTHLY_BONUS' ? 'Thưởng doanh số tháng' : labels[entry.transactionType] || 'Giao dịch ví';
const bucket = (entry: LedgerEntry) => entry.balanceBucket === 'PENDING' ? 'Chờ đối soát' : entry.balanceBucket === 'SHOPPING' ? 'Ví mua sắm' : 'Khả dụng';
const money = (value: string) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const delta = (value: string) => `${Number(value) > 0 ? '+' : Number(value) < 0 ? '−' : ''}${money(String(Math.abs(Number(value))))}`;
const date = (value: string) => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
const time = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });

export function LedgerHistoryPanel({ ledger, page, loading, filters, onFilters, onPage, onCopy, onPayout, compact = false, onViewAll }: {
  ledger: LedgerHistory | null; page: number; loading: boolean; filters: LedgerFilters; onFilters: (filters: LedgerFilters) => void; onPage: (page: number) => void; onCopy: (id: string) => void; onPayout: (id: string) => void;
  compact?: boolean; onViewAll?: () => void;
}) {
  const [search, setSearch] = useState(filters.search || '');
  const [entry, setEntry] = useState<LedgerEntry | null>(null);
  const [order, setOrder] = useState<ReferralOrderItem | null>(null);
  const [orderError, setOrderError] = useState('');
  const [openingOrder, setOpeningOrder] = useState(false);
  useEffect(() => {
    if (compact) return;
    const timer = setTimeout(() => { if (search.trim() !== (filters.search || '')) onFilters({ ...filters, search: search.trim() || undefined }); }, 350);
    return () => clearTimeout(timer);
  }, [search, filters, onFilters, compact]);
  const openOrder = async () => {
    if (!entry?.referenceDetails?.orderId || openingOrder) return;
    setOpeningOrder(true); setOrderError('');
    try {
      const result = await analyticsService.getCollaboratorReferralOrders({ search: entry.referenceDetails.orderCode || entry.referenceDetails.orderId, limit: 10 }, true);
      const matched = result.items.find(item => item.id === entry.referenceDetails?.orderId);
      if (!matched) throw Error('Không tìm thấy đơn tiếp thị trong phạm vi tài khoản.');
      setOrder(matched);
    } catch (error) { setOrderError(error instanceof Error ? error.message : 'Không tải được đơn hàng.'); }
    finally { setOpeningOrder(false); }
  };
  const pages = Math.max(1, Math.ceil((ledger?.total ?? 0) / 10));
  return <section className={`kol-ledger-history${compact ? ' kol-ledger-recent' : ''}`} aria-label={compact ? 'Giao dịch gần đây' : 'Lịch sử giao dịch'} aria-busy={loading}>
    <header id={compact ? undefined : 'wallet-ledger-details'}><h2><ReceiptText size={19} />{compact ? 'Giao dịch gần đây' : 'Lịch sử giao dịch'}{!compact && <small>{ledger?.total ?? 0} giao dịch</small>}</h2>{compact && <button type="button" className="kol-ledger-view-all" onClick={onViewAll}>Xem tất cả · {ledger?.total ?? 0}<ArrowUpRight size={14} /></button>}</header>
    {!compact && <div className="kol-ledger-filters"><input aria-label="Tìm giao dịch" placeholder="Tìm UUID giao dịch, mã đơn…" value={search} onChange={e => setSearch(e.target.value)} />
      <select aria-label="Loại giao dịch" value={filters.transactionType || ''} onChange={e => onFilters({ ...filters, transactionType: e.target.value || undefined })}><option value="">Loại giao dịch</option>{Object.entries(labels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</select>
      <select aria-label="Ngăn ví" value={filters.balanceBucket || ''} onChange={e => onFilters({ ...filters, balanceBucket: e.target.value || undefined })}><option value="">Ngăn ví</option><option value="AVAILABLE">Khả dụng</option><option value="PENDING">Chờ đối soát</option><option value="SHOPPING">Ví mua sắm</option></select>
      <select aria-label="Khoảng thời gian" value={filters.days || ''} onChange={e => onFilters({ ...filters, days: e.target.value ? Number(e.target.value) : undefined })}><option value="">Toàn thời gian</option><option value="7">7 ngày gần nhất</option><option value="30">30 ngày gần nhất</option><option value="90">90 ngày gần nhất</option></select>
    </div>}
    <table><thead><tr><th>Thời gian</th><th>{compact ? 'Giao dịch' : 'Giao dịch / Ngăn ví'}</th><th>Biến động</th><th>Số dư sau</th><th>Tham chiếu</th></tr></thead><tbody>{(compact ? ledger?.entries.slice(0, 5) : ledger?.entries)?.map(row => {
      const Icon = row.transactionType === 'REVERSAL' ? AlertCircle : row.transactionType === 'COMMISSION_PENDING' ? Clock3 : row.transactionType === 'PAYOUT_REJECT_REFUND' ? RefreshCw : row.transactionType === 'COMMISSION_APPROVED' ? CheckCircle2 : ArrowUpRight;
      const referenceLabel = row.referenceDetails?.orderCode || (row.referenceType === 'PAYOUT_REQUEST' && row.referenceId ? `Mã rút ${row.referenceId.slice(0, 8)}` : row.referenceDetails?.period ? `Kỳ ${row.referenceDetails.period}` : null);
      return <tr key={row.id}>
      <td><time dateTime={row.createdAt}>{date(row.createdAt)}<small>{time(row.createdAt)}</small></time></td>
      <td><button type="button" className="kol-ledger-entry-button" onClick={() => { setEntry(row); setOrderError(''); }}>{compact && <Icon size={14} />}{label(row)}{!compact && <ArrowUpRight size={12} />}</button><small>{bucket(row)}</small></td>
      <td><strong className="kol-ledger-delta" data-negative={Number(row.amount) < 0}>{delta(row.amount)}</strong></td>
      <td><strong>{money(row.balanceAfter)}</strong></td>
      <td>{referenceLabel && row.referenceId ? <button type="button" className="kol-ledger-reference-button" onClick={() => { setEntry(row); setOrderError(''); }}>{referenceLabel}<ArrowUpRight size={12} /></button> : compact ? <span className="kol-ledger-no-reference">—</span> : <button type="button" className="kol-ledger-reference-button" onClick={() => { setEntry(row); setOrderError(''); }}>Xem chi tiết<ArrowUpRight size={12} /></button>}<small>{row.referenceDetails?.storeName || ''}</small></td>
    </tr>; })}</tbody></table>
    {!ledger?.entries.length && <p className="kol-ledger-empty">{loading ? 'Đang tải giao dịch…' : 'Không có giao dịch phù hợp.'}</p>}
    {!compact && <footer><span>{ledger?.total ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, ledger.total)} / ${ledger.total}` : '0 giao dịch'}</span>{pages > 1 && <div><button type="button" disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>Trước</button><span>Trang {page}/{pages}</span><button type="button" disabled={loading || page >= pages} onClick={() => onPage(page + 1)}>Sau</button></div>}</footer>}
    {entry && createPortal(<Modal isOpen onClose={() => setEntry(null)} title="Chi tiết giao dịch" maxWidth="xl" stickyHeader className="kol-ledger-drawer" bodyClassName="kol-ledger-detail-body">
      <div className="kol-ledger-detail-amount"><span>{label(entry)}</span><strong data-negative={Number(entry.amount) < 0}>{delta(entry.amount)}</strong></div>
      <dl><div><dt>Mã giao dịch</dt><dd className="kol-ledger-detail-code">{entry.id}<button type="button" onClick={() => onCopy(entry.id)} aria-label="Sao chép mã giao dịch"><Copy size={15} /></button></dd></div><div><dt>Thời gian</dt><dd>{time(entry.createdAt)} · {date(entry.createdAt)}</dd></div><div><dt>Ngăn ví</dt><dd>{bucket(entry)}</dd></div><div><dt>Số dư trước</dt><dd>{money(entry.balanceBefore)}</dd></div><div><dt>Biến động</dt><dd>{delta(entry.amount)}</dd></div><div><dt>Số dư sau</dt><dd>{money(entry.balanceAfter)}</dd></div></dl>
      <p className="kol-ledger-detail-note">Số dư của ngăn ví tại thời điểm giao dịch.</p>
      {entry.referenceId && <div className="kol-ledger-related"><h4>Hồ sơ liên quan</h4>{entry.referenceDetails?.storeName && <p>{entry.referenceDetails.storeName}</p>}{entry.referenceDetails?.orderCode && <p>{entry.referenceDetails.orderCode}</p>}<div className="kol-ledger-detail-code">{entry.referenceId}<button type="button" onClick={() => onCopy(entry.referenceId!)} aria-label="Sao chép mã tham chiếu"><Copy size={15} /></button></div>
        {entry.referenceType === 'PAYOUT_REQUEST' && <button type="button" className="kol-ledger-open-related" onClick={() => { setEntry(null); onPayout(entry.referenceId!); }}>Xem yêu cầu rút <ArrowUpRight size={14} /></button>}
        {entry.referenceDetails?.orderId && <button type="button" className="kol-ledger-open-related" disabled={openingOrder} onClick={() => void openOrder()}>{openingOrder ? 'Đang tải đơn…' : 'Xem đơn tiếp thị'}<ArrowUpRight size={14} /></button>}
        {orderError && <p role="alert" className="text-xs text-[#DC2626]">{orderError}</p>}
      </div>}
    </Modal>, document.body)}
    {order && createPortal(<KolReferralOrderDialog order={order} onClose={() => setOrder(null)} />, document.body)}
  </section>;
}
