import { useState, type FormEventHandler } from 'react';
import { ArrowRight, CalendarDays, Megaphone, Store } from 'lucide-react';
import { Button } from '../ui/Button';
import { SponsorshipDateTimePicker } from './SponsorshipDateTimePicker';
import { handleStoreImageError } from '@/utils/image-fallback.utils';

export const sponsorshipMoney = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
type Pricing = { dailyRate: number; billingHours: number; minHours: number; maxDays: number };

export function SponsoredBookingForm({ pricing, pending, onSubmit, renewal, onCancelRenewal, storefront }: {
  pricing?: Pricing; pending: boolean; onSubmit: FormEventHandler<HTMLFormElement>;
  renewal?: { headline: string; startsAt: string; endsAt: string } | null;
  onCancelRenewal?: () => void;
  storefront?: { name: string; logoUrl: string };
}) {
  const [headline, setHeadline] = useState(renewal?.headline ?? '');
  const [startsAt, setStartsAt] = useState(renewal?.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(renewal?.endsAt ?? '');
  const duration = Date.parse(endsAt) - Date.parse(startsAt);
  const valid = !!pricing && duration >= pricing.minHours * 3600000
    && duration <= pricing.maxDays * 86400000 && Date.parse(endsAt) > Date.now();
  const periods = valid ? Math.ceil(duration / (pricing.billingHours * 3600000)) : 0;
  const amount = periods * (pricing?.dailyRate ?? 0);

  return (
    <form className="sp-booking rounded-xl border border-[#EAE4D7]" onSubmit={onSubmit} onReset={() => { setHeadline(''); setStartsAt(''); setEndsAt(''); }}>
      <div className="grid items-start @min-[700px]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="sp-booking-fields min-w-0 space-y-4 p-4 sm:p-5">
          <h3 className="sp-section-label flex items-center gap-2 text-sm font-semibold text-[#1A1612]">
            <CalendarDays size={16} aria-hidden="true" className="text-[#B88E4F]" />{renewal ? 'Lịch gia hạn' : 'Lịch quảng bá'}
          </h3>
          {renewal && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2.5 py-2 text-xs text-[#765629]">
              <span>Gia hạn cần thanh toán và duyệt lại.</span>
              <button type="button" onClick={onCancelRenewal} className="font-semibold underline">Bỏ gia hạn</button>
            </div>
          )}
          <label className="grid gap-1.5 text-xs font-semibold text-[#665948]">
            <span>Tiêu đề banner <span aria-hidden="true" className="text-[#DC2626]">*</span></span>
            <input name="headline" required minLength={5} maxLength={160} value={headline}
              placeholder="Nhập tiêu đề banner…" onChange={event => setHeadline(event.target.value)}
              className="h-[42px] w-full min-w-0 rounded-lg border border-[#EAE4D7] px-3 text-sm font-normal text-[#1A1612] outline-none focus:border-[#B88E4F]" />
          </label>
          <div className="sp-dates relative grid gap-2.5 sm:grid-cols-2">
            <SponsorshipDateTimePicker name="startsAt" label="Bắt đầu" value={startsAt} onChange={setStartsAt} />
            <SponsorshipDateTimePicker name="endsAt" label="Kết thúc" value={endsAt} onChange={setEndsAt} earlierValue={startsAt} />
          </div>
          {startsAt && endsAt && !valid && pricing && (
            <p role="alert" className="text-xs text-[#DC2626]">Chọn lịch chưa kết thúc và kéo dài từ {pricing.minHours} giờ đến {pricing.maxDays} ngày.</p>
          )}
        </div>

        <aside className="sp-booking-summary min-w-0 self-stretch border-t border-[#EAE4D7] bg-[#FAF8F5]/50 p-4 sm:p-5 @min-[700px]:rounded-tr-xl @min-[700px]:border-t-0 @min-[700px]:border-l" aria-label="Banner và phí quảng cáo">
          <div className="sp-banner-preview flex min-w-0 items-center gap-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB]/60 px-3.5 py-3" role="group" aria-label="Xem trước banner">
            <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-[#EEDFC6] bg-white text-[#B88E4F]">
              {storefront?.logoUrl ? <img src={storefront.logoUrl} onError={handleStoreImageError} alt="" className="size-full object-contain" /> : <Store size={19} aria-hidden="true" />}
            </span>
            <div className="min-w-0 space-y-0.5 leading-relaxed">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#765629]"><Megaphone size={11} aria-hidden="true" /> Được tài trợ</span>
              <p className="wrap-anywhere text-xs font-semibold text-[#1A1612]">{headline || 'Tiêu đề quảng bá của gian hàng'}</p>
              {storefront?.name && <p className="wrap-anywhere text-[11px] text-[#7D715E]">{storefront.name}</p>}
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-[#7D715E]">Banner tài trợ trên trang chủ SCANMS</p>
          <dl className="sp-price-breakdown mt-3.5 divide-y divide-[#EAE4D7] border-t border-[#EAE4D7] text-xs" aria-live="polite">
            <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-[#7D715E]">Đơn giá</dt><dd className="text-right font-semibold tabular-nums">{pricing ? `${sponsorshipMoney(pricing.dailyRate)} / ${pricing.billingHours} giờ` : 'Chưa có đơn giá'}</dd></div>
            <div className="flex items-center justify-between gap-3 py-2.5"><dt className="text-[#7D715E]">Số kỳ tính phí</dt><dd className="text-right font-medium tabular-nums">{periods ? `${periods} kỳ (làm tròn lên)` : startsAt && endsAt ? '—' : 'Chưa chọn lịch'}</dd></div>
            <div className="sp-total flex items-center justify-between gap-3 pt-2.5"><dt className="font-semibold">Tổng phí</dt><dd className="text-sm font-bold tabular-nums text-[#765629]">{periods ? sponsorshipMoney(amount) : '—'}</dd></div>
          </dl>
        </aside>
      </div>
      <footer className="sp-booking-footer flex justify-end border-t border-[#EAE4D7] px-3.5 py-2.5 sm:px-4">
        <input type="hidden" name="quotedAmount" value={amount} />
        <Button type="submit" variant="gold" size="sm" className="h-9 rounded-lg" loading={pending} disabled={!valid} icon={<ArrowRight size={14} />} iconPosition="right">{renewal ? 'Gửi đăng ký gia hạn' : 'Gửi đăng ký'}</Button>
      </footer>
    </form>
  );
}
