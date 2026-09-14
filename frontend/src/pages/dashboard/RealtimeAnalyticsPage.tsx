import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  MousePointerClick,
  ShoppingBag,
  Percent,
  Coins,
  DollarSign,
  Calendar,
  RefreshCw,
  Crown,
  Share2,
  Package,
  Layers,
  Sparkles,
  Download,
  Flame,
  Radio,
} from 'lucide-react';
import { analyticsService } from '../../services/analytics.service';
import type {
  DashboardOverviewResponse,
  TimeSeriesPoint,
  TopProductItem,
  TopChannelItem,
  FunnelResponse,
  CampaignPerformanceItem,
} from '../../services/analytics.service';
import { authService } from '../../services/auth.service';

export const RealtimeAnalyticsPage: React.FC = () => {
  const user = authService.getCurrentUser();
  const [range, setRange] = useState<string>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);
  const [activeChartTab, setActiveChartTab] = useState<'traffic' | 'financial'>('traffic');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = off, 15 = 15s, 30 = 30s, 60 = 60s
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Data states
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);
  const [topChannels, setTopChannels] = useState<TopChannelItem[]>([]);
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignPerformanceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all analytics data
  const fetchData = useCallback(async (showIndicator = false) => {
    try {
      if (showIndicator) setIsRefreshing(true);
      setError(null);

      const params: any = { range };
      if (range === 'custom' && customStartDate && customEndDate) {
        params.startDate = new Date(customStartDate).toISOString();
        params.endDate = new Date(customEndDate).toISOString();
      }

      const [ovData, tsData, prodData, chanData, funData, campData] = await Promise.all([
        analyticsService.getRealtimeOverview(params).catch(() => null),
        analyticsService.getTimeSeries(params).catch(() => []),
        analyticsService.getTopProducts({ ...params, limit: 5 }).catch(() => []),
        analyticsService.getTopChannels({ ...params, limit: 6 }).catch(() => []),
        analyticsService.getConversionFunnel(params).catch(() => null),
        analyticsService.getCampaignPerformance(params).catch(() => []),
      ]);

      setOverview(ovData);
      setTimeSeries(Array.isArray(tsData) ? tsData : []);
      setTopProducts(Array.isArray(prodData) ? prodData : []);
      setTopChannels(Array.isArray(chanData) ? chanData : []);
      setFunnel(funData);
      setCampaigns(Array.isArray(campData) ? campData : []);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load realtime analytics:', err);
      setError(err?.response?.data?.message || 'Không thể tải dữ liệu phân tích thời gian thực.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [range, customStartDate, customEndDate]);

  // Initial fetch and range change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const timer = setInterval(() => {
      fetchData(true);
    }, autoRefreshInterval * 1000);

    return () => clearInterval(timer);
  }, [autoRefreshInterval, fetchData]);

  // Formatter helpers
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const handleApplyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setRange('custom');
      setIsCustomOpen(false);
      fetchData();
    }
  };

  // Export CSV summary
  const handleExportCsv = () => {
    if (!timeSeries.length) return;
    const headers = ['Thời gian', 'Lượt Click', 'Số Đơn Hàng', 'Doanh Thu (VNĐ)', 'Hoa Hồng (VNĐ)', 'CR (%)'];
    const rows = timeSeries.map(p => [
      p.label || p.date || '',
      p.clicks,
      p.orders,
      p.revenue,
      p.commission,
      p.conversionRate,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF'
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SCANMS_Analytics_${range}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Max revenue for top product bar percentage
  const maxProductRevenue = useMemo(() => {
    if (!topProducts.length) return 1;
    return Math.max(...topProducts.map(p => p.grossRevenue), 1);
  }, [topProducts]);

  return (
    <div className="space-y-6 pb-12">
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-2xl text-xs font-semibold">
          {error}
        </div>
      )}
      {/* ─── Top Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-slate-900/60 p-6 rounded-3xl border border-slate-800 backdrop-blur-xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-600/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400 animate-pulse" />
              FR-28 Realtime Analytics
            </span>
            {autoRefreshInterval > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Radio className="w-3 h-3 mr-1 animate-pulse" />
                Live ({autoRefreshInterval}s)
              </span>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
            Trung Tâm Doanh Số & Hiệu Suất Realtime
          </h1>
          <p className="text-xs text-slate-400">
            Theo dõi lưu lượng truy cập, tỷ lệ chốt đơn (CR%), doanh thu và hoa hồng trực tiếp theo từng giây.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Range Filter Tabs */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
            {[
              { key: 'today', label: 'Hôm nay' },
              { key: '7d', label: '7 ngày' },
              { key: '30d', label: '30 ngày' },
              { key: 'this_month', label: 'Tháng này' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setRange(tab.key);
                  setIsCustomOpen(false);
                }}
                className={`px-3.5 py-2 rounded-xl transition-all ${
                  range === tab.key
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => setIsCustomOpen(!isCustomOpen)}
              className={`px-3 py-2 rounded-xl transition-all flex items-center space-x-1 ${
                range === 'custom'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tùy chỉnh</span>
            </button>
          </div>

          {/* Auto-refresh Dropdown */}
          <select
            aria-label="Tần suất tự động làm mới"
            value={autoRefreshInterval}
            onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs px-3 py-2.5 rounded-xl font-medium focus:outline-none focus:border-amber-500 transition-colors"
          >
            <option value={0}>Làm mới: Tắt</option>
            <option value={15}>Làm mới: 15s</option>
            <option value={30}>Làm mới: 30s</option>
            <option value={60}>Làm mới: 60s</option>
          </select>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            title="Làm mới dữ liệu ngay"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all flex items-center space-x-1.5 active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* ─── Custom Date Range Modal / Collapse ───────────────────────── */}
      {isCustomOpen && (
        <div className="bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl shadow-xl flex flex-wrap items-center gap-4 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Từ ngày:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl text-xs focus:border-amber-500 outline-none"
            />
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400">Đến ngày:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 px-3 py-1.5 rounded-xl text-xs focus:border-amber-500 outline-none"
            />
          </div>
          <button
            onClick={handleApplyCustomRange}
            disabled={!customStartDate || !customEndDate}
            className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 text-xs font-bold rounded-xl transition-transform active:scale-95 disabled:opacity-50"
          >
            Áp dụng khoảng ngày
          </button>
        </div>
      )}

      {/* ─── 5 KPI Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Clicks */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3 hover:border-amber-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lượt Click</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <MousePointerClick className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-black text-white">
              {formatNumber(overview?.metrics?.totalClicks ?? 0)}
            </p>
            <div className="flex items-center space-x-1.5 mt-2 text-xs font-semibold">
              {(overview?.metrics?.growthClicks ?? 0) >= 0 ? (
                <span className="flex items-center text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +{overview?.metrics?.growthClicks}%
                </span>
              ) : (
                <span className="flex items-center text-rose-400">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                  {overview?.metrics?.growthClicks}%
                </span>
              )}
              <span className="text-slate-500 text-[11px]">so với kỳ trước</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3 hover:border-amber-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đơn Hàng</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-black text-white">
              {formatNumber(overview?.metrics?.totalOrders ?? 0)}
            </p>
            <div className="flex items-center space-x-1.5 mt-2 text-xs font-semibold">
              {(overview?.metrics?.growthOrders ?? 0) >= 0 ? (
                <span className="flex items-center text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +{overview?.metrics?.growthOrders}%
                </span>
              ) : (
                <span className="flex items-center text-rose-400">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                  {overview?.metrics?.growthOrders}%
                </span>
              )}
              <span className="text-slate-500 text-[11px]">({overview?.metrics?.completedOrders ?? 0} thành công)</span>
            </div>
          </div>
        </div>

        {/* Card 3: Conversion Rate (CR%) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3 hover:border-amber-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ Lệ Chốt (CR%)</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl lg:text-3xl font-black text-emerald-400">
              {(overview?.metrics?.conversionRate ?? 0).toFixed(2)}%
            </p>
            <div className="flex items-center space-x-1.5 mt-2 text-xs font-semibold">
              {(overview?.metrics?.growthConversionRate ?? 0) >= 0 ? (
                <span className="flex items-center text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +{overview?.metrics?.growthConversionRate}%
                </span>
              ) : (
                <span className="flex items-center text-rose-400">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                  {overview?.metrics?.growthConversionRate}%
                </span>
              )}
              <span className="text-slate-500 text-[11px]">AOV: {formatNumber(overview?.metrics?.averageOrderValue ?? 0)}₫</span>
            </div>
          </div>
        </div>

        {/* Card 4: Gross Revenue (GMV) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3 hover:border-amber-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doanh Thu (GMV)</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xl lg:text-2xl font-black text-amber-300 truncate">
              {formatCurrency(overview?.metrics?.grossRevenue ?? 0)}
            </p>
            <div className="flex items-center space-x-1.5 mt-2 text-xs font-semibold">
              {(overview?.metrics?.growthRevenue ?? 0) >= 0 ? (
                <span className="flex items-center text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +{overview?.metrics?.growthRevenue}%
                </span>
              ) : (
                <span className="flex items-center text-rose-400">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                  {overview?.metrics?.growthRevenue}%
                </span>
              )}
              <span className="text-slate-500 text-[11px]">so với kỳ trước</span>
            </div>
          </div>
        </div>

        {/* Card 5: Total Commission (+ VIP Bonus) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-5 space-y-3 hover:border-amber-500/40 transition-all shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {user?.role === 'SHOP_MANAGER' ? 'Hoa Hồng Chi Trả' : 'Hoa Hồng Thực Nhận'}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xl lg:text-2xl font-black text-yellow-400 truncate">
              {formatCurrency(overview?.metrics?.totalCommission ?? 0)}
            </p>
            <div className="flex items-center space-x-1.5 mt-2 text-xs font-semibold">
              {(overview?.metrics?.growthCommission ?? 0) >= 0 ? (
                <span className="flex items-center text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  +{overview?.metrics?.growthCommission}%
                </span>
              ) : (
                <span className="flex items-center text-rose-400">
                  <TrendingDown className="w-3.5 h-3.5 mr-1" />
                  {overview?.metrics?.growthCommission}%
                </span>
              )}
              <span className="text-slate-500 text-[11px] truncate">
                {(overview?.metrics?.activeReferralLinks ?? 0)} link hoạt động
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main Charts & Visualizations ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 Cols): Interactive Recharts Area/Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <span>Biểu Đồ Diễn Biến Hiệu Suất Theo Thời Gian</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {range === 'today' ? 'Thống kê chi tiết theo 24 khung giờ trong ngày' : 'Thống kê xu hướng biến động theo ngày'}
              </p>
            </div>

            {/* Chart Switch Tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveChartTab('traffic')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeChartTab === 'traffic'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Traffic & Đơn Hàng
              </button>
              <button
                onClick={() => setActiveChartTab('financial')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeChartTab === 'financial'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Doanh Thu & Hoa Hồng
              </button>
            </div>
          </div>

          {/* Recharts Container */}
          <div className="h-80 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs animate-pulse">
                Đang nạp dữ liệu biểu đồ thời gian thực...
              </div>
            ) : timeSeries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Chưa có dữ liệu phát sinh trong khoảng thời gian này.
              </div>
            ) : activeChartTab === 'traffic' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '1rem',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    name="Lượt Clicks"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#clicksGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    name="Số Đơn Hàng"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#ordersGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(Number(value))}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '1rem',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="revenue" name="Doanh Thu (GMV)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="commission" name="Hoa Hồng" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right (1 Col): Conversion Funnel Visualizer */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>Phễu Chuyển Đổi (Funnel)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Đo lường độ thất thoát traffic từ lúc click link tới khi đơn giao hoàn tất.
            </p>
          </div>

          <div className="space-y-4 my-auto">
            {funnel?.stages?.map((st, idx) => (
              <div key={st.stage} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200">
                    {idx + 1}. {st.label}
                  </span>
                  <span className="font-extrabold text-amber-400">{formatNumber(st.count)}</span>
                </div>
                <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(st.percentage, 4)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Tỷ lệ tầng: {st.percentage}%</span>
                </div>
              </div>
            )) || (
              <div className="text-xs text-slate-500 text-center py-8">Chưa có dữ liệu phễu chuyển đổi.</div>
            )}
          </div>

          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tỷ lệ chuyển đổi tổng (Click ➔ Đơn):</span>
              <span className="font-bold text-emerald-400">{funnel?.conversionRate ?? 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tỷ lệ hoàn thành đơn (Fulfillment):</span>
              <span className="font-bold text-blue-400">{funnel?.fulfillmentRate ?? 0}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Breakdowns: Top Products & Channels & VIP Campaigns ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top 5 Products Leaderboard */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Package className="w-5 h-5 text-amber-400" />
                <span>Top Sản Phẩm Mang Lại Doanh Số Cao Nhất</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Xếp hạng theo tổng giá trị đơn hàng thực tế phát sinh.</p>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">Chưa có dữ liệu sản phẩm bán ra.</div>
          ) : (
            <div className="space-y-4">
              {topProducts.map((p) => {
                const percent = Math.round((p.grossRevenue / maxProductRevenue) * 100);
                return (
                  <div key={p.productId} className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                          p.rank === 1 ? 'bg-amber-500 text-slate-950 font-bold' :
                          p.rank === 2 ? 'bg-slate-300 text-slate-950 font-bold' :
                          p.rank === 3 ? 'bg-amber-800 text-amber-200 font-bold' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {p.rank}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{p.title}</h4>
                          <p className="text-xs text-slate-400">SKU: {p.sku} • {p.storeName || 'Gian Hàng'}</p>
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-sm font-black text-amber-400">{formatCurrency(p.grossRevenue)}</p>
                        <p className="text-xs text-slate-400">{p.ordersCount} đơn ({p.quantitySold} sản phẩm)</p>
                      </div>
                    </div>
                    {/* Visual bar */}
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                        style={{ width: `${Math.max(percent, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Channels Distribution */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Share2 className="w-5 h-5 text-amber-400" />
              <span>Phân Bổ Kênh Tiếp Thị</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Tỷ trọng lưu lượng và đơn hàng theo từng mạng xã hội.</p>
          </div>

          {topChannels.length === 0 ? (
            <div className="text-xs text-slate-500 py-8 text-center">Chưa có dữ liệu kênh tiếp thị.</div>
          ) : (
            <div className="space-y-4">
              {topChannels.map((c) => (
                <div key={c.channel} className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{c.channel}</span>
                    <span className="font-extrabold text-amber-400">{c.trafficSharePercent}% traffic</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                      style={{ width: `${Math.max(c.trafficSharePercent, 6)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{c.clicks} clicks</span>
                    <span>{c.orders} đơn (CR: {c.conversionRate}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── VIP Campaigns Performance Table (FR-27 Integration) ───────── */}
      {campaigns.length > 0 && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span>Hiệu Quả Chiến Dịch Tiếp Thị Độc Quyền VIP (FR-27)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Thống kê doanh số phát sinh từ các chiến dịch có hoa hồng thưởng thêm.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3.5 rounded-l-xl">Tên Chiến Dịch</th>
                  <th className="p-3.5">Thưởng Thêm</th>
                  <th className="p-3.5">Gian Hàng</th>
                  <th className="p-3.5">KOL Tham Gia</th>
                  <th className="p-3.5">Số Đơn Hàng</th>
                  <th className="p-3.5">Doanh Thu Phát Sinh</th>
                  <th className="p-3.5 rounded-r-xl">Hoa Hồng Thưởng Đã Trả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {campaigns.map((camp) => (
                  <tr key={camp.campaignId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3.5 font-bold text-white">
                      <div className="flex items-center space-x-2">
                        <span>👑</span>
                        <span>{camp.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                        +{camp.bonusCommissionRate}% Bonus
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300">{camp.storeName || '—'}</td>
                    <td className="p-3.5 font-semibold text-slate-200">{camp.participantsCount} KOLs</td>
                    <td className="p-3.5 font-bold text-slate-200">{camp.totalOrders} đơn</td>
                    <td className="p-3.5 font-bold text-amber-400">{formatCurrency(camp.totalRevenue)}</td>
                    <td className="p-3.5 font-bold text-yellow-400">{formatCurrency(camp.totalCommissions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Timestamp */}
      <div className="text-center text-[11px] text-slate-500 pt-4">
        Dữ liệu được cập nhật lúc {lastUpdated.toLocaleTimeString('vi-VN')} • Hệ thống giám sát thời gian thực SCANMS Analytics Engine
      </div>
    </div>
  );
};

export default RealtimeAnalyticsPage;
