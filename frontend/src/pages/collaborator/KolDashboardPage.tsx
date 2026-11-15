import AffiliatePerformanceChart from '../../components/affiliate/AffiliatePerformanceChart';
import { useState, type ReactNode } from 'react';
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
  Clock,
  RefreshCw,
  PlusCircle,
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
import { kolDashboardRange } from '@/utils/kol-dashboard';
import { ledgerAmountPresentation } from '@/utils/ledger-amount';
import { KolRecentReferralOrders } from '../../components/affiliate/KolRecentReferralOrders';
import './kol-dashboard.css';

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
  const [errors, setErrors] = useState<Partial<Record<'wallet' | 'ledger' | 'overview' | 'series' | 'tier', string>>>({});

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
      const query = kolDashboardRange(days);
      return analyticsService.getRealtimeOverview(query).catch(() => {
        setErrors((prev) => ({ ...prev, overview: 'Chưa thể tải tổng quan.' }));
        return null;
      });
    },
    staleTime: 1000 * 60 * 3,
    placeholderData: keepPreviousData,
  });

  const { data: timeSeries = [] } = useQuery<TimeSeriesPoint[]>({
    queryKey: ['kol-timeseries', period],
    queryFn: async () => {
      const days = Number(period) || 7;
      const query = kolDashboardRange(days);
      const res = await analyticsService.getTimeSeries({
        ...query,
        interval: 'daily',
      }).catch(() => {
        setErrors(prev => ({ ...prev, series: 'Chưa thể tải dữ liệu biểu đồ.' }));
        return [];
      });
      if (Array.isArray(res) && res.length > 0) setErrors(prev => {
        const next = { ...prev };
        delete next.series;
        return next;
      });
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

  const loading = isFetchingOverview || isFetchingWallet;

  const handleRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['kol-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-timeseries'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-wallet'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-ledger'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-referral-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-recent-referral-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-top-products'] }),
      queryClient.invalidateQueries({ queryKey: ['kol-live-summary'] }),
    ]);
  };

  const metrics = overview?.metrics;
  const availBal = wallet ? Number(wallet.availableBalance) : null;
  const pendingBal = wallet ? Number(wallet.pendingBalance) : null;

  const getMetricValue = (point: TimeSeriesPoint) => {
    const value = Number(point[metric]);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };

  const peakValue = Math.max(...timeSeries.map(getMetricValue), 0);
  const chartTotal = timeSeries.reduce((sum, point) => sum + getMetricValue(point), 0);
  const peakPoint = timeSeries.find(point => getMetricValue(point) === peakValue);
  const chartIsMoney = metric === 'revenue' || metric === 'commission';
  const chartValue = (value: number) => `${value.toLocaleString('vi-VN', { maximumFractionDigits: chartIsMoney ? 0 : 1 })}${chartIsMoney ? ' ₫' : ''}`;
  const chartMetricLabel = { clicks: 'lượt nhấp', orders: 'đơn phát sinh', revenue: 'giá trị đơn đã giao', commission: 'hoa hồng đã duyệt' }[metric];


  return (
    <section id="kol-overview" className="flex flex-col gap-3.5 w-full min-w-0 text-[#1A1612] text-left pb-12" aria-label="Tổng quan hiệu quả KOL">
      {Object.keys(errors).length > 0 && <div role="alert" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm text-[#7D715E]">
        <p className="m-0">{Object.values(errors).join(' ')} Dấu — nghĩa là chưa có dữ liệu xác nhận, không phải số dư bằng 0.</p>
        <button type="button" disabled={loading} onClick={() => void handleRefresh()} className="mt-2 font-semibold text-[#B88E4F] underline disabled:opacity-50">Thử tải lại</button>
      </div>}
      <section className="flex w-full flex-col gap-3 rounded-xl border border-[#EAE4D7] bg-white p-3 shadow-[0_1px_3px_rgb(35_29_21_/_4%)] sm:flex-row sm:items-center sm:justify-between" aria-label="Bộ lọc và thao tác tổng quan KOL">
            <div className="w-full sm:w-[210px] sm:shrink-0">
              <Select
                className="w-full h-[42px] min-h-[42px] rounded-[10px] text-sm"
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
          <div className="grid w-full min-w-0 grid-cols-2 items-stretch gap-3 sm:w-[380px] sm:shrink-0">
            <button
              type="button"
              className="inline-flex h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-[#EAE4D7] bg-white px-4 text-xs font-semibold text-[#1A1612] transition-colors hover:border-[#C59B58] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] cursor-pointer"
              onClick={() => navigate('/collaborator/wallet')}
            >
              <span className="inline-flex items-center justify-center gap-1.5 leading-4">
                Quản lý ví
                <ArrowUpRight size={14} className="text-[#B88E4F]" aria-hidden="true" />
              </span>
            </button>
            <button
              type="button"
              className="inline-flex h-[42px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-[#C59B58] bg-[#C59B58] px-4 text-xs font-semibold text-white! transition-colors hover:border-[#B88E4F] hover:bg-[#B88E4F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] cursor-pointer"
              onClick={() => navigate('/collaborator/marketing?tab=links')}
            >
              <PlusCircle size={15} aria-hidden="true" />
              <span>Tạo link tiếp thị</span>
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
                Có thể yêu cầu rút
              </span>
            </div>
            <strong className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#1A1612] my-0.5">
              {availBal === null ? '—' : `${availBal.toLocaleString('vi-VN')} ₫`}
            </strong>
          </div>

          {/* 2. Chờ đối soát Escrow */}
          <div className="flex flex-col justify-between gap-2 p-3 sm:p-4 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5]/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1612]">
                <Clock size={14} className="text-[#B88E4F]" aria-hidden="true" />
                Chờ đối soát
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#B88E4F] border border-[#EEDFC6]">
                14 ngày bảo chứng
              </span>
            </div>
            <strong className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#1A1612] my-0.5">
              {pendingBal === null ? '—' : `${pendingBal.toLocaleString('vi-VN')} ₫`}
            </strong>
          </div>

          {/* 3. Hoa hồng tạm tính */}
          <div className="flex flex-col justify-between gap-2 p-3 sm:p-4 rounded-xl border border-[#EEDFC6] bg-gradient-to-br from-white via-[#FBF5EB] to-white shadow-xs">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C6226]">
                <ShoppingBag size={14} className="text-[#B88E4F]" aria-hidden="true" />
                Thù lao tạm tính
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#B88E4F] border border-[#EEDFC6]">
                {(metrics?.pendingOrdersCount || 0)} đơn mới
              </span>
            </div>
            <strong className="text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums text-[#B88E4F] my-0.5">
              {metrics?.estimatedCommission !== undefined ? `${metrics.estimatedCommission.toLocaleString('vi-VN')} ₫` : '—'}
            </strong>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t border-[#EAE4D7]" role="group" aria-label="Hiệu quả tiếp thị trong khoảng thời gian đã chọn">
          <DashboardMetric
            label="Lượt nhấp tiếp thị"
            icon={MousePointerClick}
            value={metrics ? metrics.totalClicks.toLocaleString('vi-VN') : '—'}
            growth={metrics?.growthClicks}
            note={metrics ? `${metrics.activeReferralLinks} liên kết đang có lượt xem` : 'Chưa tải được số liệu'}
          />
          <DashboardMetric
            label="Đơn hàng thành công"
            icon={ShoppingBag}
            growth={metrics?.growthOrders}
            value={metrics ? <>{metrics.completedOrders}<span className="text-xs font-normal text-[#7D715E]"> / {metrics.totalOrders} đơn</span></> : '—'}
            note={`Chu kỳ ${period} ngày gần nhất`}
          />
          <DashboardMetric
            label="Đơn phát sinh / Lượt nhấp"
            icon={Target}
            value={metrics ? `${metrics.conversionRate.toFixed(2)}%` : '—'}
            note={metrics ? `${metrics.totalOrders} đơn phát sinh / ${metrics.totalClicks} lượt nhấp` : 'Chưa tải được số liệu'}
          />
          <DashboardMetric
            label="Doanh số tiếp thị (GMV)"
            icon={Wallet}
            growth={metrics?.growthRevenue}
            value={metrics ? `${metrics.grossRevenue.toLocaleString('vi-VN')} ₫` : '—'}
            note={metrics ? <>Hoa hồng: <strong className="text-[#B88E4F]">{metrics.totalCommission.toLocaleString('vi-VN')} ₫</strong></> : 'Chưa tải được số liệu'}
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
                <h2 className="text-sm font-semibold text-[#1A1612] m-0">Hiệu quả tiếp thị của bạn</h2>
              </div>
            </div>

            <span className="text-[11px] text-[#7D715E]">{period} ngày gần nhất</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Chọn chỉ số biểu đồ">
            {([
              { id: 'clicks', label: 'Lượt nhấp', icon: MousePointerClick },
              { id: 'orders', label: 'Đơn phát sinh', icon: ShoppingBag },
              { id: 'revenue', label: 'Đơn đã giao (₫)', icon: BarChart3 },
              { id: 'commission', label: 'Hoa hồng duyệt', icon: Wallet },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button type="button" key={id} onClick={() => setMetric(id)} aria-pressed={metric === id}
                className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#B88E4F] ${metric === id ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#8A642C]' : 'border-[#EAE4D7] bg-white text-[#7D715E] hover:bg-[#FAF8F5]'}`}>
                <Icon size={13} aria-hidden="true" />{label}
              </button>
            ))}
          </div>

          {!loading && !errors.series && timeSeries.length > 0 && (
            <div className="grid grid-cols-3 gap-3 border-b border-[#F3EFE6] pb-3 tabular-nums">
              <div className="min-w-0"><span className="block text-[10px] text-[#7D715E]">Tổng {chartMetricLabel}</span><strong className="block mt-1 text-lg font-semibold text-[#1A1612] break-words">{chartValue(chartTotal)}</strong></div>
              <div className="min-w-0"><span className="block text-[10px] text-[#7D715E]">Trung bình / ngày</span><strong className="block mt-1 text-sm font-semibold text-[#1A1612] break-words">{chartValue(chartTotal / timeSeries.length)}</strong></div>
              <div className="min-w-0"><span className="block text-[10px] text-[#7D715E]">Cao nhất{peakValue > 0 && peakPoint ? ` · ${peakPoint.label}` : ''}</span><strong className="block mt-1 text-sm font-semibold text-[#B88E4F] break-words">{chartValue(peakValue)}</strong></div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 min-h-[220px] p-5 text-xs text-[#7D715E]" role="status">
              <RefreshCw size={20} className="animate-spin text-[#B88E4F]" aria-hidden="true" />
              <span>Đang tải dữ liệu biểu đồ…</span>
            </div>
          ) : errors.series ? (
            <p className="p-5 text-xs text-[#7D715E]">{errors.series} Không thể kết luận chưa phát sinh giao dịch.</p>
          ) : timeSeries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 min-h-[220px] p-5 text-xs text-[#7D715E]">
              <BarChart3 className="w-8 h-8 text-[#EAE4D7] mb-1" />
              <span>Chưa có dữ liệu giao dịch trong chu kỳ được chọn.</span>
            </div>
          ) : (
            <AffiliatePerformanceChart points={timeSeries} metric={metric} />
          )}
        </div>

        {/* Lịch sử hoa hồng từ Ledger */}
        <div className="flex flex-col gap-3.5 min-w-0 self-start w-full p-4 rounded-xl border border-[#EAE4D7] bg-white shadow-xs">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EAE4D7]">
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-7 h-7 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                <Wallet size={15} aria-hidden="true" />
              </span>
              <h2 className="text-sm font-semibold text-[#1A1612] m-0">Giao dịch ví gần đây</h2>
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

          <div className="kol-overview-ledger-list grid divide-y divide-[#EAE4D7]">
            {!ledger ? (
              <p className="py-6 text-center text-xs text-[#7D715E]">{loading ? 'Đang tải lịch sử hoa hồng…' : errors.ledger || 'Chưa tải được lịch sử hoa hồng.'}</p>
            ) : ledger.entries.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#7D715E] leading-relaxed">
                Chưa có phát sinh hoa hồng nào. Khi khách mua qua link tiếp thị của bạn, tiền hoa hồng sẽ hiển thị tại đây!
              </div>
            ) : (
              ledger.entries.slice(0, 4).map((entry) => {
                const amount = ledgerAmountPresentation(entry.amount);
                const isPositive = amount.direction === 'credit';
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
                          : entry.transactionType === 'REVERSAL' ? 'Thu hồi thù lao' : entry.transactionType === 'PAYOUT_REJECT_REFUND' ? 'Hoàn tiền rút bị từ chối' : 'Điều chỉnh ví'}
                      </strong>
                      <span className="text-[10px] text-[#7D715E] leading-tight block">
                        {new Date(entry.createdAt).toLocaleDateString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <strong data-testid="dashboard-ledger-amount" data-direction={amount.direction}
                      className={`text-xs sm:text-sm font-bold tabular-nums shrink-0 ${
                        isPositive ? 'text-[#B88E4F]' : 'text-[#7D715E]'
                      }`}
                    >
                      {amount.text}
                    </strong>
                  </div>
                );
              })
            )}
          </div>

          {/* Cấp bậc thực tế */}
          <div className="grid gap-1 p-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB]">
            <div className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-[#B88E4F] shrink-0" />
              <strong className="text-xs font-semibold text-[#1A1612]">
                {loading ? 'Đang tải cấp bậc…' : errors.tier ? 'Chưa tải được cấp bậc' : tierStatus?.currentTier
                  ? `${tierStatus.assessmentIncomplete ? 'Hạng đang lưu' : 'Hạng'} ${tierStatus.currentTier.name} · Tiêu chuẩn ${10 + Number(tierStatus.currentTier.extraBonusPercentage || 0)}%`
                  : 'Cấp bậc khởi đầu (Hạng Đồng)'}
              </strong>
            </div>
            <p className="text-[11px] text-[#7D715E] leading-relaxed m-0">
              {tierStatus?.assessmentIncomplete ? (
                <>Chờ đối soát {tierStatus.unassignedCompletedOrdersCount} đơn thiếu ngày hoàn tất. Chưa đủ dữ liệu xác nhận cấp bậc; hệ thống không tự hạ hạng.</>
              ) : tierStatus?.nextTier ? (
                <>
                  Bạn cần thêm{' '}
                  <strong className="text-[#B88E4F]">
                    {Number(tierStatus.revenueNeeded || 0).toLocaleString('vi-VN')} ₫
                  </strong>{' '}
                  doanh số sạch để đạt ngưỡng hạng {tierStatus.nextTier.name} (tích lũy các kỳ đã đóng).
                </>
              ) : (
                'Tích cực chia sẻ link tiếp thị để gia tăng hoa hồng và mở khóa đặc quyền tài khoản!'
              )}
            </p>
          </div>
        </div>
      </div>

      {/* KHỐI BÁO CÁO CHI TIẾT GỌN GÀNG DẠNG SUB-TABS (TRÁNH KÉO DÀI TRANG) */}
      <KolRecentReferralOrders />
  </section>
  );
}
