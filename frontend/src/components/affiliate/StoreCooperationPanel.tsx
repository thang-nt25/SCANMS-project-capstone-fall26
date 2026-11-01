import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { CooperationRequestModal } from './CooperationRequestModal';

type Cooperation = { id: string; storeId: string; status: string; requestedByKol?: boolean; createdAt: string; note?: string; collaborator?: { fullName: string; collaboratorProfile?: { totalFollowers?: number } } };

export function StoreCooperationPanel({ mode, storeId }: { mode: 'shop' | 'kol'; storeId?: string }) {
  const [items, setItems] = useState<Cooperation[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const actionLocked = useRef(false);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const requestVersion = ++version.current;
    try {
      const response: any = await api.get(mode === 'shop' ? '/store-collaborators/shop' : '/store-collaborators/my-invitations', { params: mode === 'shop' && storeId ? { storeId } : undefined, headers: { 'x-skip-cache': '1' } });
      const body = response?.data || response;
      if (requestVersion !== version.current) return;
      setItems(mode === 'shop' ? body.members || [] : Array.isArray(body) ? body : []);
      setLoaded(true);
      setError(false);
    } catch { if (requestVersion === version.current) setError(true); }
  }, [mode, storeId]);
  useEffect(() => {
    void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    return () => { version.current += 1; window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, [refresh]);

  const act = async (id: string, accept: boolean) => {
    if (actionLocked.current) return;
    actionLocked.current = true;
    setBusy(id);
    try {
      await api.patch(`/store-collaborators/${id}/${mode === 'shop' ? accept ? 'shop-approve' : 'shop-reject' : accept ? 'accept' : 'reject'}`, {});
      toast.success(accept ? 'Đã xác nhận hợp tác. KOL có thể được chọn khi tạo phiên Live.' : 'Đã từ chối hợp tác.');
      await refresh();
    } catch (e: any) { toast.error(e.response?.data?.message || e.message || 'Không xử lý được yêu cầu'); }
    finally { actionLocked.current = false; setBusy(null); }
  };
  const buttonClass = 'rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-1.5 text-xs font-semibold text-[#1A1612] hover:bg-[#F3EFE6] disabled:opacity-50 cursor-pointer';
  if (mode === 'shop') {
    const pending = items.filter(item => item.status === 'PENDING' && item.requestedByKol);
    if (!error && pending.length === 0) return null;
    return (
      <section className="shrink-0 border-b border-[#EAE4D7] bg-[#FAF8F5] px-4 py-3" aria-label="Yêu cầu hợp tác từ KOL">
        <div className="flex items-center justify-between gap-3 text-xs">
          <strong>Yêu cầu hợp tác từ KOL ({pending.length})</strong>
          <button type="button" className={buttonClass} onClick={() => void refresh()}>Làm mới</button>
        </div>
        {error ? <p role="alert" className="mt-2 text-xs text-[#DC2626]">Chưa tải được yêu cầu. Bấm Làm mới để thử lại.</p> : !loaded ? <p className="mt-2 text-xs text-[#7D715E]">Đang tải…</p> : pending.length === 0 ? <p className="mt-1 text-xs text-[#7D715E]">Chưa có yêu cầu đang chờ Shop duyệt.</p> : (
          <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
            {pending.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EAE4D7] bg-white p-3">
              <div className="min-w-0"><p className="text-xs font-semibold">{item.collaborator?.fullName || 'KOL'}</p><p className="mt-0.5 text-[11px] text-[#7D715E]">Đã gửi yêu cầu · {new Date(item.createdAt).toLocaleString('vi-VN')}</p>{item.collaborator?.collaboratorProfile?.totalFollowers != null && <p className="text-[11px] text-[#7D715E]">{item.collaborator.collaboratorProfile.totalFollowers.toLocaleString('vi-VN')} người theo dõi trong hồ sơ</p>}{item.note && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-[#1A1612]">{item.note}</p>}</div>
              <div className="flex gap-2"><button type="button" disabled={busy !== null} className={buttonClass} onClick={() => void act(item.id, false)}>Từ chối</button><button type="button" disabled={busy !== null} className={buttonClass} onClick={() => void act(item.id, true)}>{busy === item.id ? 'Đang xử lý…' : 'Duyệt hợp tác'}</button></div>
            </div>)}
          </div>
        )}
      </section>
    );
  }
  if (!storeId) return null;
  const current = items.find(item => item.storeId === storeId);
  return <><div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#EAE4D7] bg-[#FBF5EB] px-4 py-2 text-xs">
    <span>{error ? 'Lỗi tải trạng thái' : !loaded ? 'Đang tải…' : current?.status === 'APPROVED' ? 'Đã liên kết hợp tác' : current?.status === 'PENDING' ? current.requestedByKol ? 'Chờ Shop duyệt yêu cầu' : 'Lời mời hợp tác từ Shop' : current?.status === 'REJECTED' ? 'Yêu cầu bị từ chối' : 'Chưa liên kết hợp tác'}</span>
    {error ? <button type="button" className={buttonClass} onClick={() => void refresh()}>Thử lại</button> : loaded && current?.status === 'PENDING' && !current.requestedByKol ? <div className="flex gap-2"><button type="button" className={buttonClass} disabled={busy !== null} onClick={() => void act(current.id, false)}>Từ chối lời mời</button><button type="button" className={buttonClass} disabled={busy !== null} onClick={() => void act(current.id, true)}>Chấp nhận lời mời</button></div> : loaded && current?.status !== 'APPROVED' && current?.status !== 'PENDING' && <button type="button" className={buttonClass} disabled={busy !== null} onClick={() => setRequestOpen(true)}>Gửi yêu cầu hợp tác</button>}
  </div>{requestOpen && <CooperationRequestModal key={storeId} storeId={storeId} onClose={() => setRequestOpen(false)} onSuccess={() => { setRequestOpen(false); toast.success('Đã gửi yêu cầu, chờ Shop duyệt.'); void refresh(); }} />}</>;
}
