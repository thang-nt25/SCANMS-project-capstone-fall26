import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Radio, RefreshCw, Search, TrendingUp, Award, PlayCircle, Loader2 } from 'lucide-react';
import api from '../../services/api';

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
    return matchesSearch && matchesStatus;
  });

  return (
    <section className="space-y-4 text-[#1A1612]">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#EAE4D7] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[#7D715E] font-medium truncate">Tổng phiên live</p>
            <h3 className="text-lg font-bold text-[#1A1612]">{totalSessions}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EAE4D7] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <PlayCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[#7D715E] font-medium truncate">Đang phát sóng</p>
            <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-1.5">
              {liveCount}
              {liveCount > 0 && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EAE4D7] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[#7D715E] font-medium truncate">Doanh số đã chốt</p>
            <h3 className="text-lg font-bold text-[#1A1612] truncate">{money(totalGross)}</h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#EAE4D7] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-[#B88E4F]" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-[#7D715E] font-medium truncate">Hoa hồng KOL chốt</p>
            <h3 className="text-lg font-bold text-[#1A1612] truncate">{money(totalCommission)}</h3>
          </div>
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-[#EAE4D7] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7D715E]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên phiên, KOL, gian hàng..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#FAF8F5] border border-[#EAE4D7] rounded-lg focus:outline-none focus:border-[#C59B58] text-[#1A1612] transition-colors placeholder:text-[#9C8F7C]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'LIVE', label: 'Đang live' },
              { key: 'SCHEDULED', label: 'Lên lịch' },
              { key: 'ENDED', label: 'Kết thúc' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  statusFilter === tab.key
                    ? 'bg-[#EBD08C] text-[#1A1612] shadow-2xs'
                    : 'bg-[#F3EFE6] text-[#7D715E] hover:bg-[#EAE4D7] hover:text-[#1A1612]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-[#7D715E] bg-[#FAF8F5] px-2.5 py-1.5 rounded-lg border border-[#EAE4D7] whitespace-nowrap">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>Tự cập nhật 15s</span>
          </div>

          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF8F5] hover:bg-[#F3EFE6] text-[#1A1612] border border-[#EAE4D7] hover:border-[#C59B58] transition cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs"
            title="Làm mới dữ liệu phiên live"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#B88E4F] ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-sm text-[#7D715E]">
          {error}
        </p>
      )}

      {loading && !sessions.length ? (
        <div className="rounded-xl border border-[#EAE4D7] bg-white p-8 text-center text-sm text-[#7D715E] flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#B88E4F]" />
          <span>Đang tải danh sách phiên live…</span>
        </div>
      ) : null}

      {!loading && !filteredSessions.length && !error ? (
        <p className="rounded-xl border border-[#EAE4D7] bg-white p-8 text-center text-sm text-[#7D715E]">
          {searchTerm || statusFilter !== 'ALL' ? 'Không tìm thấy phiên live nào phù hợp bộ lọc.' : 'Chưa có phiên live nào.'}
        </p>
      ) : null}

      <div className="grid gap-3">
        {filteredSessions.map((session) => (
          <article key={session.id} className="rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Radio className="h-4 w-4 text-[#B88E4F]" />
                  <h3 className="font-extrabold">{session.title}</h3>
                  <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 text-[11px] font-bold text-[#B88E4F]">
                    {statusNames[session.status] || session.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#7D715E]">
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
                className="inline-flex items-center gap-1 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3 py-2 text-xs font-bold hover:border-[#C59B58]"
              >
                <ExternalLink className="h-4 w-4 text-[#B88E4F]" /> Mở link live
              </a>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#EAE4D7] pt-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
              {[
                ['Đang xem', session.platform === 'SCANMS' ? String(session.report.currentViewers ?? 0) : '—'],
                ['Tổng lượt xem', session.platform === 'SCANMS' ? String(session.report.totalViewers ?? 0) : '—'],
                ['Tổng đơn', String(session.report.orders)],
                ['Đơn chờ', String(session.report.pendingOrders)],
                ['Doanh số đã chốt', money(session.report.grossSales)],
                ['Hoa hồng KOL đã chốt', money(session.report.commission)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-[#FAF8F5] p-3">
                  <p className="text-[#7D715E]">{label}</p>
                  <p className="mt-1 font-extrabold text-[#1A1612]">{value}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
