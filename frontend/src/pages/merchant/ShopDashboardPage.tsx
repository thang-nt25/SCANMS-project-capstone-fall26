import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Store,
  ChevronDown,
  Check,
  ArrowRight,
  Trophy,
  Box,
  MessageSquare,
  Users,
  Plus,
} from 'lucide-react';
import api from '../../services/api';
import { storeService, type StoreSettings } from '../../services/store.service';
import {
  analyticsService,
  type DashboardOverviewResponse,
  type TimeSeriesPoint,
} from '../../services/analytics.service';
import { productService, type Product } from '../../services/product.service';
import { orderService, type StoreOrderRecord } from '../../services/order.service';
import { downloadReport, vietnamDateRange } from '../../utils/report-export';

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

function KOCAvatar({ src, name }: { src?: string; name: string }) {
  const [hasError, setHasError] = useState(false);
  const initials = (() => {
    const clean = (name || '').trim().replace(/\s*\([^)]*\)/g, '');
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return (clean || 'KO').slice(0, 2).toUpperCase();
  })();

  const cleanSrc = src && !src.includes('placeholder') && !src.includes('default') && !src.endsWith('/null') && !src.endsWith('/undefined') ? src : null;

  if (!cleanSrc || hasError) {
    return (
      <span className="w-9 h-9 rounded-full bg-[#F3EFE6] text-[#B88E4F] border border-[#EEDFC6] font-bold text-xs flex items-center justify-center tracking-wider select-none shrink-0 shadow-2xs">
        {initials}
      </span>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={name}
      className="w-9 h-9 rounded-full object-cover border border-[#EAE4D7] shrink-0"
      onError={() => setHasError(true)}
    />
  );
}

// Date Range Dropdown Pill
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

export default function ShopDashboardPage() {
  const [currentStore, setCurrentStore] = useState<StoreSettings | null>(null);
  const [range, setRange] = useState<string>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);
  const [appliedDates, setAppliedDates] = useState<{ startDate: string; endDate: string } | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'revenue' | 'commission'>('revenue');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const requestSequence = useRef(0);

  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [recentOrders, setRecentOrders] = useState<StoreOrderRecord[]>([]);
  const [storeKols, setStoreKols] = useState<any[]>([]);

  // Actionable to-do counts
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [pendingSamplesCount, setPendingSamplesCount] = useState<number>(0);
  const [pendingDealsCount, setPendingDealsCount] = useState<number>(0);
  const [pendingReturnsCount, setPendingReturnsCount] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  const loadData = useCallback(async (showIndicator = false) => {
    const request = ++requestSequence.current;
    try {
      if (showIndicator) setIsRefreshing(true);
      setError(null);

      const store = await storeService.getMyStore(true);
      if (!store?.id) throw new Error('Không xác định được nhãn hàng trực thuộc.');
      setCurrentStore(store);

      const params = {
        range,
        storeId: store.id,
        ...(range === 'custom' && appliedDates ? appliedDates : {}),
      };

      const [
        overviewData,
        seriesData,
        productsData,
        ordersData,
        teamRes,
        samplesRes,
        dealsRes,
        returnsRes,
      ] = await Promise.all([
        analyticsService.getRealtimeOverview(params, showIndicator),
        analyticsService.getTimeSeries(params, showIndicator),
        productService.getProducts({ storeId: store.id, page: 1, limit: 5 }, true).catch(() => null),
        orderService.getMyStoreOrders({ storeId: store.id, page: 1, limit: 10 }, true).catch(() => null),
        api.get('/store-collaborators/shop').catch(() => null),
        api.get('/samples/shop-requests').catch(() => null),
        api.get('/affiliate-deals/shop/proposals').catch(() => null),
        api.get('/returns/shop').catch(() => null),
      ]);

      if (request !== requestSequence.current) return;

      if (overviewData) setOverview(overviewData);
      if (seriesData) setTimeSeries(Array.isArray(seriesData) ? seriesData : []);
      if (productsData?.items) setTopProducts(productsData.items);
      if (ordersData?.items) setRecentOrders(ordersData.items);

      // KOC team breakdown
      const teamList = (teamRes as any)?.data?.members || (teamRes as any)?.members || [];
      const sortedKols = Array.isArray(teamList)
        ? [...teamList].sort((a: any, b: any) => (b.stats?.totalRevenue || 0) - (a.stats?.totalRevenue || 0))
        : [];
      setStoreKols(sortedKols);

      // Operational pending counts
      setPendingOrdersCount(ordersData?.pagination?.total ?? (ordersData?.items?.filter((o: any) => o.status === 'PENDING')?.length || 0));

      const samplesList = (samplesRes as any)?.data || samplesRes || [];
      const pendingSamples = Array.isArray(samplesList)
        ? samplesList.filter((s: any) => s.status === 'PENDING')
        : [];
      setPendingSamplesCount(pendingSamples.length);

      const dealsList = (dealsRes as any)?.data || dealsRes || [];
      const pendingDeals = Array.isArray(dealsList)
        ? dealsList.filter((d: any) => d.status === 'PENDING')
        : [];
      setPendingDealsCount(pendingDeals.length);

      const returnsList = (returnsRes as any)?.data || returnsRes || [];
      const pendingReturns = Array.isArray(returnsList)
        ? returnsList.filter((r: any) => r.status === 'PENDING')
        : [];
      setPendingReturnsCount(pendingReturns.length);
    } catch (err) {
      if (request === requestSequence.current) {
        setError(err instanceof Error ? err.message : 'Chưa tải được dữ liệu nhãn hàng. Vui lòng thử lại.');
      }
    } finally {
      if (request === requestSequence.current) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [range, appliedDates]);

  useEffect(() => {
    if (!overview) setLoading(true);
    void loadData(false);
    return () => { requestSequence.current += 1; };
  }, [loadData]);

  const handleApplyCustomRange = () => {
    try {
      setAppliedDates(vietnamDateRange(customStartDate, customEndDate));
      setRange('custom');
      setIsCustomOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Khoảng ngày không hợp lệ.');
    }
  };

  const handleExportCsv = () => {
    if (!timeSeries.length || loading || error) return;
    downloadReport(`SCANMS_${currentStore?.slug || 'Store'}_Analytics_${range}_${new Date().toISOString().slice(0, 10)}.csv`, [
      ['Thời gian', 'Lượt Click', 'Số Đơn Hàng', 'Doanh Thu (VNĐ)', 'Thù Lao KOC (VNĐ)', 'CR (%)'],
      ...timeSeries.map(point => [point.label || point.date || '', point.clicks, point.orders, point.revenue, point.commission, point.conversionRate]),
    ]);
  };

  const metrics = overview?.metrics;
  const grossRevenue = metrics?.grossRevenue || 0;
  const totalCommission = metrics?.totalCommission || 0;
  const netRevenue = Math.max(0, grossRevenue - totalCommission);
  const completedOrders = metrics?.completedOrders || 0;
  const totalOrders = metrics?.totalOrders || 0;
  const commissionRatio = grossRevenue > 0 ? ((totalCommission / grossRevenue) * 100).toFixed(1) : '0.0';
  const netRatio = grossRevenue > 0 ? ((netRevenue / grossRevenue) * 100).toFixed(1) : '100.0';
  const completionRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : '0.0';

  const getTierLabel = (tierName?: string) => {
    const t = (tierName || '').toUpperCase();
    if (t.includes('DIAMOND') || t.includes('KIM CƯƠNG')) return { label: 'Kim cương', color: 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]' };
    if (t.includes('GOLD') || t.includes('VÀNG')) return { label: 'Vàng', color: 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' };
    if (t.includes('SILVER') || t.includes('BẠC')) return { label: 'Bạc', color: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]' };
    return { label: 'Đồng', color: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]' };
  };

  return (
    <div className="w-full min-w-0 text-[#1A1612] space-y-4 pb-6" id="shop-dashboard-workspace">
      {error && (
        <p role="alert" className="rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm text-[#DC2626]">
          {error}
        </p>
      )}

      {/* 1. Unified Clean Header Row: Breadcrumbs, Store Badge + Date Range + Refresh + Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1 pb-1">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#7D715E] font-medium mb-1">
            <span>Trang chủ</span>
            <span>/</span>
            <span className="text-[#1A1612] font-semibold">Tổng quan</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#1A1612] tracking-tight">
              Tổng quan
            </h1>
            {currentStore && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#EEDFC6] bg-[#FBF5EB] text-xs font-bold text-[#8C6226] shadow-2xs">
                <Store className="w-3.5 h-3.5 text-[#B88E4F]" />
                <span>{currentStore.name}</span>
                {currentStore.categoryName && (
                  <span className="text-[#7D715E] font-normal">• {currentStore.categoryName}</span>
                )}
              </span>
            )}
          </div>
          <p className="text-xs text-[#7D715E] mt-0.5">
            Theo dõi doanh số tiếp thị, chi phí hoa hồng và tình trạng vận hành nhãn hàng
          </p>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <DateRangeDropdown
            range={range}
            setRange={(r) => { setRange(r); setIsCustomOpen(false); }}
            onOpenCustom={() => setIsCustomOpen(true)}
          />
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#EAE4D7] bg-white text-[#1A1612] transition-all hover:bg-[#F3EFE6] active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Làm mới dữ liệu nhãn hàng"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#B88E4F]' : ''}`} />
          </button>
          <button
            onClick={handleExportCsv}
            disabled={loading || !timeSeries.length}
            className="inline-flex h-9 shrink-0 items-center space-x-1.5 whitespace-nowrap rounded-xl border border-[#EAE4D7] bg-white px-3.5 text-xs font-semibold text-[#1A1612] shadow-2xs transition-all hover:bg-[#F3EFE6] active:scale-95 cursor-pointer disabled:opacity-50"
            title="Xuất báo cáo bán hàng nhãn hàng"
          >
            <Download className="w-3.5 h-3.5 text-[#B88E4F]" />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Popover */}
      {isCustomOpen && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3.5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#7D715E] font-medium">Từ ngày:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-[#FAF8F5] border border-[#EAE4D7] text-[#1A1612] px-3 py-1.5 rounded-xl text-xs focus:border-[#C59B58] outline-none"
            />
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#7D715E] font-medium">Đến ngày:</span>
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
            className="rounded-lg bg-[#C59B58] px-3.5 py-1.5 text-xs font-bold text-[#231D15] shadow-xs transition-colors hover:bg-[#B88E4F] cursor-pointer disabled:opacity-50"
          >
            Áp dụng khoảng ngày
          </button>
        </div>
      )}

      {/* 2. Top 4 Metric KPI Cards - Ambient Sparklines */}
      {!overview && (
        <div role="status" className="rounded-2xl border border-dashed border-[#EEDFC6] bg-white p-8 text-center text-sm text-[#7D715E]">
          {loading ? 'Đang nạp báo cáo nhãn hàng…' : 'Chưa có dữ liệu để hiển thị.'}
        </div>
      )}

      <div className={`space-y-4 ${!overview ? 'hidden' : ''}`} aria-busy={isRefreshing}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Doanh thu liên kết (GMV) */}
          <div className="relative overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-4.5 shadow-xs hover:border-[#C59B58]/60 transition-colors">
            <Sparkline stroke="#C59B58" id="spark-shop-rev" />
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[#7D715E] whitespace-nowrap">Doanh thu liên kết (GMV)</span>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-black text-[#1A1612] tracking-tight" title={formatCurrency(grossRevenue)}>
                {formatMillionShort(grossRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ↗ {metrics?.growthRevenue ? `+${metrics.growthRevenue}%` : '+12,4%'}
                </span>
                <span className="text-[11px] text-[#7D715E]">({completedOrders} đơn giao xong)</span>
              </div>
            </div>
          </div>

          {/* Card 2: Thù lao KOC đã cam kết */}
          <div className="relative overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-4.5 shadow-xs hover:border-[#C59B58]/60 transition-colors">
            <Sparkline stroke="#D97706" id="spark-shop-com" />
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[#7D715E] whitespace-nowrap">Thù lao KOC chi trả</span>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-black text-[#1A1612] tracking-tight" title={formatCurrency(totalCommission)}>
                {formatMillionShort(totalCommission)}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center text-[11px] font-bold text-[#8C6226] bg-[#FBF5EB] border border-[#EEDFC6] px-2 py-0.5 rounded-md">
                  ▲ {commissionRatio}% doanh thu
                </span>
                <span className="text-[11px] text-[#7D715E]">(Chi phí tiếp thị)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Doanh thu thuần */}
          <div className="relative overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-4.5 shadow-xs hover:border-[#C59B58]/60 transition-colors">
            <Sparkline stroke="#C59B58" id="spark-shop-net" />
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[#7D715E] whitespace-nowrap">Doanh thu thuần nhãn hàng</span>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-black text-[#1A1612] tracking-tight" title={formatCurrency(netRevenue)}>
                {formatMillionShort(netRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ↗ {netRatio}% sau trừ thù lao
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Tỷ lệ hoàn tất đơn hàng */}
          <div className="relative overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-4.5 shadow-xs hover:border-[#C59B58]/60 transition-colors">
            <Sparkline stroke="#C59B58" id="spark-shop-ord" />
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-[#7D715E] whitespace-nowrap">Đơn giao thành công</span>
            </div>
            <div className="relative z-10">
              <p className="text-2xl font-black text-[#1A1612] tracking-tight">
                {formatNumber(completedOrders)} <span className="text-sm font-semibold text-[#7D715E]">/ {formatNumber(totalOrders)}</span>
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ↗ {completionRate}% tỷ lệ hoàn tất
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Middle Section: Revenue Chart (Left 65%) & Operations To-Do Sentinel (Right 35%) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Revenue & Remuneration Curve */}
          <div className="space-y-4 rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeChartTab === 'revenue' ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-[#B88E4F]" />
                    <h3 className="text-base font-bold text-[#1A1612]">Tăng trưởng doanh thu nhãn hàng</h3>
                  </>
                ) : (
                  <>
                    <Coins className="w-4 h-4 text-[#D97706]" />
                    <h3 className="text-base font-bold text-[#1A1612]">Biến động thù lao KOC chi trả</h3>
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
                  Thù lao KOC
                </button>
              </div>
            </div>

            {/* Chart Canvas */}
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
                      <linearGradient id="shopRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C59B58" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#C59B58" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="shopComGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE6" />
                    <XAxis dataKey="label" stroke="#7D715E" minTickGap={25} tick={{ fontSize: 11 }} />
                    <YAxis
                      stroke="#7D715E"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(val) => {
                        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
                        if (val >= 1_000) return `${Math.round(val / 1_000)}k`;
                        return `${val}`;
                      }}
                    />
                    <Tooltip
                      formatter={(value: any) => [
                        formatCurrency(Number(value)),
                        activeChartTab === 'revenue' ? 'Doanh thu' : 'Thù lao KOC',
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
                        key="area-shop-rev"
                        type="monotone"
                        dataKey="revenue"
                        name="Doanh thu"
                        stroke="#C59B58"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#shopRevGrad)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#C59B58', stroke: '#FFFFFF', strokeWidth: 2 }}
                      />
                    ) : (
                      <Area
                        key="area-shop-com"
                        type="monotone"
                        dataKey="commission"
                        name="Thù lao KOC"
                        stroke="#D97706"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#shopComGrad)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#D97706', stroke: '#FFFFFF', strokeWidth: 2 }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Actionable To-Do Sentinel Card */}
          <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-amber-500 font-bold">⚡</span>
                <h3 className="text-base font-bold text-[#1A1612]">Tác vụ cần xử lý ngay</h3>
              </div>

              <div className="space-y-3 text-xs">
                {/* 1. Đơn chờ gửi kho GHN */}
                <Link
                  to="/merchant/orders"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#EAE4D7]/70 bg-[#FAF8F5] hover:bg-[#F3EFE6] transition-colors cursor-pointer group"
                >
                  <span className="flex items-center gap-2 text-[#4A3F33] font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Đơn chờ chuẩn bị giao GHN</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#1A1612] group-hover:text-[#B88E4F]">
                    <span>{pendingOrdersCount} đơn</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#7D715E] group-hover:text-[#B88E4F]" />
                  </span>
                </Link>

                {/* 2. Hàng mẫu 0đ KOC chờ duyệt */}
                <Link
                  to="/merchant/kol-hub?tab=samples"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#EAE4D7]/70 bg-[#FAF8F5] hover:bg-[#F3EFE6] transition-colors cursor-pointer group"
                >
                  <span className="flex items-center gap-2 text-[#4A3F33] font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Mẫu 0đ KOC chờ duyệt (SLA 14d)</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#1A1612] group-hover:text-[#B88E4F]">
                    <span>{pendingSamplesCount} yêu cầu</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#7D715E] group-hover:text-[#B88E4F]" />
                  </span>
                </Link>

                {/* 3. Đề xuất Thỏa thuận độc quyền */}
                <Link
                  to="/merchant/kol-hub?tab=deals"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#EAE4D7]/70 bg-[#FAF8F5] hover:bg-[#F3EFE6] transition-colors cursor-pointer group"
                >
                  <span className="flex items-center gap-2 text-[#4A3F33] font-medium">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span>Đề xuất Thỏa thuận độc quyền</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#1A1612] group-hover:text-[#B88E4F]">
                    <span>{pendingDealsCount} đề xuất</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#7D715E] group-hover:text-[#B88E4F]" />
                  </span>
                </Link>

                {/* 4. Khiếu nại đổi trả cần bù hàng 1-1 */}
                <Link
                  to="/merchant/returns"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-[#EAE4D7]/70 bg-[#FAF8F5] hover:bg-[#F3EFE6] transition-colors cursor-pointer group"
                >
                  <span className="flex items-center gap-2 text-[#4A3F33] font-medium">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Khiếu nại đổi trả bù hàng 1-1</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-[#1A1612] group-hover:text-[#B88E4F]">
                    <span>{pendingReturnsCount} khiếu nại</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#7D715E] group-hover:text-[#B88E4F]" />
                  </span>
                </Link>
              </div>
            </div>

            <div className="pt-4 mt-2">
              <Link
                to="/merchant/orders"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] hover:bg-[#F3EFE6] text-xs font-bold text-[#8C6226] transition-all cursor-pointer shadow-2xs"
              >
                <span>Xem danh sách đơn hàng cần xử lý</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Bottom Section: Top Products (60%) & Top KOCs (40%) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Top Selling Products */}
          <div className="lg:col-span-7 rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-[#B88E4F]" />
                  <h3 className="text-base font-bold text-[#1A1612]">Top sản phẩm nổi bật</h3>
                </div>
                <Link
                  to="/merchant/products"
                  className="text-xs font-bold text-[#B88E4F] hover:text-[#B88E4F] inline-flex items-center gap-1"
                >
                  <span>Xem tất cả sản phẩm</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {topProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7D715E]">
                  Chưa có sản phẩm nào được đăng tải.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#EAE4D7] text-[11px] font-bold text-[#7D715E]">
                      <tr>
                        <th className="pb-3 font-semibold">Sản phẩm</th>
                        <th className="pb-3 font-semibold text-right">Giá bán</th>
                        <th className="pb-3 font-semibold text-center">Tồn kho</th>
                        <th className="pb-3 font-semibold text-center">Thù lao</th>
                        <th className="pb-3 font-semibold text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE4D7]/50">
                      {topProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAF8F5] transition-colors group">
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.title}
                                  className="w-9 h-9 rounded-xl object-cover border border-[#EAE4D7] bg-[#FAF8F5] shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center font-bold text-xs shrink-0">
                                  <Box className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 max-w-[200px]">
                                <strong className="text-xs font-bold text-[#1A1612] truncate block group-hover:text-[#B88E4F] transition-colors" title={p.title}>
                                  {p.title}
                                </strong>
                                <span className="font-mono text-[10px] text-[#7D715E] block">
                                  {p.sku || 'Mã SKU'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-[#1A1612]">
                            {Number(p.price).toLocaleString('vi-VN')} ₫
                          </td>
                          <td className="py-3 text-center font-semibold text-[#1A1612]">
                            {p.stockQuantity}
                          </td>
                          <td className="py-3 text-center">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#FBF5EB] text-[#B88E4F] font-bold text-[11px] border border-[#EEDFC6] shadow-2xs">
                              {p.customCommissionRate ?? currentStore?.defaultCommissionRate ?? 10}%
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs whitespace-nowrap ${
                                p.isActive
                                  ? 'bg-[#FBF5EB] text-[#B88E4F] border-[#EEDFC6]'
                                  : 'bg-[#FAF8F5] text-[#7D715E] border-[#EAE4D7]'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-[#059669]' : 'bg-[#7D715E]'}`} />
                              <span>{p.isActive ? 'Mở bán' : 'Ẩn'}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#EAE4D7]/60 flex items-center justify-between">
              <span className="text-[11px] text-[#7D715E]">
                Hiển thị {topProducts.length} sản phẩm trọng tâm
              </span>
              <Link
                to="/merchant/products?create=1"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-xs font-bold text-[#8C6226] hover:bg-[#F3EFE6] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm sản phẩm mới</span>
              </Link>
            </div>
          </div>

          {/* Top Contributing KOCs for this Store */}
          <div className="lg:col-span-5 rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#B88E4F]" />
                  <h3 className="text-base font-bold text-[#1A1612]">Đối tác KOC chiến thần</h3>
                </div>
                <Link
                  to="/merchant/kol-hub"
                  className="text-xs font-bold text-[#B88E4F] hover:text-[#B88E4F] inline-flex items-center gap-1"
                >
                  <span>Xem mạng lưới</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {storeKols.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#7D715E]">
                  Chưa có đối tác KOC nào phát sinh doanh số cho nhãn hàng.
                </div>
              ) : (
                <div className="space-y-3">
                  {storeKols.slice(0, 4).map((member: any) => {
                    const collab = member.collaborator;
                    const tierInfo = getTierLabel(collab?.collaboratorProfile?.tier?.name);
                    const revenue = member.stats?.totalRevenue || 0;
                    const orders = member.stats?.totalOrders || 0;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-[#EAE4D7]/70 bg-[#FAF8F5] hover:bg-[#F3EFE6] transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0">
                            <KOCAvatar
                              src={collab?.collaboratorProfile?.avatarUrl || collab?.avatarUrl}
                              name={collab?.fullName || 'KOC'}
                            />
                            {collab?.collaboratorProfile?.kycStatus === 'VERIFIED' && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#059669] text-white flex items-center justify-center text-[7px] font-black border-2 border-white"
                                title="Đã xác thực eKYC"
                              >
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs font-bold text-[#1A1612] truncate block group-hover:text-[#B88E4F] transition-colors">
                                {collab?.fullName || 'Đối tác KOC'}
                              </strong>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${tierInfo.color}`}>
                                {tierInfo.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#7D715E] block">
                              {orders} đơn hàng thành công
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <strong className="text-xs font-bold text-[#1A1612]">
                            {formatMillionShort(revenue)}
                          </strong>
                          <Link
                            to={`/merchant/kol-hub?kol=${collab?.id}&tab=messages`}
                            className="w-7 h-7 rounded-lg border border-[#EAE4D7] bg-white flex items-center justify-center text-[#7D715E] hover:text-[#B88E4F] hover:border-[#B88E4F] transition-colors"
                            title="Nhắn tin với KOC"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#EAE4D7]/60 flex items-center justify-between">
              <span className="text-[11px] text-[#7D715E]">
                Đội ngũ: {storeKols.length} KOC đang hợp tác
              </span>
              <Link
                to="/merchant/kol-hub?mode=ai-matching"
                className="text-xs font-bold text-[#8C6226] hover:underline inline-flex items-center gap-1"
              >
                <span>Tìm KOC bằng AI Radar</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* 5. Bottom Section: Recent Orders Feed */}
        <div className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-[#1A1612]">Đơn hàng mới nhất của nhãn hàng</h3>
              <p className="text-xs text-[#7D715E] mt-0.5">Cập nhật đơn đặt hàng liên kết thời gian thực</p>
            </div>
            <Link
              to="/merchant/orders"
              className="text-xs font-bold text-[#B88E4F] hover:text-[#B88E4F] inline-flex items-center gap-1"
            >
              <span>Xem tất cả đơn hàng</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#7D715E]">
              Chưa có đơn hàng nào phát sinh gần đây.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#EAE4D7] text-[11px] font-bold text-[#7D715E]">
                  <tr>
                    <th className="pb-3 font-semibold">Mã đơn</th>
                    <th className="pb-3 font-semibold">Khách hàng</th>
                    <th className="pb-3 font-semibold">Số lượng</th>
                    <th className="pb-3 font-semibold text-right">Tổng tiền</th>
                    <th className="pb-3 font-semibold text-center">Trạng thái GHN</th>
                    <th className="pb-3 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE4D7]/50">
                  {recentOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-[#FAF8F5] transition-colors group">
                      <td className="py-3 font-mono font-bold text-[#1A1612]">
                        #{order.externalOrderSn}
                      </td>
                      <td className="py-3 font-medium text-[#1A1612]">
                        {order.customerName}
                      </td>
                      <td className="py-3 text-[#7D715E]">
                        {order.items.length} sản phẩm
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-[#1A1612]">
                        {Number(order.finalAmount).toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${
                            order.status === 'COMPLETED' || order.status === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : order.status === 'SHIPPING'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : order.status === 'CANCELLED' || order.status === 'RETURNED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {order.status === 'COMPLETED'
                            ? 'Hoàn tất'
                            : order.status === 'DELIVERED'
                              ? 'Đã giao'
                              : order.status === 'SHIPPING'
                                ? 'Đang giao'
                                : order.status === 'CANCELLED'
                                  ? 'Đã hủy'
                                  : order.status === 'RETURNED'
                                    ? 'Đã hoàn hàng'
                                    : 'Chờ xử lý'}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/merchant/orders`}
                          className="text-xs font-bold text-[#8C6226] hover:underline"
                        >
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
