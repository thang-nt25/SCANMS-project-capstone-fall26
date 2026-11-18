import { useRef, useState } from 'react';
import { ArrowUpRight, Store, CheckCircle2 } from 'lucide-react';
import { monthlyRewards, type RewardOverview, type MonthlyRewardOrders } from '../../services/monthly-rewards.service';
import { authService } from '../../services/auth.service';
import { Modal } from '../ui/Modal';

const money = (amount: string | number) => `${Number(amount).toLocaleString('vi-VN')} ₫`;
const pct = (amount: string | null, target: string) => amount !== null && Number(target) > 0 ? Math.max(0, Number(amount) / Number(target) * 100) : null;
const grantLabels: Record<string, string> = { PENDING: 'Đề nghị thưởng chờ duyệt', APPROVED: 'Đã duyệt thưởng · Chưa cộng ví', PAID: 'Đã cộng ví', REJECTED: 'Đề nghị thưởng bị từ chối' };
export function KolMonthlyRewards({ data }: { data: RewardOverview }) {
  const userId = authService.getCurrentUser()?.id;
  const [orders, setOrders] = useState<MonthlyRewardOrders | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const request = useRef(0);
  const openOrders = async (id: string) => {
    const current = ++request.current; setSelected(id); setOrders(null); setError(''); setLoading(true); setPage(1);
    try { const result = await monthlyRewards.myOrders(id); if (current === request.current) setOrders(result); }
    catch (e: any) { if (current === request.current) setError(e?.message || 'Không thể tải đơn hợp lệ.'); }
    finally { if (current === request.current) setLoading(false); }
  };
  const close = () => { request.current++; setSelected(null); };
  return <div className="kol-monthly-cards">
    {!data.policies.length && !data.legacyHistory?.length && <div className="kol-monthly-empty">Chưa có chính sách thưởng cho kỳ này.</div>}
    {data.policies.map(policy => {
      const member = policy.members.find(person => person.collaboratorId === userId);
      const percentage = member ? pct(member.validRevenue, policy.targetRevenue) : null;
      const logo = data.stores.find(store => store.id === policy.storeId)?.logoUrl;
      return <article className="kol-monthly-card" key={policy.id}>
        <header><span className="kol-monthly-store-logo">{logo ? <img src={logo} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} /> : <Store size={22} />}</span><div><h2>{policy.storeName}</h2><p>{policy.name} · {policy.yearMonth.split('-').reverse().join('/')}</p></div><span className="kol-monthly-policy-status">Chính sách {policy.status === 'APPROVED' ? 'đã duyệt' : policy.status === 'PENDING' ? 'chờ duyệt' : 'bị từ chối'}</span></header>
        <div className="kol-monthly-metrics"><div><span>Doanh số hợp lệ</span><strong>{member?.validRevenue != null ? money(member.validRevenue) : 'Chưa xác định'}</strong></div><div><span>Mục tiêu</span><strong>{money(policy.targetRevenue)}</strong></div><div><span>Thưởng khi đạt</span><strong>{money(policy.rewardAmount)}</strong></div></div>
        <div className="kol-monthly-progress"><div><strong>{percentage === null ? 'Cần đối soát' : `${percentage.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% KPI`}</strong><span>{member?.error || (percentage === null ? 'Chưa đủ dữ liệu' : member?.eligible ? 'Đã đạt mục tiêu' : `Còn ${money(Math.max(0, Number(policy.targetRevenue) - Number(member?.validRevenue)))}`)}</span></div><div className="kol-monthly-track" role="progressbar" aria-label={`Tiến độ thưởng ${policy.storeName}`} aria-valuenow={Math.min(100, Math.round(percentage || 0))} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, percentage || 0)}%` }} /></div></div>
        {member?.grant?.reviewNote && <p className="kol-monthly-review-note">{member.grant.reviewNote}</p>}
        <footer><div><span className="kol-monthly-personal-status">{member?.grant?.status === 'PAID' && <CheckCircle2 size={14} />}{member?.grant ? grantLabels[member.grant.status] || member.grant.status : member?.error ? 'Cần đối soát' : member?.eligible ? 'Đủ KPI · Chưa gửi đề nghị thưởng' : 'Đang theo dõi'}</span>{member?.grant?.status === 'PAID' && <small>{money(member.grant.amount)}{member.grant.paidAt ? ` · ${new Date(member.grant.paidAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` : ''}</small>}</div><button type="button" disabled={!member || Boolean(member.error)} onClick={() => void openOrders(policy.id)}>Xem đơn hợp lệ<ArrowUpRight size={15} /></button></footer>
      </article>;
    })}
    {data.legacyHistory?.map(history => history.members.filter(member => member.collaboratorId === userId).map(member => <article className="kol-monthly-card kol-monthly-legacy" key={member.id}><header><span className="kol-monthly-store-logo"><Store size={22} /></span><div><h2>{history.storeName}</h2><p>Thưởng tháng {history.yearMonth.split('-').reverse().join('/')} · Lịch sử</p></div><span className="kol-monthly-policy-status">{grantLabels[member.status] || (member.isSettled ? 'Đã chốt kỳ' : 'Chưa chốt')}</span></header><div className="kol-monthly-metrics"><div><span>Doanh số đã chốt</span><strong>{member.validRevenue !== null ? money(member.validRevenue) : 'Chưa xác định'}</strong></div><div><span>Mục tiêu đã lưu</span><strong>{history.rules.length === 1 ? money(history.rules[0].targetRevenue) : 'Xem chính sách kỳ'}</strong></div><div><span>{member.status === 'PAID' ? 'Đã cộng ví' : 'Tiền thưởng đã chốt'}</span><strong>{member.amount !== null ? money(member.amount) : 'Chưa chốt'}</strong></div></div>{(member.error || history.warning) && <p className="kol-monthly-review-note">{member.error || history.warning}</p>}<footer><span>{member.appliedRuleName || 'Kết quả chính sách của kỳ'}</span><span>{(member.paidAt || member.settledAt) ? new Date((member.paidAt || member.settledAt)!).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có thời điểm chốt'}</span></footer></article>))}
    {selected && <Modal isOpen title="Đơn hợp lệ của kỳ thưởng" onClose={close} maxWidth="2xl"><div className="kol-monthly-orders">{loading ? <p role="status">Đang tải đơn hợp lệ…</p> : error ? <p role="alert">{error}<button onClick={() => void openOrders(selected)}>Thử lại</button></p> : orders && <><header><span>{orders.totalOrders} đơn</span><strong>{money(orders.totalRevenue)}</strong></header>{orders.items.slice((page - 1) * 10, page * 10).map(order => <article key={order.id}><div><strong>{order.code}</strong><small>{order.completedAt ? new Date(order.completedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có ngày hoàn tất'}</small>{order.products.map((product, index) => <div className="kol-monthly-order-product" key={index}>{product.imageUrl && <img src={product.imageUrl} alt="" />}<span>{product.title} × {product.quantity}</span></div>)}</div><strong>{money(order.revenue)}</strong></article>)}{!orders.items.length && <p>Chưa có đơn hợp lệ trong kỳ.</p>}{orders.items.length > 10 && <footer><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page}/{Math.ceil(orders.items.length / 10)}</span><button disabled={page * 10 >= orders.items.length} onClick={() => setPage(p => p + 1)}>Sau</button></footer>}</>}</div></Modal>}
  </div>;
}
