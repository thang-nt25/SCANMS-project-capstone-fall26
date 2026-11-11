import type { MouseEvent } from 'react';
import { ArrowRight, Bell, Check, CheckCheck, Clock3, Loader2, Package } from 'lucide-react';
import type { AppNotification, NotificationCategory } from '../../services/notifications.service';
import { getSafeProductImageUrl } from '../../utils/marketplace.utils';

type SpecificCategory = Exclude<NotificationCategory, 'ALL'>;
interface CustomerNotificationCardProps {
  item: AppNotification;
  category: SpecificCategory;
  busy: boolean;
  onOpen: () => void;
  onMarkRead: (event: MouseEvent<HTMLButtonElement>) => void;
}

const timeFormat = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
const dateFormat = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
const categoryInfo = {
  ORDER: { label: 'Đơn hàng', action: 'Xem đơn mua', icon: Package },
  PROMOTION: { label: 'Hệ thống', action: 'Xem chi tiết', icon: Bell },
  SYSTEM: { label: 'Hệ thống', action: 'Xem chi tiết', icon: Bell },
};

export function CustomerNotificationCard({ item, category, busy, onOpen, onMarkRead }: CustomerNotificationCardProps) {
  const { label, action, icon: Icon } = categoryInfo[category];
  const date = new Date(item.createdAt);
  const validDate = Number.isFinite(date.getTime());
  const productImageUrl = category === 'ORDER' && typeof item.data?.productImageUrl === 'string'
    ? item.data.productImageUrl.trim() : '';
  const productTitle = typeof item.data?.productTitle === 'string' ? item.data.productTitle : '';
  const references = [
    ['Mã đơn', item.data?.orderSn],
    ['Vận đơn', item.data?.trackingNumber],
    ['Mã ưu đãi', item.data?.voucherCode],
  ].filter(([, value]) => (typeof value === 'string' && value.trim()) || typeof value === 'number');

  return (
    <article
      className="customer-notification-card group min-w-0 border-b border-[#EAE4D7] last:border-b-0 bg-white transition-colors duration-150 hover:bg-[#FAF8F5] data-[read=false]:bg-[#FFFDF9]"
      data-notification-id={item.id}
      data-read={item.isRead}
      aria-labelledby={`customer-notification-title-${item.id}`}
    >
      <div className="customer-notification-main grid grid-cols-[60px_minmax(0,1fr)] @max-[620px]:grid-cols-[48px_minmax(0,1fr)] items-start gap-3 sm:gap-4 p-3.5 sm:p-4.5 pb-1.5">
        {productImageUrl ? (
          <span className="customer-notification-product-image grid place-items-center w-[60px] h-[60px] @max-[620px]:w-[48px] @max-[620px]:h-[48px] border border-[#EAE4D7] rounded-lg overflow-hidden bg-white shadow-2xs">
            <img
              src={getSafeProductImageUrl(productImageUrl, productTitle)}
              alt={productTitle || 'Sản phẩm trong đơn hàng'}
              loading="lazy"
              className="block w-full h-full p-1 object-contain outline-1 outline-black/5"
              onError={event => {
                if (!event.currentTarget.dataset.fallback) {
                  event.currentTarget.dataset.fallback = 'true';
                  event.currentTarget.src = getSafeProductImageUrl(null, productTitle);
                }
              }}
            />
          </span>
        ) : (
          <span
            className={`customer-notification-icon grid place-items-center w-[60px] h-[60px] @max-[620px]:w-[48px] @max-[620px]:h-[48px] border rounded-lg transition-colors ${
              item.isRead
                ? 'border-[#EAE4D7] bg-[#FAF8F5] text-[#7D715E]'
                : 'border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F]'
            }`}
            aria-hidden="true"
          >
            <Icon size={23} strokeWidth={1.65} />
          </span>
        )}
        <div className="customer-notification-content min-w-0">
          <div className="customer-notification-meta flex items-center flex-wrap gap-x-3 gap-y-1 min-h-[18px] mb-1 text-[11px] leading-normal">
            <span className="customer-notification-category text-[#7D715E] font-medium">{label}</span>
            {item.isRead ? (
              <span className="customer-notification-read inline-flex items-center gap-1 text-[#7D715E] text-[10px]">
                <Check size={12} aria-hidden="true" />
                <span>Đã đọc</span>
              </span>
            ) : (
              <span className="customer-notification-unread inline-flex items-center gap-1.5 text-[#8F682E] text-[10px] font-semibold">
                <i className="w-1.5 h-1.5 rounded-full bg-[#C59B58] inline-block" aria-hidden="true" />
                <span>Chưa đọc</span>
              </span>
            )}
          </div>
          <h3 id={`customer-notification-title-${item.id}`} className="m-0 text-sm leading-snug font-semibold text-[#1A1612]">
            <button
              type="button"
              onClick={onOpen}
              className={`block max-w-full m-0 p-0 border-0 bg-transparent text-left cursor-pointer transition-colors hover:text-[#8F682E] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-2 break-words ${
                item.isRead ? 'font-medium text-[#4A3F33]' : 'font-bold text-[#1A1612]'
              }`}
            >
              {item.title}
            </button>
          </h3>
          <p className="customer-notification-message m-0 mt-1 text-[#7D715E] text-xs leading-relaxed whitespace-pre-line break-words">
            {item.message}
          </p>
          {references.length > 0 && (
            <div className="customer-notification-references flex flex-wrap gap-x-2.5 gap-y-1 mt-2 text-[#7D715E] text-[11px] leading-relaxed">
              {references.map(([name, value]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 bg-[#FAF8F5] border border-[#EAE4D7] px-2 py-0.5 rounded text-[10px] font-mono tabular-nums text-[#4A3F33]"
                >
                  {name}: <strong className="font-semibold text-[#1A1612]">{value}</strong>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="customer-notification-footer flex flex-wrap items-center justify-between gap-2.5 sm:gap-4 ml-[76px] @max-[620px]:ml-[60px] @max-[400px]:ml-3 mr-3.5 sm:mr-4.5 pt-1 pb-3">
        {validDate && (
          <time
            className="customer-notification-time inline-flex items-center flex-wrap gap-1.5 min-w-0 text-[#7D715E] text-[11px] leading-normal font-mono tabular-nums @max-[400px]:basis-full"
            dateTime={item.createdAt}
            aria-label={`${timeFormat.format(date)}, ngày ${dateFormat.format(date)}`}
          >
            <Clock3 size={13} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
            <span>{timeFormat.format(date)}</span>
            <span aria-hidden="true">·</span>
            <span>{dateFormat.format(date)}</span>
          </time>
        )}
        <div className="customer-notification-actions flex items-center justify-end gap-2 ml-auto @max-[400px]:w-full">
          {!item.isRead && (
            <button
              type="button"
              className="customer-notification-mark inline-flex items-center justify-center gap-1.5 min-h-[32px] @max-[620px]:min-h-[36px] px-2.5 py-1.5 border border-transparent hover:border-[#EAE4D7] rounded-lg bg-transparent hover:bg-white text-[#7D715E] hover:text-[#1A1612] text-xs font-medium cursor-pointer transition-all active:scale-[0.96] disabled:opacity-55 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-2"
              disabled={busy}
              aria-busy={busy}
              aria-label={`Đánh dấu đã đọc: ${item.title}`}
              title="Đánh dấu đã đọc"
              onClick={onMarkRead}
            >
              {busy ? (
                <Loader2 size={15} className="customer-notification-spinner shrink-0 text-[#B88E4F] animate-spin" aria-hidden="true" />
              ) : (
                <CheckCheck size={15} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
              )}
              <span className="@max-[620px]:sr-only">Đánh dấu đã đọc</span>
            </button>
          )}
          <button
            type="button"
            className="customer-notification-open inline-flex items-center justify-center gap-1.5 min-h-[32px] @max-[620px]:min-h-[36px] px-3 py-1.5 border border-[#EEDFC6] hover:border-[#C59B58] rounded-lg bg-[#FBF5EB] hover:bg-[#F3EFE6] text-[#1A1612] text-xs font-semibold cursor-pointer transition-all active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-2 @max-[400px]:flex-1"
            onClick={onOpen}
          >
            <span>{action}</span>
            <ArrowRight size={14} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
