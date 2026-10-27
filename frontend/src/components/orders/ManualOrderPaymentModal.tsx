import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PayosOrderPayment } from '../checkout/PayosOrderPayment';

export function ManualOrderPaymentModal({ order, onClose, onPaid }: {
  order: { id: string; externalOrderSn: string };
  onClose: () => void;
  onPaid: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = overflow; previous?.isConnected && previous.focus(); };
  }, []);
  return createPortal(<dialog ref={dialog} aria-labelledby="manual-payment-title" onCancel={event => { event.preventDefault(); onClose(); }}
    className="m-auto w-[calc(100%-24px)] max-w-[650px] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-2xl border border-[#EAE4D7] bg-white p-4 text-left text-[#1A1612] shadow-xl backdrop:bg-[#231D15]/30 sm:p-5">
    <header className="mb-4 flex items-start justify-between gap-3">
      <div><h2 id="manual-payment-title" className="text-base font-semibold">Thanh toán đơn thủ công</h2><p className="mt-1 text-xs text-[#7D715E]">Đơn đã được lưu. Sao chép link PayOS để gửi khách thanh toán.</p></div>
      <button type="button" onClick={onClose} aria-label="Đóng thanh toán" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#EAE4D7] bg-white"><X size={17} /></button>
    </header>
    <PayosOrderPayment key={order.id} orderCode={order.externalOrderSn} manualOrderId={order.id} onPaid={onPaid} />
    <footer className="mt-4 flex justify-end"><button type="button" onClick={onClose} className="rounded-lg border border-[#EAE4D7] bg-white px-4 py-2 text-xs font-medium hover:bg-[#FBF5EB]">Đóng</button></footer>
  </dialog>, document.body);
}
