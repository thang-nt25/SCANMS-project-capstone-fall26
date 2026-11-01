import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Award, Clock, MapPin, Truck, Users, X } from 'lucide-react';
import type { SampleRequestItem } from '../../pages/merchant/ShopSampleManagementTab';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';

export function SampleRequestDetails({ sample, onClose, children }: { sample: SampleRequestItem; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      const dialogs = [...document.querySelectorAll('[role="dialog"]')];
      if (dialogs.at(-1) !== dialog.current) return;
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
      if (event.key === 'Tab') {
        const controls = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary') || [])].filter(el => el.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [onClose]);
  return createPortal(<div className="fixed inset-0 z-50 grid place-items-center bg-[#231D15]/35 p-3 backdrop-blur-[2px]" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="sample-details-title" tabIndex={-1} className="flex max-h-[90dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white text-left font-sans text-[#1A1612] shadow-xl outline-none">
      <header className="flex items-start justify-between gap-3 border-b border-[#EAE4D7] px-5 py-4"><div><h2 id="sample-details-title" className="text-base font-semibold">Chi tiết hàng mẫu</h2><p className="mt-1 text-xs text-[#7D715E]">{sample.collaboratorInfo?.fullName || 'Nhà sáng tạo'} · {new Date(sample.createdAt).toLocaleDateString('vi-VN')}</p></div><button type="button" onClick={onClose} aria-label="Đóng chi tiết hàng mẫu" className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-[#7D715E] hover:bg-[#F3EFE6] focus-visible:outline-2 focus-visible:outline-[#C59B58]"><X size={18} /></button></header>
      <div className="min-h-0 space-y-4 overflow-y-auto p-5 text-xs">
        <section className="flex items-center gap-3 rounded-xl border border-[#EAE4D7] p-3"><img src={getSafeProductImageUrl(sample.product.thumbnail, sample.product.title)} alt={sample.product.title} className="h-12 w-12 shrink-0 rounded-lg border border-[#EAE4D7] object-contain" /><div className="min-w-0"><h3 className="font-semibold leading-relaxed">{sample.product.title}</h3><p className="mt-1 text-[11px] text-[#7D715E]">{sample.productVariantName || 'Bản tiêu chuẩn'}</p></div></section>
        <section><h3 className="mb-2 flex items-center gap-2 font-semibold"><MapPin size={15} className="text-[#B88E4F]" />Thông tin nhận hàng</h3><dl className="grid grid-cols-2 gap-3 rounded-xl bg-[#FAF8F5] p-3 leading-relaxed"><div><dt className="text-[11px] text-[#7D715E]">Người nhận</dt><dd className="mt-1 break-words font-medium">{sample.recipientName || 'Chưa cập nhật'}</dd></div><div><dt className="text-[11px] text-[#7D715E]">Điện thoại</dt><dd className="mt-1">{sample.recipientPhone || 'Chưa cập nhật'}</dd></div><div className="col-span-2"><dt className="text-[11px] text-[#7D715E]">Địa chỉ</dt><dd className="mt-1 break-words">{sample.shippingAddress || 'Chưa cập nhật'}</dd></div></dl></section>
        <section className="overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white">
          <div className="flex items-center gap-2.5 px-4 pt-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]"><Users size={16} /></span><h3 className="text-[13px] font-semibold">Nhà sáng tạo</h3></div>
          <dl className="grid grid-cols-2 gap-3 p-4">
            <div className="rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-3"><dt className="text-[11px] text-[#7D715E]">Cấp bậc</dt><dd className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#795A2D]"><Award size={16} className="shrink-0 text-[#B88E4F]" />{sample.collaboratorInfo?.tier || 'Mới'}</dd></div>
            <div className="rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] px-3 py-3"><dt className="text-[11px] text-[#7D715E]">Người theo dõi</dt><dd className="mt-1.5 text-lg font-semibold leading-5 tabular-nums tracking-tight">{sample.collaboratorMetrics?.totalFollowers != null ? sample.collaboratorMetrics.totalFollowers.toLocaleString('vi-VN') : '—'}</dd></div>
          </dl>
        </section>
        <section className="rounded-2xl border border-[#EAE4D7] bg-white p-4">
          <div className="mb-3 flex items-center gap-2.5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FBF5EB] text-[#B88E4F]"><Truck size={16} /></span><h3 className="text-[13px] font-semibold">Vận chuyển & thời hạn</h3></div>
          <dl className="divide-y divide-[#EAE4D7] rounded-xl bg-[#FAF8F5] px-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 py-3"><dt className="text-[11px] text-[#7D715E]">Mã vận đơn</dt><dd>{sample.trackingCode ? <span className="break-all font-mono text-xs font-semibold text-[#795A2D]">{sample.trackingCode}</span> : <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EAE4D7] bg-white px-2.5 py-1 text-[11px] font-medium text-[#7D715E]"><span className="h-1.5 w-1.5 rounded-full bg-[#C59B58]" />Chưa phát hành</span>}</dd></div>
            <div className="py-3"><dt className="flex items-center gap-1.5 text-[11px] text-[#7D715E]"><Clock size={13} />Hạn nộp video</dt><dd className={`mt-1.5 leading-relaxed ${sample.deadlineAt ? 'font-medium' : 'text-[11px] text-[#7D715E]'}`}>{sample.deadlineAt ? new Date(sample.deadlineAt).toLocaleString('vi-VN') : 'Bắt đầu khi GHN xác nhận giao hàng.'}</dd></div>
          </dl>
          {children}
        </section>
      </div>
      <footer className="flex justify-end border-t border-[#EAE4D7] px-5 py-3"><button type="button" onClick={onClose} className="cursor-pointer rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-4 py-2 text-xs font-semibold hover:bg-[#F3EFE6]">Đóng</button></footer>
    </div>
  </div>, document.body);
}
