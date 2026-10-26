import { useState, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  MousePointerClick,
  ShoppingBag,
  Target,
  Wallet,
  BarChart3,
  Crown,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  RefreshCw,
  PlusCircle,
  Copy,
  Check,
  Package,
  Award,
  Radio,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { tierService, type TierStatus } from '@/services/tier.service';
import { walletService, type WalletSummary, type LedgerHistory } from '@/services/wallet.service';
import {
  analyticsService,
  type DashboardOverviewResponse,
  type TimeSeriesPoint,
} from '@/services/analytics.service';
import { Select } from '@/components/ui/Select';
import KolProductCommissionTable from '../../components/affiliate/KolProductCommissionTable';
import KolLivePerformanceCard from '../../components/affiliate/KolLivePerformanceCard';

function DashboardMetric({ label, value, note, growth, icon: Icon }: {
  label: string;
  value: ReactNode;
  note: ReactNode;
  growth?: number;
  icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0 p-3 sm:p-4 border-b sm:border-b-0 sm:border-r border-[#EAE4D7] last:border-r-0 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <span className="text-[11px] text-[#7D715E] leading-tight">{label}</span>
        {growth !== undefined && (
          <span
            title="So với kỳ trước"
            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold leading-tight whitespace-nowrap ${
              growth > 0 ? 'text-[#059669]' : growth < 0 ? 'text-[#DC2626]' : 'text-[#7D715E]'
            }`}
          >
            {growth !== 0 && <TrendingUp size={11} className={growth < 0 ? 'rotate-180' : ''} aria-hidden="true" />}
            {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="grid place-items-center shrink-0 w-7 h-7 rounded-lg bg-[#FBF5EB] text-[#B88E4F]">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
        <strong className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1612] tabular-nums truncate">
          {value}
        </strong>
      </div>
      <span className="text-[10px] text-[#7D715E] mt-auto leading-relaxed">{note}</span>
    </div>
  );
}

export default function KolDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('7');
  const [metric, setMetric] = useState<'clicks' | 'orders' | 'revenue' | 'commission'>('clicks');
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'stores' | 'live'>('orders');
  const [copiedOrderSn, setCopiedOrderSn] = useState<string | null>(null);

  // TanStack Query Hooks with 3-minute stale cache and seamless keepPreviousData
  const { data: wallet, isFetching: isFetchingWallet } = useQuery<WalletSummary | null>({
    queryKey: ['kol-wallet'],
    queryFn: () => walletService.getMyWallet().catch(() => null),
    staleTime: 1000 * 60 * 3,
  });

  const { data: ledger } = useQuery<LedgerHistory | null>({
    queryKey: ['kol-ledger'],
    queryFn: () => walletService.getMyLedger(1).catch(() => null),
    staleTime: 1000 * 60 * 3,
  });

  const { data: overview, isFetching: isFetchingOverview } = useQuery<DashboardOverviewResponse | null>({
    queryKey: ['kol-overview', period],
    queryFn: () => {
      const days = Number(period) || 7;
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setUTCHours(0, 0, 0, 0);
      startDate.setUTCDate(startDate.getUTCDate() - days + 1);
      return analyticsService.getRealtimeOverview({
        range: 'custom',
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }).catch(() => null);
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: keepPreviousData,
  });

  const { data: timeSeries = [] } = useQuery<TimeSeriesPoint[]>({
    queryKey: ['kol-timeseries', period],
    queryFn: async () => {
      const days = Number(period) || 7;
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setUTCHours(0, 0, 0, 0);
      startDate.setUTCDate(startDate.getUTCDate() - days + 1);
      const res = await analyticsService.getTimeSeries({
        range: 'custom',
        days,
        interval: 'daily',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      }).catch(() => []);
      return Array.isArray(res) ? res : [];
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: keepPreviousData,
  });

  const { data: tierStatus } = useQuery<TierStatus | null>({
    queryKey: ['kol-tier-status'],
    queryFn: () => tierService.getMyTierStatus().catch(() => null),
    staleTime: 1000 * 60 * 5,
  });

  const { data: referralOrdersData, isFetching: isFetchingOrders } = useQuery({
    queryKey: ['kol-referral-orders'],
    queryFn: () => analyticsService.getCollaboratorReferralOrders({ limit: 10 }).catch(() => null),
    staleTime: 1000 * 60 * 2,
    placeholderData: keepPreviousData,
  });

  const { data: topProductsData, isFetching: isFetchingProducts } = useQuery({
    queryKey: ['kol-top-products'],
    queryFn: () => analyticsService.getCollaboratorTopProducts(10).catch(() => null),
    staleTime: 1000 * 60 * 3,
    placeholderData: keepPreviousData,
  });

  const { data: liveData, isFetching: isFetchingLive } = useQuery({
    queryKey: ['kol-live-summary'],
    queryFn: () => analyticsService.getCollaboratorLiveSessionsSummary().catch(() => null),
    staleTime: 1000 * 60 * 3,
    placeholderData: keepPreviousData,
  });

  const referralOrders = referralOrdersData?.items || [];
  const topProducts = topProductsData?.items || [];
  const liveSummary = {
    sessions: liveData?.sessions || [],
    totals: liveData?.totals || { totalLiveRevenue: 0, totalLiveCommission: 0, totalLiveOrders: 0 },
  };

  const storeBreakdown = useMemo(() => {
    const storeMap = new Map<string, { storeName: string; ordersCount: number; totalRevenue: number; totalCommission: number }>();

    referralOrders.forEach((order) => {
      const sName = order.storeName || 'Sora Skin Official';
      const existing = storeMap.get(sName) || {
        storeName: sName,
        ordersCount: 0,
        totalRevenue: 0,
        totalCommission: 0,
      };
      existing.ordersCount += 1;
      existing.totalRevenue += Number(order.finalAmount || 0);
      existing.totalCommission += Number(order.commissionAmount || 0);
      storeMap.set(sName, existing);
    });

    topProducts.forEach((prod) => {
      if (prod.storeName && !storeMap.has(prod.storeName)) {
        storeMap.set(prod.storeName, {
          storeName: prod.storeName,
          ordersCount: prod.ordersCount || 0,
          totalRevenue: prod.grossRevenue || 0,
          totalCommission: Math.round((prod.grossRevenue || 0) * 0.1),
        });
      }
    });

    if (storeMap.size === 0) {
      storeMap.set('Sora Skin Official', {
        storeName: 'Sora Skin Official',
        ordersCount: 0,
        totalRevenue: 0,
        totalCommission: 0,
      });
    }

    const items = Array.from(storeMap.values());
    const grandTotalCommission = items.reduce((sum, s) => sum + s.totalCommission, 0) || 1;

    return items
      .map((item) => ({
        ...item,
        percentage: Math.min(100, Math.round((item.totalCommission / grandTotalCommission) * 100)),
      }))
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [referralOrdersData?.items, topProductsData?.items]);

  const loading = isFetchingOverview || isFetchingWallet;

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['kol-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-timeseries'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-ledger'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-referral-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-top-products'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-live-summary'] }),
    ]);
  };

  const metrics = overview?.metrics;
  const availBal = Number(wallet?.availableBalance || 0);
  const pendingBal = Number(wallet?.pendingBalance || 0);

  const getMetricValue = (point: TimeSeriesPoint) => {
    const value = Number(point[metric]);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };

  const maxValue = Math.max(...timeSeries.map(getMetricValue), 1);
  const hasChartActivity = timeSeries.some((point) => getMetricValue(point) > 0);
  const chartMetricLabel = { clicks: 'lượt nhấp', orders: 'đơn hàng', revenue: 'doanh số', commission: 'hoa hồng' }[metric];
  const chartTicks = Array.from({ length: Math.min(7, timeSeries.length) }, (_, i) =>
    Math.round(i * (timeSeries.length - 1) / Math.max(1, Math.min(7, timeSeries.length) - 1)),
  );
  const formatChartValue = (value: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

  return (
    <section className="flex flex-col gap-3.5 w-full min-w-0 text-[#1A1612] text-left pb-12" aria-label="Tổng quan hiệu quả KOL">
      <section className="grid w-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 items-start gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3 sm:p-4 shadow-xs" aria-label="Bộ lọc và thao tác tổng quan KOL">
            <div className="w-full">
              <Select
                className="w-full min-h-[44px]"
                id="kol-dashboard-period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                aria-label="Khoảng thời gian phân tích"
              >
                <option value="7">7 ngày gần nhất</option>
                <option value="30">30 ngày gần nhất</option>
                <option value="90">90 ngày gần nhất</option>
              </Select>
            </div>
            <button
              type="button"
              className="order-last inline-flex w-full min-h-[44px] items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#EAE4D7] bg-white text-[#1A1612] text-xs font-semibold hover:border-[#C59B58] hover:bg-[#FBF5EB] transition-colors disabled:opacity-60 cursor-pointer"
              onClick={() => void handleRefresh()}
              disabled={loading}
            >
              <RefreshCw size={14} className={`text-[#B88E4F] ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              className="inline-flex w-full min-h-[44px] items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition-colors cursor-pointer shadow-xs"
              onClick={() => navigate('/collaborator/marketing?tab=links')}
            >
              <PlusCircle size={14} />
              <span>Tạo link tiếp thị</span>
            </button>
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex w-full flex-col items-center justify-center gap-0.5 min-h-[44px] px-3 py-1.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#1A1612] text-xs font-semibold hover:border-[#C59B58] hover:bg-[#F3EFE6] transition-colors cursor-pointer"
              onClick={() => navigate('/collaborator/wallet')}
            >
              <span className="inline-flex items-center justify-center gap-1.5 leading-4">
                Quản lý ví
                <ArrowUpRight size={14} className="text-[#B88E4F]" aria-hidden="true" />
              </span>
            <span className="inline-flex items-center justify-center gap-1 text-[10px] font-normal leading-3 text-[#7D715E]">
              <ShieldCheck size={13} className={wallet?.kycStatus === 'VERIFIED' ? 'text-[#059669]' : 'text-[#B88E4F]'} aria-hidden="true" />
              <span>{wallet?.kycStatus === 'VERIFIED' ? 'KYC đã xác thực' : 'Chưa xác thực KYC'}</span>
            </span>
            </button>
          </div>
      </section>

      <div className="min-w-0 rounded-xl border border-[#EAE4D7] bg-white shadow-xs">
        <section className="grid grid-cols-1 md:grid-cols-3 items-stretch gap-2.5 p-3.5" aria-label="Số dư ví KOL" aria-busy={loading}>
          {/* 1. Số dư khả dụng */}
          <div className="flex flex-col justify-between gap-2 p-3 sm:p-4 rounded-xl border border-[#EEDFC6] bg-gradient-to-b from-[#FBF5EB] to-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1612]">
                <Wallet size={15} className="text-[#B88E4F]" aria-hidden="true" />
                Số dư khả dụng
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF8F5] text-[#059669] border border-[#EAE4D7]">
                Rút ngay 24/7
              </span>
            </div>
            <strong className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#1A1612] my-0.5">
              {availBal.toLocaleString('vi-VN')} ₫
            </strong>
            <span className="text-[10px] text-[#7D715E] leading-tight">
              Có thể rút tiền về tài khoản ngân hàng liên kết bất kỳ lúc nào.
            </span>
          </div>

          {/* 2. Chờ đối soát Escrow */}
          <div className="flex flex-col justify-between gap-2 p-3 sm:p-4 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5]/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1612]">
                <Clock size={14} className="text-[#B88E4F]" aria-hidden="true" />
                Chờ đối soát Escrow
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#B88E4F] border border-[#EEDFC6]">
                14 ngày bảo chứng
              </span>
            </div>
            <strong className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#1A1612] my-0.5">
              {pendingBal.toLocaleString('vi-VN')} ₫
            </strong>
            <span className="text-[10px] text-[#7D715E] leading-tight">
              Đơn đã giao thành công, đang đếm ngược thời gian khiếu nại đổi trả.
            </span>
          </div>

          {/* 3. Hoa hồng tạm tính */}
          <div className="flex flex-col justify-between gap-2 p-3 sm:p-4 rounded-xl border border-[#EEDFC6] bg-gradient-to-br from-white via-[#FBF5EB] to-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C6226]">
                <ShoppingBag size={14} className="text-[#B88E4F]" aria-hidden="true" />
                Hoa hồng tạm tính
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#B88E4F] border border-[#EEDFC6]">
                {(metrics?.pendingOrdersCount || 0)} đơn mới
              </span>
            </div>
            <strong className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#B88E4F] my-0.5">
              {(metrics?.estimatedCommission || 0).toLocaleString('vi-VN')} ₫
            </strong>
            <span className="text-[10px] text-[#7D715E] leading-tight">
              Ghi nhận ngay khi khách đặt mua qua link; chuyển vào ví chờ sau khi giao.
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-[#EAE4D7]" role="group" aria-label="Hiệu quả tiếp thị trong khoảng thời gian đã chọn">
          <DashboardMetric
            label="Lượt nhấp tiếp thị"
            icon={MousePointerClick}
            value={(metrics?.totalClicks || 0).toLocaleString('vi-VN')}
            growth={metrics?.growthClicks}
            note={`${metrics?.activeReferralLinks || 0} liên kết đang có lượt xem`}
          />
          <DashboardMetric
            label="Đơn hàng thành công"
            icon={ShoppingBag}
            growth={metrics?.growthOrders}
            value={<>{metrics?.completedOrders || 0}<span className="text-xs font-normal text-[#7D715E]"> / {metrics?.totalOrders || 0} đơn</span></>}
            note={`Chu kỳ ${period} ngày gần nhất`}
          />
          <DashboardMetric
            label="Tỷ lệ chuyển đổi"
            icon={Target}
            value={`${(metrics?.conversionRate || 0).toFixed(2)}%`}
            note={`Trung bình đơn: ${(metrics?.averageOrderValue || 0).toLocaleString('vi-VN')} ₫`}
          />
          <DashboardMetric
            label="Doanh số tiếp thị (GMV)"
            icon={Wallet}
            growth={metrics?.growthRevenue}
            value={`${(metrics?.grossRevenue || 0).toLocaleString('vi-VN')} ₫`}
            note={<>Hoa hồng: <strong className="text-[#B88E4F]">{(metrics?.totalCommission || 0).toLocaleString('vi-VN')} ₫</strong></>}
          />
        </div>
      </div>

      {/* Real Chart and Commission Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.4fr)] items-stretch gap-3.5">
        {/* Biểu đồ diễn biến */}
        <div className="flex flex-col gap-3.5 min-w-0 p-4 rounded-xl border border-[#EAE4D7] bg-white shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2.5 pb-3 border-b border-[#EAE4D7]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid place-items-center shrink-0 w-8 h-8 rounded-lg border border-[#EEDFC6] bg-white text-[#B88E4F]">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#1A1612] m-0">Hiệu quả theo ngày</h2>
                <p className="text-[11px] text-[#7D715E] mt-0.5 m-0">Theo dõi biến động trong {period} ngày gần nhất</p>
              </div>
            </div>

            <div className="w-[160px] max-w-full">
              <Select
                value={metric}
                onChange={(e) => setMetric(e.target.value as any)}
                aria-label="Chọn chỉ số biểu đồ"
              >
                <option value="clicks">Lượt nhấp tiếp thị</option>
                <option value="orders">Đơn hàng</option>
                <option value="revenue">Doanh số (₫)</option>
                <option value="commission">Hoa hồng (₫)</option>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 min-h-[220px] p-5 text-xs text-[#7D715E]" role="status">
              <RefreshCw size={20} className="animate-spin text-[#B88E4F]" aria-hidden="true" />
              <span>Đang tải dữ liệu biểu đồ…</span>
            </div>
          ) : timeSeries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 min-h-[220px] p-5 text-xs text-[#7D715E]">
              <BarChart3 className="w-8 h-8 text-[#EAE4D7] mb-1" />
              <span>Chưa có dữ liệu giao dịch trong chu kỳ được chọn.</span>
            </div>
          ) : (
            <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-2 pt-2" role="group" aria-label={`Biểu đồ ${chartMetricLabel} theo ngày`}>
              <div className="flex flex-col justify-between h-[168px] mt-6 text-[10px] text-[#7D715E] text-right tabular-nums" aria-hidden="true">
                <span>{formatChartValue(maxValue)}</span>
                <span>{formatChartValue(maxValue / 2)}</span>
                <span>0</span>
              </div>
              <div className="relative h-[192px] min-w-0">
                <div className="absolute inset-0 top-6 flex flex-col justify-between pointer-events-none" aria-hidden="true">
                  <div className="w-full border-t border-dashed border-[#EAE4D7]" />
                  <div className="w-full border-t border-dashed border-[#EAE4D7]" />
                  <div className="w-full border-t border-[#EAE4D7]" />
                </div>
                {!hasChartActivity && (
                  <div className="absolute inset-0 top-6 flex flex-col items-center justify-center gap-1.5 p-2 text-center text-xs text-[#7D715E] pointer-events-none">
                    <span className="grid place-items-center w-9 h-9 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                      <BarChart3 size={18} aria-hidden="true" />
                    </span>
                    <strong className="text-xs font-semibold text-[#1A1612]">Chưa phát sinh {chartMetricLabel} trong kỳ này</strong>
                    <span className="text-[10px]">Dữ liệu sẽ hiển thị khi có hoạt động tiếp thị.</span>
                  </div>
                )}
                <div className="relative grid items-end h-[192px] gap-1" style={{ gridTemplateColumns: `repeat(${timeSeries.length}, minmax(0, 1fr))` }}>
                  {timeSeries.map((d, idx) => {
                    const val = getMetricValue(d);
                    const formattedVal = `${val.toLocaleString('vi-VN')}${metric === 'revenue' || metric === 'commission' ? ' ₫' : ''}`;
                    return (
                      <div className="relative flex items-end justify-center h-[192px] min-w-0 group cursor-default focus:outline-none" key={d.date || idx} tabIndex={0} aria-label={`${d.label}: ${formattedVal}`}>
                        <div
                          className={`relative w-3/4 max-w-[36px] min-w-[2px] rounded-t transition-colors ${
                            val === 0 ? 'w-1.5 min-w-0 border-b-2 border-[#EAE4D7] bg-transparent' : 'bg-[#C59B58] group-hover:bg-[#B88E4F]'
                          }`}
                          style={{ height: val ? `max(2px, calc(168px * ${val / maxValue}))` : 0 }}
                        >
                          {val > 0 && timeSeries.length <= 14 && (
                            <span className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 text-[10px] text-[#7D715E] font-medium whitespace-nowrap" aria-hidden="true">
                              {formatChartValue(val)}
                            </span>
                          )}
                        </div>
                        <span className="absolute z-10 bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 px-2 py-1 rounded-md border border-[#EEDFC6] bg-white text-[#1A1612] shadow-md text-xs whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-focus:opacity-100 transition-opacity" role="tooltip">
                          {d.label}: {formattedVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="relative col-start-2 h-7 mt-2.5 text-[11px] text-[#7D715E]" aria-hidden="true">
                {chartTicks.map((index) => (
                  <span
                    key={index}
                    className="absolute -translate-x-1/2 whitespace-nowrap"
                    style={{ left: `${(index + 0.5) / timeSeries.length * 100}%` }}
                  >
                    {timeSeries[index].label}
                  </span>
                ))}
              </div>
              {(metric === 'revenue' || metric === 'commission') && (
                <span className="col-start-2 text-right text-[10px] text-[#7D715E]">Đơn vị: VND</span>
              )}
            </div>
          )}
        </div>

        {/* Lịch sử hoa hồng từ Ledger */}
        <div className="flex flex-col gap-3.5 min-w-0 p-4 rounded-xl border border-[#EAE4D7] bg-white shadow-xs">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EAE4D7]">
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-7 h-7 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                <Wallet size={15} aria-hidden="true" />
              </span>
              <h2 className="text-sm font-semibold text-[#1A1612] m-0">Hoa hồng gần đây</h2>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#B88E4F] hover:text-[#1A1612] transition-colors cursor-pointer"
              onClick={() => navigate('/collaborator/wallet')}
            >
              <span>Xem tất cả</span>
              <ArrowUpRight size={13} aria-hidden="true" />
            </button>
          </div>

          <div className="grid divide-y divide-[#EAE4D7]">
            {!ledger?.entries || ledger.entries.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#7D715E] leading-relaxed">
                Chưa có phát sinh hoa hồng nào. Khi khách mua qua link tiếp thị của bạn, tiền hoa hồng sẽ hiển thị tại đây!
              </div>
            ) : (
              ledger.entries.slice(0, 4).map((entry) => {
                const isPositive = entry.balanceBucket === 'AVAILABLE' || entry.transactionType.includes('COMMISSION');
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2.5 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="grid place-items-center w-7 h-7 shrink-0 text-[#B88E4F] bg-[#FAF8F5] rounded-lg" aria-hidden="true">
                      {isPositive ? <PlusCircle size={15} /> : <ArrowUpRight size={15} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <strong className="text-xs font-semibold text-[#1A1612] block truncate">
                        {entry.transactionType === 'COMMISSION_PENDING'
                          ? 'Hoa hồng chờ duyệt'
                          : entry.transactionType === 'COMMISSION_APPROVED'
                          ? 'Hoa hồng khả dụng'
                          : entry.transactionType === 'PAYOUT_WITHDRAW'
                          ? 'Rút tiền về ngân hàng'
                          : entry.transactionType}
                      </strong>
                      <span className="text-[10px] text-[#7D715E] leading-tight block">
                        {new Date(entry.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <strong
                      className={`text-xs sm:text-sm font-bold tabular-nums shrink-0 ${
                        isPositive ? 'text-[#B88E4F]' : 'text-[#7D715E]'
                      }`}
                    >
                      {isPositive ? '+' : '-'}
                      {Math.abs(Number(entry.amount)).toLocaleString('vi-VN')} ₫
                    </strong>
                  </div>
                );
              })
            )}
          </div>

          {/* Cấp bậc thực tế */}
          <div className="grid gap-1 mt-auto p-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB]">
            <div className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-[#B88E4F] shrink-0" />
              <strong className="text-xs font-semibold text-[#1A1612]">
                {tierStatus?.currentTier
                  ? `Hạng ${tierStatus.currentTier.name} (+${tierStatus.currentTier.extraBonusPercentage || 0}% Thưởng)`
                  : 'Cấp bậc khởi đầu (Hạng Đồng)'}
              </strong>
            </div>
            <p className="text-[11px] text-[#7D715E] leading-relaxed m-0">
              {tierStatus?.nextTier ? (
                <>
                  Bạn cần thêm{' '}
                  <strong className="text-[#B88E4F]">
                    {Number(tierStatus.revenueNeeded || 0).toLocaleString('vi-VN')} ₫
                  </strong>{' '}
                  GMV so với ngưỡng hạng {tierStatus.nextTier.name} (đối chiếu tháng trước).
                </>
              ) : (
                'Tích cực chia sẻ link tiếp thị để gia tăng hoa hồng và mở khóa đặc quyền tài khoản!'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* KHỐI BÁO CÁO CHI TIẾT GỌN GÀNG DẠNG SUB-TABS (TRÁNH KÉO DÀI TRANG) */}
      <div className="flex flex-col min-w-0 rounded-2xl border border-[#EAE4D7] bg-white shadow-xs overflow-hidden">
        {/* Khay tab điều hướng */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-[#EAE4D7] bg-[#FAF8F5]/80">
          <div className="inline-flex p-1 rounded-xl bg-[#F3EFE6] border border-[#EAE4D7] gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white text-[#1A1612] shadow-2xs border border-[#EAE4D7]'
                  : 'text-[#7D715E] hover:text-[#1A1612]'
              }`}
            >
              <ShoppingBag size={13} className={activeTab === 'orders' ? 'text-[#B88E4F]' : ''} />
              <span>Đơn hàng</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FAF8F5] border border-[#EAE4D7] font-mono">
                {referralOrders.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'bg-white text-[#1A1612] shadow-2xs border border-[#EAE4D7]'
                  : 'text-[#7D715E] hover:text-[#1A1612]'
              }`}
            >
              <Award size={13} className={activeTab === 'products' ? 'text-[#B88E4F]' : ''} />
              <span>Sản phẩm</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FAF8F5] border border-[#EAE4D7] font-mono">
                {topProducts.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stores')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'stores'
                  ? 'bg-white text-[#1A1612] shadow-2xs border border-[#EAE4D7]'
                  : 'text-[#7D715E] hover:text-[#1A1612]'
              }`}
            >
              <Store size={13} className={activeTab === 'stores' ? 'text-[#B88E4F]' : ''} />
              <span>Gian hàng</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FAF8F5] border border-[#EAE4D7] font-mono">
                {storeBreakdown.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-white text-[#1A1612] shadow-2xs border border-[#EAE4D7]'
                  : 'text-[#7D715E] hover:text-[#1A1612]'
              }`}
            >
              <Radio size={13} className={activeTab === 'live' ? 'text-[#B88E4F]' : ''} />
              <span>Livestream</span>
              {liveSummary.sessions.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#FAF8F5] border border-[#EAE4D7] font-mono">
                  {liveSummary.sessions.length}
                </span>
              )}
            </button>
          </div>

          <span className="text-[11px] text-[#7D715E]">
            {activeTab === 'orders' && `${referralOrders.length} đơn hàng tiếp thị gần nhất`}
            {activeTab === 'products' && `${topProducts.length} sản phẩm ghi nhận doanh số`}
            {activeTab === 'stores' && `${storeBreakdown.length} gian hàng đối tác`}
            {activeTab === 'live' && `${liveSummary.sessions.length} phiên Live có ghim giỏ hàng`}
          </span>
        </div>

        {/* Nội dung Tab 1: Đơn hàng tiếp thị */}
        {activeTab === 'orders' &&
          (referralOrders.length === 0 ? (
          <div className="py-10 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F] flex items-center justify-center mb-2.5">
              <Package size={22} />
            </div>
            <strong className="text-sm font-semibold text-[#1A1612]">Chưa phát sinh đơn hàng qua liên kết</strong>
            <p className="text-xs text-[#7D715E] max-w-md mt-1 mb-3.5">
              Khi khách hàng nhấp vào link tiếp thị và đặt mua sản phẩm, đơn hàng và hoa hồng tạm tính sẽ xuất hiện ngay tại đây.
            </p>
            <button
              type="button"
              onClick={() => navigate('/collaborator/marketing?tab=links')}
              className="px-3.5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Lấy link chia sẻ ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAF8F5] text-[#7D715E] border-b border-[#EAE4D7]">
                <tr>
                  <th className="px-3.5 py-2.5 font-bold">Mã đơn hàng</th>
                  <th className="px-3.5 py-2.5 font-bold">Thời gian đặt</th>
                  <th className="px-3.5 py-2.5 font-bold">Sản phẩm & Gian hàng</th>
                  <th className="px-3.5 py-2.5 font-bold text-right">Giá trị đơn</th>
                  <th className="px-3.5 py-2.5 font-bold text-right">Hoa hồng ({referralOrders[0]?.commissionRate || 10}%)</th>
                  <th className="px-3.5 py-2.5 font-bold text-center">Trạng thái đối soát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE4D7]">
                {referralOrders.map((order) => {
                  const isDelivered = order.status === 'DELIVERED';
                  const isCompleted = order.status === 'COMPLETED';
                  const isCancelled = order.status === 'CANCELLED';
                  const firstProduct = order.products?.[0];
                  const otherCount = (order.products?.length || 1) - 1;

                  return (
                    <tr key={order.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                      <td className="px-3.5 py-3 font-mono font-bold text-[#1A1612]">
                        <div className="flex items-center gap-1.5">
                          <span>{order.orderCode}</span>
                          <button
                            type="button"
                            aria-label={`Sao chép mã đơn ${order.orderCode}`}
                            onClick={() => {
                              navigator.clipboard.writeText(order.orderCode);
                              setCopiedOrderSn(order.orderCode);
                              setTimeout(() => setCopiedOrderSn(null), 1500);
                            }}
                            className="text-[#7D715E] hover:text-[#B88E4F] p-0.5 rounded cursor-pointer"
                            title="Sao chép mã đơn"
                          >
                            {copiedOrderSn === order.orderCode ? (
                              <Check size={12} className="text-[#059669]" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-[#7D715E] whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="flex items-center gap-2.5 min-w-0 max-w-xs">
                          {firstProduct?.imageUrl ? (
                            <img
                              src={firstProduct.imageUrl}
                              alt={firstProduct.title}
                              className="w-8 h-8 rounded-lg object-cover border border-[#EAE4D7] shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#EAE4D7] flex items-center justify-center shrink-0">
                              <ShoppingBag size={14} className="text-[#B88E4F]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-[#1A1612] truncate block" title={firstProduct?.title}>
                              {firstProduct?.title || 'Sản phẩm tiếp thị'}
                              {otherCount > 0 && ` (+${otherCount})`}
                            </span>
                            <span className="text-[10px] text-[#7D715E] truncate block">
                              {order.storeName}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right font-bold text-[#1A1612] tabular-nums whitespace-nowrap">
                        {order.finalAmount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-3.5 py-3 text-right font-extrabold text-[#B88E4F] tabular-nums whitespace-nowrap">
                        +{order.commissionAmount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="px-3.5 py-3 text-center whitespace-nowrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] text-[#059669] border border-[#EEDFC6]">
                            ✓ Đã hoàn tất (Khả dụng)
                          </span>
                        ) : isDelivered ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] text-[#B88E4F] border border-[#EAE4D7]">
                            <Clock size={11} /> Chờ đối soát Escrow
                          </span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            ✕ Đã hủy
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] text-[#8C6226] border border-[#EEDFC6]">
                            <Clock size={11} /> Hoa hồng tạm tính
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

      {/* Nội dung Tab 2: Hiệu suất theo sản phẩm */}
      {activeTab === 'products' && (
        <div className="p-0">
          <KolProductCommissionTable items={topProducts} loading={isFetchingProducts} />
        </div>
      )}

      {/* Nội dung Tab: Phân bổ hoa hồng theo gian hàng */}
      {activeTab === 'stores' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#EAE4D7] bg-[#FAF8F5] text-[11px] font-semibold text-[#7D715E]">
                <th className="py-3 px-4">Gian hàng</th>
                <th className="py-3 px-4 text-center">Số đơn</th>
                <th className="py-3 px-4 text-right">Doanh số (GMV)</th>
                <th className="py-3 px-4 text-right">Hoa hồng nhận</th>
                <th className="py-3 px-4 text-right">Tỷ trọng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE4D7]">
              {storeBreakdown.map((item, idx) => (
                <tr key={item.storeName || idx} className="hover:bg-[#FBF5EB]/40 transition">
                  <td className="py-3 px-4 font-semibold text-[#1A1612]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] flex items-center justify-center text-[#B88E4F] shrink-0">
                        <Store size={14} />
                      </div>
                      <span>{item.storeName}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-[#1A1612] tabular-nums font-medium">
                    {item.ordersCount}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-[#1A1612] tabular-nums">
                    {item.totalRevenue.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-[#B88E4F] tabular-nums">
                    {item.totalCommission.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <div className="w-16 h-1.5 rounded-full bg-[#EAE4D7] overflow-hidden">
                        <div
                          className="h-full bg-[#C59B58] rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[#7D715E] w-8 tabular-nums">
                        {item.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nội dung Tab 3: Phiên Livestream */}
      {activeTab === 'live' && (
        <div className="p-0">
          <KolLivePerformanceCard
            sessions={liveSummary.sessions}
            totals={liveSummary.totals}
            loading={isFetchingLive}
          />
        </div>
      )}
    </div>
  </section>
  );
}
