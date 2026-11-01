import { useRef, useState, type FormEvent } from 'react';
import api from '../../services/api';
import { Modal } from '../ui/Modal';

export function CooperationRequestModal({ storeId, onClose, onSuccess }: {
  storeId: string; onClose: () => void; onSuccess: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true; setBusy(true); setError('');
    try {
      await api.post('/store-collaborators/request', { storeId, note: note.trim() || undefined });
      onSuccess();
    } catch (caught: any) {
      const message = caught?.response?.data?.message || caught?.message;
      setError(Array.isArray(message) ? message.join('. ') : message || 'Không gửi được đề xuất. Vui lòng thử lại.');
    } finally { locked.current = false; setBusy(false); }
  }
  return <Modal isOpen title="Đề xuất hợp tác với gian hàng" subtitle="Shop sẽ xem hồ sơ KOC và phản hồi đề xuất của bạn." onClose={() => { if (!busy) onClose(); }} maxWidth="lg">
    <form onSubmit={submit} className="space-y-4 text-sm text-[#1A1612]" aria-busy={busy}>
      <label className="block">Kế hoạch nội dung và cam kết hợp tác
        <textarea aria-label="Kế hoạch hợp tác với gian hàng" value={note} onChange={event => setNote(event.target.value)} maxLength={255} rows={4} disabled={busy} placeholder="Ví dụ: Kênh chuyên chăm sóc da, dự kiến thực hiện 2 video review mỗi tháng…" className="mt-2 w-full rounded-xl border border-[#EAE4D7] bg-white p-3 focus:border-[#C59B58] focus:outline-none" />
        <span className="mt-1 block text-right text-xs text-[#7D715E]">{note.length}/255</span>
      </label>
      <p className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] p-3 text-xs text-[#7D715E]">Shop xem kênh xã hội và lượng người theo dõi từ hồ sơ của bạn. Đề xuất hợp tác này chưa cấp mức thù lao VIP hoặc coupon.</p>
      {error && <p role="alert" className="text-[#DC2626]">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-[#EAE4D7] px-4 py-2">Hủy</button><button type="submit" disabled={busy} className="rounded-xl bg-[#C59B58] px-4 py-2 font-semibold hover:bg-[#B88E4F] disabled:opacity-50">{busy ? 'Đang gửi…' : 'Gửi đề xuất hợp tác'}</button></div>
    </form>
  </Modal>;
}
