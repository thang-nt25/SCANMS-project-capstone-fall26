import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Trophy, Award, Target, ArrowUpRight, Gift, ShoppingBag, TrendingUp, Check } from 'lucide-react';
import { tierService, type TierStatus, type TierPolicy } from '../../services/tier.service';
import { leaderboardService, type LeaderboardPodium } from '../../services/leaderboard.service';
import LeaderboardPage from '../dashboard/LeaderboardPage';
import KolBonusProgressPage from './KolBonusProgressPage';
import './KolProfile.css';
import './KolTierStatusPage.css';
import './CreatorRewards.css';

const currency = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
const samePolicy = (left: TierPolicy, right: TierPolicy) =>
  left.id === right.id || (
    left.name.trim().toLowerCase() === right.name.trim().toLowerCase() &&
    Number(left.minRevenueThreshold) === Number(right.minRevenueThreshold) &&
    Number(left.extraBonusPercentage) === Number(right.extraBonusPercentage)
  );

export default function KolTierStatusPage({ view = 'tiers' }: { view?: 'tiers' | 'leaderboard' | 'bonus' } = {}) {
  const [tierStatus, setTierStatus] = useState<TierStatus | null>(null);
  const [podium, setPodium] = useState<LeaderboardPodium | null>(null);
  const [tierPolicies, setTierPolicies] = useState<TierPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusError, setStatusError] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const [podiumError, setPodiumError] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);

  useEffect(() => {
    if (view !== 'tiers') return;
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      const [status, policies, podiumData] = await Promise.allSettled([
        tierService.getMyTierStatus(),
        tierService.getAllTiers(),
        leaderboardService.getPodium({ metric: 'REVENUE', timeRange: 'this_month' }),
      ]);
      if (cancelled) return;
      setTierStatus(status.status === 'fulfilled' ? status.value : null);
      setTierPolicies(policies.status === 'fulfilled' ? policies.value : []);
      setPodium(podiumData.status === 'fulfilled' ? podiumData.value : null);
      setStatusError(status.status === 'rejected');
      setPolicyError(policies.status === 'rejected');
      setPodiumError(podiumData.status === 'rejected');
      setLoading(false);
    };
    void loadData();
    return () => { cancelled = true; };
  }, [view, loadRevision]);

  const currentTier = tierStatus?.currentTier;
  const currentRevenue = Number(tierStatus?.currentRevenue || 0);
  const totalOrders = Number(tierStatus?.totalOrders || 0);
  const nextTier = tierStatus?.nextTier;
  const targetSales = Number(nextTier?.minRevenueThreshold || 0);
  const progressPct = Number(tierStatus?.progressPercentage ?? 0);
  const podiumEntries = [
    { slot: 2, creator: podium?.rank2 },
    { slot: 1, creator: podium?.rank1 },
    { slot: 3, creator: podium?.rank3 },
  ].filter(entry => entry.creator);
  const retry = () => setLoadRevision(revision => revision + 1);

  return (
    <div className="kol-tier-page tier-overview creator-rewards">
      <nav className="kol-tier-nav tier-section-nav" aria-label="Cấp bậc và vinh danh">
        <Link to="/collaborator/tiers" aria-current={view === 'tiers' ? 'page' : undefined}>
          <Award aria-hidden="true" /><span>Cấp bậc &amp; Quyền lợi</span>
        </Link>
        <Link to="/collaborator/leaderboard" aria-current={view === 'leaderboard' ? 'page' : undefined}>
          <Trophy aria-hidden="true" /><span>Bảng vinh danh Top Creator</span>
        </Link>
        <Link to="/collaborator/bonus-progress" aria-current={view === 'bonus' ? 'page' : undefined}>
          <Target aria-hidden="true" /><span>Tiến độ thưởng doanh số</span>
        </Link>
      </nav>

      {view === 'leaderboard' ? <LeaderboardPage alignToContainer /> : view === 'bonus' ? <KolBonusProgressPage embedded /> : (
        <div className="tier-dashboard-layout">
          {loading ? <section className="tier-panel tier-current tier-state" role="status">Đang tải cấp bậc và tiến độ…</section>
            : statusError || !currentTier || !tierStatus ? <section className="tier-panel tier-current tier-state" role="status">Chưa tải được cấp bậc đang áp dụng. <button className="tier-retry" onClick={retry}>Thử lại</button></section>
            : <section className="tier-panel tier-current" aria-labelledby="tier-current-title">
            <div className="tier-current-heading">
              <div className="tier-current-identity">
                <span className="tier-current-icon"><Crown aria-hidden="true" /></span>
                <div>
                  <p className="tier-label">Cấp bậc hiện tại</p>
                  <h2 id="tier-current-title">{currentTier.name}</h2>
                  <p className="tier-current-bonus">Thưởng <strong>+{Number(currentTier.extraBonusPercentage)}%</strong> cho đơn hàng đủ điều kiện</p>
                </div>
              </div>
            </div>

            <div className="tier-current-stats">
              <div><TrendingUp aria-hidden="true" /><span>Doanh số tích lũy</span><strong>{currency(currentRevenue)}</strong></div>
              <div><ShoppingBag aria-hidden="true" /><span>Đơn thành công</span><strong>{totalOrders.toLocaleString('vi-VN')} đơn</strong></div>
              <div><Award aria-hidden="true" /><span>Hoa hồng thưởng</span><strong>+{currentTier.extraBonusPercentage || 0}%</strong></div>
            </div>

            {nextTier ? (
              <div className="tier-progress" id="tier-promotion-progress">
                <div className="tier-progress-heading">
                  <div><span className="tier-label">Hạng tiếp theo</span><h3>{nextTier.name} <span>+{nextTier.extraBonusPercentage || 0}% thưởng</span></h3></div>
                  <span className="tier-progress-percentage">{progressPct}%</span>
                </div>
                <div className="tier-progress-track" role="progressbar" aria-label={`Tiến độ lên hạng ${nextTier.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, progressPct))}>
                  <span style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }} />
                </div>
                <div className="tier-progress-caption"><span>{currency(currentRevenue)} / {currency(targetSales)}</span><span>Còn {currency(tierStatus.revenueNeeded)} để đạt ngưỡng</span></div>
                {tierStatus.qualifiedTier && Number(tierStatus.qualifiedTier.minRevenueThreshold) > Number(currentTier.minRevenueThreshold) && (
                  <p className="tier-upgrade-note">Bạn đã đạt ngưỡng hạng {tierStatus.qualifiedTier.name}. Hạng mới có hiệu lực sau khi được đánh giá cấp bậc.</p>
                )}
              </div>
            ) : (
              <p className="tier-highest"><Check aria-hidden="true" /> Bạn đang ở cấp bậc cao nhất trong hệ thống đối tác.</p>
            )}
            <div className="tier-current-perks">
              <Gift aria-hidden="true" /><span>Sản phẩm mẫu</span><strong>Theo xét duyệt của Shop</strong>
            </div>
          </section>}

          <section className="tier-panel tier-policy" aria-labelledby="tier-policy-title">
            <header className="tier-panel-heading">
              <div className="tier-heading-title">
                <span className="tier-heading-icon"><Award aria-hidden="true" /></span>
                <div><h2 id="tier-policy-title">Cấp bậc &amp; quyền lợi</h2><p>Ngưỡng doanh số tích lũy để xét hạng.</p></div>
              </div>
              <span className="tier-policy-count">{loading ? 'Đang tải…' : policyError ? 'Chưa tải được' : `${tierPolicies.length} cấp bậc`}</span>
            </header>
            <div className="tier-policy-grid" aria-label="Chính sách cấp bậc">
                  {loading || policyError || !tierPolicies.length ? <p className="tier-policy-empty">
                    {loading ? 'Đang tải chính sách cấp bậc…' : policyError ? <>Chưa tải được chính sách. <button className="tier-retry" onClick={retry}>Thử lại</button></> : 'Chưa có chính sách cấp bậc được cấu hình.'}
                  </p> : tierPolicies.map(policy => {
                    const isCurrent = !statusError && currentTier && samePolicy(currentTier, policy);
                    return (
                      <article className="tier-policy-card" key={policy.id} data-current={isCurrent || undefined}>
                        <div className="tier-policy-card-heading"><h3>{policy.name}</h3>{isCurrent && <span className="tier-policy-current"><Check aria-hidden="true" /> Hiện tại</span>}</div>
                        <div className="tier-policy-card-bonus"><strong>+{Number(policy.extraBonusPercentage)}%</strong><span>hoa hồng thưởng</span></div>
                        <p>Từ <strong>{currency(Number(policy.minRevenueThreshold))}</strong></p>
                      </article>
                    );
                  })}
            </div>
            <p className="tier-policy-note">Hạng có hiệu lực sau khi hệ thống đánh giá. Hạn mức mẫu do từng Shop xét duyệt.</p>
          </section>
          <section className="tier-panel tier-featured" aria-labelledby="tier-featured-title">
            <header className="tier-panel-heading">
              <div className="tier-heading-title">
                <span className="tier-heading-icon"><Trophy aria-hidden="true" /></span>
                <div>
                  <h2 id="tier-featured-title">Nhà sáng tạo nổi bật tháng này</h2>
                  <p>Xếp hạng theo doanh số ghi nhận khi giao / hoàn tất trong tháng (giờ Việt Nam).</p>
                </div>
              </div>
              <Link className="tier-text-link" to="/collaborator/leaderboard">
                Xem bảng xếp hạng <ArrowUpRight aria-hidden="true" />
              </Link>
            </header>
            {loading ? <p className="tier-state" role="status">Đang tải nhà sáng tạo nổi bật…</p>
              : podiumError ? <div className="tier-state" role="status">Chưa tải được bảng vinh danh. <button className="tier-retry" onClick={retry}>Thử lại</button></div>
              : !podiumEntries.length ? <p className="tier-state">Chưa có Creator đủ điều kiện vinh danh trong tháng này.</p>
              : <div className="tier-featured-grid">
              {podiumEntries.map(({ slot, creator }) => {
                const rank = creator!.rank;
                return <article className={`tier-creator ${rank === 1 ? 'tier-creator-first' : ''}`} data-featured-rank={slot} key={creator!.collaboratorId}>
                  <div className="tier-creator-identity">
                    <span className="tier-creator-avatar" aria-hidden="true">
                      {creator?.fullName?.charAt(0) || rank}
                      {creator?.avatarUrl && <img src={creator.avatarUrl} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}
                    </span>
                    <div className="tier-creator-name">
                      <h3>{creator?.fullName || 'Đang cập nhật'}</h3>
                      <p>{creator?.tierName || 'KOL Tiếp thị'}</p>
                    </div>
                    <span className="tier-rank-badge">
                      {rank === 1 && <Crown aria-hidden="true" />} Hạng {rank}
                    </span>
                  </div>
                  <div className="tier-creator-revenue">
                    <div><span>Doanh số GMV{rank === 1 ? ' xuất sắc' : ''}</span><strong>{currency(Number(creator?.grossRevenue || 0))}</strong></div>
                    {rank === 1 && creator?.totalOrders !== undefined && <span className="tier-creator-orders">{creator.totalOrders} đơn đã giao / hoàn tất</span>}
                  </div>
                </article>;
              })}
            </div>}
          </section>
        </div>
      )}
    </div>
  );
}
