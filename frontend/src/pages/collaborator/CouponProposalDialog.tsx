import type { FormEvent } from 'react';
import { Loader2, Ticket, Store } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';

type Partner = { id?: string; storeId?: string; name?: string; storeName?: string; logoUrl?: string | null };
export function CouponProposalDialog({ open, onClose, stores, storeId, setStoreId, code, setCode, note, setNote, valid, validationError, error, success, busy, onSubmit }: {
  open: boolean; onClose: () => void; stores: Partner[]; storeId: string; setStoreId: (id: string) => void;
  code: string; setCode: (code: string) => void; note: string; setNote: (note: string) => void;
  valid: boolean; validationError: string; error: string | null; success: string | null; busy: boolean; onSubmit: (event: FormEvent) => void;
}) {
  const selected = stores.find(s => (s.id || s.storeId) === storeId);
  return <Modal isOpen={open} onClose={onClose} title="Đề xuất mã" icon={<Ticket size={19} />} maxWidth="2xl" stickyHeader className="kc-proposal-dialog" bodyClassName="kc-proposal-body" footer={<div className="kc-proposal-actions"><button type="button" onClick={onClose}>Hủy</button><button type="submit" form="kol-coupon-proposal-form" disabled={!valid || busy || !stores.length || !storeId}>{busy ? <><Loader2 size={16} className="animate-spin" />Đang gửi…</> : 'Gửi đề xuất'}</button></div>}>
    <form id="kol-coupon-proposal-form" onSubmit={onSubmit} className="kc-proposal-form">
      {error && <p role="alert" className="kc-proposal-error">{error}</p>}
      {success && <p role="status" className="kc-proposal-success">{success}</p>}
      <div><label htmlFor="coupon-partner-store">Cửa hàng <span>*</span></label><div className="kc-proposal-store"><span className="kc-proposal-logo">{selected?.logoUrl ? <img src={selected.logoUrl} alt="" onError={event => { event.currentTarget.hidden = true; }} /> : <Store size={18} />}</span><Select id="coupon-partner-store" aria-label="Chọn cửa hàng đề xuất mã" value={storeId} onChange={event => setStoreId(event.target.value)} disabled={!stores.length || busy} searchable={stores.length > 5}>
        {!stores.length && <option value="">Chưa có cửa hàng phù hợp</option>}
        {stores.map(s => <option key={s.id || s.storeId} value={s.id || s.storeId}>{s.name || s.storeName || 'Cửa hàng đối tác'}</option>)}
      </Select></div>{!stores.length && <p className="kc-proposal-help">Cần Deal toàn cửa hàng đã duyệt để đề xuất mã.</p>}</div>
      <div><div className="kc-proposal-label"><label htmlFor="coupon-proposal-code">Mã mong muốn <span>*</span></label><span>{code.length}/20</span></div>
        <input id="coupon-proposal-code" aria-describedby="coupon-code-feedback" aria-invalid={Boolean(code && !valid)} value={code} onChange={event => setCode(event.target.value.toUpperCase().replace(/\s/g, ''))} maxLength={20} autoComplete="off" placeholder="Ví dụ: ANNHI10" required disabled={busy} />
        <p id="coupon-code-feedback" className={code && !valid ? 'kc-proposal-error' : 'kc-proposal-help'}>{code && !valid ? validationError : '4–20 ký tự, gồm chữ và số; có ít nhất một chữ cái.'}</p>
        <div className="kc-proposal-suggestions" aria-label="Gợi ý tên mã">{['GOCREVIEW', 'CHONCUATOI', 'KENHCUATOI'].map(value => <button key={value} type="button" onClick={() => setCode(value)} disabled={busy}>{value}</button>)}</div>
      </div>
      <div><label htmlFor="coupon-proposal-note">Ghi chú <small>Không bắt buộc</small></label><textarea id="coupon-proposal-note" value={note} onChange={event => setNote(event.target.value)} placeholder="Lời nhắn cho cửa hàng…" rows={3} disabled={busy} /></div>
      <p className="kc-proposal-notice">Shop xác nhận điều kiện ưu đãi trước khi kích hoạt.</p>
    </form>
  </Modal>;
}
