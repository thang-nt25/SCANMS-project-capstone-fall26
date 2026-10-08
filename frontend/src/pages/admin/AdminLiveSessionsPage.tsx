import { LiveGovernancePanel, type LiveGovernance } from '../../components/live/LiveGovernancePanel';
import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Radio, RefreshCw, Search, TrendingUp, Award, PlayCircle, Loader2, Store, UserRound, Clock3 } from 'lucide-react';
import api from '../../services/api';
import { Select } from '../../components/ui/Select';
import './AdminMarketingPanels.css';

type AdminLiveSession = {
  governance?: LiveGovernance;
  id: string;
  title: string;
  platform: string;
  liveUrl: string;
  status: string;
  startsAt: string;
  creator: { id: string; fullName: string };
  store: { name: string };
  report: {
    currentViewers: number | null;
    totalViewers: number | null;
    orders: number;
    buyers?: number;
    pendingOrders: number;
    grossSales: number;
    commission: number;
  };
};

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
const shortLiveCode = (value: string) => (/^https?:\/\/[^/]+\/live\/[A-Za-z0-9_-]{12}$/.test(value) ? value.slice(-12) : null);
const statusNames: Record<string, string> = {
  PENDING_CREATOR: 'Chờ KOL',
  SCHEDULED: 'Đã lên lịch',
  LIVE: 'Đang live',
  PAUSED: 'Tạm dừng',
  ENDED: 'Đã kết thúc',
  CANCELLED: 'Đã hủy',
};
export default function AdminLiveSessionsPage() {
  const [sessions, setSessions] = useState<AdminLiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [disputeFilter, setDisputeFilter] = useState('ALL');

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response: any = await api.get('/live-sessions/admin', { headers: { 'x-skip-cache': 'true' } });
      const result = response?.data || response;
      setSessions(Array.isArray(result) ? result : []);
      setError('');
    } catch (cause: any) {
      setError(cause?.response?.data?.message || cause?.message || 'Không tải được dữ liệu phiên live.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const totalSessions = sessions.length;
  const liveCount = sessions.filter((s) => s.status === 'LIVE').length;
  const totalGross = sessions.reduce((acc, s) => acc + (s.report?.grossSales || 0), 0);
  const totalCommission = sessions.reduce((acc, s) => acc + (s.report?.commission || 0), 0);

  const filteredSessions = sessions.filter((session) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      session.title.toLowerCase().includes(term) ||
      session.store.name.toLowerCase().includes(term) ||
      session.creator.fullName.toLowerCase().includes(term) ||
      session.platform.toLowerCase().includes(term) || session.id.toLowerCase().includes(term) || session.creator.id.replace(/-/g, '').toLowerCase().includes(term) || Boolean(shortLiveCode(session.liveUrl)?.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'ALL' || session.status === statusFilter;
    const matchesPlatform = platformFilter === 'ALL' || session.platform.toUpperCase() === platformFilter;
    const disputeStatus = session.governance?.dispute?.status;
    const matchesDispute = disputeFilter === 'ALL' || (disputeFilter === 'PENDING' ? ['OPEN', 'ESCALATED', 'APPEALED'].includes(disputeStatus || '') : Boolean(disputeStatus));
    return matchesSearch && matchesStatus && matchesPlatform && matchesDispute;
  });

  return (
    <div className="admin-marketing-page admin-live-page">
      <div className="admin-marketing-content">
        {/* KPI Stats Cards - Matching AdminReferralLinksPage styling */}
        <div className="admin-marketing-metrics">
          <div className="admin-live-metric">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <Radio className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#7D715E]">Tổng phiên livestream</p>
              <h3 className="text-lg font-bold text-[#1A1612]">{totalSessions.toLocaleString()}</h3>
            </div>
          </div>

          <div className="admin-live-metric">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <PlayCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#7D715E]">Đang phát sóng</p>
              <h3 className="flex items-center gap-2 text-lg font-bold text-[#8F682E]">
                {liveCount}
                {liveCount > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C59B58] opacity-40"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C59B58]"></span>
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="admin-live-metric">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#7D715E]">Doanh số đã chốt</p>
              <h3 className="truncate text-lg font-bold text-[#1A1612]">{money(totalGross)}</h3>
            </div>
          </div>

          <div className="admin-live-metric">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]">
              <Award className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-[#7D715E]">Hoa hồng KOL</p>
              <h3 className="truncate text-lg font-bold text-[#1A1612]">{money(totalCommission)}</h3>
            </div>
          </div>
        </div>

        {/* Filter and Action Toolbar - Exactly matching AdminReferralLinksPage */}
        <div className="admin-live-toolbar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load(true);
            }}
            className="admin-live-search-form"
          >
            <div className="admin-marketing-search">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7D715E]" />
              <input
                aria-label="Tìm phiên livestream"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã phiên, tên live, KOL, shop..."
                className="h-10 w-full rounded-xl border border-[#EAE4D7] py-2 pl-9 pr-3 text-xs text-[#1A1612] placeholder:text-[#A89D8B] focus:border-[#C59B58] focus:outline-none focus:ring-2 focus:ring-[#C59B58]/15 sm:text-sm"
              />
            </div>
           <button
              type="submit"
              className="admin-live-search-button"
            >
              Tìm
            </button>
          </form>

          <div className="admin-live-filters">
            <Select aria-label="Lọc tranh chấp" value={disputeFilter} onChange={e => setDisputeFilter(e.target.value)}>
              <option value="ALL">Tất cả phiên live</option>
              <option value="PENDING">Tranh chấp chờ xử lý</option>
              <option value="DISPUTED">Tất cả tranh chấp</option>
            </Select>
 
            <div className="admin-live-status-select">
              <Select
                aria-label="Trạng thái phiên live"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-live-filter-select"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING_CREATOR">Chờ KOL</option>
                <option value="LIVE">Đang live</option>
                <option value="SCHEDULED">Đã lên lịch</option>
                <option value="PAUSED">Tạm dừng</option>
                <option value="ENDED">Đã kết thúc</option>
                <option value="CANCELLED">Đã hủy</option>
              </Select>
            </div>

            <Select
              aria-label="Nền tảng livestream"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="admin-live-filter-select"
            >
              <option value="ALL">Tất cả nền tảng</option>
              <option value="SCANMS">SCANMS Live</option>
              <option value="TIKTOK">TikTok Live</option>
              <option value="FACEBOOK">Facebook Live</option>
              <option value="YOUTUBE">YouTube Live</option>
            </Select>

            <button
              type="button"
              onClick={() => void load(true)}
              disabled={loading}
              className="admin-marketing-refresh"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 text-[#B88E4F] ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-[#EEDFC6] bg-white p-3 text-sm text-[#7D715E]">
            {error}
          </p>
        )}

        {loading && !sessions.length ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[#EAE4D7] bg-white p-8 text-center text-sm text-[#7D715E]">
            <Loader2 className="h-6 w-6 animate-spin text-[#B88E4F]" />
            <span>Đang tải danh sách phiên livestream…</span>
          </div>
        ) : null}

        {!loading && !filteredSessions.length && !error ? (
          <p className="rounded-2xl border border-[#EAE4D7] bg-white p-8 text-center text-sm text-[#7D715E]">
            {searchTerm || statusFilter !== 'ALL' || platformFilter !== 'ALL' || disputeFilter !== 'ALL'
              ? 'Không tìm thấy phiên live nào phù hợp với bộ lọc.'
              : 'Chưa có phiên livestream nào trên hệ thống.'}
          </p>
        ) : null}

        <div className="admin-live-list">
          {filteredSessions.map((session) => (
            <article key={session.id} className="admin-live-card">
              <div className="admin-live-card-header">
                <div className="min-w-0">
                  <div className="admin-live-heading">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]"><Radio className="h-4 w-4" /></span>
                    <h3 className="text-sm font-bold text-[#1A1612]">{session.title}</h3>
                    <span className={"admin-live-status is-" + session.status.toLowerCase()}>
                      {statusNames[session.status] || session.status}
                    </span>
                    <span className="rounded-full border border-[#EAE4D7] bg-[#FAF8F5] px-2 py-1 text-[10px] font-medium text-[#7D715E]">{session.platform}</span>
                  </div>
                  <div className="admin-live-meta">
                    <span><Store size={12} />{session.store.name}</span>
                    <span><UserRound size={12} />{session.creator.fullName}</span>
                    <time dateTime={session.startsAt}><Clock3 size={12} />{new Date(session.startsAt).toLocaleString('vi-VN')}</time>
                  </div>
                  <div className="admin-live-identifiers">
                    <span title={session.id}>Phiên <code>{shortLiveCode(session.liveUrl) || session.id}</code></span>
                    <span title={session.creator.id}>Mã KOL <code>{session.creator.id.replace(/-/g, '').slice(0, 8).toUpperCase()}</code></span>
                  </div>
                </div>
                <a
                  href={session.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-live-open"
                >
                  <ExternalLink className="h-4 w-4 text-[#B88E4F]" /> Mở link live
                </a>
              </div>
              <div className="admin-live-report">
                {[
                  ['Đang xem', session.platform === 'SCANMS' ? String(session.report.currentViewers ?? 0) : '—'],
                  ['Tổng lượt xem', session.platform === 'SCANMS' ? String(session.report.totalViewers ?? 0) : '—'],
                  ['Tổng đơn', String(session.report.orders)],
                  ['Người mua', String(session.report.buyers ?? 0)],
                  ['Đơn chờ', String(session.report.pendingOrders)],
                  ['Doanh số đã chốt', money(session.report.grossSales)],
                  ['Hoa hồng KOL đã chốt', money(session.report.commission)],
                ].map(([label, value]) => (
                  <div key={label} className="admin-live-report-item">
                    <p className="truncate text-[11px] text-[#7D715E]">{label}</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-[#1A1612]">{value}</p>
                  </div>
                ))}
              </div>
              <div className="admin-live-governance"><LiveGovernancePanel session={session} audience="admin" onChanged={() => void load()} /></div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
