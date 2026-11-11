import type { MouseEvent } from 'react';
import { ArrowRight, Bell, Check, CheckCheck, Clock3, Loader2, Package, Ticket } from 'lucide-react';
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
  PROMOTION: { label: 'Ưu đãi', action: 'Xem ưu đãi', icon: Ticket },
  SYSTEM: { label: 'SCANMS', action: 'Xem chi tiết', icon: Bell },
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
    <article className={`customer-notification-card min-w-0 border-b border-[#EAE4D7] p-3 @min-[640px]:p-4 last:border-b-0 ${item.isRead ? 'bg-white' : 'bg-[#FBF5EB]/50'}`} data-notification-id={item.id} data-read={item.isRead}
      aria-labelledby={`customer-notification-title-${item.id}`}>
      <div className="customer-notification-main flex min-w-0 items-start gap-3 @min-[640px]:gap-4">
        {productImageUrl ? (
          <span className="customer-notification-product-image block size-12 shrink-0 overflow-hidden rounded-lg border border-[#EAE4D7] bg-white @min-[640px]:size-16">
            <img className="block size-full max-w-full object-contain p-1" width={64} height={64} src={getSafeProductImageUrl(productImageUrl, productTitle)} alt={productTitle || 'Sản phẩm trong đơn hàng'} loading="lazy"
              onError={event => {
                if (!event.currentTarget.dataset.fallback) {
                  event.currentTarget.dataset.fallback = 'true';
                  event.currentTarget.src = getSafeProductImageUrl(null, productTitle);
                }
              }} />
          </span>
        ) : <span className="customer-notification-icon grid size-12 shrink-0 place-items-center rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] text-[#B88E4F] @min-[640px]:size-16" aria-hidden="true"><Icon size={23} strokeWidth={1.65} /></span>}
        <div className="customer-notification-content min-w-0 flex-1">
          <div className="customer-notification-meta flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-5 text-[#7D715E]">
            <span className="customer-notification-category font-medium">{label}</span>
            {item.isRead ? (
              <span className="customer-notification-read inline-flex items-center gap-1"><Check size={12} aria-hidden="true" />Đã đọc</span>
            ) : (
              <span className="customer-notification-unread inline-flex items-center gap-1.5 font-medium text-[#B88E4F]"><i className="size-1.5 shrink-0 rounded-full bg-[#C59B58]" aria-hidden="true" />Chưa đọc</span>
            )}
          </div>
          <h3 className="m-0 mt-1 text-sm font-semibold leading-6 text-[#1A1612]" id={`customer-notification-title-${item.id}`}>
            <button className="block w-full cursor-pointer rounded-sm text-left [overflow-wrap:anywhere] hover:text-[#B88E4F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F]" type="button" onClick={onOpen}>{item.title}</button>
          </h3>
          <p className="customer-notification-message m-0 mt-1 text-sm leading-6 text-[#7D715E] [overflow-wrap:anywhere]">{item.message}</p>
          {references.length > 0 && <div className="customer-notification-references mt-2 flex min-w-0 flex-wrap gap-2 text-xs leading-5 text-[#7D715E]">
            {references.map(([name, value]) => <span className="max-w-full rounded-md border border-[#EAE4D7] bg-white px-2 py-1 [overflow-wrap:anywhere]" key={name}>{name}: <strong className="font-medium text-[#1A1612]">{value}</strong></span>)}
          </div>}
        </div>
      </div>
      <div className="customer-notification-footer mt-3 flex min-w-0 flex-col gap-3 @min-[640px]:flex-row @min-[640px]:items-center @min-[640px]:justify-between">
        {validDate && <time className="customer-notification-time inline-flex flex-wrap items-center gap-1.5 text-xs leading-5 tabular-nums text-[#7D715E]" dateTime={item.createdAt}
          aria-label={`${timeFormat.format(date)}, ngày ${dateFormat.format(date)}`}>
          <Clock3 size={13} aria-hidden="true" />
          <span>{timeFormat.format(date)}</span><span aria-hidden="true">·</span><span>{dateFormat.format(date)}</span>
        </time>}
        <div className="customer-notification-actions flex min-w-0 flex-wrap gap-2 @max-[399px]:flex-col">
          {!item.isRead && <button type="button" className="customer-notification-mark inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#EAE4D7] bg-white px-3 py-2 text-xs font-medium text-[#7D715E] transition hover:border-[#C59B58] hover:text-[#1A1612] disabled:cursor-wait disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] cursor-pointer" disabled={busy}
            aria-busy={busy} aria-label={`Đánh dấu đã đọc: ${item.title}`} title="Đánh dấu đã đọc" onClick={onMarkRead}>
            {busy ? <Loader2 size={16} className="customer-notification-spinner shrink-0 animate-spin" aria-hidden="true" /> : <CheckCheck size={16} className="shrink-0" aria-hidden="true" />}
            <span>Đánh dấu đã đọc</span>
          </button>}
          <button type="button" className="customer-notification-open inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-xs font-medium text-[#1A1612] transition hover:border-[#C59B58] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] cursor-pointer" onClick={onOpen}>
            <span>{action}</span><ArrowRight size={15} className="shrink-0 text-[#B88E4F]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
