import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Store, Info, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { handleStoreImageError } from '@/utils/image-fallback.utils';
import { Modal } from '../ui/Modal';
import type { WalletSummary } from '../../types/wallet.types';
import './wallet-financial-breakdown.css';
import { getSafeProductImageUrl, handleProductImageError } from '@/utils/marketplace.utils';
import { DealKpiProgress } from '../affiliate/DealKpiProgress';
import { referralLinksService, type DealKpiProgress as DealProgress } from '@/services/referral-links.service';

interface WalletFinancialBreakdownProps {
  wallet: WalletSummary | null;
  onSelectStoreForWithdraw?: (storeId: string) => void;
  onViewTransactions?: () => void;
  formatMoney: (val: string) => string;
}
const minor = (value: string) => {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2)) * (whole.startsWith('-') ? -1n : 1n);
};
export function WalletFinancialBreakdown({ wallet, formatMoney, onViewTransactions }: WalletFinancialBreakdownProps) {
  const [details, setDetails] = useState<string | null>(null);
  const [progressById, setProgressById] = useState<Record<string, DealProgress>>({});
  useEffect(() => {
    if (!details) return;
    let active = true;
    const deals = wallet?.activeDeals?.filter(deal => details === 'all' || deal.storeId === details) ?? [];
    void Promise.allSettled(deals.map(async deal => ({ id: deal.id, progress: await referralLinksService.getDealProgress(deal.id) }))).then(results => {
      if (!active) return;
      const next: Record<string, DealProgress> = {};
      for (const result of results) if (result.status === 'fulfilled') next[result.value.id] = result.value.progress;
      setProgressById(next);
    });
    return () => { active = false; };
  }, [details, wallet?.activeDeals]);
  if (!wallet) return null;
  const rows = wallet.cooperationStores?.length ? wallet.cooperationStores : wallet.stores.map(store => ({ ...store, logoUrl: null }));
  const availableTotal = rows.reduce((sum, row) => sum + minor(row.availableBalance), 0n);
  const pendingTotal = rows.reduce((sum, row) => sum + minor(row.pendingBalance), 0n);
  const hasDealAllocation = rows.every(row => row.conditionalDealEscrowBalance !== undefined);
  const dealTotal = rows.reduce((sum, row) => sum + minor(row.conditionalDealEscrowBalance ?? '0'), 0n);
  const totalsMatch = availableTotal === minor(wallet.availableBalance) && pendingTotal === minor(wallet.pendingBalance)
    && hasDealAllocation && dealTotal === minor(wallet.conditionalDealEscrowBalance ?? '0')
    && !wallet.balanceConsistency?.requiresReview && !wallet.dealBalanceConsistency?.requiresReview;
  const selected = rows.find(row => row.storeId === details);
  const deals = wallet.activeDeals?.filter(deal => !selected || deal.storeId === selected.storeId) ?? [];
  return <>
    <section className="wallet-store-breakdown" aria-label="Thu nhập theo cửa hàng">
      <header><h2><Store size={19} />Thu nhập theo cửa hàng</h2><div className="wallet-store-toolbar">
        {onViewTransactions && <button type="button" onClick={onViewTransactions}>Xem giao dịch <ArrowUpRight size={14} /></button>}
        <button type="button" onClick={() => setDetails('all')}><Info size={14} />Điều kiện mở khóa</button>
      </div></header>
      <div className="wallet-store-table-scroll"><table>
        <colgroup><col style={{ width: '29%' }} /><col style={{ width: '17%' }} /><col style={{ width: '18%' }} /><col style={{ width: '21%' }} /><col style={{ width: '15%' }} /></colgroup>
        <thead><tr><th>Cửa hàng</th><th>Có thể rút</th><th>Chờ đối soát 14 ngày</th><th>Chênh lệch Deal đang giữ</th><th>Đối soát</th></tr></thead>
        <tbody>{rows.map(row => {
          const hasIncome = minor(row.availableBalance) !== 0n || minor(row.pendingBalance) !== 0n || minor(row.conditionalDealEscrowBalance ?? '0') !== 0n;
          return <tr key={row.storeId}>
            <td><div className="wallet-store-identity"><span className="wallet-store-logo">{row.logoUrl ? <img src={row.logoUrl} onError={handleStoreImageError} alt="" /> : <Store size={20} />}</span><strong>{row.storeName}</strong></div></td>
            <td>{formatMoney(row.availableBalance)}</td><td>{formatMoney(row.pendingBalance)}</td>
            <td>{row.conditionalDealEscrowBalance !== undefined ? <button className="wallet-store-deal-value" type="button" onClick={() => setDetails(row.storeId)} aria-label={`Xem Deal tại ${row.storeName}`}>{formatMoney(row.conditionalDealEscrowBalance)}<Info size={12} /></button> : <span className="wallet-store-muted">Chưa có phân bổ</span>}</td>
            <td><button type="button" className="wallet-store-status" onClick={() => setDetails(row.storeId)}>{hasIncome ? 'Xem đối soát' : 'Chưa phát sinh'}<ArrowUpRight size={12} /></button></td>
          </tr>;
        })}</tbody>
        <tfoot><tr><th><span>Tổng thu nhập của bạn</span><small>{rows.length} cửa hàng</small></th>
          <td>{formatMoney(wallet.availableBalance)}</td><td>{formatMoney(wallet.pendingBalance)}</td><td>{formatMoney(wallet.conditionalDealEscrowBalance ?? '0')}</td>
          <td>{hasDealAllocation && <button type="button" className="wallet-store-total-status" data-matched={totalsMatch} onClick={() => setDetails('all')}>{totalsMatch ? <CheckCircle2 size={13} /> : <Info size={13} />}{totalsMatch ? 'Khớp tổng ví' : 'Cần đối soát'}</button>}</td>
        </tr></tfoot>
      </table></div>
    </section>
    {details && createPortal(<Modal isOpen onClose={() => setDetails(null)} title={selected ? 'Đối soát thu nhập' : 'Điều kiện mở khóa Deal'} subtitle={selected?.storeName} maxWidth="3xl" stickyHeader className="wallet-deal-conditions-dialog" bodyClassName="wallet-deal-conditions"
      footer={<div className="wallet-deal-conditions-footer"><span>Deal không cộng dồn với mức theo bậc.</span><button type="button" onClick={() => setDetails(null)}>Đóng</button></div>}>
      {selected && <div className="wallet-store-detail-values">
        <div><span>Có thể rút</span><strong>{formatMoney(selected.availableBalance)}</strong></div>
        <div><span>Chờ đối soát</span><strong>{formatMoney(selected.pendingBalance)}</strong></div>
        <div><span>Deal đang giữ</span><strong>{selected.conditionalDealEscrowBalance === undefined ? 'Chưa có phân bổ' : formatMoney(selected.conditionalDealEscrowBalance)}</strong></div>
      </div>}
      {!selected && !totalsMatch && <div className="wallet-store-review-note"><p>Phân bổ theo cửa hàng chưa khớp đầy đủ với tổng ví. Cần kiểm tra giao dịch trước khi xác nhận số liệu.</p>{wallet.dealBalanceConsistency && <div className="wallet-store-review-values"><span>Deal theo cửa hàng: <strong>{formatMoney(wallet.dealBalanceConsistency.allocatedBalance)}</strong></span><span>Deal trên tổng ví: <strong>{formatMoney(wallet.conditionalDealEscrowBalance ?? '0')}</strong></span></div>}</div>}
      <div className="wallet-deal-rules">
        <div className="wallet-deal-rule"><h3>Thù lao tiêu chuẩn</h3><strong>10% + mức theo bậc</strong><p>Mở khóa sau đối soát 14 ngày.</p></div>
        <div className="wallet-deal-rule"><h3>Chênh lệch Deal</h3><strong>Deal% − mức tiêu chuẩn</strong><p>Mở khóa khi đủ KPI và đối soát 14 ngày.</p></div>
      </div>
      <h3>Deal đã được duyệt</h3>
      {deals.length ? <div className="wallet-store-deal-list">{deals.map(deal => {
        const progress = progressById[deal.id];
        const states: Record<DealProgress['state'], string> = { PENDING: 'Chờ Shop chấp thuận', PENDING_ADMIN_APPROVAL: 'Chờ Admin phê duyệt', ACTIVE: 'Đang thực hiện', SETTLING: 'Chờ đối soát', ACHIEVED: 'Đã đạt KPI', REVIEW_REQUIRED: 'Cần xem xét', CLOSED: 'Đã đóng', LEGACY: 'Cam kết cũ', REJECTED: 'Đã từ chối' };
        const deadline = progress?.endsAt ?? deal.commitmentEndsAt;
        const target = progress?.targetRevenue ? formatMoney(String(progress.targetRevenue)) : progress?.targetOrders != null ? `${progress.targetOrders} đơn` : deal.targetOrders ? `${deal.targetOrders} đơn` : deal.targetRevenue ? formatMoney(String(deal.targetRevenue)) : 'Chưa thiết lập';
        return <article key={deal.id} className="wallet-condition-deal-card">
          <header><img src={getSafeProductImageUrl(deal.product?.imageUrl)} onError={handleProductImageError} alt="" /><div><strong>{deal.product?.title || 'Sản phẩm Deal'}</strong><span>{deal.store.name}</span></div><span className="wallet-condition-deal-state">{progress ? states[progress.state] : 'Đã duyệt'}</span></header>
          <div className="wallet-condition-deal-metrics"><div><span>Mức Deal</span><b>{deal.approvedCommissionRate || deal.proposedCommissionRate}%</b></div><div><span>KPI cam kết</span><b>{target}</b></div><div><span>Hạn hoàn thành</span><b>{deadline ? new Date(deadline).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa thiết lập'}</b></div></div>
          {progress && <div className="wallet-condition-deal-progress"><div><span>Đã đạt <b>{progress.targetRevenue ? formatMoney(String(progress.validRevenue || 0)) : `${progress.completedOrders} đơn`}</b></span><span>{Number(progress.percent).toLocaleString('vi-VN')}%</span></div><div role="progressbar" aria-label={`Tiến độ ${deal.product?.title || 'Deal'}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, progress.percent))}><i style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }} /></div></div>}
          <DealKpiProgress id={deal.id} product={deal.product} storeName={deal.store.name} triggerLabel="Xem tiến độ ↗" />
        </article>;
      })}</div> : <p className="wallet-store-muted">Chưa có Deal đã duyệt trong phạm vi này.</p>}
      {onViewTransactions && <button type="button" className="wallet-store-open-ledger" onClick={() => { setDetails(null); onViewTransactions(); }}>Xem giao dịch <ArrowUpRight size={14} /></button>}
    </Modal>, document.body)}
  </>;
}
