import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Handshake } from 'lucide-react';
import { useStoreCooperations } from '../../hooks/useStoreCooperations';
import { authService } from '../../services/auth.service';
import { CooperationRequestModal } from './CooperationRequestModal';
import { toast } from '../../utils/toast';

/** The shared query loads invitations once for all visible cards, not once per Shop. */
export function StoreCooperationAction({ storeId, storeName, className = '', tabIndex }: {
  storeId: string; storeName: string; className?: string; tabIndex?: number;
}) {
  const [viewer, setViewer] = useState(() => authService.getCurrentUser());
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isKoc = viewer?.role === 'COLLABORATOR';
  useEffect(() => {
    const refresh = () => { setViewer(authService.getCurrentUser()); setOpen(false); };
    const storageChanged = (event: StorageEvent) => { if (!event.key || event.key === 'user' || event.key === 'token') refresh(); };
    window.addEventListener('auth-user-updated', refresh);
    window.addEventListener('scanms_auth_changed', refresh);
    window.addEventListener('storage', storageChanged);
    return () => {
      window.removeEventListener('auth-user-updated', refresh);
      window.removeEventListener('scanms_auth_changed', refresh);
      window.removeEventListener('storage', storageChanged);
    };
  }, []);
  const { queryKey, data = [], isPending, isError, refetch } = useStoreCooperations(viewer?.id, isKoc);
  if (!isKoc || !storeId) return null;
  const current = data.find(row => row.storeId === storeId);
  const approved = current?.status === 'APPROVED';
  const waiting = current?.status === 'PENDING';
  const style = `inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs font-semibold text-[#1A1612] transition hover:border-[#C59B58] disabled:opacity-60 ${className}`;
  return <>
    {waiting && !current.requestedByKol ? <Link className={style} tabIndex={tabIndex} to="/collaborator/collaboration?tab=messages">Xem lời mời từ Shop</Link> : <button
      type="button" tabIndex={tabIndex} className={style} data-store-cooperation={storeId}
      disabled={isPending || approved || waiting}
      onClick={() => { if (isError) void refetch(); else setOpen(true); }}
      aria-label={`${isError ? 'Thử tải trạng thái' : approved ? 'Đã hợp tác với' : waiting ? 'Chờ duyệt hợp tác với' : 'Đề xuất hợp tác với'} ${storeName}`}
    ><Handshake size={15} aria-hidden="true" />{isError ? 'Thử lại' : isPending ? 'Đang tải hợp tác…' : approved ? 'Đã hợp tác' : waiting ? 'Đang chờ Shop duyệt' : 'Đề xuất hợp tác'}</button>}
    {open && <CooperationRequestModal key={storeId} storeId={storeId} storeName={storeName} onClose={() => setOpen(false)} onSuccess={() => {
      setOpen(false); toast.success(`Đã gửi đề xuất tới ${storeName}.`);
      void queryClient.invalidateQueries({ queryKey });
    }} />}
  </>;
}
