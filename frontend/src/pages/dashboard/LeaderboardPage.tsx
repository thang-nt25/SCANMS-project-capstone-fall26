import { useCallback, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Crown,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  RefreshCw,
  ChevronRight,
  Filter,
  X,
  Check,
  ArrowUpRight,
  ChevronDown,
} from 'lucide-react';
import { leaderboardService } from '../../services/leaderboard.service';
import type {
  LeaderboardFullResponse,
  LeaderboardItem,
  LeaderboardMetric,
  LeaderboardScope,
  LeaderboardTimeRange,
  CreatorHallOfFameProfile,
} from '../../services/leaderboard.service';
import { toast } from '../../utils/toast';
import api from '../../services/api';
import { authService } from '../../services/auth.service';
import './LeaderboardPage.css';

export default function LeaderboardPage({ alignToContainer = false }: { alignToContainer?: boolean } = {}) {
  const [data, setData] = useState<LeaderboardFullResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState('');
  const requestSequence = useRef(0);

  // Filters
  const [metric, setMetric] = useState<LeaderboardMetric>('REVENUE');
  const [timeRange, setTimeRange] = useState<LeaderboardTimeRange>('this_month');
  const [scope, setScope] = useState<LeaderboardScope>('GLOBAL');
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.role === 'SYSTEM_MANAGER';
  const canChangeScope = isAdmin || currentUser?.role === 'SHOP_MANAGER';

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    setStoresLoading(true);
    api.get('/stores/marketplace', { headers: { 'x-skip-cache': 'true' } }).then((response: any) => {
      const body = response?.data?.data || response?.data || response;
      const list = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [];
      if (!active) return;
      setStores(list.filter((store: any) => store?.id && store?.name).map((store: any) => ({ id: store.id, name: store.name })));
      setSelectedStoreId((current) => current || list[0]?.id || '');
    }).catch((error: any) => {
      if (active) toast.error(error?.message || 'Không tải được danh sách gian hàng.');
    }).finally(() => { if (active) setStoresLoading(false); });
    return () => { active = false; };
  }, [isAdmin]);

  // Creator Modal
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<CreatorHallOfFameProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);

  const fetchLeaderboard = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (scope === 'STORE' && isAdmin && !selectedStoreId) {
      setLoadError(stores.length ? 'Vui lòng chọn gian hàng để xem bảng xếp hạng.' : 'Chưa có gian hàng khả dụng để lọc.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setLoadError('');
      const res = await leaderboardService.getLeaderboard({
        metric,
        timeRange,
        scope,
        ...(scope === 'STORE' && isAdmin ? { storeId: selectedStoreId } : {}),
        limit: 20,
      });
      if (requestId !== requestSequence.current) return;
      setData(res);
    } catch (err: any) {
      if (requestId !== requestSequence.current) return;
      setLoadError(err?.message || 'Không tải được bảng xếp hạng.');
      toast.error(err?.message || 'Không tải được bảng xếp hạng.');
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [isAdmin, metric, scope, selectedStoreId, stores.length, timeRange]);

  useEffect(() => {
    void fetchLeaderboard();
    return () => { requestSequence.current += 1; };
  }, [fetchLeaderboard]);

  const handleOpenCreatorModal = async (creatorId: string) => {
    try {
      setSelectedCreatorId(creatorId);
      setLoadingProfile(true);
      const profile = await leaderboardService.getCreatorProfile(creatorId);
      setCreatorProfile(profile);
    } catch (err) {
      console.error('Lỗi khi tải hồ sơ creator:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedCreatorId(null);
    setCreatorProfile(null);
  };

  const formatVND = (val?: number) => {
    if (val === undefined || val === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const formatNumber = (val?: number) => {
    if (val === undefined || val === null) return '0';
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const metricLabels: Record<LeaderboardMetric, string> = {
    REVENUE: 'Doanh thu',
    ORDERS: 'Đơn hàng',
    CONVERSION_RATE: 'Tỷ lệ chốt',
    COMMISSION: 'Hoa hồng đã duyệt',
  };
  const formatMetricValue = (item?: LeaderboardItem | null) => {
    if (!item) return 'Chưa có dữ liệu';
    switch (metric) {
      case 'ORDERS': return `${formatNumber(item.totalOrders)} đơn`;
      case 'CONVERSION_RATE': return `${formatNumber(item.conversionRate)}%`;
      case 'COMMISSION': return formatVND(item.totalCommission);
      case 'REVENUE':
      default: return formatVND(item.grossRevenue);
    }
  };

  const podium = data?.podium;
  const rankings = data?.rankings || [];
  const myRank = data?.myRankStatus;

  const timeOptions: { value: LeaderboardTimeRange; label: string }[] = [
    { value: 'this_month', label: 'Tháng này' },
    { value: 'last_month', label: 'Tháng trước' },
    { value: 'this_quarter', label: 'Quý này' },
    { value: 'all_time', label: 'Toàn thời gian' },
  ];
  const podiumEntries = [
    { slot: 2, creator: podium?.rank2 },
    { slot: 1, creator: podium?.rank1 },
    { slot: 3, creator: podium?.rank3 },
  ].filter((entry): entry is { slot: number; creator: LeaderboardItem } => Boolean(entry.creator));
  const scopeLabel = scope === 'GLOBAL' ? 'Toàn sàn' : isAdmin
    ? (stores.find(store => store.id === selectedStoreId)?.name || 'Gian hàng')
    : 'Gian hàng của bạn';

  return (
    <div className={`leaderboard-page leaderboard-redesign ${alignToContainer ? 'leaderboard-flush' : ''}`}>
      <section className="lb-panel lb-filters" aria-labelledby="lb-title">
        <header className="lb-filter-heading">
          <div className="lb-heading">
            <span className="lb-heading-icon"><Trophy aria-hidden="true" /></span>
            <div><h1 id="lb-title">Bảng vinh danh Top Creator</h1><p>{data?.periodLabel || timeOptions.find(option => option.value === timeRange)?.label} · {scopeLabel}</p></div>
          </div>
          <button type="button" onClick={fetchLeaderboard} disabled={loading} className="lb-refresh" title="Làm mới bảng xếp hạng">
            <RefreshCw aria-hidden="true" className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Đang cập nhật' : 'Làm mới'}</span>
          </button>
        </header>
        <div className="lb-filter-grid">
          <div className="lb-filter-field">
            <div className="lb-segments lb-periods" role="group" aria-label="Khoảng thời gian xếp hạng">
              {timeOptions.map(option => <button key={option.value} type="button" aria-pressed={timeRange === option.value} onClick={() => setTimeRange(option.value)}>{option.label}</button>)}
            </div>
          </div>
          <div className="lb-filter-field lb-metric-field">
            <label className="lb-label" htmlFor="lb-metric-select"><Filter aria-hidden="true" /> Xếp hạng theo</label>
            <div className="lb-metric-select">
              <select id="lb-metric-select" value={metric} onChange={event => setMetric(event.target.value as LeaderboardMetric)}>
                {Object.entries(metricLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <ChevronDown aria-hidden="true" />
            </div>
          </div>
        </div>
        {canChangeScope && (
          <div className="lb-scope">
            <button type="button" aria-pressed={scope === 'STORE'} onClick={() => setScope(scope === 'GLOBAL' ? 'STORE' : 'GLOBAL')}>
              <Shield aria-hidden="true" /><span>{scope === 'GLOBAL' ? 'Toàn sàn SCANMS' : isAdmin ? 'Theo gian hàng' : 'Gian hàng của tôi'}</span>
            </button>
            {scope === 'STORE' && isAdmin && (
              <select aria-label="Chọn gian hàng để xếp hạng" value={selectedStoreId} onChange={event => setSelectedStoreId(event.target.value)} disabled={!stores.length}>
                {stores.length ? stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>) : <option value="">{storesLoading ? 'Đang tải gian hàng…' : 'Không có gian hàng'}</option>}
              </select>
            )}
          </div>
        )}
        {loading && <span className="lb-sr-only" role="status" aria-live="polite">Đang cập nhật bảng xếp hạng…</span>}
        <details className="lb-method-note">
          <summary>Cách xếp hạng<ChevronDown aria-hidden="true" /></summary>
          <p>Chỉ xếp hạng khi tiêu chí đã chọn lớn hơn 0. Doanh số và đơn hàng ghi nhận theo ngày giao thành công, hoặc ngày hoàn tất nếu thiếu ngày giao (giờ Việt Nam). Cùng doanh số thì xét số đơn; các tiêu chí khác dùng doanh số làm tiêu chí phụ. Cùng cả hai tiêu chí sẽ đồng hạng.</p>
        </details>
      </section>

      {loadError && <div role="alert" className="lb-error">{loadError}</div>}

      {loading ? <div className="lb-panel lb-podium-state" role="status">Đang tải bảng vinh danh…</div>
        : loadError ? null : !podiumEntries.length ? <div className="lb-panel lb-podium-state"><Trophy aria-hidden="true" /><h2>Chưa có Creator đủ điều kiện vinh danh</h2><p>Kỳ này chưa có kết quả theo tiêu chí {metricLabels[metric].toLowerCase()}. Chọn khoảng thời gian khác để xem thành tích.</p>{timeRange === 'this_month' && <button type="button" className="lb-empty-action" onClick={() => setTimeRange('last_month')}>Xem tháng trước<ArrowUpRight aria-hidden="true" /></button>}</div>
        : <div className="leaderboard-podium" aria-label="Các nhà sáng tạo dẫn đầu">
        {podiumEntries.map(({ slot, creator }) => {
          const rank = creator.rank;
          return <article key={creator.collaboratorId} data-podium-rank={slot} data-current={creator?.isCurrentUser || undefined}
            className={`lb-creator-card ${rank === 1 ? 'lb-creator-first' : ''}`}
          >
            <button className="lb-creator-identity" type="button" disabled={!creator}
              aria-label={creator ? `Xem hồ sơ ${creator.fullName}` : 'Hồ sơ chưa có dữ liệu'}
              onClick={() => creator && handleOpenCreatorModal(creator.collaboratorId)}
            >
              <span className="lb-avatar" aria-hidden="true">
                {creator?.fullName?.charAt(0) || rank}
                {creator?.avatarUrl && <img src={creator.avatarUrl} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}
              </span>
              <span className="lb-identity-copy">
                <span className="lb-creator-name">{creator?.fullName || (loading && !data ? 'Đang tải KOL…' : rank === 1 ? 'Chưa có Quán Quân' : 'Chưa có đối tác')}</span>
                <span className="lb-creator-tier">{creator.tierName}</span>
                <span className="lb-creator-badges">
                  <span className="lb-rank"><Crown aria-hidden="true" className={rank === 1 ? '' : 'lb-hidden-crown'} /> Hạng {rank}</span>
                  {creator?.isCurrentUser && <span className="lb-you">Bạn</span>}
                </span>
              </span>
            </button>
            <div className="lb-creator-metric">
              <span>{metric === 'REVENUE' ? 'Doanh số GMV' : metricLabels[metric]}</span>
              <div className="lb-creator-value">
                <strong>{formatMetricValue(creator)}</strong>
                {rank === 1 && <span>{formatNumber(creator?.totalOrders)} đơn đã giao / hoàn tất</span>}
              </div>
            </div>
            <details className="lb-creator-details">
              <summary><span>Chi tiết thành tích</span><ChevronDown aria-hidden="true" /></summary>
              <div className="lb-creator-details-content">
                {creator.primaryChannelHandle && <span className="lb-creator-handle" title={creator.primaryChannelHandle}>{creator.primaryChannelHandle}</span>}
                <div className="lb-creator-stats">
                  <span><strong>{formatNumber(creator?.totalOrders)}</strong> đơn</span>
                  {rank === 1 && <span><strong>{formatNumber(creator?.totalClicks)}</strong> clicks</span>}
                  <span><strong>{formatNumber(creator?.conversionRate)}%</strong> CR</span>
                </div>
              </div>
            </details>
          </article>;
        })}
      </div>}

      {(loading || loadError || rankings.length > 0) && <section className="leaderboard-rankings lb-panel" aria-labelledby="lb-ranking-title">
        <header className="leaderboard-rankings-header">
          <div className="lb-heading">
            <span className="lb-heading-icon"><Award aria-hidden="true" /></span>
            <div><h2 id="lb-ranking-title">Bảng xếp hạng Creator</h2><p>Các Creator tiếp theo trong tối đa 20 kết quả dẫn đầu.</p></div>
          </div>
          <span className="lb-table-context">{metricLabels[metric]} · {scopeLabel}</span>
        </header>
        <div className="lb-table-scroll" role="region" aria-label="Danh sách Creator tiếp theo" tabIndex={0}>
          <table>
            <thead><tr>
              <th scope="col" className="lb-center">Hạng</th><th scope="col">Creator / Đối tác</th><th scope="col">Cấp bậc</th>
              <th scope="col" className="lb-number">Lượt click</th><th scope="col" className="lb-number" data-active={metric === 'ORDERS' || undefined}>Đơn hàng</th>
              <th scope="col" className="lb-number" data-active={metric === 'CONVERSION_RATE' || undefined}>Tỷ lệ chốt</th>
              <th scope="col" className="lb-number" data-active={metric === 'REVENUE' || undefined}>Doanh số GMV</th>
              <th scope="col" className="lb-number" data-active={metric === 'COMMISSION' || undefined}>Hoa hồng đã duyệt</th><th scope="col" className="lb-center">Hồ sơ</th>
            </tr></thead>
            <tbody>
              {loading || loadError || !rankings.length ? <tr><td colSpan={9} className="lb-empty">{loading ? 'Đang tải danh sách KOL…' : loadError ? 'Chưa tải được danh sách. Vui lòng làm mới.' : 'Chưa có thêm Creator đủ điều kiện trong kỳ này.'}</td></tr> : rankings.map(item => (
                <tr key={item.collaboratorId} data-current={item.isCurrentUser || undefined}>
                  <td className="lb-center">
                    <div className="lb-rank-cell"><strong>#{item.rank < 10 ? `0${item.rank}` : item.rank}</strong>
                      {metric === 'REVENUE' && (item.rankDelta > 0
                        ? <span className="lb-rank-up" title={`Tăng ${item.rankDelta} bậc`}><TrendingUp aria-hidden="true" />{item.rankDelta}</span>
                        : item.rankDelta < 0 ? <span className="lb-rank-down" title={`Giảm ${Math.abs(item.rankDelta)} bậc`}><TrendingDown aria-hidden="true" />{Math.abs(item.rankDelta)}</span>
                        : <Minus className="lb-rank-unchanged" aria-label="Không đổi hạng" />)}
                    </div>
                  </td>
                  <td><div className="lb-table-creator">
                    <span className="lb-avatar" aria-hidden="true">{item.fullName?.charAt(0) || 'K'}{item.avatarUrl && <img src={item.avatarUrl} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}</span>
                    <div><div className="lb-table-name"><strong>{item.fullName}</strong>{item.isCurrentUser && <span className="lb-you">Bạn</span>}</div><p title={item.primaryChannelHandle || undefined}>{item.primaryChannelHandle || 'Chưa cập nhật kênh'}</p></div>
                  </div></td>
                  <td><span className="lb-tier">{item.tierName}</span></td>
                  <td className="lb-number">{formatNumber(item.totalClicks)}</td>
                  <td className="lb-number" data-active={metric === 'ORDERS' || undefined}>{formatNumber(item.totalOrders)} đơn</td>
                  <td className="lb-number" data-active={metric === 'CONVERSION_RATE' || undefined}>{formatNumber(item.conversionRate)}%</td>
                  <td className="lb-number" data-active={metric === 'REVENUE' || undefined}>{formatVND(item.grossRevenue)}</td>
                  <td className="lb-number" data-active={metric === 'COMMISSION' || undefined}>{formatVND(item.totalCommission)}</td>
                  <td className="lb-center"><button className="lb-profile-button" onClick={() => handleOpenCreatorModal(item.collaboratorId)}>Xem <ChevronRight aria-hidden="true" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}

      {!loading && !loadError && myRank && (
        <section className="leaderboard-my-rank lb-panel" aria-label="Vị trí của bạn trên bảng xếp hạng">
          <div className="lb-my-rank-identity">
            <span className="lb-my-rank-number">{myRank.myRank === null ? <Award aria-hidden="true" /> : `#${myRank.myRank}`}</span>
            <div>
              <div className="lb-my-rank-title"><h2>{myRank.myRank === null ? 'Bạn chưa được xếp hạng trong kỳ' : `Hạng của bạn theo ${metricLabels[metric]}`}</h2>
                {metric === 'REVENUE' && myRank.rankDelta > 0 && <span className="lb-rank-up"><TrendingUp aria-hidden="true" /> Tăng {myRank.rankDelta} bậc</span>}
              </div>
              <p>{myRank.currentPeriodLabel} · {metricLabels[metric]} hiện tại: <strong>{metric === 'REVENUE' ? formatVND(myRank.myRevenue) : metric === 'ORDERS' ? `${formatNumber(myRank.myOrders)} đơn` : metric === 'CONVERSION_RATE' ? `${formatNumber(myRank.myConversionRate)}%` : formatVND(myRank.myCommission)}</strong></p>
            </div>
          </div>
          <div className="leaderboard-my-rank-actions">
            {metric === 'REVENUE' && myRank.myRank !== null && (myRank.myRank > 10
              ? <div className="lb-top-gap"><span>Chênh lệch doanh số với Top 10</span><strong>{formatVND(myRank.gapToTop10Revenue)}</strong></div>
              : <span className="lb-top-ten"><Check aria-hidden="true" /> Đang trong Top 10</span>)}
            {currentUser?.role === 'COLLABORATOR' ? <Link className="lb-race-button" to="/collaborator/marketing">Tạo link tiếp thị<ArrowUpRight aria-hidden="true" /></Link>
              : <button className="lb-race-button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Xem bộ lọc<ArrowUpRight aria-hidden="true" /></button>}
          </div>
        </section>
      )}

      {/* ─── 5. MODAL HỒ SƠ VINH DANH CREATOR (CREATOR HALL OF FAME) ─────── */}
      {selectedCreatorId && createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="creator-hall-profile-title" className="creator-hall-overlay fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="creator-hall-modal bg-white border border-[#EAE4D7] rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAE4D7] pb-4">
              <div className="flex items-center space-x-2">
                <Trophy className="w-6 h-6 text-[#8F682E]" />
                <h3 id="creator-hall-profile-title" className="text-lg font-bold text-[#1A1612]">Hồ sơ vinh danh Creator</h3>
              </div>
              <button
                onClick={handleCloseModal}
                aria-label="Đóng hồ sơ Creator"
                className="p-1.5 rounded-xl text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingProfile || !creatorProfile ? (
              <div className="py-12 text-center text-[#7D715E] space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#8F682E]" />
                <p className="text-xs">Đang tải hồ sơ thành tích...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Creator Header Info */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                  <div className="w-20 h-20 rounded-full bg-[#FBF5EB] border border-[#EEDFC6] p-1 flex-shrink-0 shadow-lg">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl font-bold text-[#8F682E] overflow-hidden">
                      {creatorProfile.avatarUrl ? (
                        <img src={creatorProfile.avatarUrl} alt={creatorProfile.fullName} className="w-full h-full object-cover" />
                      ) : (
                        creatorProfile.fullName?.charAt(0)
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h4 className="text-xl font-extrabold text-[#1A1612]">{creatorProfile.fullName}</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">
                        {creatorProfile.tierName}
                      </span>
                    </div>
                    <p className="text-xs text-[#7D715E]">{creatorProfile.bio}</p>
                    <p className="text-xs text-[#7D715E]">{creatorProfile.email}</p>
                  </div>
                </div>

                {/* Lifetime Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] text-center">
                    <span className="text-[11px] text-[#7D715E]">Tổng Đơn Hàng</span>
                    <div className="text-base font-bold text-[#1A1612]">{formatNumber(creatorProfile.lifetimeStats.totalOrders)}</div>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] text-center">
                    <span className="text-[11px] text-[#7D715E]">Tổng Doanh Thu</span>
                    <div className="text-base font-bold text-[#8F682E]">{formatVND(creatorProfile.lifetimeStats.totalRevenue)}</div>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] text-center">
                    <span className="text-[11px] text-[#7D715E]">Tổng Hoa Hồng</span>
                    <div className="text-base font-bold text-[#8F682E]">{formatVND(creatorProfile.lifetimeStats.totalCommission)}</div>
                  </div>
                  <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#EAE4D7] text-center">
                    <span className="text-[11px] text-[#7D715E]">Mẫu Thử Đã Nhận</span>
                    <div className="text-base font-bold text-[#1A1612]">{creatorProfile.lifetimeStats.totalSamplesReceived} mẫu</div>
                  </div>
                </div>

                {/* Badges */}
                {creatorProfile.badges.length > 0 && <div className="space-y-2">
                  <h5 className="text-xs font-bold text-[#7D715E] uppercase tracking-wider">Huy Hiệu Danh Dự</h5>
                  <div className="flex flex-wrap gap-2">
                    {creatorProfile.badges.map((b) => (
                      <span
                        key={b.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6] flex items-center space-x-1.5"
                      >
                        <Award className="w-3.5 h-3.5 text-[#8F682E]" />
                        <span>{b.name}</span>
                      </span>
                    ))}
                  </div>
                </div>}

                {/* Social Channels */}
                {creatorProfile.socialChannels.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-[#7D715E] uppercase tracking-wider">Kênh Mạng Xã Hội</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {creatorProfile.socialChannels.map((s, idx) => (
                        <div key={idx} className="p-2.5 bg-[#FAF8F5] rounded-xl border border-[#EAE4D7] flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-[#1A1612]">{s.platform}</span>
                            <p className="text-[#7D715E] text-[11px]">{s.channelName ? `@${s.channelName}` : 'Chưa đặt tên'}</p>
                          </div>
                          <span className="text-[#7D715E] font-medium">{formatNumber(s.followerCount)} theo dõi</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-[#EAE4D7]">
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-[#F3EFE6] hover:bg-[#F3EFE6] text-[#7D715E] text-xs font-semibold rounded-xl transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
