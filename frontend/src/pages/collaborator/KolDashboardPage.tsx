import { useState, useEffect, useRef, useCallback, lazy, Suspense, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import './KolDashboardPage.css';
import {
  MousePointerClick,
  ShoppingBag,
  Target,
  Wallet,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  Clock,
  RefreshCw,
  PlusCircle,
  X,
  type LucideIcon,
} from 'lucide-react';
import { walletService, type WalletSummary, type LedgerHistory } from '@/services/wallet.service';
import { Select } from '@/components/ui/Select';
import {
  analyticsService,
  type DashboardOverviewResponse,
  type TimeSeriesPoint,
} from '@/services/analytics.service';

const CreateReferralLink = lazy(() => import('./ReferralLinksPage'));
const DashboardWallet = lazy(() => import('./WalletPage'));

function DashboardMetric({ label, value, note, growth, icon: Icon }: {
  label: string;
  value: ReactNode;
  note: ReactNode;
  growth?: number;
  icon: LucideIcon;
}) {
  return (
    <div className="kol-overview-metric">
      <div className="kol-overview-metric-heading">
        <span>{label}</span>
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
      <div className="kol-overview-metric-value">
        <span className="grid place-items-center shrink-0 w-7 h-7 rounded-lg bg-[#FBF5EB] text-[#B88E4F]">
          <Icon className="w-4 h-4" aria-hidden="true" />
        </span>
        <strong>
          {value}
        </strong>
      </div>
      <div className="kol-overview-metric-note">{note}</div>
    </div>
  );
}

export default function KolDashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('7');
  const [metric, setMetric] = useState<'clicks' | 'orders' | 'revenue' | 'commission'>('clicks');
  const [loading, setLoading] = useState(true);
  const [createLinkOpen, setCreateLinkOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletBusy, setWalletBusy] = useState(false);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerHistory | null>(null);
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [activeChartIndex, setActiveChartIndex] = useState<number | null>(null);
  const requestSequence = useRef(0);

  const loadData = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setLoadErrors([]);
    const failedSections: string[] = [];
    const unavailable = (section: string) => {
      failedSections.push(section);
      return null;
    };
    try {
      const days = Number(period) || 7;
      const endDate = new Date();
      const vietnamOffsetMs = 7 * 60 * 60 * 1000;
      const startDate = new Date(endDate.getTime() + vietnamOffsetMs);
      startDate.setUTCHours(0, 0, 0, 0);
      startDate.setUTCDate(startDate.getUTCDate() - days + 1);
      startDate.setTime(startDate.getTime() - vietnamOffsetMs);
      const query = { range: 'custom', days, startDate: startDate.toISOString(), endDate: endDate.toISOString() };
      const [walletData, ledgerData, overviewData, seriesData] = await Promise.all([
        walletService.getMyWallet().catch(() => unavailable('số dư ví')),
        walletService.getMyLedger(1).catch(() => unavailable('lịch sử ví')),
        analyticsService.getRealtimeOverview(query).catch(() => unavailable('chỉ số hiệu quả')),
        analyticsService.getTimeSeries({ ...query, interval: 'daily' }).catch(() => unavailable('biểu đồ')),
      ]);

      if (requestId !== requestSequence.current) return;
      setWallet(walletData);
      setLedger(ledgerData);
      setOverview(overviewData);
      setTimeSeries(Array.isArray(seriesData) ? seriesData : []);
      setLoadErrors(failedSections);
    } catch (err) {
      console.error('Lỗi tải dữ liệu Dashboard KOL:', err);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void loadData();
    return () => { requestSequence.current += 1; };
  }, [loadData]);

  const metrics = overview?.metrics;
  const availBal = Number(wallet?.availableBalance || 0);
  const pendingBal = Number(wallet?.pendingBalance || 0);

  const getMetricValue = (point: TimeSeriesPoint) => {
    const value = Number(point[metric]);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  };

  const isCountMetric = metric === 'clicks' || metric === 'orders';
  const dataMaxValue = Math.max(...timeSeries.map(getMetricValue), 1);
  const maxValue = isCountMetric ? Math.max(2, Math.ceil(dataMaxValue / 2) * 2) : dataMaxValue;
  const hasChartActivity = timeSeries.some((point) => getMetricValue(point) > 0);
  const chartMetricLabel = { clicks: 'lượt nhấp', orders: 'đơn hàng', revenue: 'doanh số', commission: 'hoa hồng đã duyệt' }[metric];
  const chartTicks = Array.from({ length: Math.min(7, timeSeries.length) }, (_, i) =>
    Math.round(i * (timeSeries.length - 1) / Math.max(1, Math.min(7, timeSeries.length) - 1)),
  );
  const formatChartValue = (value: number) => new Intl.NumberFormat('vi-VN', isCountMetric ? { maximumFractionDigits: 0 } : { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  const activeChartPoint = activeChartIndex === null ? undefined : timeSeries[activeChartIndex];
  const activeChartX = activeChartIndex === null ? 0 : (activeChartIndex + 0.5) / timeSeries.length * 100;
  const activeChartY = activeChartPoint ? 192 - getMetricValue(activeChartPoint) / maxValue * 168 : 0;

  useEffect(() => {
    setActiveChartIndex(null);
  }, [period, metric, timeSeries]);

  return (
    <section className="flex flex-col gap-3.5 w-full min-w-0 text-[#1A1612] text-left pb-12" aria-label="Tổng quan hiệu quả KOL">

      <section className="grid w-full grid-cols-1 sm:grid-cols-3 items-center gap-3 rounded-2xl border border-[#EAE4D7] bg-white p-3 sm:p-4 shadow-xs" aria-label="Bộ lọc và thao tác tổng quan KOL">
            <button
              type="button"
              className="inline-flex w-full min-h-[44px] items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-[#1A1612] text-xs font-bold transition-colors cursor-pointer shadow-xs"
              onClick={() => setCreateLinkOpen(true)}
            >
              <PlusCircle size={14} />
              <span>Tạo link tiếp thị</span>
            </button>
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="inline-flex w-full flex-col items-center justify-center gap-0.5 min-h-[44px] px-3 py-1.5 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#1A1612] text-xs font-semibold hover:border-[#C59B58] hover:bg-[#F3EFE6] transition-colors cursor-pointer"
              onClick={() => setWalletOpen(true)}
            >
              <span className="inline-flex items-center justify-center gap-1.5 leading-4">
                Quản lý ví
                <ArrowUpRight size={14} className="text-[#B88E4F]" aria-hidden="true" />
              </span>
            </button>
          </div>
            <div className="w-[180px] max-w-full justify-self-end">
              <Select
                portal
                className="w-full min-h-[44px] h-[44px] rounded-xl px-3 text-xs sm:text-xs"
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
      </section>

      {loadErrors.length > 0 && (
        <p role="alert" className="m-0 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs text-[#7D715E]">
          Không tải được {loadErrors.join(', ')}. Vui lòng thử lại bằng cách tải lại trang.
        </p>
      )}

      <div className="kol-overview-summary">
        <div className="kol-overview-summary-heading">
          <h2>Ví hiện tại</h2>
        </div>
        <section className="kol-overview-balances" aria-label="Số dư ví KOL" aria-busy={loading}>
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#7D715E] leading-relaxed">
              <Wallet size={15} className="text-[#B88E4F]" aria-hidden="true" />
              Số dư khả dụng
            </span>
            <strong className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight tabular-nums text-[#1A1612]">
              {loading || !wallet ? '—' : `${availBal.toLocaleString('vi-VN')} ₫`}
            </strong>
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs text-[#7D715E] leading-relaxed">
              <Clock size={14} className="text-[#B88E4F]" aria-hidden="true" />
              Chờ đối soát Escrow
            </span>
            <strong className="text-2xl sm:text-3xl font-semibold leading-tight tracking-tight tabular-nums text-[#1A1612]">
              {loading || !wallet ? '—' : `${pendingBal.toLocaleString('vi-VN')} ₫`}
            </strong>
          </div>
        </section>

        <div className="kol-overview-performance-heading"><h2>Hiệu quả tiếp thị</h2><span>{period} ngày gần nhất</span></div>

        {loading || !overview ? (
          <div className="border-t border-[#EAE4D7] px-4 py-5 text-xs text-[#7D715E]" role="status">
            {loading ? 'Đang tải chỉ số hiệu quả…' : 'Không tải được chỉ số hiệu quả.'}
          </div>
        ) : <div className="kol-overview-metrics" role="group" aria-label="Hiệu quả tiếp thị trong khoảng thời gian đã chọn">
          <DashboardMetric
            label="Lượt nhấp tiếp thị"
            icon={MousePointerClick}
            value={(metrics?.totalClicks || 0).toLocaleString('vi-VN')}
            growth={metrics?.growthClicks}
            note={`${metrics?.activeReferralLinks || 0} liên kết đang hoạt động · Hiện tại`}
          />
          <DashboardMetric
            label="Đơn hàng tiếp thị"
            icon={ShoppingBag}
            growth={metrics?.growthOrders}
            value={metrics?.totalOrders || 0}
            note={`${metrics?.completedOrders || 0} đơn đã giao / hoàn tất trong kỳ`}
          />
          <DashboardMetric
            label="Tỷ lệ chuyển đổi"
            icon={Target}
            value={`${(metrics?.conversionRate || 0).toFixed(2)}%`}
            note={`${metrics?.totalOrders || 0} đơn / ${metrics?.totalClicks || 0} lượt nhấp`}
          />
          <DashboardMetric
            label="Doanh số đơn đã giao / hoàn tất"
            icon={Wallet}
            growth={metrics?.growthRevenue}
            value={`${(metrics?.grossRevenue || 0).toLocaleString('vi-VN')} ₫`}
            note={<>
              <span className="block">Trung bình đơn đã giao: {(metrics?.averageOrderValue || 0).toLocaleString('vi-VN')} ₫</span>
              <span className="block">Hoa hồng đã duyệt: <strong className="text-[#B88E4F]">{(metrics?.totalCommission || 0).toLocaleString('vi-VN')} ₫</strong></span>
            </>}
          />
        </div>}
      </div>

      {/* Real Chart and Commission Activity */}
      <div className="kol-overview-details">
        {/* Biểu đồ diễn biến */}
        <div className="kol-overview-chart">
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

            <div className="w-[200px] max-w-full">
              <Select
                portal
                value={metric}
                onChange={(e) => setMetric(e.target.value as typeof metric)}
                aria-label="Chọn chỉ số biểu đồ"
              >
                <option value="clicks">Lượt nhấp tiếp thị</option>
                <option value="orders">Đơn hàng</option>
                <option value="revenue">Doanh số (₫)</option>
                <option value="commission">Hoa hồng đã duyệt (₫)</option>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 min-h-[220px] p-5 text-xs text-[#7D715E]" role="status">
              <RefreshCw size={20} className="animate-spin text-[#B88E4F]" aria-hidden="true" />
              <span>Đang tải dữ liệu biểu đồ…</span>
            </div>
          ) : loadErrors.includes('biểu đồ') ? (
            <div className="flex items-center justify-center min-h-[220px] text-xs text-[#7D715E]">Không tải được biểu đồ.</div>
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
              <div
                className="relative h-[192px] min-w-0"
                onPointerMove={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  const ratio = (event.clientX - bounds.left) / bounds.width;
                  setActiveChartIndex(Math.max(0, Math.min(timeSeries.length - 1, Math.floor(ratio * timeSeries.length))));
                }}
                onPointerLeave={() => setActiveChartIndex(null)}
                onPointerCancel={() => setActiveChartIndex(null)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setActiveChartIndex(null);
                }}
              >
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
                      <div
                        className="relative flex items-end justify-center h-[192px] min-w-0 group cursor-default focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#C59B58]"
                        key={d.date || idx}
                        tabIndex={0}
                        onFocus={() => setActiveChartIndex(idx)}
                        onBlur={() => setActiveChartIndex(null)}
                        aria-label={`${d.label}: ${formattedVal}`}
                        aria-describedby={activeChartIndex === idx ? 'kol-chart-tooltip' : undefined}
                      >
                        <div
                          className={`relative w-3/4 max-w-[36px] min-w-[2px] rounded-t transition-colors ${
                            val === 0 ? 'w-1.5 min-w-0 border-b-2 border-[#EAE4D7] bg-transparent' : activeChartIndex === idx ? 'bg-[#B88E4F]' : 'bg-[#C59B58]'
                          }`}
                          style={{ height: val ? `max(2px, calc(168px * ${val / maxValue}))` : 0 }}
                        >
                          {val > 0 && timeSeries.length <= 14 && (
                            <span className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 text-[10px] text-[#7D715E] font-medium whitespace-nowrap" aria-hidden="true">
                              {formatChartValue(val)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {activeChartPoint && (
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <div
                      id="kol-chart-tooltip"
                      role="tooltip"
                      className="absolute grid w-[176px] max-w-full gap-1 rounded-lg border border-[#EEDFC6] bg-white px-3 py-2 shadow-md text-xs"
                      style={{
                        left: `clamp(0px, calc(${activeChartX}% - 88px), max(0px, calc(100% - 176px)))`,
                        top: Math.max(0, activeChartY - 64),
                      }}
                    >
                      <span className="text-[#7D715E]">{activeChartPoint.label}</span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="capitalize">{chartMetricLabel}</span>
                        <strong className="text-[#B88E4F] tabular-nums">
                          {getMetricValue(activeChartPoint).toLocaleString('vi-VN')}{metric === 'revenue' || metric === 'commission' ? ' ₫' : ''}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
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
        <div className="kol-overview-ledger">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#EAE4D7]">
            <div className="flex items-center gap-2">
              <span className="grid place-items-center w-7 h-7 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
                <Wallet size={15} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[#1A1612] m-0">Biến động ví gần đây</h2>
                <p className="m-0 mt-0.5 text-[10px] text-[#7D715E]">Mới nhất · Không theo bộ lọc thời gian</p>
              </div>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#B88E4F] hover:text-[#1A1612] transition-colors cursor-pointer"
              onClick={() => navigate('/collaborator/wallet?tab=wallet&section=ledger')}
            >
              <span>Xem tất cả</span>
              <ArrowUpRight size={13} aria-hidden="true" />
            </button>
          </div>

          <div className="kol-overview-ledger-list">
            {loading || !ledger ? (
              <div className="py-6 text-center text-xs text-[#7D715E]" role="status">
                {loading ? 'Đang tải lịch sử ví…' : 'Không tải được lịch sử ví.'}
              </div>
            ) : ledger.entries.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#7D715E] leading-relaxed">
                Chưa có giao dịch ví nào.
              </div>
            ) : (
              ledger.entries.slice(0, 4).map((entry) => {
                const amount = Number(entry.amount);
                const isPositive = amount > 0;
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
                          : entry.transactionType === 'REVERSAL'
                          ? 'Điều chỉnh / thu hồi hoa hồng'
                          : entry.transactionType === 'PAYOUT_REJECT_REFUND'
                          ? 'Hoàn tiền yêu cầu rút bị từ chối'
                          : entry.transactionType}
                      </strong>
                      <span className="text-[10px] text-[#7D715E] leading-tight block">
                        {new Date(entry.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Ho_Chi_Minh',
                        })}
                      </span>
                    </div>
                    <strong
                      className={`text-xs sm:text-sm font-bold tabular-nums shrink-0 ${
                        isPositive ? 'text-[#B88E4F]' : 'text-[#7D715E]'
                      }`}
                    >
                      {amount > 0 ? '+' : amount < 0 ? '-' : ''}
                      {Math.abs(amount).toLocaleString('vi-VN')} ₫
                    </strong>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
      {createLinkOpen && (
        <Suspense fallback={<span role="status" className="text-xs text-[#7D715E]">Đang mở hộp tạo link…</span>}>
          <CreateReferralLink modalOnly onCreateClose={() => setCreateLinkOpen(false)} />
        </Suspense>
      )}
      {walletOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#231D15]/30 p-3 sm:p-5 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="dashboard-wallet-title" className="dashboard-wallet-modal flex max-h-[calc(100dvh-40px)] w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-2xl">
            <div className="dashboard-wallet-heading flex shrink-0 items-center justify-between gap-3 border-b border-[#EAE4D7] px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]"><Wallet size={18} /></span>
                <div><h2 id="dashboard-wallet-title" className="m-0 text-sm font-semibold text-[#1A1612]">Quản lý ví</h2><p className="m-0 mt-0.5 text-[11px] text-[#7D715E]">Số dư, tài khoản nhận tiền và lịch sử giao dịch</p></div>
              </div>
              <button type="button" aria-label="Đóng quản lý ví" disabled={walletBusy} onClick={() => { setWalletOpen(false); void loadData(); }} className="grid h-8 w-8 place-items-center rounded-lg text-[#7D715E] hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58] disabled:opacity-40 disabled:cursor-wait"><X size={18} /></button>
            </div>
            <div className="dashboard-wallet-content min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5">
              <Suspense fallback={<p role="status" className="text-xs text-[#7D715E]">Đang tải ví…</p>}>
                <DashboardWallet embedded onBusyChange={setWalletBusy} />
              </Suspense>
            </div>
          </div>
        </div>, document.body
      )}
    </section>
  );
}
