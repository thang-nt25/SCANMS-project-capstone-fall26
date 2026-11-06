import { useId, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  CartesianGrid, XAxis, YAxis, Tooltip,
} from 'recharts';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { TimeSeriesPoint } from '@/services/analytics.service';

type Metric = 'clicks' | 'orders' | 'revenue' | 'commission';
const labels: Record<Metric, string> = {
  clicks: 'Lượt nhấp', orders: 'Đơn phát sinh', revenue: 'Giá trị đơn đã giao', commission: 'Hoa hồng đã duyệt',
};
const number = (value: number) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const money = (key: Metric) => key === 'revenue' || key === 'commission';
const format = (value: number, key: Metric) => `${number(value).toLocaleString('vi-VN')}${money(key) ? ' ₫' : ''}`;
const compact = (value: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

function DayTooltip({ active, payload, metric }: { active?: boolean; payload?: readonly any[]; metric: Metric }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-lg border border-[#EEDFC6] bg-white px-2.5 py-2 shadow-sm text-[11px]">
      <p className="m-0 mb-1 text-[10px] leading-4 text-[#7D715E]">{point.label}</p>
      <div className="flex items-center justify-between gap-3 leading-4"><span className="text-[#7D715E]">{labels[metric]}</span><strong className="font-semibold tabular-nums text-[#1A1612]">{format(point[metric], metric)}</strong></div>
    </div>
  );
}

export default function AffiliatePerformanceChart({ points, metric }: { points: TimeSeriesPoint[]; metric: Metric }) {
  const [showTable, setShowTable] = useState(false);
  const uid = useId().replace(/:/g, '');
  const data = points.map(point => ({ ...point, clicks: number(point.clicks), orders: number(point.orders), revenue: number(point.revenue), commission: number(point.commission) }));
  const total = data.reduce((sum, point) => sum + point[metric], 0);
  const activeDays = data.filter(point => point[metric] > 0).length;
  const currency = money(metric);
  const common = { data, margin: { top: 20, right: 16, left: 0, bottom: 8 }, accessibilityLayer: true };
  const axes = <>
    <CartesianGrid vertical={false} stroke="#EAE4D7" strokeDasharray="3 5" />
    <XAxis dataKey="label" axisLine={false} tickLine={false} minTickGap={30} tickMargin={12} tick={{ fill: '#7D715E', fontSize: 10 }} />
    <YAxis axisLine={false} tickLine={false} width={58} tickCount={5} allowDecimals={currency} tickFormatter={compact} tick={{ fill: '#7D715E', fontSize: 10 }} domain={[0, 'auto']} />
    <Tooltip content={<DayTooltip metric={metric} />} offset={12} cursor={{ stroke: '#EEDFC6', strokeDasharray: '4 4' }} />
  </>;
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 px-1 text-[10px] text-[#7D715E]">
        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#B88E4F]" />{labels[metric]} · {currency ? 'VND' : metric === 'clicks' ? 'lượt' : 'đơn'}</span>
        <span>{activeDays}/{data.length} ngày có phát sinh</span>
      </div>
      <div className="relative mt-2 h-[250px] w-full min-w-0 sm:h-[280px]" role="group" aria-label={`Xu hướng ${labels[metric]} theo ngày; tổng ${format(total, metric)}`}>
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...common}>
              <defs><linearGradient id={`affiliate-area-${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C59B58" stopOpacity={.32} /><stop offset="100%" stopColor="#C59B58" stopOpacity={.02} /></linearGradient></defs>
              {axes}<Area type="linear" dataKey={metric} name={labels[metric]} stroke="#B88E4F" strokeWidth={2.5} fill={`url(#affiliate-area-${uid})`} dot={data.length <= 14 ? { r: 3, strokeWidth: 2, fill: '#fff' } : false} activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }} isAnimationActive={false} />
            </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 mt-3 pt-3 border-t border-[#f3efe6]">
        <button type="button" aria-expanded={showTable} aria-controls={`affiliate-table-${uid}`} onClick={() => setShowTable(!showTable)} className="inline-flex items-center gap-[7px] min-h-[32px] px-2.5 py-1.5 border border-[#eedfc6] rounded-lg bg-white text-[#8a642c] text-[11px] font-semibold cursor-pointer hover:bg-[#fbf5eb] focus-visible:outline-2 focus-visible:outline-[#b88e4f] focus-visible:outline-offset-2">{showTable ? 'Thu gọn số liệu' : 'Xem bảng số liệu'}{showTable ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>
      </div>
      {showTable && <section id={`affiliate-table-${uid}`} className="mt-3.5 overflow-hidden border border-[#eae4d7] rounded-xl bg-white" aria-label="Chi tiết số liệu tiếp thị">
        <div className="flex flex-wrap items-center justify-between gap-1.5 p-2.5 sm:px-3.5 sm:py-3 border-b border-[#eae4d7]"><strong className="text-[12px] font-semibold text-[#1a1612]">Số liệu theo ngày</strong><span className="text-[10px] text-[#7d715e]">{data.length} ngày · Giờ Việt Nam</span></div>
        <div className="max-h-[380px] overflow-auto"><table className="w-full min-w-[560px] border-collapse border-spacing-0 text-right text-[11px] leading-[18px] tabular-nums">
          <caption className="sr-only">Số liệu tiếp thị từng ngày</caption>
          <thead><tr><th scope="col" className="sticky top-0 z-[1] bg-white text-[#7d715e] font-medium border-b border-[#eae4d7] px-2.5 py-2.5 sm:px-3.5 sm:py-2.5 whitespace-nowrap text-left">Ngày</th>{(Object.keys(labels) as Metric[]).map(key => <th key={key} scope="col" aria-sort={undefined} data-selected={metric === key} className="sticky top-0 z-[1] bg-white text-[#7d715e] font-medium border-b border-[#eae4d7] px-2.5 py-2.5 sm:px-3.5 sm:py-2.5 whitespace-nowrap data-[selected=true]:text-[#8a642c] data-[selected=true]:font-semibold">{labels[key]}{money(key) && <small className="block text-[9px] font-normal">VND</small>}</th>)}</tr></thead>
          <tbody>{data.map((point, index) => <tr key={point.date || index} className="hover:bg-[#fffaf2]"><th scope="row" className="px-2.5 py-2.5 sm:px-3.5 sm:py-2.5 whitespace-nowrap border-b border-[#f3efe6] font-medium text-[#7d715e] text-left">{point.label}</th>{(Object.keys(labels) as Metric[]).map(key => <td key={key} data-selected={metric === key} className="px-2.5 py-2.5 sm:px-3.5 sm:py-2.5 whitespace-nowrap border-b border-[#f3efe6] data-[selected=true]:text-[#8a642c] data-[selected=true]:font-semibold">{format(point[key], key)}</td>)}</tr>)}</tbody>
          <tfoot><tr><th scope="row" className="px-2.5 py-2.5 sm:px-3.5 sm:py-2.5 whitespace-nowrap border-t border-[#eedfc6] bg-[#fbf5eb] font-semibold text-left">Tổng trong kỳ</th>{(Object.keys(labels) as Metric[]).map(key => <td key={key} data-selected={metric === key} className="px-2.5 py-2.5 sm:px-3.5 sm:py-2.5 whitespace-nowrap border-t border-[#eedfc6] bg-[#fbf5eb] font-semibold data-[selected=true]:text-[#8a642c]">{format(data.reduce((sum, point) => sum + point[key], 0), key)}</td>)}</tr></tfoot>
        </table></div>
      </section>}
    </div>
  );
}
