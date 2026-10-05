import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Radio, RefreshCw, Search, TrendingUp, Award, PlayCircle, Loader2, Filter } from 'lucide-react';
import api from '../../services/api';
import { Select } from '../../components/ui/Select';

type AdminLiveSession = {
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
      session.platform.toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'ALL' || session.status === statusFilter;
    const matchesPlatform = platformFilter === 'ALL' || session.platform.toUpperCase() === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  return (
    <div className="min-h-screen bg-[#FAF8F5] px-0 py-8 text-[#1A1612]">
      <div className="mx-0 w-full max-w-none space-y-6">
        {/* KPI Stats Cards - Matching AdminReferralLinksPage styling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#EAE4D7] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center font-bold shrink-0">
              <Radio className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#7D715E] font-medium truncate">Tổng phiên live toàn sàn</p>
              <h3 className="text-xl font-bold text-[#1A1612]">{totalSessions.toLocaleString()}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#EAE4D7] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold shrink-0">
              <PlayCircle className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#7D715E] font-medium truncate">Đang phát sóng (LIVE)</p>
              <h3 className="text-xl font-bold text-emerald-600 flex items-center gap-2">
                {liveCount}
                {liveCount > 0 && (
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#EAE4D7] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center font-bold shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#7D715E] font-medium truncate">Tổng doanh số chốt live</p>
              <h3 className="text-xl font-bold text-[#1A1612] truncate">{money(totalGross)}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#EAE4D7] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center font-bold shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-[#7D715E] font-medium truncate">Hoa hồng KOL đã chốt</p>
              <h3 className="text-xl font-bold text-[#1A1612] truncate">{money(totalCommission)}</h3>
            </div>
          </div>
        </div>

        {/* Filter and Action Toolbar - Exactly matching AdminReferralLinksPage */}
        <div className="bg-white rounded-xl border border-[#EAE4D7] p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void load(true);
            }}
            className="w-full md:w-96 flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7D715E] absolute left-3 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã phiên, tên live, KOL, shop..."
                className="w-full pl-9 pr-4 py-2 border border-[#EAE4D7] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C59B58] focus:border-transparent text-[#1A1612]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#C59B58] hover:bg-[#B88E4F] text-white font-medium rounded-xl text-sm transition cursor-pointer shrink-0"
            >
              Tìm
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#7D715E]" />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-40 text-sm"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="LIVE">Đang live (LIVE)</option>
                <option value="SCHEDULED">Đã lên lịch (SCHEDULED)</option>
                <option value="PAUSED">Tạm dừng (PAUSED)</option>
                <option value="ENDED">Đã kết thúc (ENDED)</option>
                <option value="CANCELLED">Đã hủy (CANCELLED)</option>
              </Select>
            </div>

            <Select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-40 text-sm"
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
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#1A1612] border border-[#EAE4D7] hover:border-[#C59B58] font-medium rounded-xl text-sm transition cursor-pointer disabled:opacity-50 shrink-0"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 text-[#B88E4F] ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-4 text-sm text-[#7D715E]">
            {error}
          </p>
        )}

        {loading && !sessions.length ? (
          <div className="rounded-xl border border-[#EAE4D7] bg-white p-12 text-center text-sm text-[#7D715E] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#B88E4F]" />
            <span>Đang tải danh sách phiên livestream…</span>
          </div>
        ) : null}

        {!loading && !filteredSessions.length && !error ? (
          <p className="rounded-xl border border-[#EAE4D7] bg-white p-12 text-center text-sm text-[#7D715E]">
            {searchTerm || statusFilter !== 'ALL' || platformFilter !== 'ALL'
              ? 'Không tìm thấy phiên live nào phù hợp với bộ lọc.'
              : 'Chưa có phiên livestream nào trên hệ thống.'}
          </p>
        ) : null}

        <div className="grid gap-4">
          {filteredSessions.map((session) => (
            <article key={session.id} className="rounded-2xl border border-[#EAE4D7] bg-white p-5 shadow-xs transition hover:border-[#C59B58]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Radio className="h-4 w-4 text-[#B88E4F]" />
                    <h3 className="font-extrabold text-[#1A1612]">{session.title}</h3>
                    <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-0.5 text-[11px] font-bold text-[#B88E4F]">
                      {statusNames[session.status] || session.status}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-[#7D715E]">
                    {session.store.name} · KOL: <strong className="text-[#1A1612]">{session.creator.fullName}</strong> · Mã KOL{' '}
                    {session.creator.id.replace(/-/g, '').slice(0, 8).toUpperCase()} · {session.platform}
                    {shortLiveCode(session.liveUrl) ? ` · Mã phiên ${shortLiveCode(session.liveUrl)}` : ''} ·{' '}
                    {new Date(session.startsAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <a
                  href={session.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3.5 py-2 text-xs font-bold text-[#1A1612] hover:bg-[#F3EFE6] hover:border-[#C59B58] transition"
                >
                  <ExternalLink className="h-4 w-4 text-[#B88E4F]" /> Mở link live
                </a>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#EAE4D7] pt-4 text-xs sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ['Đang xem', session.platform === 'SCANMS' ? String(session.report.currentViewers ?? 0) : '—'],
                  ['Tổng lượt xem', session.platform === 'SCANMS' ? String(session.report.totalViewers ?? 0) : '—'],
                  ['Tổng đơn', String(session.report.orders)],
                  ['Đơn chờ', String(session.report.pendingOrders)],
                  ['Doanh số đã chốt', money(session.report.grossSales)],
                  ['Hoa hồng KOL đã chốt', money(session.report.commission)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-[#FAF8F5] p-3 border border-[#EAE4D7]/50">
                    <p className="text-[#7D715E]">{label}</p>
                    <p className="mt-1 font-extrabold text-[#1A1612]">{value}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
