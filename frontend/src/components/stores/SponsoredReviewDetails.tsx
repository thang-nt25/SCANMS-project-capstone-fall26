import { CalendarDays, ExternalLink, Image, Package, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Sponsorship } from '@/services/sponsorship.service';
import { handleProductImageError, handleStoreImageError } from '@/utils/image-fallback.utils';
import { SponsoredBannerPreview, sponsorshipMoney } from './SponsoredBookingForm';

const dateFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
});
const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Ho_Chi_Minh',
});

export function SponsoredReviewDetails({ booking }: { booking: Sponsorship }) {
  const { bannerImageUrl, product, store } = booking;
  const uploadedImage = bannerImageUrl?.startsWith('https://') ? bannerImageUrl : null;
  const destinations = product ? `/products/${encodeURIComponent(product.id)}` : `/shops/${encodeURIComponent(store.id)}`;
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section aria-label="Nội dung banner" className="min-w-0 space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold"><Image size={16} className="text-[#795A2D]" aria-hidden="true" /> Banner trang chủ</h4>
        <SponsoredBannerPreview headline={booking.headline} storefront={store} product={product} imageUrl={uploadedImage} large />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7D715E]">
          {uploadedImage ? (
            <a href={uploadedImage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[#795A2D] underline underline-offset-2">
              Xem ảnh gốc shop tải lên <ExternalLink size={13} aria-hidden="true" />
            </a>
          ) : <span>{product?.imageUrl ? 'Dùng ảnh sản phẩm. Shop không tải ảnh riêng.' : 'Shop không tải ảnh banner riêng.'}</span>}
        </div>
      </section>
      <div className="min-w-0 divide-y divide-[#EAE4D7] rounded-xl border border-[#EAE4D7] bg-[#FAF8F5]">
        <section aria-label="Sản phẩm quảng bá" className="p-3.5">
          <h4 className="mb-2.5 flex items-center gap-2 text-sm font-semibold"><Package size={16} className="text-[#795A2D]" aria-hidden="true" /> Sản phẩm quảng bá</h4>
          <Link to={destinations} target="_blank" rel="noreferrer"
            className="flex min-w-0 items-center gap-3 rounded-lg border border-[#EAE4D7] bg-white p-2.5 text-[#231D15] hover:border-[#C59B58] focus-visible:outline-2 focus-visible:outline-[#795A2D]">
            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-md bg-[#F3EFE6] text-[#795A2D]">
              {product ? <img src={product.imageUrl || '/assets/product-placeholder.svg'} onError={handleProductImageError} alt="" className="size-full object-contain" />
                : store.logoUrl ? <img src={store.logoUrl} onError={handleStoreImageError} alt="" className="size-full object-contain" />
                  : <Store size={19} aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block wrap-anywhere text-xs font-semibold leading-5">{product?.title || 'Quảng bá cả gian hàng'}</span>
              <span className="block text-[11px] text-[#7D715E]">{product ? 'Mở trang sản phẩm' : 'Mở trang gian hàng'}</span>
            </span>
            <ExternalLink size={14} className="shrink-0 text-[#795A2D]" aria-hidden="true" />
          </Link>
        </section>
        <section aria-label="Lịch hiển thị" className="p-3.5">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <h4 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays size={16} className="text-[#795A2D]" aria-hidden="true" /> Lịch hiển thị</h4>
            <span className="text-[11px] text-[#7D715E]">Giờ Việt Nam (GMT+7)</span>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            {([['Bắt đầu', booking.startsAt], ['Kết thúc', booking.endsAt]] as const).map(([label, date]) => (
              <div key={label} className="min-w-0 rounded-lg border border-[#EAE4D7] bg-white px-2.5 py-2">
                <dt className="text-[11px] text-[#7D715E]">{label}</dt>
                <dd>
                  <time dateTime={date} className="block text-[11px] tabular-nums text-[#655A49]">
                    <strong className="block text-base text-[#1A1612]">{timeFormat.format(new Date(date))}</strong>
                    {dateFormat.format(new Date(date))}
                  </time>
                </dd>
              </div>
            ))}
            <div className="col-span-2 mt-1 flex items-center justify-between gap-2">
              <dt className="text-xs text-[#7D715E]">Phí đăng ký</dt>
              <dd className="text-sm font-bold tabular-nums text-[#231D15]">{booking.amount == null ? 'Chưa ghi nhận' : sponsorshipMoney(Number(booking.amount))}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
