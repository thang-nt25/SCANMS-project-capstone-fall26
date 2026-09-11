import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';

// ─── Format helpers ───────────────────────────────────────────────────────
const fmtVnd = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const fmtShortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white border rounded-2xl p-4 flex items-center gap-3.5 shadow-xs hover:border-[#B88E4F] hover:shadow-md transition duration-200 ${
        highlight ? 'border-[#EEDFC6] bg-[#FBF5EB]/30' : 'border-[#EAE4D7]'
      }`}
    >
      <div className="w-11 h-11 rounded-xl bg-[#F3EFE6] flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-lg sm:text-xl font-black truncate ${highlight ? 'text-[#B88E4F]' : 'text-[#1A1612]'}`}>
          {value}
        </div>
        <div className="text-xs font-semibold text-[#7D715E] mt-0.5 truncate">{label}</div>
        {sub && <div className="text-[11px] text-[#7D715E]/80 mt-0.5 truncate">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, isCurrency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#EAE4D7] rounded-xl p-3 shadow-lg min-w-[150px] text-xs">
      <div className="text-xs font-bold text-[#7D715E] mb-1.5">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3 text-xs py-0.5">
          <span className="text-[#7D715E]">{p.name || p.dataKey}:</span>
          <strong className="font-extrabold text-[#1A1612]">
            {isCurrency ? fmtVnd(p.value) : p.value.toLocaleString('vi-VN')}
          </strong>
        </div>
      ))}
    </div>
  );
}

// ─── SHOP DASHBOARD ───────────────────────────────────────────────────────
export function ShopDashboardStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/dashboard/shop?days=${days}`);
      setData(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;
  const charts = data?.charts;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6" id="shop-dashboard-page">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap pb-2 border-b border-[#EAE4D7]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1612] flex items-center gap-2.5">
            <span>📊</span> Dashboard Doanh Số Gian Hàng
          </h1>
          <p className="text-sm text-[#7D715E] mt-1">
            Theo dõi hiệu suất kinh doanh và tiếp thị liên kết theo thời gian thực
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-[#F3EFE6] border border-[#EAE4D7] rounded-full">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              id={`tab-${d}d`}
              type="button"
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer ${
                days === d
                  ? 'bg-white text-[#B88E4F] shadow-xs'
                  : 'text-[#7D715E] hover:text-[#1A1612]'
              }`}
              onClick={() => setDays(d)}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 p-20 text-[#7D715E]">
          <div className="w-8 h-8 border-3 border-[#C59B58]/20 border-t-[#C59B58] rounded-full animate-spin" />
          <span className="text-sm font-semibold">Đang tổng hợp dữ liệu doanh số...</span>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <StatCard
              icon="📦"
              label="Tổng đơn hàng"
              value={(s?.totalOrders ?? 0).toLocaleString('vi-VN')}
            />
            <StatCard
              icon="💰"
              label="Doanh thu"
              value={fmtVnd(s?.totalRevenue ?? 0)}
              highlight
            />
            <StatCard
              icon="👆"
              label="Lượt click"
              value={(s?.totalClicks ?? 0).toLocaleString('vi-VN')}
            />
            <StatCard
              icon="🎯"
              label="Tỷ lệ chốt đơn (CR%)"
              value={`${s?.conversionRate ?? 0}%`}
              sub="click → đơn hàng"
              highlight
            />
            <StatCard
              icon="🤝"
              label="Hoa hồng đã trả"
              value={fmtVnd(s?.totalCommissions ?? 0)}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Revenue area chart */}
            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-5 shadow-xs" id="chart-revenue">
              <h3 className="text-base font-bold text-[#1A1612] mb-4 flex items-center gap-2">
                <span>💰</span> Doanh Thu Theo Ngày
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={charts?.revenueByDay?.map((d: any) => ({ ...d, date: fmtShortDate(d.date) }))}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C59B58" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#C59B58" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE6" />
                  <XAxis dataKey="date" tick={{ fill: '#7D715E', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
                    tick={{ fill: '#7D715E', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip isCurrency />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#B88E4F"
                    fill="url(#gradRevenue)"
                    strokeWidth={2.5}
                    dot={{ fill: '#B88E4F', r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Orders bar chart */}
            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-5 shadow-xs" id="chart-orders">
              <h3 className="text-base font-bold text-[#1A1612] mb-4 flex items-center gap-2">
                <span>📦</span> Đơn Hàng Theo Ngày
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts?.ordersByDay?.map((d: any) => ({ ...d, date: fmtShortDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE6" />
                  <XAxis dataKey="date" tick={{ fill: '#7D715E', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7D715E', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Đơn hàng" fill="#C59B58" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Clicks line chart */}
            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-5 shadow-xs lg:col-span-2" id="chart-clicks">
              <h3 className="text-base font-bold text-[#1A1612] mb-4 flex items-center gap-2">
                <span>👆</span> Lượt Click Tiếp Thị Liên Kết Theo Ngày
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={charts?.clicksByDay?.map((d: any) => ({ ...d, date: fmtShortDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE6" />
                  <XAxis dataKey="date" tick={{ fill: '#7D715E', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7D715E', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    name="Lượt Click"
                    stroke="#231D15"
                    strokeWidth={2.5}
                    dot={{ fill: '#B88E4F', r: 3.5 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── KOL DASHBOARD ────────────────────────────────────────────────────────
export function KolDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/dashboard/kol?days=${days}`);
      setData(res.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const s = data?.summary;
  const charts = data?.charts;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6" id="kol-dashboard-page">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between gap-4 flex-wrap pb-2 border-b border-[#EAE4D7]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A1612] flex items-center gap-2.5">
            <span>📈</span> Dashboard Doanh Thu KOL / CTV
          </h1>
          <p className="text-sm text-[#7D715E] mt-1">
            Theo dõi hoa hồng tiếp thị và hiệu suất đơn hàng qua liên kết giới thiệu của bạn
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 bg-[#F3EFE6] border border-[#EAE4D7] rounded-full">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              id={`kol-tab-${d}d`}
              type="button"
              className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer ${
                days === d
                  ? 'bg-white text-[#B88E4F] shadow-xs'
                  : 'text-[#7D715E] hover:text-[#1A1612]'
              }`}
              onClick={() => setDays(d)}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 p-20 text-[#7D715E]">
          <div className="w-8 h-8 border-3 border-[#C59B58]/20 border-t-[#C59B58] rounded-full animate-spin" />
          <span className="text-sm font-semibold">Đang cập nhật hoa hồng...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <StatCard
              icon="📦"
              label="Đơn được tính"
              value={(s?.totalOrders ?? 0).toLocaleString('vi-VN')}
            />
            <StatCard
              icon="👆"
              label="Lượt click"
              value={(s?.totalClicks ?? 0).toLocaleString('vi-VN')}
            />
            <StatCard
              icon="🎯"
              label="Tỷ lệ chốt đơn"
              value={`${s?.conversionRate ?? 0}%`}
            />
            <StatCard
              icon="✅"
              label="Hoa hồng đã duyệt"
              value={fmtVnd(s?.totalCommission ?? 0)}
              highlight
            />
            <StatCard
              icon="⏳"
              label="Hoa hồng chờ duyệt"
              value={fmtVnd(s?.pendingCommission ?? 0)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Commission area chart */}
            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-5 shadow-xs lg:col-span-2" id="chart-commissions">
              <h3 className="text-base font-bold text-[#1A1612] mb-4 flex items-center gap-2">
                <span>💸</span> Hoa Hồng Thực Nhận Theo Ngày
              </h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={charts?.commissionsByDay?.map((d: any) => ({ ...d, date: fmtShortDate(d.date) }))}>
                  <defs>
                    <linearGradient id="gradComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C59B58" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#C59B58" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE6" />
                  <XAxis dataKey="date" tick={{ fill: '#7D715E', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1e3).toFixed(0)}K`}
                    tick={{ fill: '#7D715E', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip isCurrency />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    name="Hoa hồng (VNĐ)"
                    stroke="#B88E4F"
                    fill="url(#gradComm)"
                    strokeWidth={2.5}
                    dot={{ fill: '#B88E4F', r: 3.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Clicks line */}
            <div className="bg-white border border-[#EAE4D7] rounded-2xl p-5 shadow-xs lg:col-span-2" id="kol-chart-clicks">
              <h3 className="text-base font-bold text-[#1A1612] mb-4 flex items-center gap-2">
                <span>👆</span> Lượt Clicks Qua Link Tiếp Thị
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={charts?.clicksByDay?.map((d: any) => ({ ...d, date: fmtShortDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE6" />
                  <XAxis dataKey="date" tick={{ fill: '#7D715E', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#7D715E', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    name="Clicks"
                    stroke="#231D15"
                    strokeWidth={2.5}
                    dot={{ fill: '#B88E4F', r: 3.5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Default export = Shop dashboard
export default ShopDashboardStatsPage;
