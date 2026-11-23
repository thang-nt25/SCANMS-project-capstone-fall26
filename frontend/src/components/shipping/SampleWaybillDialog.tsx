import { useEffect, useRef } from 'react';
import type { FormEventHandler } from 'react';
import { Info, Truck, X } from 'lucide-react';
import { handleProductImageError } from '../../utils/image-fallback.utils';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';

type Environment = 'LIVE' | 'TEST';

interface Props {
  sample: {
    recipientName?: string | null;
    recipientPhone?: string | null;
    shippingAddress?: string | null;
    status: string;
    product: { title: string; thumbnail?: string | null };
  };
  environment: Environment;
  onEnvironmentChange: (value: Environment) => void;
  manualTracking?: { value: string; onChange: (value: string) => void };
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function SampleWaybillDialog({ sample, environment, onEnvironmentChange, manualTracking, busy, error, onClose, onSubmit }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const live = environment === 'LIVE';
  const liveAllowed = sample.status !== 'SHIPPED';
  const canSubmit = manualTracking ? Boolean(manualTracking.value.trim()) : !live || liveAllowed;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [error]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="sample-shipping-title"
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
      className="m-auto max-h-[calc(100dvh-24px)] w-[calc(100%-24px)] max-w-[540px] overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-0 text-[#1A1612] shadow-xl backdrop:bg-[#231D15]/40"
    >
      <form onSubmit={event => {
        if (busy || !canSubmit) {
          event.preventDefault();
          return;
        }
        onSubmit(event);
      }} className="flex max-h-[calc(100dvh-26px)] min-h-0 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#EAE4D7] px-5 py-3">
          <h3 id="sample-shipping-title" className="flex items-center gap-2 text-base font-bold"><Truck size={19} className="text-[#946B30]" aria-hidden="true" />Tạo vận đơn gửi mẫu</h3>
          <button type="button" aria-label="Đóng khung tạo vận đơn" disabled={busy} onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-[#7D715E] hover:bg-[#FAF8F5] disabled:opacity-50"><X size={18} aria-hidden="true" /></button>
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <strong>{sample.recipientName || 'Chưa cập nhật người nhận'}</strong>
            <span className="tabular-nums text-[#655A49]">{sample.recipientPhone || 'Chưa cập nhật số điện thoại'}</span>
          </div>
          <p className="mt-1 break-words text-xs leading-relaxed text-[#655A49]">{sample.shippingAddress || 'Chưa cập nhật địa chỉ'}</p>
          <div className="mt-3 flex items-center gap-2.5">
            <img src={getSafeProductImageUrl(sample.product.thumbnail ?? undefined, sample.product.title)} onError={handleProductImageError} alt=""
              className="size-9 shrink-0 rounded-lg border border-[#EAE4D7] object-contain" />
            <p className="min-w-0 break-words text-xs font-semibold leading-relaxed">{sample.product.title}</p>
          </div>

          <div className="mt-4 border-t border-[#EAE4D7] pt-3">
            {manualTracking ? (
              <label className="block text-xs font-semibold">
                Mã vận đơn
                <input required disabled={busy} value={manualTracking.value} onChange={event => manualTracking.onChange(event.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-[#EAE4D7] px-3" />
              </label>
            ) : (
              <>
                <fieldset disabled={busy}>
                  <legend className="mb-2 text-xs font-semibold">Loại vận đơn</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(['LIVE', 'TEST'] as const).map(value => (
                      <label key={value} className="min-w-0">
                        <input className="peer sr-only" type="radio" name="sample-ghn-environment" value={value}
                          checked={environment === value} disabled={value === 'LIVE' && !liveAllowed}
                          onChange={() => onEnvironmentChange(value)} />
                        <span className="flex h-10 cursor-pointer items-center justify-center rounded-lg! border border-[#EAE4D7] px-1 text-center text-xs font-semibold text-[#655A49] peer-checked:border-[#C59B58] peer-checked:bg-[#FBF5EB] peer-checked:text-[#231D15] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#B88E4F] peer-disabled:cursor-default peer-disabled:opacity-50">
                          {value === 'LIVE' ? 'GHN thật' : 'GHN thử nghiệm'}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between gap-3"><dt>KOL trả khi nhận hàng</dt><dd className="font-semibold tabular-nums">0 ₫</dd></div>
                  <div className="flex justify-between gap-3"><dt>Cước vận chuyển</dt><dd className="text-right font-semibold">{live ? 'Shop chịu 100% cước' : 'Tham khảo'}</dd></div>
                </dl>
                <p className="mt-1 text-[11px] leading-relaxed text-[#655A49]">{live ? 'Cước ghi nhận chưa xác nhận thanh toán.' : 'Cước thử nghiệm không tính vào phí vận chuyển.'}</p>
              </>
            )}
          </div>

          {error && <div ref={errorRef} role="alert" className="mt-3 rounded-lg border border-[#FECACA] bg-[#FFF8F7] px-3 py-2 text-xs text-[#991B1B]">
            <p className="font-semibold">Chưa tạo được vận đơn gửi mẫu</p>
            <p className="mt-1 break-words leading-relaxed">{error}</p>
          </div>}
        </div>

        <footer className="shrink-0 border-t border-[#EAE4D7] px-5 py-3">
          {!manualTracking && live && <p className="mb-2 flex items-start gap-1.5 text-[11px] text-[#655A49]"><Info size={14} className="shrink-0 text-[#946B30]" aria-hidden="true" />Chỉ tạo khi kiện hàng đã sẵn sàng bàn giao.</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={busy} onClick={onClose} className="h-10 rounded-lg! border border-[#EAE4D7] px-3 text-xs font-semibold text-[#655A49] hover:bg-[#FAF8F5] disabled:opacity-50">Hủy</button>
            <button type="submit" disabled={busy || !canSubmit}
              className="min-h-10 rounded-lg! bg-[#C59B58]! px-4 text-xs font-bold text-[#231D15] hover:bg-[#B88E4F]! disabled:opacity-50">
              {busy ? 'Đang xử lý…' : manualTracking ? 'Xác nhận đã gửi hàng' : live ? 'Tạo vận đơn thật' : 'Tạo vận đơn thử nghiệm'}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
