import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import { CooperationRequestModal } from './CooperationRequestModal';

type Cooperation = { id: string; storeId: string; collaboratorId?: string; status: string; requestedByKol?: boolean; createdAt: string; note?: string; collaborator?: { id?: string; fullName: string; collaboratorProfile?: { totalFollowers?: number } } };

export function StoreCooperationPanel({ mode, storeId, collaboratorId, onChanged }: { mode: 'shop' | 'kol'; storeId?: string; collaboratorId?: string; onChanged?: () => void }) {
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
      const response: any = await api.get(mode === 'shop' ? '/store-collaborators/shop' : '/store-collaborators/my-invitations', {
        params: mode === 'shop' && storeId ? { storeId } : undefined,
        headers: { 'x-skip-cache': '1' },
      });
      const body = response?.data || response;
      if (requestVersion !== version.current) return;
      if (mode === 'shop') {
        const mergedShopRelations = [
          ...(Array.isArray(body?.pendingRequests) ? body.pendingRequests : []),
          ...(Array.isArray(body?.members) ? body.members : []),
        ];
        setItems(mergedShopRelations);
      } else {
        setItems(Array.isArray(body) ? body : []);
      }
      setLoaded(true);
      setError(false);
    } catch { if (requestVersion === version.current) setError(true); }
  }, [mode, storeId]);
  useEffect(() => {
    void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    window.addEventListener('scanms_cooperation_changed', update);
    return () => {
      version.current += 1;
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      window.removeEventListener('scanms_cooperation_changed', update);
    };
  }, [refresh]);

  const act = async (id: string, accept: boolean) => {
    if (actionLocked.current) return;
    actionLocked.current = true;
    setBusy(id);
    try {
      await api.patch(`/store-collaborators/${id}/${mode === 'shop' ? accept ? 'shop-approve' : 'shop-reject' : accept ? 'accept' : 'reject'}`, {});
      toast.success(
        accept
          ? 'Đã xác nhận hợp tác thành công. Hai bên có thể bắt đầu tạo Deal độc quyền.'
          : 'Đã từ chối hợp tác.',
      );
      window.dispatchEvent(new Event('scanms_cooperation_changed'));
      onChanged?.();
      await refresh();
    } catch (e: any) { toast.error(e.response?.data?.message || e.message || 'Không xử lý được yêu cầu'); }
    finally { actionLocked.current = false; setBusy(null); }
  };
  const buttonClass = 'rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-1.5 text-xs font-semibold text-[#1A1612] hover:bg-[#F3EFE6] disabled:opacity-50 cursor-pointer';
  if (mode === 'shop') {
    const pending = items.filter(item => item.status === 'PENDING' && item.requestedByKol && (!collaboratorId || (item.collaboratorId || item.collaborator?.id) === collaboratorId));
    if (!error && pending.length === 0) return null;
    return (
      <section className="shrink-0 border-b border-[#EAE4D7] bg-[#FAF8F5] px-4 py-3" aria-label="Yêu cầu hợp tác từ KOL">
        {error ? <div role="alert" className="flex items-center justify-between gap-3 text-xs text-[#DC2626]"><p>Chưa tải được yêu cầu.</p><button type="button" className={buttonClass} onClick={() => void refresh()}>Thử lại</button></div> : !loaded ? <p className="text-xs text-[#7D715E]">Đang tải…</p> : pending.length === 0 ? <p className="text-xs text-[#7D715E]">Chưa có yêu cầu đang chờ Shop duyệt.</p> : (
          <div className="max-h-40 space-y-2 overflow-y-auto">
            {pending.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EAE4D7] bg-white p-3">
              <div className="min-w-0"><p className="text-xs font-semibold text-[#1A1612]">{item.collaborator?.fullName || 'KOL'}</p><p className="mt-0.5 text-[11px] text-[#7D715E]">Đã gửi yêu cầu hợp tác · {new Date(item.createdAt).toLocaleString('vi-VN')}</p>{item.collaborator?.collaboratorProfile?.totalFollowers != null && <p className="text-[11px] text-[#7D715E]">{item.collaborator.collaboratorProfile.totalFollowers.toLocaleString('vi-VN')} người theo dõi trong hồ sơ</p>}{item.note && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-[#1A1612]">{item.note}</p>}</div>
              <div className="flex gap-2"><button type="button" disabled={busy !== null} className="rounded-lg border border-[#EAE4D7] bg-white px-3 py-1.5 text-xs font-semibold text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#DC2626] disabled:opacity-50 cursor-pointer" onClick={() => void act(item.id, false)}>Từ chối</button><button type="button" disabled={busy !== null} className="rounded-lg border border-[#B88E4F] bg-[#C59B58] px-3 py-1.5 text-xs font-bold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50 cursor-pointer" onClick={() => void act(item.id, true)}>{busy === item.id ? 'Đang xử lý…' : 'Duyệt hợp tác'}</button></div>
            </div>)}
          </div>
        )}
      </section>
    );
  }
  if (!storeId) return null;
  const current = items.find(item => item.storeId === storeId);
  const statusLabel = error
    ? 'Lỗi tải trạng thái'
    : !loaded
      ? 'Đang tải…'
      : current?.status === 'APPROVED'
        ? 'Đã liên kết hợp tác'
        : current?.status === 'PENDING'
          ? current.requestedByKol
            ? 'Đang chờ Shop duyệt yêu cầu'
            : 'Lời mời hợp tác từ Shop'
          : current?.status === 'REJECTED'
            ? 'Hợp tác đã bị từ chối'
            : current?.status === 'TERMINATED'
              ? 'Hợp tác đã chấm dứt'
              : current?.status === 'BLOCKED'
                ? 'Cửa hàng đã khóa hợp tác'
                : 'Chưa liên kết hợp tác';
  return <><div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#EAE4D7] bg-[#FBF5EB] px-4 py-2 text-xs">
    <div className="min-w-0 flex-1">
      <span className={`font-semibold ${current?.status === 'REJECTED' || current?.status === 'BLOCKED' ? 'text-[#DC2626]' : current?.status === 'TERMINATED' ? 'text-[#7D715E]' : 'text-[#1A1612]'}`}>{statusLabel}</span>
      {loaded && current?.status === 'PENDING' && !current.requestedByKol && current.note && (
        <p className="mt-0.5 text-[11px] text-[#7D715E] truncate" title={current.note}>Lời nhắn từ Shop: {current.note}</p>
      )}
    </div>
    {error ? <button type="button" className={buttonClass} onClick={() => void refresh()}>Thử lại</button> : loaded && current?.status === 'PENDING' && !current.requestedByKol ? <div className="flex gap-2 shrink-0"><button type="button" className="rounded-lg border border-[#EAE4D7] bg-white px-3 py-1.5 text-xs font-semibold text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#DC2626] disabled:opacity-50 cursor-pointer" disabled={busy !== null} onClick={() => void act(current.id, false)}>Từ chối lời mời</button><button type="button" className="rounded-lg border border-[#B88E4F] bg-[#C59B58] px-3 py-1.5 text-xs font-bold text-[#231D15] hover:bg-[#B88E4F] disabled:opacity-50 cursor-pointer" disabled={busy !== null} onClick={() => void act(current.id, true)}>Chấp nhận lời mời</button></div> : loaded && current?.status !== 'APPROVED' && current?.status !== 'PENDING' && current?.status !== 'BLOCKED' && <button type="button" className={buttonClass} disabled={busy !== null} onClick={() => setRequestOpen(true)}>{current?.status === 'REJECTED' || current?.status === 'TERMINATED' ? 'Gửi yêu cầu hợp tác lại' : 'Gửi yêu cầu hợp tác'}</button>}
  </div>{requestOpen && <CooperationRequestModal key={storeId} storeId={storeId} onClose={() => setRequestOpen(false)} onSuccess={() => {
    setRequestOpen(false);
    toast.success('Đã gửi yêu cầu, chờ Shop duyệt.');
    void refresh();
    onChanged?.();
    window.dispatchEvent(new Event('scanms_cooperation_changed'));
  }} />}</>;
}
