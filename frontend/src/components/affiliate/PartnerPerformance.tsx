import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ExclusiveDealInbox } from './ExclusiveDealInbox';

interface Performance {
  totalOrders: number; completedOrders: number; revenue: number; commission: number; clicks: number;
  conversionRate: number | null; completionRate: number | null;
  orders: Array<{ id: string; code: string; createdAt: string; amount: number; commission: number; status: string; products: string[] }>;
}
const money = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
export function PartnerPerformance({ collaboratorId, storeId, name, onChat }: {
  collaboratorId: string; storeId?: string; name: string; onChat: () => void;
}) {
  const [range, setRange] = useState('30d');
  const [data, setData] = useState<Performance | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    api.get(`/store-collaborators/shop/${encodeURIComponent(collaboratorId)}/performance`, {
      params: { range, storeId }, headers: { 'x-skip-cache': '1' },
    }).then((response: any) => {
      if (!active) return;
      const body = response?.data || response;
      if (!Array.isArray(body?.orders) || typeof body.revenue !== 'number') throw new Error('Dữ liệu hiệu suất không hợp lệ');
      setData(body);
    }).catch(() => { if (active) setError('Chưa tải được hiệu suất của nhà sáng tạo này.'); });
    return () => { active = false; };
  }, [collaboratorId, storeId, range, attempt]);
  return <section className="space-y-4" aria-label="Hiệu suất nhà sáng tạo">
    <ExclusiveDealInbox collaboratorId={collaboratorId} onChat={onChat} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-sm font-semibold">Hiệu suất của {name}</h3>
      <button type="button" onClick={onChat} className="rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs">Trao đổi hợp tác</button>
    </div>
    <div className="flex flex-wrap gap-2" aria-label="Khoảng thời gian hiệu suất">
      {[['7d', '7 ngày qua'], ['30d', '30 ngày qua'], ['month', 'Tháng này'], ['all', 'Toàn thời gian']].map(([value, label]) =>
        <button type="button" key={value} aria-pressed={range === value} onClick={() => setRange(value)} className={`rounded-lg border px-3 py-2 text-xs ${range === value ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8C6226]' : 'border-[#EAE4D7] bg-white text-[#7D715E]'}`}>{label}</button>)}
    </div>
    {error ? <div role="alert" className="rounded-xl border border-[#EAE4D7] bg-white p-4 text-xs">{error} <button type="button" onClick={() => setAttempt(value => value + 1)} className="underline">Thử lại</button></div>
      : !data ? <p role="status" className="text-xs text-[#7D715E]">Đang tải hiệu suất…</p> : <>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            ['Doanh thu đơn thành công', money(data.revenue)], ['Hoa hồng đã ghi nhận', money(data.commission)],
            ['Đơn thành công / tổng đơn', `${data.completedOrders} / ${data.totalOrders}`],
            ['Giá trị trung bình đơn thành công', money(data.completedOrders ? Math.round(data.revenue / data.completedOrders) : 0)],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#EAE4D7] bg-white p-4"><p className="text-[11px] text-[#7D715E]">{label}</p><strong className="mt-2 block text-lg font-semibold tabular-nums">{value}</strong></div>)}
        </div>
        <div className="flex flex-wrap gap-5 rounded-xl border border-[#EAE4D7] bg-white p-4 text-xs text-[#7D715E]">
          <span>Lượt nhấp: <strong>{data.clicks.toLocaleString('vi-VN')}</strong></span>
          <span>Chuyển đổi thành đơn: <strong>{data.conversionRate == null ? 'Chưa có lượt nhấp' : `${data.conversionRate.toFixed(1)}%`}</strong></span>
          <span>Tỷ lệ đơn thành công: <strong>{data.completionRate == null ? 'Chưa có đơn hàng' : `${data.completionRate.toFixed(1)}%`}</strong></span>
        </div>
        <div className="overflow-hidden rounded-xl border border-[#EAE4D7] bg-white">
          <h4 className="border-b border-[#EAE4D7] p-4 text-xs font-semibold">Đơn hàng gần nhất · tối đa 20 đơn</h4>
          {!data.orders.length ? <p className="p-6 text-center text-xs text-[#7D715E]">Chưa có đơn hàng được ghi nhận cho nhà sáng tạo trong khoảng thời gian này.</p> :
            <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead><tr>{['Mã đơn', 'Ngày tạo', 'Sản phẩm', 'Giá trị đơn', 'Hoa hồng ghi nhận', 'Trạng thái'].map(label => <th key={label} className="p-3 font-medium text-[#7D715E]">{label}</th>)}</tr></thead>
              <tbody>{data.orders.map(order => <tr key={order.id} className="border-t border-[#EAE4D7]">
                <td className="p-3"><Link className="text-[#8C6226] underline" to={`/merchant/orders?search=${encodeURIComponent(order.code)}`}>{order.code}</Link></td>
                <td className="p-3">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td><td className="p-3">{order.products.join(', ')}</td>
                <td className="p-3">{money(order.amount)}</td><td className="p-3">{money(order.commission)}</td><td className="p-3">{({PENDING:'Chờ xử lý',PAID:'Đã thanh toán',PROCESSING:'Đang xử lý',SHIPPING:'Đang giao',DELIVERED:'Đã giao',COMPLETED:'Hoàn tất',CANCELLED:'Đã hủy',RETURNED:'Đã trả hàng'} as Record<string,string>)[order.status] || order.status}</td>
              </tr>)}</tbody></table></div>}
        </div>
      </>}
  </section>;
}
