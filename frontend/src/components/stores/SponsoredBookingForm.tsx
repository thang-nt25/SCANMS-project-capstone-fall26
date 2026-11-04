import { useState, type FormEventHandler } from 'react';
import { ArrowRight, CalendarDays, Check, Megaphone, MousePointer2, Store } from 'lucide-react';
import { Button } from '../ui/Button';
import { SponsorshipDateTimePicker } from './SponsorshipDateTimePicker';

export const sponsorshipMoney = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
type Pricing = { dailyRate: number; billingHours: number; minHours: number; maxDays: number };

export function SponsoredBookingForm({ pricing, pending, onSubmit, renewal, onCancelRenewal }: {
  pricing?: Pricing; pending: boolean; onSubmit: FormEventHandler<HTMLFormElement>;
  renewal?: { headline: string; startsAt: string; endsAt: string } | null;
  onCancelRenewal?: () => void;
}) {
  const [headline, setHeadline] = useState(renewal?.headline ?? '');
  const [startsAt, setStartsAt] = useState(renewal?.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(renewal?.endsAt ?? '');
  const duration = Date.parse(endsAt) - Date.parse(startsAt);
  const valid = !!pricing && duration >= pricing.minHours * 3600000
    && duration <= pricing.maxDays * 86400000 && Date.parse(endsAt) > Date.now();
  const days = valid ? Math.ceil(duration / (pricing!.billingHours * 3600000)) : 0;
  const amount = days * (pricing?.dailyRate ?? 0);
  return <div className="sp-booking grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
    <form className="sp-booking-fields flex min-w-0 flex-col gap-4 rounded-xl border border-[#EAE4D7] bg-white p-4 sm:p-5 [&_label]:grid [&_label]:min-w-0 [&_label]:gap-2 [&_label]:text-xs [&_label]:font-medium [&_label]:text-[#1A1612] [&_label>input]:h-10 [&_label>input]:w-full [&_label>input]:min-w-0 [&_label>input]:rounded-lg [&_label>input]:border [&_label>input]:border-[#EAE4D7] [&_label>input]:bg-white [&_label>input]:px-3 [&_label>input]:text-[13px] [&_label>input]:font-normal [&_label>input]:outline-none [&_label>input:focus]:border-[#C59B58] [&_label>input:focus]:ring-2 [&_label>input:focus]:ring-[#C59B58]/10 [&_.sp-date-trigger]:min-h-10 [&_.sp-date-trigger]:py-2 [&_.sp-field-label]:text-xs [&_.sp-field-label]:font-medium" onSubmit={onSubmit} onReset={() => { setHeadline(''); setStartsAt(''); setEndsAt(''); }}>
      <div className="sp-section-label flex items-center gap-2 text-xs font-semibold text-[#7D715E]"><CalendarDays size={17} /> {renewal ? 'Đăng ký gia hạn quảng cáo' : 'Lịch quảng bá'}</div>
      {renewal && <div className="sp-renewal-info mt-0 py-[12px] px-[14px] border border-[#EEDFC6] rounded-[10px] bg-[#FBF5EB] text-[12px] leading-[1.6] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 [&_p]:text-[#7D715E] [&_button]:mt-[8px] [&_button]:border-0 [&_button]:p-0 [&_button]:text-[#795A2D] [&_button]:bg-transparent [&_button]:underline [&_button]:text-[12px] [&_button]:cursor-pointer"><p>Gói cũ đã hết hạn. Lịch và phí bên dưới là cho lượt quảng cáo mới, cần thanh toán và được Admin duyệt lại.</p><button type="button" onClick={onCancelRenewal}>Bỏ gia hạn</button></div>}
      <label>Tiêu đề trên banner <span aria-hidden="true">*</span>
        <input name="headline" required minLength={5} maxLength={160} value={headline}
          placeholder="VD: Sora Skin — Ưu đãi chăm sóc da" onChange={e => setHeadline(e.target.value)} />
      </label>
      <div className="sp-dates grid grid-cols-[1fr_1fr] gap-[12px] [@media(max-width:520px)]:grid-cols-[1fr]">
        <SponsorshipDateTimePicker name="startsAt" label="Bắt đầu" value={startsAt} onChange={setStartsAt} />
        <SponsorshipDateTimePicker name="endsAt" label="Kết thúc" value={endsAt} onChange={setEndsAt} />
      </div>
      {startsAt && endsAt && !valid && pricing && <p className="sp-date-error text-[#DC2626] text-[12px] m-0" role="alert">Chọn lịch còn hiệu lực, dài từ {pricing.minHours} giờ đến {pricing.maxDays} ngày.</p>}
      <div className="sp-preview-section">
      <div className="sp-preview-heading mb-2 text-xs font-medium text-[#1A1612]">Xem trước banner</div>
      <div className="sp-banner-preview flex min-w-0 items-center gap-3 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB]/30 p-3 text-[#B88E4F] [&>div]:min-w-0 [&>div]:flex-1 [&_strong]:my-1 [&_strong]:block [&_strong]:text-[13px] [&_strong]:font-semibold [&_strong]:text-[#1A1612] [&_strong]:wrap-anywhere [&_small]:text-[11px] [&_small]:text-[#7D715E]" aria-label="Xem trước banner">
        <span className="sp-preview-icon grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#EEDFC6] bg-white text-[#B88E4F]"><Store size={25} /></span>
        <div><span className="sp-preview-tag inline-flex items-center gap-1 rounded border border-[#EEDFC6] bg-white px-1.5 py-0.5 text-[9px] font-medium text-[#B88E4F]"><Megaphone size={11} /> Được tài trợ</span>
          <strong>{headline || 'Tiêu đề quảng bá của gian hàng'}</strong></div>
      </div>
      </div>
      <div className="sp-booking-footer mt-auto flex justify-end border-t border-[#EAE4D7] pt-3 [&_button]:min-h-9 [&_button]:rounded-lg [&_button]:text-xs">
        <input type="hidden" name="quotedAmount" value={amount} />
        <Button type="submit" variant="gold" loading={pending} disabled={!valid} icon={<ArrowRight size={16} />} iconPosition="right">{renewal ? 'Gửi đăng ký gia hạn' : 'Gửi đăng ký'}</Button>
      </div>
    </form>
    <aside className="sp-booking-summary min-w-0 space-y-3 rounded-xl border border-[#EEDFC6] bg-white p-4 sm:p-5" aria-label="Bảng phí quảng cáo">
      <div className="sp-section-label flex items-center gap-[8px] text-[12px] font-bold text-[#7D715E]">Vị trí tài trợ · Trang chủ</div>
      <div className="sp-rate text-2xl font-semibold tracking-tight text-[#1A1612] [&_span]:ml-1.5 [&_span]:whitespace-nowrap [&_span]:text-xs [&_span]:font-normal [&_span]:tracking-normal [&_span]:text-[#7D715E]">{pricing ? sponsorshipMoney(pricing.dailyRate) : 'Đang tải phí…'}<span>/ {pricing?.billingHours ?? 24} giờ</span></div>
      <ul className="sp-benefits m-0 grid list-none gap-2 border-t border-[#EAE4D7] py-3 [&_li]:flex [&_li]:items-start [&_li]:gap-2 [&_li]:text-xs [&_li]:leading-relaxed [&_svg]:mt-0.5 [&_svg]:shrink-0 [&_svg]:text-[#B88E4F]">
        <li><Check size={15} /><span>Banner riêng trên trang chủ mua sắm SCANMS</span></li>
        <li><Check size={15} /><span>Hiển thị logo, tên Shop và tiêu đề quảng bá</span></li>
        <li><MousePointer2 size={15} /><span>Nút truy cập trực tiếp vào gian hàng</span></li>
      </ul>
      <div className="sp-price-breakdown grid gap-3 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB]/50 p-3 [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-3 [&>div]:text-xs [&>div]:text-[#7D715E] [&_strong]:text-[#1A1612] [&_.sp-total]:border-t [&_.sp-total]:border-[#EEDFC6] [&_.sp-total]:pt-3 [&_.sp-total_strong]:text-lg [&_.sp-total_strong]:text-[#B88E4F]" aria-live="polite">
        <div><span>Thời gian tính phí</span><strong>{days ? `${days} ngày` : 'Chưa chọn lịch'}</strong></div>
        <div className="sp-total [&_strong]:whitespace-nowrap"><span>Tổng phí quảng cáo</span><strong>{days ? sponsorshipMoney(amount) : '—'}</strong></div>
      </div>
    </aside>
  </div>;
}
