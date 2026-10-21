import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Loader2, X, XCircle } from 'lucide-react';

const reasons = [
  { id: 'ADDRESS', label: 'Tôi muốn thay đổi địa chỉ hoặc SĐT nhận hàng' },
  { id: 'VOUCHER', label: 'Tôi muốn thêm hoặc thay đổi mã giảm giá' },
  { id: 'PRODUCT', label: 'Tôi muốn thay đổi sản phẩm, phân loại hoặc số lượng' },
  { id: 'PAYMENT', label: 'Tôi muốn thay đổi phương thức thanh toán' },
  { id: 'BETTER_OFFER', label: 'Tôi tìm thấy nơi mua khác phù hợp hơn' },
  { id: 'NO_LONGER_NEEDED', label: 'Tôi không còn nhu cầu mua nữa' },
  { id: 'OTHER', label: 'Lý do khác — tự nhập nội dung' },
];

interface Props {
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function CustomerCancelOrderModal({ busy, onClose, onConfirm }: Props) {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const dialog = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;
  const reason = selectedReason === 'OTHER'
    ? customReason.trim()
    : reasons.find(item => item.id === selectedReason)?.label || '';

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLButtonElement>('[data-cancel-keep]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!busyRef.current && !submitting.current) closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)') || [])]
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); dialog.current?.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !dialog.current?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason || busy || submitting.current) return;
    submitting.current = true;
    try { await onConfirm(reason); }
    finally { submitting.current = false; }
  };

  return <div className="customer-cancel-overlay fixed! inset-0! z-[80]! flex! items-center! justify-center! p-[12px]! [background:rgb(35_29_21_/_38%)]! [backdrop-filter:blur(3px)]!" onMouseDown={event => {
    if (event.target === event.currentTarget && !busy && !submitting.current) onClose();
  }}>
    <form ref={dialog} role="dialog" aria-modal="true" aria-labelledby="customer-cancel-title" aria-describedby="customer-cancel-description"
      aria-busy={busy} tabIndex={-1} className="customer-cancel-dialog flex! flex-col! w-full! max-w-[520px]! max-h-[min(92dvh,760px)]! min-h-0! m-0! overflow-hidden! [border:1px_solid_#EAE4D7]! rounded-[16px]! bg-[#FFFFFF]! text-[#1A1612]! text-left! shadow-[0_20px_70px_rgb(35_29_21_/_18%)]! [&_button:disabled]:cursor-not-allowed! [&_button:disabled]:opacity-[0.5]! [&_:is(button,input,textarea):focus-visible]:[outline:2px_solid_#C59B58]! [&_:is(button,input,textarea):focus-visible]:outline-offset-[3px]! [@media_(max-width:419px)]:max-h-[94dvh]! [@media_(max-width:419px)]:rounded-[13px]!" onSubmit={event => void submit(event)}>
      <header className="customer-cancel-header flex! items-center! shrink-0! gap-[12px]! p-[18px_20px]! [border-bottom:1px_solid_#EAE4D7]! [&_h2]:m-0! [&_h2]:text-[#1A1612]! [&_h2]:[font-family:inherit]! [&_h2]:[font-style:inherit]! [&_h2]:[font-variant:inherit]! [&_h2]:[font-stretch:inherit]! [&_h2]:text-[18px]! [&_h2]:font-[650]! [&_h2]:leading-[1.4]! [&_p]:m-[4px_0_0]! [&_p]:text-[#7D715E]! [&_p]:text-[12px]! [&_p]:leading-[1.5]! [@media_(max-width:419px)]:gap-[9px]! [@media_(max-width:419px)]:p-[14px]! [@media_(max-width:419px)]:[&_h2]:text-[16px]! [@media_(max-width:419px)]:[&_p]:text-[11px]!">
        <span className="customer-cancel-icon grid! place-items-center! shrink-0! w-[40px]! h-[40px]! [border:1px_solid_#EEDFC6]! rounded-[11px]! bg-[#FBF5EB]! text-[#B88E4F]! [@media_(max-width:419px)]:w-[34px]! [@media_(max-width:419px)]:h-[34px]!"><XCircle size={21} aria-hidden="true" /></span>
        <div><h2 id="customer-cancel-title">Hủy đơn hàng</h2><p id="customer-cancel-description">Chọn lý do hủy hoặc nhập nội dung của bạn.</p></div>
        <button type="button" className="customer-cancel-close grid! place-items-center! shrink-0! w-[32px]! h-[32px]! ml-auto! p-0! [border:1px_solid_#EAE4D7]! rounded-[8px]! bg-[#FAF8F5]! text-[#7D715E]! cursor-pointer! [&:hover:not(:disabled)]:bg-[#F3EFE6]! [&:hover:not(:disabled)]:border-[#C59B58]!" aria-label="Đóng cửa sổ hủy đơn" disabled={busy} onClick={onClose}><X size={18} /></button>
      </header>
      <div className="customer-cancel-body flex-[1]! min-h-0! p-[16px_20px_20px]! overflow-y-auto! overscroll-contain! [scrollbar-width:thin]! [scrollbar-color:#EEDFC6_transparent]! [@media_(max-width:419px)]:p-[14px]!">
        <p className="customer-cancel-notice flex! items-start! gap-[9px]! m-[0_0_18px]! p-[12px]! [border:1px_solid_#EEDFC6]! rounded-[10px]! bg-[#FBF5EB]! text-[#7D715E]! text-[12px]! leading-[1.65]! [&_svg]:shrink-0! [&_svg]:mt-[2px]! [&_svg]:text-[#B88E4F]!"><AlertCircle size={16} aria-hidden="true" /><span>Đơn hàng đang chờ Shop xác nhận. Thao tác này sẽ hủy toàn bộ sản phẩm trong đơn.</span></p>
        <fieldset disabled={busy} className="customer-cancel-reasons grid! gap-[7px]! min-w-0! m-0! p-0! border-0! [border-style:none]! [&_legend]:mb-[10px]! [&_legend]:p-0! [&_legend]:text-[#1A1612]! [&_legend]:text-[13px]! [&_legend]:font-[600]!">
          <legend>Lý do hủy đơn</legend>
          {reasons.map(item => <label className="customer-cancel-choice flex! items-start! gap-[10px]! min-h-[44px]! p-[11px_12px]! [border:1px_solid_#EAE4D7]! rounded-[9px]! bg-[#FFFFFF]! text-[#1A1612]! text-[13px]! leading-[1.55]! cursor-pointer! [&_input]:shrink-0! [&_input]:w-[16px]! [&_input]:h-[16px]! [&_input]:m-[2px_0_0]! [&_input]:[accent-color:#B88E4F]! [&_input]:cursor-pointer! [&:hover]:bg-[#FBF5EB]! [&:hover]:border-[#C59B58]! [&[data-selected='true']]:bg-[#FBF5EB]! [&[data-selected='true']]:border-[#C59B58]! [@media_(max-width:419px)]:p-[10px]! [@media_(max-width:419px)]:text-[12px]!" data-selected={selectedReason === item.id} key={item.id}>
            <input type="radio" name="customer-cancel-reason" value={item.id} checked={selectedReason === item.id}
              onChange={() => setSelectedReason(item.id)} />
            <span>{item.label}</span>
          </label>)}
          {selectedReason === 'OTHER' && <div className="customer-cancel-custom grid! gap-[7px]! pt-[5px]! [&_>_label]:text-[12px]! [&_>_label]:font-[600]! [&_>_label_span]:text-[#DC2626]! [&_textarea]:box-border! [&_textarea]:w-full! [&_textarea]:min-h-[90px]! [&_textarea]:p-[11px_12px]! [&_textarea]:[border:1px_solid_#EAE4D7]! [&_textarea]:rounded-[9px]! [&_textarea]:bg-[#FFFFFF]! [&_textarea]:text-[#1A1612]! [&_textarea]:[font-family:inherit]! [&_textarea]:[font-style:inherit]! [&_textarea]:[font-variant:inherit]! [&_textarea]:[font-stretch:inherit]! [&_textarea]:text-[13px]! [&_textarea]:leading-[1.6]! [&_textarea]:resize-y! [&_p]:flex! [&_p]:justify-between! [&_p]:gap-[12px]! [&_p]:m-0! [&_p]:text-[#7D715E]! [&_p]:text-[11px]! [&_p]:leading-[1.5]! [&_p_>_span:last-child]:shrink-0! [&_p_>_span:last-child]:tabular-nums!">
            <label htmlFor="customer-cancel-custom-reason">Nội dung lý do <span aria-hidden="true">*</span></label>
            <textarea id="customer-cancel-custom-reason" value={customReason} onChange={event => setCustomReason(event.target.value)}
              required maxLength={500} rows={3} placeholder="Nhập lý do bạn muốn hủy đơn…" aria-describedby="customer-cancel-custom-hint" />
            <p id="customer-cancel-custom-hint"><span>Vui lòng nhập nội dung trước khi xác nhận.</span><span>{customReason.length}/500</span></p>
          </div>}
        </fieldset>
      </div>
      <footer className="customer-cancel-footer grid! grid-cols-[repeat(2,minmax(0,1fr))]! shrink-0! gap-[10px]! p-[14px_20px]! [border-top:1px_solid_#EAE4D7]! bg-[#FAF8F5]! [&_button]:inline-flex! [&_button]:items-center! [&_button]:justify-center! [&_button]:gap-[7px]! [&_button]:min-w-0! [&_button]:min-h-[44px]! [&_button]:p-[10px_12px]! [&_button]:[border:1px_solid_#EAE4D7]! [&_button]:rounded-[9px]! [&_button]:bg-[#FFFFFF]! [&_button]:text-[#7D715E]! [&_button]:[font-family:inherit]! [&_button]:[font-style:inherit]! [&_button]:[font-variant:inherit]! [&_button]:[font-stretch:inherit]! [&_button]:text-[13px]! [&_button]:font-[600]! [&_button]:leading-[1.5]! [&_button]:cursor-pointer! [&_.customer-cancel-confirm]:border-[#EEDFC6]! [&_.customer-cancel-confirm]:bg-[#FBF5EB]! [&_.customer-cancel-confirm]:text-[#1A1612]! [&_button:hover:not(:disabled)]:bg-[#F3EFE6]! [&_button:hover:not(:disabled)]:border-[#C59B58]! [@media_(max-width:419px)]:p-[12px_14px]!">
        <button type="button" data-cancel-keep disabled={busy} onClick={onClose}>Giữ lại đơn</button>
        <button type="submit" disabled={busy || !reason} className="customer-cancel-confirm">{busy && <Loader2 size={15} className="animate-spin" />}<span>{busy ? 'Đang hủy đơn…' : 'Xác nhận hủy'}</span></button>
      </footer>
    </form>
  </div>;
}
