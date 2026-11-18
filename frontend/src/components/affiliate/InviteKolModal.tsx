import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Mail, UserPlus, X } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';

export function InviteKolModal({ onClose, store }: { onClose: () => void; store?: { id: string; name: string } | null }) {
  const [ownedStore, setOwnedStore] = useState(store || null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const inviteLock = useRef(false);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let active = true;
    if (!store) void api.get('/stores/my-store').then((response: any) => {
      if (active) setOwnedStore(response?.data || response);
    }).catch(() => {});
    return () => { active = false; };
  }, [store]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  const closeInviteModal = () => { if (!inviting && !inviteLock.current) onClose(); };
  // Handler: Send Kol Invitation
  const handleInviteKol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviting || inviteLock.current) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    inviteLock.current = true;
    setInviteError('');
    setInviteSuccess('');
    setInviting(true);
    try {
      const response: any = await api.post('/store-collaborators/invite', {
        email,
        ...(ownedStore ? { storeId: ownedStore.id } : {}),
      });
      const result = response?.data || response;
      if (!result?.invitation?.id) throw new Error('Máy chủ chưa xác nhận lời mời. Vui lòng thử lại.');
      setInviteSuccess(`Đã gửi lời mời tới ${email}. Chờ KOL phản hồi.`);
      setInviteEmail('');
      toast.success('Đã gửi lời mời hợp tác trên SCANMS.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không gửi được lời mời. Vui lòng thử lại.';
      setInviteError(message);
      toast.error(message);
    } finally {
      inviteLock.current = false;
      setInviting(false);
    }
  };

  return createPortal(
    <div className="kol-invite-overlay fixed inset-0 z-[110] flex items-center justify-center bg-[#231D15]/35 p-4 backdrop-blur-xs" onClick={closeInviteModal}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="invite-kol-title" className="kol-invite-dialog flex max-h-[90dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-[0_24px_70px_rgba(35,29,21,0.18)]" onKeyDown={event => { if (event.key === 'Escape') closeInviteModal(); }} onClick={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#EAE4D7] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]"><UserPlus className="h-5 w-5" /></span>
            <div><h3 id="invite-kol-title" className="text-base font-semibold text-[#1A1612]">Mời KOL hợp tác</h3><p className="mt-0.5 text-xs text-[#7D715E]">{ownedStore?.name || 'Kết nối đội ngũ nhà sáng tạo trên SCANMS'}</p></div>
          </div>
          <button type="button" disabled={inviting} onClick={closeInviteModal} aria-label="Đóng lời mời KOL" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#7D715E] transition hover:bg-[#FBF5EB] disabled:opacity-40"><X className="h-4 w-4" /></button>
        </header>
        <form id="kol-invite-form" onSubmit={handleInviteKol} className="min-h-0 overflow-y-auto px-5 py-5">

          <label htmlFor="kol-invite-email" className="mb-1.5 block text-[13px] font-medium text-[#1A1612]">Email tài khoản SCANMS <span className="text-[#DC2626]">*</span></label>
          <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B88E4F]" /><input id="kol-invite-email" type="email" required autoComplete="email" maxLength={254} disabled={inviting} placeholder="tenkol@example.com" value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); setInviteError(''); setInviteSuccess(''); }} aria-invalid={!!inviteError} aria-describedby="kol-invite-help" className="h-[42px] w-full rounded-lg border border-[#EAE4D7] bg-white pl-10 pr-3 text-sm text-[#1A1612] outline-none transition placeholder:text-[#A79B89] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/10 disabled:opacity-60" /></div>
          <p id="kol-invite-help" className="mt-2 text-xs leading-relaxed text-[#7D715E]">Hợp tác bắt đầu khi KOL chấp nhận lời mời.</p>
          {inviteError && <p role="alert" className="mt-3 text-sm text-[#DC2626]">{inviteError}</p>}
          {inviteSuccess && <div role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm text-[#1A1612]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" /><p>{inviteSuccess}</p></div>}


        </form>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-[#EAE4D7] px-5 py-3">
          <button type="button" disabled={inviting} onClick={closeInviteModal} className="h-[42px] rounded-lg border border-[#EAE4D7] px-4 text-[13px] font-medium text-[#7D715E] disabled:opacity-50">{inviteSuccess ? 'Đóng' : 'Quay lại'}</button>
          <button type="submit" form="kol-invite-form" disabled={inviting || !inviteEmail.trim()} className="h-[42px] rounded-lg border border-[#B88E4F] bg-[#C59B58] px-4 text-[13px] font-semibold text-[#231D15] hover:bg-[#B88E4F] disabled:cursor-not-allowed disabled:opacity-50">{inviting ? 'Đang gửi…' : 'Gửi lời mời'}</button>
        </footer>
      </section>
    </div>, document.body
  );

}
