import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
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
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import './KolDashboardPage.css';

function DashboardMetric({ label, value, note, growth, icon: Icon }: {
  label: string;
  value: ReactNode;
  note: ReactNode;
  growth?: number;
  icon: LucideIcon;
}) {
  return (
    <Card className="kd-metric-card">
      <div className="kd-metric-top">
        <span className="kd-metric-label">{label}</span>
        {growth !== undefined && (
          <span title="So với kỳ trước" className={`kd-growth ${growth > 0 ? 'is-positive' : growth < 0 ? 'is-negative' : 'is-neutral'}`}>
            {growth !== 0 && <TrendingUp size={12} aria-hidden="true" />}
            {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="kd-metric-main">
        <span className="kd-icon"><Icon aria-hidden="true" /></span>
        <strong className="kd-metric-value">{value}</strong>
      </div>
      <span className="kd-metric-note">{note}</span>
    </Card>
  );
}

export default function KolDashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('7');
  const [metric, setMetric] = useState<'clicks' | 'orders' | 'revenue' | 'commission'>('clicks');
  const [loading, setLoading] = useState(true);

  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerHistory | null>(null);
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [tierStatus, setTierStatus] = useState<TierStatus | null>(null);
  const requestSequence = useRef(0);

  const loadData = async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const days = Number(period) || 7;
      const endDate = new Date();
      const startDate = new Date(endDate);
      // The analytics API groups daily points by UTC date. Request exactly N buckets.
      startDate.setUTCHours(0, 0, 0, 0);
      startDate.setUTCDate(startDate.getUTCDate() - days + 1);
      const query = { range: 'custom', days, startDate: startDate.toISOString(), endDate: endDate.toISOString() };
      const [walletData, ledgerData, overviewData, seriesData, tierData] = await Promise.all([
        walletService.getMyWallet().catch(() => null),
        walletService.getMyLedger(1).catch(() => null),
        analyticsService.getRealtimeOverview(query).catch(() => null),
        analyticsService.getTimeSeries({ ...query, interval: 'daily' }).catch(() => []),
        tierService.getMyTierStatus().catch(() => null),
      ]);

      if (requestId !== requestSequence.current) return;
      setWallet(walletData);
      setLedger(ledgerData);
      setOverview(overviewData);
      setTimeSeries(Array.isArray(seriesData) ? seriesData : []);
      setTierStatus(tierData);
    } catch (err) {
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
  const availBal = Number(wallet?.availableBalance || 0);
  const pendingBal = Number(wallet?.pendingBalance || 0);

  // Compute max value for chart scaling based on selected metric
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
    <section className="kol-dashboard" aria-label="Tổng quan hiệu quả KOL">
      <div className="kd-filter-bar">
        <div className="kd-period-control">
          <label htmlFor="kol-dashboard-period"><Calendar size={14} aria-hidden="true" />Thời gian phân tích</label>
          <div className="kd-period-select">
            <Select id="kol-dashboard-period" value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Khoảng thời gian phân tích">
              <option value="7">7 ngày gần nhất</option>
              <option value="30">30 ngày gần nhất</option>
              <option value="90">90 ngày gần nhất</option>
            </Select>
          </div>
        </div>
        <div className="kd-filter-actions">
          <span className="kd-date-range">
            {overview?.period
              ? `Dữ liệu: ${new Date(overview.period.startDate).toLocaleDateString('vi-VN')} – ${new Date(overview.period.endDate).toLocaleDateString('vi-VN')}`
              : 'Dữ liệu thực tế từ ví & giao dịch sàn'}
          </span>
          <button type="button" className="kd-button" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" />Làm mới
          </button>
          <button type="button" className="kd-button kd-create-link" onClick={() => navigate('/collaborator/referral-links')}>
            <PlusCircle size={14} aria-hidden="true" />Tạo link tiếp thị
          </button>
        </div>
      </div>
      <div className="kd-summary-panel">
        <section className="kd-balance" aria-label="Số dư ví KOL" aria-busy={loading}>
          <div className="kd-available">
            <span className="kd-label"><Wallet size={15} aria-hidden="true" />Số dư khả dụng</span>
            <strong>{availBal.toLocaleString('vi-VN')} ₫</strong>
          </div>
          <div className="kd-pending">
            <span className="kd-label"><Clock size={14} aria-hidden="true" />Chờ đối soát Escrow</span>
            <strong>{pendingBal.toLocaleString('vi-VN')} ₫</strong>
          </div>
          <div className="kd-wallet-actions">
            <button type="button" className="kd-button kd-wallet-link" onClick={() => navigate('/collaborator/wallet')}>
              Quản lý ví <ArrowUpRight size={14} aria-hidden="true" />
            </button>
            <span className="kd-kyc" data-verified={wallet?.kycStatus === 'VERIFIED'}>
              <ShieldCheck size={13} aria-hidden="true" />{wallet?.kycStatus === 'VERIFIED' ? 'KYC đã xác thực' : 'Chưa xác thực KYC'}
            </span>
          </div>
        </section>

        <div className="kd-metrics" role="group" aria-label="Hiệu quả tiếp thị trong khoảng thời gian đã chọn">
          <DashboardMetric label="Lượt nhấp tiếp thị" icon={MousePointerClick}
            value={(metrics?.totalClicks || 0).toLocaleString('vi-VN')} growth={metrics?.growthClicks}
            note={`${metrics?.activeReferralLinks || 0} liên kết đang có lượt xem`} />
          <DashboardMetric label="Đơn hàng thành công" icon={ShoppingBag} growth={metrics?.growthOrders}
            value={<>{metrics?.completedOrders || 0}<span> / {metrics?.totalOrders || 0} đơn</span></>}
            note={`Chu kỳ ${period} ngày gần nhất`} />
          <DashboardMetric label="Tỷ lệ chuyển đổi" icon={Target}
            value={`${(metrics?.conversionRate || 0).toFixed(2)}%`}
            note={`Trung bình đơn: ${(metrics?.averageOrderValue || 0).toLocaleString('vi-VN')} ₫`} />
          <DashboardMetric label="Doanh số tiếp thị (GMV)" icon={Wallet} growth={metrics?.growthRevenue}
            value={`${(metrics?.grossRevenue || 0).toLocaleString('vi-VN')} ₫`}
            note={<>Hoa hồng: <strong className="text-[#B88E4F]">{(metrics?.totalCommission || 0).toLocaleString('vi-VN')} ₫</strong></>} />
        </div>
      </div>

      {/* Real Chart and Commission Activity */}
      <div className="kd-details-grid">
        {/* Biểu đồ diễn biến */}
        <Card className="kol-daily-card kd-chart-card">
          <div className="kd-card-heading">
            <div className="kd-card-title">
              <div className="kd-icon">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2>Hiệu quả theo ngày</h2>
                <p>Theo dõi biến động trong {period} ngày gần nhất</p>
              </div>
            </div>

            <div className="kd-chart-select">
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
            <div className="kd-chart-state" role="status"><RefreshCw size={20} className="animate-spin" aria-hidden="true" /><span>Đang tải dữ liệu biểu đồ…</span></div>
          ) : timeSeries.length === 0 ? (
            <div className="kd-chart-state">
              <BarChart3 className="w-8 h-8 text-[#EAE4D7] mb-2" />
              Chưa có dữ liệu giao dịch trong chu kỳ được chọn.
            </div>
          ) : (
            <div className="kol-daily-chart" data-empty={!hasChartActivity || undefined} role="group" aria-label={`Biểu đồ ${metric === 'clicks' ? 'lượt nhấp' : metric === 'orders' ? 'đơn hàng' : metric === 'revenue' ? 'doanh số' : 'hoa hồng'} theo ngày`}>
              <div className="kol-chart-y-axis" aria-hidden="true"><span>{formatChartValue(maxValue)}</span><span>{formatChartValue(maxValue / 2)}</span><span>0</span></div>
              <div className="kol-chart-plot">
                <div className="kol-chart-grid" aria-hidden="true"><i /><i /><i /></div>
                {!hasChartActivity && (
                  <div className="kd-chart-zero-state">
                    <span className="kd-chart-empty-icon"><BarChart3 size={20} aria-hidden="true" /></span>
                    <strong>Chưa phát sinh {chartMetricLabel} trong kỳ này</strong>
                    <span>Dữ liệu sẽ hiển thị khi có hoạt động tiếp thị.</span>
                  </div>
                )}
                <div className="kol-chart-bars" style={{ gridTemplateColumns: `repeat(${timeSeries.length}, minmax(0, 1fr))` }}>
                  {timeSeries.map((d, idx) => {
                    const val = getMetricValue(d);
                    const formattedVal = `${val.toLocaleString('vi-VN')}${metric === 'revenue' || metric === 'commission' ? ' ₫' : ''}`;
                    return <div className="kol-chart-column" key={d.date || idx} tabIndex={0} aria-label={`${d.label}: ${formattedVal}`}>
                      <div className="kol-chart-bar" data-zero={val === 0 || undefined} style={{ height: val ? `max(2px, calc(var(--kd-chart-height, 168px) * ${val / maxValue}))` : 0 }}>
                        {val > 0 && timeSeries.length <= 14 && <span className="kol-chart-value" aria-hidden="true">{formatChartValue(val)}</span>}
                      </div>
                      <span className="kol-chart-tooltip" role="tooltip">{d.label}: {formattedVal}</span>
                    </div>;
                  })}
                </div>
              </div>
              <div className="kol-chart-dates" aria-hidden="true">
                {chartTicks.map((index, i) => <span key={index} data-tick={i} style={{ left: `${(index + .5) / timeSeries.length * 100}%` }}>{timeSeries[index].label}</span>)}
              </div>
              {(metric === 'revenue' || metric === 'commission') && <span className="kol-chart-unit">Đơn vị: VND</span>}
            </div>
          )}
        </Card>

        {/* Lịch sử hoa hồng từ Ledger */}
        <Card className="kd-activity-card">
          <div className="kd-card-heading">
            <div className="kd-card-title"><span className="kd-icon"><Wallet size={16} aria-hidden="true" /></span><h2>Hoa hồng gần đây</h2></div>
            <button
              type="button"
              className="kd-text-link"
              onClick={() => navigate('/collaborator/wallet')}
            >
              Xem tất cả <ArrowUpRight size={13} aria-hidden="true" />
            </button>
          </div>

          <div className="kd-activity-list">
            {!ledger?.entries || ledger.entries.length === 0 ? (
              <div className="kd-activity-empty">
                Chưa có phát sinh hoa hồng nào. Khi khách mua qua link tiếp thị của bạn, tiền hoa hồng sẽ hiển thị tại đây!
              </div>
            ) : (
              ledger.entries.slice(0, 4).map((entry) => {
                const isPositive = entry.balanceBucket === 'AVAILABLE' || entry.transactionType.includes('COMMISSION');
                return (
                  <div
                    key={entry.id}
                    className="kd-activity-row"
                  >
                    <span className="kd-activity-icon" aria-hidden="true">
                      {isPositive ? <PlusCircle size={15} /> : <ArrowUpRight size={15} />}
                    </span>
                    <div>
                      <strong className="text-xs font-bold text-[#1A1612] block">
                        {entry.transactionType === 'COMMISSION_PENDING'
                          ? 'Hoa hồng chờ duyệt'
                          : entry.transactionType === 'COMMISSION_APPROVED'
                          ? 'Hoa hồng khả dụng'
                          : entry.transactionType === 'PAYOUT_WITHDRAW'
                          ? 'Rút tiền về ngân hàng'
                          : entry.transactionType}
                      </strong>
                      <span className="kd-metric-note">
                        {new Date(entry.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <strong
                      className={`text-sm font-extrabold ${
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
          <div className="kd-tier">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#B88E4F] shrink-0" />
              <strong className="text-xs font-bold text-[#1A1612]">
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
                  doanh số tháng này để thăng hạng {tierStatus.nextTier.name}!
                </>
              ) : (
                'Tích cực chia sẻ link tiếp thị để gia tăng hoa hồng và mở khóa đặc quyền tài khoản!'
              )}
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}
