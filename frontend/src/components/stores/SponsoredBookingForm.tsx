import { useState, type FormEventHandler } from 'react';
import { ArrowRight, CalendarDays, Megaphone, Store } from 'lucide-react';
import { Button } from '../ui/Button';
import { SponsorshipDateTimePicker } from './SponsorshipDateTimePicker';
import { handleProductImageError, handleStoreImageError } from '@/utils/image-fallback.utils';
import { uploadService } from '@/services/upload.service';
import type { SponsorshipProduct } from '@/services/sponsorship.service';
import { Select } from '../ui/Select';

export const sponsorshipMoney = (value: number) => `${value.toLocaleString('vi-VN')} ₫`;
type Pricing = { dailyRate: number; billingHours: number; minHours: number; maxDays: number };
const storeOptionLabel = 'Quảng bá cả gian hàng';
const productMenuClass = [
  'max-h-[200px] rounded-xl p-0 shadow-lg',
  '[&>div:first-child]:p-1.5 [&_input]:h-8! [&_input]:min-h-8! [&_input]:rounded-lg! [&_input]:py-1!',
  'sm:[&_input]:text-sm! [&_input+button]:size-8',
  '[&_[role=option]]:min-h-10! [&_[role=option]]:px-2.5! [&_[role=option]]:py-1! [&_[role=option]]:text-[13px]!',
  '[&_[role=option][aria-selected=true]]:text-[#6C4D20]!',
].join(' ');

function SponsoredProductOption({ label, imageUrl, isStore = false, singleLine = false }: {
  label: string;
  imageUrl?: string | null;
  isStore?: boolean;
  singleLine?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {isStore ? (
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#F3EFE6] text-[#795A2D]" aria-hidden="true">
          <Store size={14} />
        </span>
      ) : (
        <img src={imageUrl || '/assets/product-placeholder.svg'} onError={handleProductImageError} alt="" loading="lazy"
          className="size-7 shrink-0 rounded-md border border-[#EAE4D7] bg-[#FAF8F5] object-cover" />
      )}
      <span className={singleLine ? 'truncate' : 'line-clamp-2 leading-tight'} title={label}>{label}</span>
    </span>
  );
}

export function SponsoredBannerPreview({ headline, storefront, product, imageUrl, large = false }: {
  headline: string;
  storefront?: { name: string; logoUrl?: string | null };
  product?: SponsorshipProduct | null;
  imageUrl?: string | null;
  large?: boolean;
}) {
  const fallbackImage = product?.imageUrl || storefront?.logoUrl;
  return (
    <div className={`sp-banner-preview relative isolate grid min-h-28 min-w-0 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-center gap-2 overflow-hidden rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3.5 py-3 ${large ? 'min-h-[170px] sm:px-5' : ''}`} role="group" aria-label="Xem trước banner">
      {imageUrl && <>
        <img key={imageUrl} src={imageUrl} onError={handleStoreImageError} alt="" className="absolute inset-0 -z-20 size-full object-cover object-right" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#FAF8F5_0%,#FAF8F5e8_45%,transparent_90%)]" />
      </>}
      <div className="min-w-0 space-y-1 leading-relaxed">
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#765629]"><Megaphone size={11} aria-hidden="true" /> Được tài trợ</span>
        <p className={`wrap-anywhere font-semibold text-[#1A1612] ${large ? 'text-base' : 'text-xs'}`}>{headline || 'Tiêu đề quảng bá của gian hàng'}</p>
        {storefront?.name && <p className="wrap-anywhere text-[11px] text-[#7D715E]">{storefront.name}</p>}
        <span className="inline-block rounded-md bg-[#C59B58] px-2 py-1 text-[10px] font-bold text-[#231D15]">{product ? 'Xem sản phẩm' : 'Vào gian hàng'}</span>
      </div>
      {!imageUrl && <span className={`grid h-20 place-items-center text-[#B88E4F] ${large ? 'h-28' : ''}`}>
        {fallbackImage ? <img key={fallbackImage} src={fallbackImage} onError={handleStoreImageError} alt="" className="size-full min-h-0 object-contain" /> : <Store size={24} aria-hidden="true" />}
      </span>}
    </div>
  );
}

export function SponsoredBookingForm({ pricing, pending, onSubmit, renewal, onCancelRenewal, storefront, products = [], productsLoading, productsFailed, onRetryProducts }: {
  pricing?: Pricing; pending: boolean; onSubmit: FormEventHandler<HTMLFormElement>;
  renewal?: { headline: string; startsAt: string; endsAt: string; product?: SponsorshipProduct | null; bannerImageUrl?: string | null } | null;
  onCancelRenewal?: () => void;
  storefront?: { name: string; logoUrl: string };
  products?: SponsorshipProduct[];
  productsLoading?: boolean;
  productsFailed?: boolean;
  onRetryProducts?: () => void;
}) {
  const [headline, setHeadline] = useState(renewal?.headline ?? '');
  const [startsAt, setStartsAt] = useState(renewal?.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(renewal?.endsAt ?? '');
  const [productId, setProductId] = useState(renewal?.product?.id ?? '');
  const [imageUrl, setImageUrl] = useState(renewal?.bannerImageUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const product = products.find(item => item.id === productId);
  const unavailableProduct = Boolean(productId && !product);
  const unavailableLabel = renewal?.product?.title ?? 'Sản phẩm không khả dụng';
  const duration = Date.parse(endsAt) - Date.parse(startsAt);
  const valid = !!pricing && duration >= pricing.minHours * 3600000
    && duration <= pricing.maxDays * 86400000 && Date.parse(startsAt) > Date.now();
  const periods = valid ? Math.ceil(duration / (pricing.billingHours * 3600000)) : 0;
  const amount = periods * (pricing?.dailyRate ?? 0);

  async function uploadBanner(file?: File) {
    if (!file) return;
    setUploadError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setUploadError('Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.');
      return;
    }
    setUploading(true);
    try {
      setImageUrl(await uploadService.uploadImage(file, 'scanms/sponsorship'));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Tải ảnh thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="sp-booking rounded-xl border border-[#EAE4D7]" onSubmit={onSubmit} onReset={() => {
      setHeadline(''); setStartsAt(''); setEndsAt(''); setProductId(''); setImageUrl(''); setUploadError('');
    }}>
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
          <div className="grid min-w-0 max-w-96 gap-1.5 text-xs font-semibold text-[#665948]">
            <label htmlFor="sponsored-product">Sản phẩm nổi bật (tùy chọn)</label>
            <Select id="sponsored-product" aria-label="Sản phẩm nổi bật" name="productId" value={productId}
              onChange={event => setProductId(event.target.value)} searchable disabled={pending}
              searchPlaceholder="Tìm sản phẩm…"
              className="h-11! min-h-11! w-full rounded-xl px-2.5! py-1! text-sm!"
              menuClassName={productMenuClass}
              triggerContent={<SponsoredProductOption label={productId ? product?.title ?? unavailableLabel : storeOptionLabel}
                imageUrl={product ? product.imageUrl : renewal?.product?.imageUrl} isStore={!productId} singleLine />}
              options={[
                { value: '', label: storeOptionLabel, content: <SponsoredProductOption label={storeOptionLabel} isStore /> },
                ...(unavailableProduct ? [{
                  value: productId, label: unavailableLabel, disabled: true,
                  content: <SponsoredProductOption label={unavailableLabel} imageUrl={renewal?.product?.imageUrl} />,
                }] : []),
                ...products.map(item => ({
                  value: item.id, label: item.title,
                  content: <SponsoredProductOption label={item.title} imageUrl={item.imageUrl} />,
                })),
              ]}
            />
            {productsLoading && <p role="status">Đang tải sản phẩm…</p>}
            {productsFailed && <button type="button" onClick={onRetryProducts} className="w-fit text-[#795A2D] underline">Tải lại danh sách sản phẩm</button>}
            {!productsLoading && !productsFailed && products.length === 0 && <p className="font-normal text-[#7D715E]">Gian hàng chưa có sản phẩm đã duyệt và đang bán.</p>}
            {unavailableProduct && !productsLoading && !productsFailed && <p role="alert" className="text-[#DC2626]">Sản phẩm này không còn đủ điều kiện. Hãy chọn mục khác.</p>}
          </div>
          <div className="grid gap-1.5 text-xs text-[#665948]">
            <label htmlFor="sponsored-image" className="font-semibold">Ảnh banner (tùy chọn)</label>
            <input id="sponsored-image" type="file" accept="image/jpeg,image/png,image/webp"
              disabled={uploading || pending} onChange={event => {
                void uploadBanner(event.currentTarget.files?.[0]);
                event.currentTarget.value = '';
              }} className="w-full min-w-0 rounded-lg border border-[#EAE4D7] p-2 file:mr-2 file:rounded-md file:border-0 file:bg-[#F3EFE6] file:px-3 file:py-1.5 file:font-semibold file:text-[#231D15]" />
            {uploading && <p role="status">Đang tải ảnh lên…</p>}
            {uploadError && <p role="alert" className="text-[#DC2626]">{uploadError}</p>}
            {imageUrl && <button type="button" disabled={uploading || pending} onClick={() => { setImageUrl(''); setUploadError(''); }}
              className="w-fit font-semibold text-[#795A2D] underline">Xóa ảnh banner</button>}
            <p>JPG, PNG hoặc WebP, tối đa 5 MB.</p>
          </div>
          <div className="sp-dates relative grid gap-2.5 sm:grid-cols-2">
            <SponsorshipDateTimePicker name="startsAt" label="Bắt đầu" value={startsAt} onChange={setStartsAt} />
            <SponsorshipDateTimePicker name="endsAt" label="Kết thúc" value={endsAt} onChange={setEndsAt} earlierValue={startsAt} />
          </div>
          {startsAt && endsAt && !valid && pricing && (
            <p role="alert" className="text-xs text-[#DC2626]">Chọn lịch bắt đầu trong tương lai và kéo dài từ {pricing.minHours} giờ đến {pricing.maxDays} ngày.</p>
          )}
        </div>

        <aside className="sp-booking-summary min-w-0 self-stretch border-t border-[#EAE4D7] bg-[#FAF8F5]/50 p-4 sm:p-5 @min-[700px]:rounded-tr-xl @min-[700px]:border-t-0 @min-[700px]:border-l" aria-label="Banner và phí quảng cáo">
          <SponsoredBannerPreview headline={headline} storefront={storefront} product={product} imageUrl={imageUrl} />
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
        <input type="hidden" name="bannerImageUrl" value={imageUrl} />
        <Button type="submit" variant="gold" size="sm" className="h-9 rounded-lg" loading={pending} disabled={!valid || uploading || unavailableProduct} icon={<ArrowRight size={14} />} iconPosition="right">{renewal ? 'Gửi đăng ký gia hạn' : 'Gửi đăng ký'}</Button>
      </footer>
    </form>
  );
}
