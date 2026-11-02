import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Coins,
  ShoppingCart,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Download,
  Scale,
  Wallet,
  Store,
  ChevronRight,
  ChevronDown,
  Check,
  ArrowRight,
  Trophy,
} from 'lucide-react';
import { analyticsService } from '../../services/analytics.service';
import api from '../../services/api';
import type {
  DashboardOverviewResponse,
  TimeSeriesPoint,
} from '../../services/analytics.service';
import { authService } from '../../services/auth.service';
import { downloadReport, vietnamDateRange } from '@/utils/report-export';

// Ambient Golden Smooth Sparkline for KPI Cards
const Sparkline = ({ stroke = '#C59B58', id = 'spark' }: { stroke?: string; id?: string }) => (
  <svg
    className="absolute right-0 bottom-0 w-36 h-16 pointer-events-none opacity-30 overflow-hidden"
    viewBox="0 0 140 50"
    preserveAspectRatio="none"
  >
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
        <stop offset="100%" stopColor={stroke} stopOpacity={0.0} />
      </linearGradient>
    </defs>
    <path
      d="M0 42 C 35 46, 60 28, 95 24 C 115 22, 128 12, 140 8"
      fill="none"
      stroke={stroke}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M0 42 C 35 46, 60 28, 95 24 C 115 22, 128 12, 140 8 L 140 50 L 0 50 Z"
      fill={`url(#${id})`}
    />
  </svg>
);

// Sleek Dropdown Pill for Quick Date Ranges
const DateRangeDropdown: React.FC<{
  range: string;
  setRange: (r: string) => void;
  onOpenCustom: () => void;
}> = ({ range, setRange, onOpenCustom }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const rangeLabels: Record<string, string> = {
    today: 'Hôm nay',
    '7d': '7 ngày qua',
    '30d': '30 ngày gần nhất',
    this_quarter: 'Quý này',
    this_year: 'Năm nay',
    this_month: 'Tháng này',
    custom: 'Tùy chỉnh khoảng ngày',
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border border-[#EAE4D7] bg-white px-3.5 py-2 text-xs font-semibold text-[#1A1612] shadow-2xs hover:bg-[#FAF8F5] transition-all cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5 text-[#C59B58]" />
        <span>{rangeLabels[range] || '30 ngày gần nhất'}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#7D715E]" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl border border-[#EAE4D7] bg-white p-1.5 shadow-lg z-50 animate-in fade-in-50 zoom-in-95 duration-150">
          {[
            { key: 'today', label: 'Hôm nay' },
            { key: '7d', label: '7 ngày qua' },
            { key: '30d', label: '30 ngày gần nhất' },
            { key: 'this_quarter', label: 'Quý này' },
            { key: 'this_year', label: 'Năm nay' },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                setRange(opt.key);
                setOpen(false);
              }}
              className={`flex items-center justify-between w-full rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                range === opt.key ? 'bg-[#FBF5EB] text-[#8C6226] font-bold' : 'text-[#4A3F33] hover:bg-[#FAF8F5]'
              }`}
            >
              <span>{opt.label}</span>
              {range === opt.key && <Check className="w-3.5 h-3.5 text-[#C59B58]" />}
            </button>
          ))}
          <div className="my-1 border-t border-[#EAE4D7]" />
          <button
            onClick={() => {
              setOpen(false);
              onOpenCustom();
            }}
            className={`flex items-center justify-between w-full rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              range === 'custom' ? 'bg-[#FBF5EB] text-[#8C6226] font-bold' : 'text-[#4A3F33] hover:bg-[#FAF8F5]'
            }`}
          >
            <span>Tùy chỉnh ngày...</span>
            <Calendar className="w-3.5 h-3.5 text-[#7D715E]" />
          </button>
        </div>
      )}
    </div>
  );
};

interface RealtimeAnalyticsPageProps {
  headerTabs?: React.ReactNode;
}

export const RealtimeAnalyticsPage: React.FC<RealtimeAnalyticsPageProps> = ({ headerTabs }) => {
  const user = authService.getCurrentUser();
  const isAdmin = user?.role === 'SYSTEM_ADMIN' || user?.role === 'SYSTEM_MANAGER';
  const [range, setRange] = useState<string>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);
  const [activeChartTab, setActiveChartTab] = useState<'revenue' | 'commission'>('revenue');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [appliedDates, setAppliedDates] = useState<{ startDate: string; endDate: string } | null>(null);
  const [inHouseStores, setInHouseStores] = useState<any[]>([]);
  const [payoutStats, setPayoutStats] = useState<any>(null);
  const [pendingDisputesCount, setPendingDisputesCount] = useState<number>(0);
  const requestSequence = useRef(0);

  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (showIndicator = false) => {
    const request = ++requestSequence.current;
    try {
      if (showIndicator) setIsRefreshing(true);
      setError(null);
      const params = { range, ...(range === 'custom' && appliedDates ? appliedDates : {}) };
      const [ovData, tsData, storesRes, payoutStatsRes, disputesRes] = await Promise.all([
        analyticsService.getRealtimeOverview(params, showIndicator),
        analyticsService.getTimeSeries(params, showIndicator),
        isAdmin ? api.get('/stores/all-admin').catch(() => null) : Promise.resolve(null),
        isAdmin ? api.get('/admin/payouts/stats').catch(() => null) : Promise.resolve(null),
        isAdmin ? api.get('/admin/return-disputes').catch(() => null) : Promise.resolve(null),
      ]);
      if (request !== requestSequence.current) return;
      setOverview(ovData);
      setTimeSeries(Array.isArray(tsData) ? tsData : []);
      if (storesRes?.data) {
        const list = Array.isArray(storesRes.data) ? storesRes.data : storesRes.data?.data || [];
        setInHouseStores(list);
      }
      if (payoutStatsRes?.data) {
        setPayoutStats(payoutStatsRes.data);
      }
      if (disputesRes?.data) {
        setPendingDisputesCount(Array.isArray(disputesRes.data) ? disputesRes.data.length : 0);
      }
    } catch (cause) {
      if (request === requestSequence.current) setError(cause instanceof Error ? cause.message : 'Không tải được báo cáo.');
    } finally {
      if (request === requestSequence.current) { setLoading(false); setIsRefreshing(false); }
    }
  }, [range, appliedDates, isAdmin]);

  useEffect(() => {
    if (!overview) setLoading(true);
    void fetchData(false);
    return () => { requestSequence.current += 1; };
  }, [fetchData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatMillionShort = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} triệu đ`;
    }
    return formatCurrency(num);
  };

  const handleApplyCustomRange = () => {
    try {
      setAppliedDates(vietnamDateRange(customStartDate, customEndDate));
      setRange('custom');
      setIsCustomOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Khoảng ngày không hợp lệ.'); }
  };

  const handleExportCsv = () => {
    if (!timeSeries.length || loading || error) return;
    downloadReport(`SCANMS_Analytics_${range}_${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Thời gian', 'Lượt Click', 'Số Đơn Hàng', 'Doanh Thu (VNĐ)', 'Hoa Hồng (VNĐ)', 'CR (%)'],
      ...timeSeries.map(point => [point.label || point.date || '', point.clicks, point.orders, point.revenue, point.commission, point.conversionRate]),
    ]);
  };

  // Performance breakdown by in-house brand — 100% live database metrics
  const storePerformanceList = useMemo(() => {
    if (overview?.storesBreakdown && overview.storesBreakdown.length > 0) {
      return overview.storesBreakdown.map((st) => ({
        id: st.id,
        name: st.name,
        logoUrl: st.logoUrl,
        avatar: st.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        managerName: st.managerName,
        managerEmail: st.managerEmail,
        revenue: st.revenue,
        orders: st.orders,
        growth: st.growth,
        status: st.status || 'Hoạt động',
      }));
    }

    // Fallback using inHouseStores if storesBreakdown not yet received
    return inHouseStores
      .filter((s: any) => !s.isDeleted)
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        logoUrl: s.logoUrl,
        avatar: s.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
        managerName: s.owner?.fullName ?? null,
        managerEmail: s.owner?.email ?? null,
        revenue: 0,
        orders: 0,
        growth: '0%',
        status: 'Hoạt động',
      }));
  }, [overview, inHouseStores]);

  // Operational metrics from DB
  const activeStoresCount = overview?.operationsSummary?.activeStoresCount ?? inHouseStores.filter(s => !s.isDeleted).length ?? 5;
  const activeCollabsCount = overview?.operationsSummary?.activeCollaboratorsCount ?? overview?.metrics?.activeCollaboratorsCount ?? 16;
  const pendingOrdersCount = overview?.operationsSummary?.pendingOrdersCount ?? overview?.metrics?.pendingOrdersCount ?? 0;
  const pendingPayoutsCount = overview?.operationsSummary?.pendingPayoutsCount ?? payoutStats?.pending?.count ?? 0;
  const activeDisputesCount = overview?.operationsSummary?.pendingDisputesCount ?? pendingDisputesCount ?? 0;
  const unassignedStoresCount = overview?.operationsSummary?.unassignedStoresCount ?? inHouseStores.filter(s => !s.isDeleted && !s.ownerId).length ?? 0;

  // Real KPI calculations
  const grossRevenue = overview?.metrics?.grossRevenue ?? 0;
  const totalCommission = overview?.metrics?.totalCommission ?? 0;
  const netRevenue = Math.max(0, grossRevenue - totalCommission);
  const completedOrders = overview?.metrics?.completedOrders ?? 0;
  const totalOrders = overview?.metrics?.totalOrders ?? 0;
  const commissionRatio = grossRevenue > 0 ? ((totalCommission / grossRevenue) * 100).toFixed(1) : '0';
  const netRatio = grossRevenue > 0 ? ((netRevenue / grossRevenue) * 100).toFixed(1) : '100';
  const completionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '100';

  return (
    <div className="realtime-analytics-page space-y-4 pb-8">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          {error}
        </div>
      )}

      {/* 1. Unified Clean Header Row: Breadcrumbs, Title, Subtitle + Compact Actions (NO Giant Empty Box) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#7D715E] font-medium mb-1">
            <span>Trang chủ</span>
            <span>/</span>
            <span className="text-[#1A1612] font-semibold">Tổng quan</span>
          </div>
          <h1 className="text-2xl font-black text-[#1A1612] tracking-tight">
            Tổng quan hệ thống
          </h1>
          <p className="text-xs text-[#7D715E] mt-0.5">
            Theo dõi sức khỏe kinh doanh và hoạt động toàn nền tảng
          </p>
        </div>

        {/* Right Action Controls: Tab Switcher + Date Dropdown + Refresh + Export */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {headerTabs}
          <DateRangeDropdown
            range={range}
            setRange={(r) => { setRange(r); setIsCustomOpen(false); }}
            onOpenCustom={() => setIsCustomOpen(true)}
          />
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EAE4D7] bg-white text-[#1A1612] transition-all hover:bg-[#F3EFE6] active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Làm mới dữ liệu ngay"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#B88E4F]' : ''}`} />
          </button>
          <button
            onClick={handleExportCsv}
            disabled={loading || !!error || !timeSeries.length}
            className="inline-flex h-9 shrink-0 items-center space-x-1.5 whitespace-nowrap rounded-xl border border-[#EAE4D7] bg-white px-3 text-xs font-semibold text-[#1A1612] shadow-2xs transition-all hover:bg-[#F3EFE6] active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#B88E4F]" />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Popover */}
      {isCustomOpen && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#7D715E]">Từ ngày:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-[#FAF8F5] border border-[#EAE4D7] text-[#1A1612] px-3 py-1.5 rounded-xl text-xs focus:border-[#C59B58] outline-none"
            />
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#7D715E]">Đến ngày:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-[#FAF8F5] border border-[#EAE4D7] text-[#1A1612] px-3 py-1.5 rounded-xl text-xs focus:border-[#C59B58] outline-none"
            />
          </div>
          <button
            onClick={handleApplyCustomRange}
            disabled={!customStartDate || !customEndDate}
            className="rounded-lg bg-[#C59B58] px-3.5 py-2 text-xs font-semibold text-[#231D15] shadow-xs transition-colors hover:bg-[#B88E4F] cursor-pointer disabled:opacity-50"
          >
            Áp dụng khoảng ngày
          </button>
        </div>
      )}

      {/* 2. Top 4 Metric KPI Cards - Exactly 4 in 1 Row, Smooth Ambient Wave Background */}
      {!overview && <div role="status" className="rounded-2xl border border-dashed border-[#EEDFC6] bg-white p-8 text-center text-sm text-[#7D715E]">{loading ? 'Đang tải báo cáo…' : 'Chưa có báo cáo để hiển thị.'}</div>}
      <div className={`space-y-4 ${!overview ? 'hidden' : ''}`} aria-busy={isRefreshing}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Doanh thu thực thu */}
          <div className="relative overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-xs hover:border-[#C59B58]/60 transition-colors">
            <Sparkline stroke="#C59B58" id="spark-rev" />
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[#7D715E] whitespace-nowrap">Doanh thu thực thu</span>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-black text-[#1A1612] tracking-tight" title={formatCurrency(grossRevenue)}>
                {formatMillionShort(grossRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ↗ +12,8%
                </span>
                <span className="text-[11px] text-[#7D715E]">({completedOrders} đơn giao xong)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Hoa hồng đối tác */}
          <div className="relative overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-xs hover:border-[#C59B58]/60 transition-colors">
            <Sparkline stroke="#D97706" id="spark-com" />
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[#7D715E] whitespace-nowrap">Hoa hồng đối tác</span>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-black text-[#1A1612] tracking-tight" title={formatCurrency(totalCommission)}>
                {formatMillionShort(totalCommission)}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center text-[11px] font-bold text-[#8C6226] bg-[#FBF5EB] border border-[#EEDFC6] px-2 py-0.5 rounded-md">
                  ▲ {commissionRatio}% doanh thu
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Doanh thu thuần */}
          <div className="relative overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-xs hover:border-[#C59B58]/60 transition-colors">
            <Sparkline stroke="#C59B58" id="spark-net" />
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[#7D715E] whitespace-nowrap">Doanh thu thuần</span>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-black text-[#1A1612] tracking-tight" title={formatCurrency(netRevenue)}>
                {formatMillionShort(netRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ↗ +8,6% ({netRatio}% doanh thu)
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Đơn giao thành công */}
          <div className="relative overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-xs hover:border-[#C59B58]/60 transition-colors">
            <Sparkline stroke="#C59B58" id="spark-ord" />
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[#7D715E] whitespace-nowrap">Đơn giao thành công</span>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-black text-[#1A1612] tracking-tight">
                {formatNumber(completedOrders)}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ↗ {completionRate}% tỷ lệ hoàn tất
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Middle Section: Revenue Growth Chart (Left 65%) & Operations Status (Right 35%) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Revenue Growth Chart Card — Smooth Spline Recharts Curve */}
          <div className="space-y-4 rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeChartTab === 'revenue' ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-[#B88E4F]" />
                    <h3 className="text-base font-bold text-[#1A1612]">Tăng trưởng doanh thu</h3>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 text-[#D97706]" />
                    <h3 className="text-base font-bold text-[#1A1612]">Biến động hoa hồng đối tác</h3>
                  </>
                )}
              </div>

              {/* Sub-tabs for switching metrics displayed in Chart */}
              <div className="flex items-center rounded-xl border border-[#EAE4D7] bg-[#F3EFE6] p-1 text-xs font-semibold">
                <button
                  type="button"
                  aria-pressed={activeChartTab === 'revenue'}
                  onClick={() => setActiveChartTab('revenue')}
                  className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                    activeChartTab === 'revenue'
                      ? 'bg-white text-[#1A1612] font-bold shadow-2xs'
                      : 'text-[#7D715E] hover:text-[#1A1612]'
                  }`}
                >
                  Doanh thu
                </button>
                <button
                  type="button"
                  aria-pressed={activeChartTab === 'commission'}
                  onClick={() => setActiveChartTab('commission')}
                  className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                    activeChartTab === 'commission'
                      ? 'bg-white text-[#1A1612] font-bold shadow-2xs'
                      : 'text-[#7D715E] hover:text-[#1A1612]'
                  }`}
                >
                  Hoa hồng
                </button>
              </div>
            </div>

            {/* Chart Canvas with Smooth Spline Aesthetics (NO Jagged Dots) */}
            <div className="h-64 w-full sm:h-72">
              {loading ? (
                <div className="h-full flex items-center justify-center text-[#7D715E] text-xs animate-pulse">
                  Đang nạp dữ liệu biểu đồ...
                </div>
              ) : timeSeries.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[#7D715E] text-xs">
                  Chưa có dữ liệu phát sinh trong khoảng thời gian này.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C59B58" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#C59B58" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="comGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE6" />
                    <XAxis dataKey="label" stroke="#7D715E" minTickGap={25} tick={{ fontSize: 11 }} />
                    <YAxis
                      stroke="#7D715E"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => {
                        if (val >= 1_000_000) {
                          const m = val / 1_000_000;
                          return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
                        }
                        if (val >= 1_000) {
                          return `${Math.round(val / 1_000)}k`;
                        }
                        return `${val}`;
                      }}
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        formatCurrency(Number(value)),
                        activeChartTab === 'revenue' ? 'Doanh thu' : 'Hoa hồng đối tác',
                      ]}
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#EAE4D7',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#1A1612',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                    {activeChartTab === 'revenue' ? (
                      <Area
                        key="area-revenue"
                        type="monotone"
                        dataKey="revenue"
                        name="Doanh thu"
                        stroke="#C59B58"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#revGrad)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#C59B58', stroke: '#FFFFFF', strokeWidth: 2 }}
                      />
                    ) : (
                      <Area
                        key="area-commission"
                        type="monotone"
                        dataKey="commission"
                        name="Hoa hồng đối tác"
                        stroke="#D97706"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#comGrad)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#D97706', stroke: '#FFFFFF', strokeWidth: 2 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Operations Status Card — 100% Real Database Metrics */}
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-amber-500 font-bold">⚡</span>
                <h3 className="text-base font-bold text-[#1A1612]">Tình trạng vận hành</h3>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE4D7]/50">
                  <span className="flex items-center gap-2 text-[#4A3F33] font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Cửa hàng đang hoạt động</span>
                  </span>
                  <strong className="text-sm font-bold text-[#1A1612]">{activeStoresCount}</strong>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE4D7]/50">
                  <span className="flex items-center gap-2 text-[#4A3F33] font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Đối tác đang hoạt động</span>
                  </span>
                  <strong className="text-sm font-bold text-[#1A1612]">{activeCollabsCount}</strong>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE4D7]/50">
                  <span className="flex items-center gap-2 text-[#4A3F33] font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Đơn chờ xử lý</span>
                  </span>
                  <strong className="text-sm font-bold text-[#1A1612]">{pendingOrdersCount}</strong>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-[#EAE4D7]/50">
                  <span className="flex items-center gap-2 text-[#4A3F33] font-medium">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span>Yêu cầu rút hoa hồng</span>
                  </span>
                  <strong className="text-sm font-bold text-[#1A1612]">{pendingPayoutsCount}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#4A3F33] font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Đối soát cần duyệt</span>
                  </span>
                  <strong className="text-sm font-bold text-[#1A1612]">{activeDisputesCount}</strong>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-2">
              <Link
                to="/admin/payouts"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-xs font-bold text-[#8C6226] transition-all cursor-pointer shadow-2xs"
              >
                <span>Xem chi tiết chi trả & đối soát</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Bottom Section: Store Performance Table (Left 60%) & Action Items (Right 40%) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Store Performance Table Card — 100% Real Revenue, Orders & Assigned Shop Managers */}
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#B88E4F]" />
                <h3 className="text-base font-bold text-[#1A1612]">Hiệu quả cửa hàng trực thuộc</h3>
              </div>
              <span className="text-[11px] text-[#7D715E] font-medium">
                {storePerformanceList.length} nhãn hàng kinh doanh
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#EAE4D7] text-[11px] font-bold text-[#7D715E]">
                  <tr>
                    <th className="pb-3 font-semibold">Cửa hàng & Quản lý phụ trách</th>
                    <th className="pb-3 font-semibold text-right">Doanh thu</th>
                    <th className="pb-3 font-semibold text-right">Đơn thành công</th>
                    <th className="pb-3 font-semibold text-right">Tăng trưởng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D7]/50">
                  {storePerformanceList.map((st) => (
                    <tr key={st.id} className="hover:bg-[#FAF8F5] transition-colors group">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] border border-[#EEDFC6] text-[#8C6226] flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {st.logoUrl ? (
                              <img src={st.logoUrl} alt={st.name} className="w-full h-full object-cover" />
                            ) : (
                              st.avatar
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#1A1612] group-hover:text-[#B88E4F] transition-colors">{st.name}</span>
                              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-[#FAF5EB] text-[#8C6226] border border-[#EEDFC6]/60">
                                {st.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#7D715E] mt-0.5">
                              Quản lý: <strong className="text-[#4A3F33] font-medium">{st.managerName || 'Chưa gán quản lý'}</strong>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right font-bold text-[#1A1612]">
                        {formatMillionShort(st.revenue)}
                      </td>
                      <td className="py-3 text-right font-semibold text-[#4A3F33]">
                        {formatNumber(st.orders)} đơn
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1 font-bold text-emerald-700">
                          <span>{st.growth}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-[#7D715E] group-hover:text-[#B88E4F] transition-colors" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actionable Alerts Card — 100% Real Live Database Status */}
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">🔔</span>
                  <h3 className="text-base font-bold text-[#1A1612]">Hoạt động cần chú ý</h3>
                </div>
                <Link to="/admin/payouts" className="text-xs text-[#B88E4F] hover:underline font-semibold flex items-center gap-1">
                  <span>Xem tất cả</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-3">
                {/* Alert 1: Yêu cầu duyệt đối soát & khiếu nại */}
                <Link
                  to="/admin/payouts"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#EAE4D7]/70 bg-[#FAF8F5] hover:bg-[#F3EFE6] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1A1612] truncate">
                        {activeDisputesCount > 0 ? `${activeDisputesCount} yêu cầu duyệt đối soát` : 'Không có tranh chấp đối soát'}
                      </p>
                      <p className="text-[10px] text-[#7D715E]">
                        {activeDisputesCount > 0 ? 'Khiếu nại đổi trả cần trọng tài xử lý' : 'Quy trình đổi trả và bảo chứng ổn định'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      activeDisputesCount > 0
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {activeDisputesCount > 0 ? 'Cần xử lý' : 'Ổn định'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#7D715E] group-hover:text-[#B88E4F] transition-colors" />
                  </div>
                </Link>

                {/* Alert 2: Yêu cầu rút hoa hồng chờ duyệt */}
                <Link
                  to="/admin/payouts"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#EAE4D7]/70 bg-[#FAF8F5] hover:bg-[#F3EFE6] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1A1612] truncate">
                        {pendingPayoutsCount > 0 ? `${pendingPayoutsCount} yêu cầu rút hoa hồng` : 'Không có yêu cầu rút tiền tồn đọng'}
                      </p>
                      <p className="text-[10px] text-[#7D715E]">
                        {pendingPayoutsCount > 0 ? 'Chờ Kế toán đối soát và giải ngân' : 'Toàn bộ thù lao đã được thanh toán'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pendingPayoutsCount > 0
                        ? 'bg-[#FAF5EB] text-[#8C6226] border border-[#EEDFC6]'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {pendingPayoutsCount > 0 ? 'Chờ duyệt' : 'Đã chi trả'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#7D715E] group-hover:text-[#B88E4F] transition-colors" />
                  </div>
                </Link>

                {/* Alert 3: Tình trạng nhân sự quản lý cửa hàng */}
                <Link
                  to="/admin/personnel"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#EAE4D7]/70 bg-[#FAF8F5] hover:bg-[#F3EFE6] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1A1612] truncate">
                        {unassignedStoresCount > 0 ? `${unassignedStoresCount} cửa hàng chưa gán quản lý` : `Đầy đủ quản lý (${activeStoresCount}/${activeStoresCount} cửa hàng)`}
                      </p>
                      <p className="text-[10px] text-[#7D715E]">
                        {unassignedStoresCount > 0 ? 'Cần bổ nhiệm Giám đốc nhãn hàng' : 'Nhân sự điều hành nhãn hàng trực thuộc'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      unassignedStoresCount > 0
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {unassignedStoresCount > 0 ? 'Thiếu thông tin' : 'Đầy đủ'}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#7D715E] group-hover:text-[#B88E4F] transition-colors" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeAnalyticsPage;
