import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Trophy, Award, Target, Info, Check, ArrowUpRight } from 'lucide-react';
import { tierService, type TierStatus, type TierPolicy } from '../../services/tier.service';
import LeaderboardPage from '../dashboard/LeaderboardPage';
import { MonthlyRewardsPanel } from '../../components/promotions/MonthlyRewardsPanel';
import { Modal } from '../../components/ui/Modal';
import './kol-tier-workspace.css';

const money = (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫`;
const date = (value: string) => new Date(value).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export default function KolTierStatusPage({ view = 'tiers' }: { view?: 'tiers' | 'leaderboard' | 'bonus' } = {}) {
  const [status, setStatus] = useState<TierStatus | null>(null);
  const [policies, setPolicies] = useState<TierPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [policyError, setPolicyError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [showRules, setShowRules] = useState(false);
  useEffect(() => {
    if (view !== 'tiers') return;
    let active = true; setLoading(true); setError('');
    Promise.allSettled([tierService.getMyTierStatus(), tierService.getAllTiers()]).then(([result, rules]) => {
      if (!active) return;
      setStatus(result.status === 'fulfilled' ? result.value : null);
      setError(result.status === 'rejected' ? 'Chưa tải được cấp bậc đang áp dụng.' : '');
      setPolicies(rules.status === 'fulfilled' ? rules.value : []); setPolicyError(rules.status === 'rejected'); setLoading(false);
    });
    return () => { active = false; };
  }, [view, revision]);
  const current = status?.currentTier;
  const revenue = Number(status?.currentRevenue || 0);
  const maintenance = Number(status?.maintenanceThreshold ?? current?.maintenanceThreshold ?? Number(current?.minRevenueThreshold || 0) * .6);
  const maintained = status?.isMaintained ?? revenue >= maintenance;
  const next = status?.nextTier;
  const target = Number(next?.minRevenueThreshold || 0);
  const progress = next && target ? Math.min(100, Math.max(0, revenue / target * 100)) : 100;
  const tabs = [{ label: 'Cấp bậc & Quyền lợi', path: '/collaborator/tiers', key: 'tiers', icon: Award }, { label: 'Bảng vinh danh', path: '/collaborator/leaderboard', key: 'leaderboard', icon: Trophy }, { label: 'Thưởng doanh số tháng', path: '/collaborator/bonus-progress', key: 'bonus', icon: Target }];
  return <div className="kol-tier-workspace">
    <nav className="kol-tier-navigation" aria-label="Cấp bậc và vinh danh">{tabs.map(tab => <Link key={tab.key} to={tab.path} aria-current={view === tab.key ? 'page' : undefined}><tab.icon size={17} /><span>{tab.label}</span></Link>)}</nav>
    {view === 'leaderboard' ? <LeaderboardPage alignToContainer /> : view === 'bonus' ? <MonthlyRewardsPanel mode="kol" /> : <>
      {loading ? <div className="kol-tier-state" role="status">Đang tải cấp bậc…</div> : error || !status || !current ? <div className="kol-tier-state" role="alert">{error || 'Chưa có dữ liệu cấp bậc.'}<button onClick={() => setRevision(v => v + 1)}>Thử lại</button></div> : <div className="kol-tier-grid">
        <section className="kol-current-tier" aria-label="Cấp bậc hiện tại">
          <header><span className="kol-tier-crown"><Crown size={28} /></span><div><span>Cấp bậc hiện tại</span><h2>{current.name}</h2><p>Mức cộng theo bậc <strong>+{Number(current.extraBonusPercentage)}%</strong></p></div><button className="kol-tier-rules-button" onClick={() => setShowRules(true)}><Info size={14} />Cách xét hạng</button></header>
          <div className="kol-tier-stats"><div><span>GMV kỳ xét</span><strong>{money(revenue)}</strong></div><div><span>Đơn hợp lệ</span><strong>{Number(status.totalOrders).toLocaleString('vi-VN')} đơn</strong></div><div><span>Ngưỡng duy trì</span><strong>{money(maintenance)}</strong></div></div>
          {status.assessmentPeriod && <p className="kol-tier-period">Kỳ xét: {date(status.assessmentPeriod.startsAt)} – {date(new Date(new Date(status.assessmentPeriod.endsAt).getTime() - 1).toISOString())}</p>}
          <div className="kol-tier-progress">
            <p className="kol-tier-maintained">{status.assessmentIncomplete ? <><Info size={15} />Số liệu kỳ xét cần đối soát</> : maintained ? <><Check size={15} />Đã đạt ngưỡng duy trì</> : <>Còn {money(Math.max(0, maintenance - revenue))} để duy trì hạng</>}</p>
            {next ? <><div className="kol-tier-progress-label"><span>Còn <strong>{money(Math.max(0, target - revenue))}</strong> để đạt ngưỡng hạng {next.name}</span><strong>{progress.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</strong></div><div className="kol-tier-track" role="progressbar" aria-label={`Tiến độ hạng ${next.name}`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div><div className="kol-tier-progress-caption"><span>{money(revenue)}</span><span>Mục tiêu {money(target)}</span></div></> : <p>Bạn đang ở cấp bậc cao nhất.</p>}
            {!maintained && status.cycleStatus === 'GRACE_PERIOD' && <p className="kol-tier-grace">Đang ân hạn · Còn {status.daysRemaining ?? '—'} ngày theo kỳ đánh giá.</p>}
          </div>
          <footer><span>Hạng áp dụng theo kết quả hệ thống.</span><Link to="/collaborator/marketing?tab=links">Tạo link tiếp thị<ArrowUpRight size={14} /></Link></footer>
        </section>
        <section className="kol-tier-policy" aria-label="Các cấp bậc"><header><h2>Cấp bậc & quyền lợi</h2><span>{policies.length} cấp bậc</span></header><div className="kol-tier-policy-grid">{policies.map(policy => {
          const active = policy.id === current.id;
          return <article key={policy.id} data-current={active || undefined}><header><h3>{policy.name}</h3>{active && <span><Check size={11} />Hiện tại</span>}</header><strong className="kol-tier-policy-bonus">+{Number(policy.extraBonusPercentage)}%<small>mức cộng theo bậc</small></strong><dl><div><dt>Ngưỡng lên hạng</dt><dd>{money(Number(policy.minRevenueThreshold))}</dd></div><div><dt>Ngưỡng duy trì</dt><dd>{money(Number(policy.maintenanceThreshold ?? Math.round(Number(policy.minRevenueThreshold) * .6)))}</dd></div></dl></article>;
        })}</div>{policyError && <p role="alert">Chưa tải được chính sách. <button onClick={() => setRevision(v => v + 1)}>Thử lại</button></p>}</section>
      </div>}
    </>}
    {showRules && status && <Modal isOpen title="Cách xét hạng" onClose={() => setShowRules(false)} maxWidth="xl"><div className="kol-tier-rule-content"><p>GMV hợp lệ tính từ đơn tiếp thị đã giao hoặc hoàn tất trong kỳ xét, không gồm phí vận chuyển và đã trừ ưu đãi, hoàn trả.</p>{status.assessmentPeriod && <p><strong>Kỳ dữ liệu:</strong> {date(status.assessmentPeriod.startsAt)} – {date(new Date(new Date(status.assessmentPeriod.endsAt).getTime() - 1).toISOString())}</p>}<p><strong>Duy trì hạng:</strong> theo ngưỡng cấu hình của từng cấp bậc. Đạt ngưỡng không phải xác nhận bảo toàn hạng cho một kỳ tương lai.</p>{status.nextEvaluationAt && <p><strong>Lần đánh giá tiếp theo:</strong> {new Date(status.nextEvaluationAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</p>}<p><strong>Ân hạn:</strong> {status.daysRemaining ?? '—'} ngày theo trạng thái kỳ; khi chưa duy trì được hạng, hệ thống áp dụng quy tắc chuyển tiếp.{status.stepDownTier ? ` Hạng chuyển tiếp: ${status.stepDownTier.name}.` : ''}</p><p>Thù lao theo bậc không cộng dồn vào tổng mức Deal đã thỏa thuận.</p><button onClick={() => setShowRules(false)}>Đóng</button></div></Modal>}
  </div>;
}
