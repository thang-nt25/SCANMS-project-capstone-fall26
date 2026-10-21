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
  const pickDays = (count: number) => {
    const start = startsAt && Number.isFinite(Date.parse(startsAt)) ? new Date(startsAt) : new Date(Date.now() + 3600000);
    const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setStartsAt(local(start));
    setEndsAt(local(new Date(start.getTime() + count * 86400000)));
  };
  return <div className="sp-booking grid grid-cols-[minmax(0,1.3fr)_minmax(280px,1fr)] border border-[#EAE4D7] rounded-[16px] [&_label]:flex [&_label]:flex-col [&_label]:gap-[7px] [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-[#1A1612] [&_label]:min-w-0 [&_label>span]:hidden [&_input:not([type=hidden])]:w-full [&_input:not([type=hidden])]:min-w-0 [&_input:not([type=hidden])]:box-border [&_input:not([type=hidden])]:border [&_input:not([type=hidden])]:border-[#EAE4D7] [&_input:not([type=hidden])]:rounded-[10px] [&_input:not([type=hidden])]:bg-white [&_input:not([type=hidden])]:py-[11px] [&_input:not([type=hidden])]:px-[12px] [&_input:not([type=hidden])]:text-[13px] [&_input:not([type=hidden])]:font-normal [&_input:not([type=hidden])]:text-[#1A1612] [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-solid [&_input:focus-visible]:outline-[#C59B58] [&_input:focus-visible]:outline-offset-[2px] [@media(max-width:1000px)]:grid-cols-[1fr]">
    <form className="sp-booking-fields p-[24px] flex flex-col gap-[18px] min-w-0 [@media(max-width:520px)]:p-[16px]" onSubmit={onSubmit} onReset={() => { setHeadline(''); setStartsAt(''); setEndsAt(''); }}>
      <div className="sp-section-label flex items-center gap-[8px] text-[12px] font-bold text-[#7D715E]"><CalendarDays size={17} /> {renewal ? 'Đăng ký gia hạn quảng cáo' : 'Lịch quảng bá'}</div>
      {renewal && <div className="sp-renewal-info mt-0 py-[12px] px-[14px] border border-[#EEDFC6] rounded-[10px] bg-[#FBF5EB] text-[12px] leading-[1.6] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 [&_p]:text-[#7D715E] [&_button]:mt-[8px] [&_button]:border-0 [&_button]:p-0 [&_button]:text-[#795A2D] [&_button]:bg-transparent [&_button]:underline [&_button]:text-[12px] [&_button]:cursor-pointer"><p>Gói cũ đã hết hạn. Lịch và phí bên dưới là cho lượt quảng cáo mới, cần thanh toán và được Admin duyệt lại.</p><button type="button" onClick={onCancelRenewal}>Bỏ gia hạn</button></div>}
      <label>Tiêu đề trên banner <span aria-hidden="true">*</span>
        <input name="headline" required minLength={5} maxLength={160} value={headline}
          placeholder="VD: Sora Skin — Ưu đãi chăm sóc da" onChange={e => setHeadline(e.target.value)} />
      </label>
      <div className="sp-dates grid grid-cols-[1fr_1fr] gap-[12px] [@media(max-width:520px)]:grid-cols-[1fr]">
        <SponsorshipDateTimePicker name="startsAt" label="Bắt đầu" value={startsAt} onChange={setStartsAt} />
        <SponsorshipDateTimePicker name="endsAt" label="Kết thúc" value={endsAt} onChange={setEndsAt} />
      </div>
      <div className="sp-presets flex gap-[7px] items-center -mt-[6px] text-[12px] text-[#7D715E] [&_button]:bg-white [&_button]:border [&_button]:border-[#EAE4D7] [&_button]:rounded-[7px] [&_button]:py-[5px] [&_button]:px-[12px] [&_button]:text-[#1A1612] [&_button]:cursor-pointer [&_button:hover]:bg-[#FBF5EB] [&_button:hover]:border-[#C59B58]"><span>Chọn nhanh</span>{[1, 3, 7].map(count =>
        <button type="button" key={count} onClick={() => pickDays(count)}>{count} ngày</button>)}</div>
      {startsAt && endsAt && !valid && pricing && <p className="sp-date-error text-[#DC2626] text-[12px] m-0" role="alert">Chọn lịch còn hiệu lực, dài từ {pricing.minHours} giờ đến {pricing.maxDays} ngày.</p>}
      <div className="sp-preview-section">
      <div className="sp-preview-heading flex items-center justify-between flex-wrap gap-[6px] mb-[9px] [&>span]:text-[12px] [&>span]:font-semibold [&>span]:text-[#1A1612] [&_small]:text-[10px] [&_small]:text-[#7D715E]"><span>Xem trước banner</span><small>Chưa đăng lên trang chủ</small></div>
      <div className="sp-banner-preview flex items-center gap-[12px] p-[18px] bg-[#FAF8F5] border border-[#EEDFC6] rounded-[12px] text-[#B88E4F] min-w-0 [&>div]:flex-1 [&>div]:min-w-0 [&_strong]:block [&_strong]:text-[#1A1612] [&_strong]:text-[14px] [&_strong]:mt-[7px] [&_strong]:mb-[3px] [&_strong]:mx-0 [&_strong]:wrap-anywhere [&_small]:text-[#7D715E] [&_small]:text-[11px]" aria-label="Xem trước banner">
        <span className="sp-preview-icon bg-white border border-[#EEDFC6] rounded-[10px] w-[46px] h-[46px] grid place-items-center text-[#B88E4F] shrink-0"><Store size={25} /></span>
        <div><span className="sp-preview-tag inline-flex gap-[4px] items-center text-[#7D5D2A] bg-[#F3EFE6] border border-[#EEDFC6] py-[3px] px-[7px] rounded-[5px] text-[9px] font-bold"><Megaphone size={11} /> Được tài trợ</span>
          <strong>{headline || 'Tiêu đề quảng bá của gian hàng'}</strong><small>Nội dung minh họa cách banner hiển thị</small></div>
      </div>
      <p className="sp-preview-note mt-[8px] mb-0 mx-0 text-[#7D715E] text-[11px] leading-[1.6]">Bản xem trước không có liên kết. Banner thật chỉ hiển thị sau khi xác nhận thanh toán, được duyệt và đến lịch chạy.</p>
      </div>
      <div className="sp-booking-footer flex items-center gap-[16px] justify-between mt-auto [&_p]:text-[11px] [&_p]:leading-[1.6] [&_p]:text-[#7D715E] [&_p]:m-0 [&_p]:max-w-[260px] [&_button]:shrink-0 [&_button]:min-h-[42px] [@media(max-width:1000px)]:flex-wrap [@media(max-width:520px)]:flex-col [@media(max-width:520px)]:items-stretch [@media(max-width:520px)]:[&_p]:max-w-none">
        <div className="sp-mobile-total hidden [@media(max-width:1000px)]:w-full [@media(max-width:1000px)]:flex [@media(max-width:1000px)]:justify-between [@media(max-width:1000px)]:items-center [@media(max-width:1000px)]:text-[13px] [@media(max-width:1000px)]:pt-[12px] [@media(max-width:1000px)]:border-t [@media(max-width:1000px)]:border-t-[#EAE4D7] [@media(max-width:1000px)]:[&_strong]:text-[20px]"><span>Tổng phí quảng cáo</span><strong>{days ? sponsorshipMoney(amount) : 'Chưa chọn lịch'}</strong></div>
        <p>Gửi đăng ký chưa trừ tiền. Admin xác nhận thanh toán trước khi quảng cáo hiển thị.</p>
        <input type="hidden" name="quotedAmount" value={amount} />
        <Button type="submit" variant="gold" loading={pending} disabled={!valid} icon={<ArrowRight size={16} />} iconPosition="right">{renewal ? 'Gửi đăng ký gia hạn' : 'Gửi đăng ký'}</Button>
      </div>
    </form>
    <aside className="sp-booking-summary bg-[#FBF5EB] border-l border-l-[#EEDFC6] [border-radius:0_16px_16px_0] p-[24px] min-w-0 [@media(max-width:1000px)]:border-l-0 [@media(max-width:1000px)]:border-t [@media(max-width:1000px)]:border-t-[#EEDFC6] [@media(max-width:1000px)]:[border-radius:0_0_16px_16px] [@media(max-width:520px)]:p-[16px]" aria-label="Bảng phí quảng cáo">
      <div className="sp-section-label flex items-center gap-[8px] text-[12px] font-bold text-[#7D715E]">Vị trí tài trợ · Trang chủ</div>
      <div className="sp-rate mt-[12px] text-[28px] font-extrabold tracking-[-1px] text-[#1A1612] [&_span]:text-[13px] [&_span]:tracking-[0] [&_span]:font-normal [&_span]:text-[#7D715E] [&_span]:ml-[6px] [&_span]:whitespace-nowrap">{pricing ? sponsorshipMoney(pricing.dailyRate) : 'Đang tải phí…'}<span>/ {pricing?.billingHours ?? 24} giờ</span></div>
      <p className="sp-rate-note text-[#7D715E] text-[11px] leading-[1.7] mt-[6px] mb-0 mx-0">Tính theo thời gian hiển thị, phần lẻ làm tròn lên mỗi 24 giờ.</p>
      <ul className="sp-benefits list-none my-[20px] mx-0 p-0 grid gap-[12px] [&_li]:flex [&_li]:items-start [&_li]:gap-[8px] [&_li]:text-[12px] [&_li]:leading-[1.6] [&_svg]:text-[#B88E4F] [&_svg]:shrink-0 [&_svg]:mt-[2px]">
        <li><Check size={15} /><span>Banner riêng trên trang chủ mua sắm SCANMS</span></li>
        <li><Check size={15} /><span>Hiển thị logo, tên Shop và tiêu đề quảng bá</span></li>
        <li><MousePointer2 size={15} /><span>Nút truy cập trực tiếp vào gian hàng</span></li>
      </ul>
      <div className="sp-price-breakdown border-t border-t-[#EEDFC6] pt-[16px] grid gap-[12px] [&>div]:flex [&>div]:justify-between [&>div]:gap-[10px] [&>div]:text-[12px] [&>div]:text-[#7D715E] [&_strong]:text-[#1A1612] [&_.sp-total]:items-center [&_.sp-total]:text-[#1A1612]" aria-live="polite">
        <div><span>Thời gian tính phí</span><strong>{days ? `${days} ngày` : 'Chưa chọn lịch'}</strong></div>
        <div className="sp-total [&_strong]:text-[23px] [&_strong]:whitespace-nowrap"><span>Tổng phí quảng cáo</span><strong>{days ? sponsorshipMoney(amount) : '—'}</strong></div>
      </div>
      <p className="sp-summary-note text-[#7D715E] text-[11px] leading-[1.7] mt-[16px] mb-0 mx-0">Tối đa 6 vị trí cùng lúc. Lịch chạy cần được duyệt; không cam kết lượt xem hoặc doanh số. Hủy gói không tự hoàn phí.</p>
    </aside>
  </div>;
}
