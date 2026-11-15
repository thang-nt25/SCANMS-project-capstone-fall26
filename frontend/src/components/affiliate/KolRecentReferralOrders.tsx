import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import { analyticsService, type ReferralOrderItem } from '../../services/analytics.service';
import { formatMoney, getSafeProductImageUrl, handleProductImageError } from '../../utils/marketplace.utils';
import { kolOrderCommissionStatus, kolOrderCommissionAmountLabel } from '../../utils/kol-order-status';
import { KolReferralOrderDialog } from './KolReferralOrderDialog';

export function KolRecentReferralOrders() {
  const [selected, setSelected] = useState<ReferralOrderItem | null>(null);
  const { data, isPending, refetch } = useQuery({ queryKey: ['kol-recent-referral-orders'], queryFn: () => analyticsService.getCollaboratorReferralOrders({ limit: 3 }, true), staleTime: 120000 });
  return <section className="kol-recent-orders" aria-label="Đơn tiếp thị gần đây"><header><h2><ShoppingBag size={17}/>Đơn tiếp thị gần đây</h2><Link to="/collaborator/reports?tab=orders">Xem báo cáo đầy đủ <ArrowUpRight size={14}/></Link></header>
    {isPending ? <p className="kol-report-empty" role="status">Đang tải đơn tiếp thị…</p> : !data ? <p className="kol-report-empty">Chưa tải được đơn tiếp thị.<button type="button" onClick={() => void refetch()}>Thử lại</button></p> : !data.items.length ? <p className="kol-report-empty">Chưa có đơn tiếp thị được ghi nhận.</p> : <div>{data.items.slice(0, 3).map(order => {
      const product = order.products[0];
      return <article key={order.id} className="kol-recent-order-row"><img src={getSafeProductImageUrl(product?.imageUrl, product?.title)} alt={product?.title || 'Sản phẩm tiếp thị'} onError={handleProductImageError}/><div className="kol-recent-order-info"><button type="button" onClick={() => setSelected(order)}>{order.orderCode}</button><span>{product?.title || order.storeName}</span><time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}</time></div><div className="kol-recent-order-money"><span>{kolOrderCommissionAmountLabel(order)}</span><strong>{formatMoney(order.commissionAmount)}</strong></div><span className="kol-commission-status" data-status={order.commissionStatus}>{kolOrderCommissionStatus(order)}</span></article>;
    })}</div>}
    {selected && <KolReferralOrderDialog order={selected} onClose={() => setSelected(null)}/>}
  </section>;
}
