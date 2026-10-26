import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { kolDashboardRange, loadKolDashboard } from '@/utils/kol-dashboard';
import { ledgerAmountPresentation } from '@/utils/ledger-amount';

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
  const [period, setPeriod] = useState('7');
  const [metric, setMetric] = useState<'clicks' | 'orders' | 'revenue' | 'commission'>('clicks');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<'wallet' | 'ledger' | 'overview' | 'series' | 'tier', string>>>({});

  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerHistory | null>(null);
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [tierStatus, setTierStatus] = useState<TierStatus | null>(null);
  const requestSequence = useRef(0);

  const loadData = async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setErrors({});
    setWallet(null); setLedger(null); setOverview(null); setTimeSeries([]); setTierStatus(null);
    try {
      const days = Number(period) || 7;
      const query = kolDashboardRange(days);
      const snapshot = await loadKolDashboard({
        wallet: () => walletService.getMyWallet(),
        ledger: () => walletService.getMyLedger(1),
        overview: () => analyticsService.getRealtimeOverview(query),
        series: () => analyticsService.getTimeSeries({ ...query, interval: 'daily' }),
        tier: () => tierService.getMyTierStatus(),
      });

      if (requestId !== requestSequence.current) return;
      setErrors(snapshot.errors);
      setWallet(snapshot.wallet);
      setLedger(snapshot.ledger);
      setOverview(snapshot.overview);
      setTimeSeries(snapshot.series);
      setTierStatus(snapshot.tier);
    } catch (err) {
      if (requestId === requestSequence.current) setErrors({ overview: 'Chưa thể tải dashboard. Vui lòng thử lại.' });
      console.error('Lỗi tải dữ liệu Dashboard KOL:', err);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    return () => { requestSequence.current += 1; };
  }, [period]);

  const metrics = overview?.metrics;
  const availBal = wallet ? Number(wallet.availableBalance) : null;
  const pendingBal = wallet ? Number(wallet.pendingBalance) : null;

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
      {Object.keys(errors).length > 0 && <div role="alert" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm text-[#7D715E]">
        <p className="m-0">{Object.values(errors).join(' ')} Dấu — nghĩa là chưa có dữ liệu xác nhận, không phải số dư bằng 0.</p>
        <button type="button" disabled={loading} onClick={() => void loadData()} className="mt-2 font-semibold text-[#B88E4F] underline disabled:opacity-50">Thử tải lại</button>
      </div>}
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
              onClick={() => void loadData()}
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
        <section className="grid grid-cols-1 md:grid-cols-2 items-center gap-2.5 p-3.5" aria-label="Số dư ví KOL" aria-busy={loading}>
          <div className="grid gap-1.5 min-w-0 p-3 sm:p-4 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB]">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#7D715E] leading-relaxed">
              <Wallet size={15} className="text-[#B88E4F]" aria-hidden="true" />
              Số dư khả dụng
            </span>
            <strong className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight tabular-nums text-[#1A1612]">
              {availBal === null ? '—' : `${availBal.toLocaleString('vi-VN')} ₫`}
            </strong>
          </div>
          <div className="grid gap-1.5 min-w-0 p-3 sm:p-4 rounded-lg border border-[#EAE4D7] bg-[#FAF8F5]">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#7D715E] leading-relaxed">
              <Clock size={14} className="text-[#B88E4F]" aria-hidden="true" />
              Chờ đối soát Escrow
            </span>
            <strong className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight tabular-nums text-[#1A1612]">
              {pendingBal === null ? '—' : `${pendingBal.toLocaleString('vi-VN')} ₫`}
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
            label="Tỷ lệ chuyển đổi"
            icon={Target}
            value={metrics ? `${metrics.conversionRate.toFixed(2)}%` : '—'}
            note={metrics ? `Trung bình đơn: ${metrics.averageOrderValue.toLocaleString('vi-VN')} ₫` : 'Chưa tải được số liệu'}
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
          ) : errors.series ? (
            <p className="p-5 text-xs text-[#7D715E]">{errors.series} Không thể kết luận chưa phát sinh giao dịch.</p>
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
          <div className="grid gap-1 mt-auto p-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB]">
            <div className="flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-[#B88E4F] shrink-0" />
              <strong className="text-xs font-semibold text-[#1A1612]">
                {loading ? 'Đang tải cấp bậc…' : errors.tier ? 'Chưa tải được cấp bậc' : tierStatus?.currentTier
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
    </section>
  );
}
