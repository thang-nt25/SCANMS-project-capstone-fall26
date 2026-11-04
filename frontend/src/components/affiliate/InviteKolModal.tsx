import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, CheckCircle2, Copy, Mail, Share2, UserPlus, X } from 'lucide-react';
import api from '../../services/api';
import { toast } from '../../utils/toast';

export function InviteKolModal({ onClose, store }: { onClose: () => void; store?: { id: string; name: string } | null }) {
  const [ownedStore, setOwnedStore] = useState(store || null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [copyingLink, setCopyingLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sharedShopLink, setSharedShopLink] = useState('');
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
  const closeInviteModal = () => { if (!inviting) onClose(); };
  // Handler: Send Kol Invitation
  const handleInviteKol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inviting) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
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
      setInviteSuccess(`Đã gửi lời mời tới ${result.collaborator?.fullName || email}. Đang chờ KOL phản hồi trên SCANMS.`);
      setInviteEmail('');
      toast.success('Đã gửi lời mời hợp tác trên SCANMS.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không gửi được lời mời. Vui lòng thử lại.';
      setInviteError(message);
      toast.error(message);
    } finally {
      setInviting(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (copyingLink) return;
    setCopyingLink(true);
    setCopiedLink(false);
    try {
      const response: any = await api.get('/stores/my-store');
      const store = response?.data || response;
      if (!store?.slug) throw new Error('Gian hàng chưa có đường dẫn công khai để chia sẻ.');
      const link = new URL(`/shop/${encodeURIComponent(store.slug)}`, window.location.origin).href;
      setSharedShopLink(link);
      if (!navigator.clipboard?.writeText) throw new Error('Trình duyệt không hỗ trợ sao chép tự động. Hãy chọn và chép liên kết bên dưới.');
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      toast.success('Đã sao chép trang gian hàng trên SCANMS.');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (error) {
      toast.error(error instanceof DOMException ? 'Trình duyệt chưa cho phép sao chép. Hãy chọn và chép liên kết bên dưới.' : error instanceof Error ? error.message : 'Không sao chép được. Bạn có thể chọn và chép liên kết bên dưới.');
    } finally {
      setCopyingLink(false);
    }
  };

  return createPortal(
    <div className="kol-invite-overlay fixed inset-0 z-[110] flex items-center justify-center bg-[#231D15]/35 p-4 backdrop-blur-xs" onClick={closeInviteModal}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="invite-kol-title" className="kol-invite-dialog flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white shadow-[0_24px_70px_rgba(35,29,21,0.18)]" onKeyDown={event => { if (event.key === 'Escape') closeInviteModal(); }} onClick={(event) => event.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#EAE4D7] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]"><UserPlus className="h-5 w-5" /></span>
            <div><h3 id="invite-kol-title" className="text-base font-semibold text-[#1A1612]">Mời KOL hợp tác</h3><p className="mt-0.5 text-xs text-[#7D715E]">{ownedStore?.name || 'Kết nối đội ngũ nhà sáng tạo trên SCANMS'}</p></div>
          </div>
          <button type="button" disabled={inviting} onClick={closeInviteModal} aria-label="Đóng lời mời KOL" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#7D715E] transition hover:bg-[#FBF5EB] disabled:opacity-40"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={handleInviteKol} className="min-h-0 overflow-y-auto px-5 py-5">
          <p className="kol-invite-description mb-4 text-sm leading-relaxed text-[#7D715E]">Gửi lời mời tới email tài khoản SCANMS của KOL/CTV.</p>
          <label htmlFor="kol-invite-email" className="mb-1.5 block text-sm font-medium text-[#1A1612]">Email của KOL/CTV <span className="text-[#DC2626]">*</span></label>
          <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B88E4F]" /><input id="kol-invite-email" type="email" required autoComplete="email" maxLength={254} disabled={inviting} placeholder="tenkol@example.com" value={inviteEmail} onChange={(event) => { setInviteEmail(event.target.value); setInviteError(''); setInviteSuccess(''); }} aria-invalid={!!inviteError} aria-describedby="kol-invite-help" className="h-11 w-full rounded-xl border border-[#EAE4D7] bg-white pl-10 pr-3 text-sm text-[#1A1612] outline-none transition placeholder:text-[#A79B89] focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/10 disabled:opacity-60" /></div>
          <p id="kol-invite-help" className="mt-2 text-xs leading-relaxed text-[#7D715E]">Hợp tác được xác nhận khi KOL chấp nhận lời mời.</p>
          {inviteError && <p role="alert" className="mt-3 text-sm text-[#DC2626]">{inviteError}</p>}
          {inviteSuccess && <div role="status" className="mt-3 flex items-start gap-2 rounded-xl border border-[#EAE4D7] bg-white p-3 text-sm text-[#1A1612]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#059669]" /><p>{inviteSuccess}</p></div>}
          <button type="submit" disabled={inviting || !inviteEmail.trim()} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#C59B58] text-sm font-semibold text-[#231D15] transition hover:bg-[#B88E4F] disabled:cursor-not-allowed disabled:opacity-50"><UserPlus className="h-4 w-4" />{inviting ? 'Đang gửi…' : 'Gửi lời mời hợp tác'}</button>
          <details className="group mt-5 border-t border-[#EAE4D7] pt-4">
            <summary className="flex items-center gap-2 list-none cursor-pointer py-1 text-xs text-[#7D715E] [&::-webkit-details-marker]:hidden hover:text-[#1A1612]"><Share2 className="h-3.5 w-3.5 text-[#B88E4F]" /><span>Chia sẻ gian hàng</span><span className="ml-auto text-sm text-[#B88E4F] group-open:rotate-45 transition-transform" aria-hidden="true">+</span></summary>
            <p className="mt-2 text-xs leading-relaxed text-[#7D715E]">Gửi trang shop để KOL tìm hiểu. Liên kết này không tạo lời mời hợp tác.</p>
            <button type="button" disabled={copyingLink} onClick={handleCopyInviteLink} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#EAE4D7] bg-white text-xs font-medium text-[#1A1612] transition hover:bg-[#FBF5EB] disabled:opacity-50">{copiedLink ? <Check className="h-4 w-4 text-[#059669]" /> : <Copy className="h-4 w-4 text-[#B88E4F]" />}{copyingLink ? 'Đang lấy liên kết…' : copiedLink ? 'Đã sao chép' : 'Sao chép trang gian hàng'}</button>
            {sharedShopLink && <input readOnly aria-label="Liên kết trang gian hàng" value={sharedShopLink} onFocus={(event) => event.target.select()} className="mt-2 h-9 w-full rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-3 text-xs text-[#7D715E] outline-none" />}
          </details>
        </form>
      </section>
    </div>, document.body
  );

}
