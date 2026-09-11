import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../../services/api';
import './DashboardPage.css';

// ─── Format helpers ───────────────────────────────────────────────────────
const fmtVnd = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const fmtShortDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${day}/${m}`;
};

// ─── Stat Card ────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color,
}: { icon: string; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`db-stat-card db-stat-${color}`}>
      <div className="db-stat-icon">{icon}</div>
      <div className="db-stat-body">
        <div className="db-stat-value">{value}</div>
        <div className="db-stat-label">{label}</div>
        {sub && <div className="db-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label, isCurrency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="db-tooltip">
      <div className="db-tooltip-date">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="db-tooltip-row" style={{ color: p.color }}>
          <span>{p.name || p.dataKey}:</span>
          <strong>{isCurrency ? fmtVnd(p.value) : p.value.toLocaleString('vi-VN')}</strong>
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
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;
  const charts = data?.charts;

  return (
    <div className="db-page" id="shop-dashboard-page">
      <div className="db-header">
        <div>
          <h1 className="db-title"><span>📊</span> Dashboard Doanh Số</h1>
          <p className="db-subtitle">Theo dõi hiệu suất cửa hàng theo thời gian thực</p>
        </div>
        <div className="db-period-tabs">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              id={`tab-${d}d`}
              className={`db-tab ${days === d ? 'active' : ''}`}
              onClick={() => setDays(d)}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="db-loading"><div className="db-spinner" /><span>Đang tải dữ liệu...</span></div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="db-stats-grid">
            <StatCard icon="📦" label="Tổng đơn hàng" value={(s?.totalOrders ?? 0).toLocaleString('vi-VN')} color="blue" />
            <StatCard icon="💰" label="Doanh thu" value={fmtVnd(s?.totalRevenue ?? 0)} color="green" />
            <StatCard icon="👆" label="Lượt click" value={(s?.totalClicks ?? 0).toLocaleString('vi-VN')} color="purple" />
            <StatCard icon="🎯" label="Tỷ lệ chốt đơn (CR%)" value={`${s?.conversionRate ?? 0}%`} sub="click → đơn hàng" color="orange" />
            <StatCard icon="🤝" label="Hoa hồng đã trả" value={fmtVnd(s?.totalCommissions ?? 0)} color="pink" />
          </div>

          {/* Charts */}
          <div className="db-charts">
            {/* Revenue area chart */}
            <div className="db-chart-card" id="chart-revenue">
              <h3 className="db-chart-title">💰 Doanh Thu Theo Ngày</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={charts?.revenueByDay?.map((d: any) => ({ ...d, date: fmtShortDate(d.date) }))}>
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v / 1e6).toFixed(0)}M`} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isCurrency />} />
                  <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#10b981" fill="url(#gradRevenue)" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Orders bar chart */}
            <div className="db-chart-card" id="chart-orders">
              <h3 className="db-chart-title">📦 Đơn Hàng Theo Ngày</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={charts?.ordersByDay?.map((d: any) => ({ ...d, date: fmtShortDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Đơn hàng" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Clicks line chart */}
            <div className="db-chart-card" id="chart-clicks">
              <h3 className="db-chart-title">👆 Lượt Click Theo Ngày</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={charts?.clicksByDay?.map((d: any) => ({ ...d, date: fmtShortDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="clicks" name="Click" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} activeDot={{ r: 5 }} />
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
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;
  const charts = data?.charts;

  return (
    <div className="db-page" id="kol-dashboard-page">
      <div className="db-header">
        <div>
          <h1 className="db-title"><span>📈</span> Dashboard KOL</h1>
          <p className="db-subtitle">Theo dõi hoa hồng và hiệu suất tiếp thị của bạn</p>
        </div>
        <div className="db-period-tabs">
          {[7, 14, 30].map(d => (
            <button
              key={d}
              id={`kol-tab-${d}d`}
              className={`db-tab ${days === d ? 'active' : ''}`}
              onClick={() => setDays(d)}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="db-loading"><div className="db-spinner" /><span>Đang tải...</span></div>
      ) : (
        <>
          <div className="db-stats-grid">
            <StatCard icon="📦" label="Đơn được tính" value={(s?.totalOrders ?? 0).toLocaleString('vi-VN')} color="blue" />
            <StatCard icon="👆" label="Lượt click" value={(s?.totalClicks ?? 0).toLocaleString('vi-VN')} color="purple" />
            <StatCard icon="🎯" label="Tỷ lệ chốt đơn" value={`${s?.conversionRate ?? 0}%`} color="orange" />
            <StatCard icon="✅" label="Hoa hồng đã duyệt" value={fmtVnd(s?.totalCommission ?? 0)} color="green" />
            <StatCard icon="⏳" label="Hoa hồng chờ duyệt" value={fmtVnd(s?.pendingCommission ?? 0)} color="pink" />
          </div>

          <div className="db-charts">
            {/* Commission area chart */}
            <div className="db-chart-card wide" id="chart-commissions">
              <h3 className="db-chart-title">💸 Hoa Hồng Theo Ngày</h3>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={charts?.commissionsByDay?.map((d: any) => ({ ...d, date: fmtShortDate(d.date) }))}>
                  <defs>
                    <linearGradient id="gradComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${(v / 1e3).toFixed(0)}K`} tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isCurrency />} />
                  <Legend />
                  <Area type="monotone" dataKey="commission" name="Hoa hồng (VNĐ)" stroke="#f59e0b" fill="url(#gradComm)" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Clicks line */}
            <div className="db-chart-card" id="kol-chart-clicks">
              <h3 className="db-chart-title">👆 Clicks Theo Ngày</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={charts?.clicksByDay?.map((d: any) => ({ ...d, date: fmtShortDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="clicks" name="Clicks" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
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
