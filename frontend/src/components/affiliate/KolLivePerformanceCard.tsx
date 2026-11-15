import { Radio } from 'lucide-react';
import type { LiveSessionSummaryItem } from '../../services/analytics.service';
import { formatMoney, handleProductImageError } from '../../utils/marketplace.utils';

interface Props { sessions: LiveSessionSummaryItem[]; totals: { totalLiveRevenue: number; totalLiveCommission: number; totalLiveOrders: number }; loading?: boolean }
const liveStatusLabels: Record<string, string> = { DRAFT: 'Bản nháp', SCHEDULED: 'Đã lên lịch', LIVE: 'Đang phát', ENDED: 'Đã kết thúc', CANCELLED: 'Đã hủy', COMPLETED: 'Đã kết thúc' };
export default function KolLivePerformanceCard({ sessions, totals, loading }: Props) {
  if (loading) return <p role="status" className="kol-report-empty">Đang tải số liệu livestream…</p>;
  return <div className="kol-live-report"><div className="kol-live-metrics">{[
    ['Doanh số livestream', formatMoney(totals.totalLiveRevenue)], ['Thù lao ghi nhận', formatMoney(totals.totalLiveCommission)], ['Đơn phát sinh', `${totals.totalLiveOrders.toLocaleString('vi-VN')} đơn`],
  ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    {!sessions.length ? <div className="kol-report-empty"><Radio size={26}/><span>Chưa có dữ liệu livestream</span></div> : <div className="overflow-x-auto"><table className="kol-live-table"><thead><tr><th>Phiên live / Cửa hàng</th><th>Thời gian</th><th>Đơn</th><th>Doanh số</th><th>Thù lao ghi nhận</th></tr></thead><tbody>{sessions.map(session => <tr key={session.id}><td><div className="kol-report-product">{session.coverImageUrl ? <img src={session.coverImageUrl} alt="" onError={handleProductImageError}/> : <span className="kol-live-cover"><Radio size={22}/></span>}<div><strong>{session.title}</strong><span>{session.storeName}</span><small>{liveStatusLabels[session.status] || 'Chưa xác định'}</small></div></div></td><td>{new Date(session.startsAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' })}</td><td>{session.metrics.ordersCount}</td><td>{formatMoney(session.metrics.grossRevenue)}</td><td>{formatMoney(session.metrics.commissionEarned)}</td></tr>)}</tbody></table></div>}
  </div>;
}
