import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Radio, RefreshCw } from 'lucide-react';
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
  report: { currentViewers: number | null; totalViewers: number | null; orders: number; pendingOrders: number; grossSales: number; commission: number };
};

const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} ₫`;
const shortLiveCode = (value: string) => /^https?:\/\/[^/]+\/live\/[A-Za-z0-9_-]{12}$/.test(value) ? value.slice(-12) : null;
const statusNames: Record<string, string> = {
  PENDING_CREATOR: 'Chờ KOL', SCHEDULED: 'Đã lên lịch', LIVE: 'Đang live', PAUSED: 'Tạm dừng', ENDED: 'Đã kết thúc', CANCELLED: 'Đã hủy',
};

export default function AdminLiveSessionsPage() {
  const [sessions, setSessions] = useState<AdminLiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <section className="space-y-4 text-[#1A1612]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Giám sát phiên SCANMS Live</h2>
          <p className="text-xs text-[#7D715E]">50 phiên gần nhất · Người xem đang hoạt động, đơn hàng và hoa hồng theo KOL.</p>
        </div>
        <button type="button" onClick={() => void load(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-bold hover:border-[#C59B58]"><RefreshCw className="h-4 w-4 text-[#B88E4F]" /> Làm mới</button>
      </div>
      {error && <p role="alert" className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-sm text-[#7D715E]">{error}</p>}
      {loading && !sessions.length ? <p className="rounded-xl border border-[#EAE4D7] bg-white p-8 text-center text-sm text-[#7D715E]">Đang tải phiên live…</p> : null}
      {!loading && !sessions.length && !error ? <p className="rounded-xl border border-[#EAE4D7] bg-white p-8 text-center text-sm text-[#7D715E]">Chưa có phiên live nào.</p> : null}
      <div className="grid gap-3">
        {sessions.map((session) => (
          <article key={session.id} className="rounded-2xl border border-[#EAE4D7] bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Radio className="h-4 w-4 text-[#B88E4F]" />
                  <h3 className="font-extrabold">{session.title}</h3>
                  <span className="rounded-full border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-0.5 text-[11px] font-bold text-[#B88E4F]">{statusNames[session.status] || session.status}</span>
                </div>
                <p className="mt-1 text-xs text-[#7D715E]">{session.store.name} · KOL: <strong className="text-[#1A1612]">{session.creator.fullName}</strong> · Mã KOL {session.creator.id.replace(/-/g, '').slice(0, 8).toUpperCase()} · {session.platform}{shortLiveCode(session.liveUrl) ? ` · Mã phiên ${shortLiveCode(session.liveUrl)}` : ''} · {new Date(session.startsAt).toLocaleString('vi-VN')}</p>
              </div>
              <a href={session.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3 py-2 text-xs font-bold hover:border-[#C59B58]"><ExternalLink className="h-4 w-4 text-[#B88E4F]" /> Mở link live</a>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[#EAE4D7] pt-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
              {[
                ['Đang xem', session.platform === 'SCANMS' ? String(session.report.currentViewers ?? 0) : '—'],
                ['Tổng lượt xem', session.platform === 'SCANMS' ? String(session.report.totalViewers ?? 0) : '—'],
                ['Tổng đơn', String(session.report.orders)],
                ['Đơn chờ', String(session.report.pendingOrders)],
                ['Doanh số đã chốt', money(session.report.grossSales)],
                ['Hoa hồng KOL đã chốt', money(session.report.commission)],
              ].map(([label, value]) => <div key={label} className="rounded-xl bg-[#FAF8F5] p-3"><p className="text-[#7D715E]">{label}</p><p className="mt-1 font-extrabold text-[#1A1612]">{value}</p></div>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
