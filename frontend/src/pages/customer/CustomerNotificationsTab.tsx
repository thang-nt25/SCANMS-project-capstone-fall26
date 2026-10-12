import { useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Loader2,
  Package,
  Ticket,
} from 'lucide-react';
import type {
  AppNotification,
  NotificationCategory,
} from '../../services/notifications.service';

type SpecificCategory = Exclude<NotificationCategory, 'ALL'>;
interface CustomerNotificationsTabProps {
  items: AppNotification[];
  loading: boolean;
  category: NotificationCategory;
  unreadCount: number;
  categoryUnread: Record<SpecificCategory, number>;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onSelectCategory: (category: NotificationCategory) => void;
  onOpen: (notification: AppNotification) => Promise<void>;
  onMarkRead: (
    event: MouseEvent,
    notification: AppNotification,
  ) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onLoadMore: () => void;
  onRetry: () => void;
  getCategory: (type: string) => SpecificCategory;
}

const categories = [
  { key: 'ALL', label: 'Tất cả', icon: Bell },
  { key: 'ORDER', label: 'Đơn hàng', icon: Package },
  { key: 'PROMOTION', label: 'Ưu đãi', icon: Ticket },
  { key: 'SYSTEM', label: 'SCANMS', icon: Bell },
] as const;
const headings = {
  ALL: {
    title: 'Thông báo',
    description: 'Theo dõi đơn mua, ưu đãi và cập nhật tài khoản.',
  },
  ORDER: {
    title: 'Thông báo đơn hàng',
    description: 'Cập nhật tiến trình xử lý và vận chuyển đơn mua.',
  },
  PROMOTION: {
    title: 'Ưu đãi & khuyến mãi',
    description: 'Mã giảm giá và ưu đãi từ các gian hàng đối tác.',
  },
  SYSTEM: {
    title: 'Cập nhật SCANMS',
    description: 'Thông tin tài khoản, hồ sơ đối tác và cập nhật từ sàn.',
  },
};

export function CustomerNotificationsTab({
  items,
  loading,
  category,
  unreadCount,
  categoryUnread,
  error,
  hasMore,
  loadingMore,
  onSelectCategory,
  onOpen,
  onMarkRead,
  onMarkAllRead,
  onLoadMore,
  onRetry,
  getCategory,
}: CustomerNotificationsTabProps) {
  const [markingAll, setMarkingAll] = useState(false);
  const [markingIds, setMarkingIds] = useState<string[]>([]);
  const heading = headings[category] || headings.ALL;
  const currentUnread =
    category === 'ALL' ? unreadCount : categoryUnread[category];

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await onMarkAllRead();
    } finally {
      setMarkingAll(false);
    }
  };
  const markRead = async (event: MouseEvent, item: AppNotification) => {
    setMarkingIds((ids) => [...ids, item.id]);
    try {
      await onMarkRead(event, item);
    } finally {
      setMarkingIds((ids) => ids.filter((id) => id !== item.id));
    }
  };

  return (
    <section
      className="@container/notifications grid gap-[14px] w-full max-w-[1040px] min-w-0 text-left text-[#1A1612] max-md:pb-[64px]"
      aria-labelledby="customer-notifications-heading"
    >
      <div className="flex items-center justify-between flex-wrap @max-[899px]:flex-col @max-[899px]:items-stretch gap-[12px_20px] p-[4px_0_14px] border-b border-[#EAE4D7]">
        <header className="flex flex-1 min-w-[300px] @max-[899px]:min-w-0 @max-[449px]:flex-wrap items-center justify-between gap-[12px] @max-[449px]:gap-[10px]">
          <div className="flex items-center gap-[10px] @max-[449px]:gap-[8px] min-w-0">
            <span className="grid place-items-center shrink-0 w-[36px] h-[38px] @max-[449px]:w-[32px] @max-[449px]:h-[34px] border border-[#EEDFC6] rounded-[11px] @max-[449px]:rounded-[9px] bg-white text-[#B88E4F]" aria-hidden="true">
              <Bell size={18} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-[8px]">
                <h1 id="customer-notifications-heading" className="m-0 font-inherit text-[18px] @max-[449px]:text-[17px] font-[650] leading-[1.4] tracking-[-0.3px] text-[#1A1612]">{heading.title}</h1>
                {currentUnread > 0 && (
                  <span className="p-[2px_7px] border border-[#EEDFC6] rounded-[6px] bg-[#FBF5EB] text-[#7D715E] text-[10px] leading-[1.5] whitespace-nowrap">{currentUnread} chưa đọc</span>
                )}
              </div>
              <p className="m-0 mt-[3px] text-[11px] @max-[449px]:text-[10px] text-[#7D715E] leading-[1.5]">{heading.description}</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="inline-flex items-center justify-center shrink-0 gap-[5px] min-h-[32px] @max-[449px]:min-h-[28px] @max-[449px]:ml-[40px] px-[9px] py-[6px] border border-[#EAE4D7] rounded-[7px] bg-white text-[#7D715E] text-[11px] @max-[449px]:text-[10px] font-[500] whitespace-nowrap cursor-pointer hover:border-[#C59B58] hover:bg-[#FBF5EB] transition disabled:opacity-55 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-2"
              disabled={markingAll || loading}
              onClick={() => void markAll()}
            >
              {markingAll ? (
                <Loader2 size={14} className="animate-spin text-[#B88E4F]" />
              ) : (
                <CheckCheck size={14} className="text-[#B88E4F]" />
              )}
              Đọc tất cả
            </button>
          )}
        </header>

        <nav className="grid grid-cols-4 @max-[449px]:grid-cols-2 shrink-0 gap-[3px] p-[4px] border border-[#EAE4D7] rounded-[9px] bg-[#F3EFE6] @max-[899px]:self-start @max-[449px]:self-stretch" aria-label="Lọc thông báo">
          {categories.map(({ key, label, icon: Icon }) => {
            const unread = key === 'ALL' ? unreadCount : categoryUnread[key];
            const isActive = category === key;
            return (
              <button
                type="button"
                key={key}
                aria-pressed={isActive}
                className={`inline-flex items-center justify-center min-w-0 gap-[6px] min-h-[32px] @max-[449px]:min-h-[30px] px-[10px] @max-[449px]:p-[6px] py-[6px] border rounded-[7px] text-[11px] font-[500] leading-[1.4] cursor-pointer transition focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-2 ${isActive ? 'bg-white border-[#EEDFC6] text-[#1A1612] font-[600]' : 'border-transparent text-[#7D715E] hover:bg-white hover:text-[#B88E4F]'}`}
                onClick={() => onSelectCategory(key)}
              >
                <Icon size={14} className={isActive ? 'text-[#B88E4F]' : ''} />
                <span>{label}</span>
                {unread > 0 && <span className="min-w-[16px] px-[4px] py-[1px] rounded-[5px] bg-[#F3EFE6] text-[#B88E4F] text-center text-[9px] leading-[1.4]">{unread}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-[10px] py-[32px] px-[12px] border border-[#EAE4D7] rounded-[12px] bg-white text-[#B88E4F] text-center" role="status">
          <Loader2 size={26} className="animate-spin" />
          <p className="m-0 text-[11px] text-[#7D715E] leading-[1.6]">Đang tải thông báo…</p>
        </div>
      ) : error && items.length === 0 ? (
        <div className="flex flex-col items-center gap-[10px] py-[32px] px-[12px] border border-[#EAE4D7] rounded-[12px] bg-white text-center" role="alert">
          <Bell size={25} className="text-[#DC2626]" />
          <p className="m-0 text-[11px] text-[#7D715E] leading-[1.6]">{error}</p>
          <button type="button" className="inline-flex items-center justify-center gap-[6px] p-[7px_10px] border border-[#EEDFC6] rounded-[7px] bg-[#FBF5EB] text-[#1A1612] text-[11px] font-[500] leading-[1.4] hover:border-[#C59B58] transition cursor-pointer" onClick={onRetry}>
            Thử tải lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-[10px] py-[32px] px-[12px] border border-[#EAE4D7] rounded-[12px] bg-white text-center">
          <span className="grid place-items-center shrink-0 w-[40px] h-[40px] rounded-[11px] bg-[#FBF5EB] text-[#B88E4F]">
            <Bell size={24} />
          </span>
          <h2 className="m-0 font-inherit text-[15px] font-[600] text-[#1A1612]">Chưa có thông báo</h2>
          <p className="m-0 text-[11px] text-[#7D715E] leading-[1.6] break-words">Các cập nhật mới trong mục này sẽ xuất hiện tại đây.</p>
          {category === 'ORDER' && (
            <Link to="/marketplace" className="inline-flex items-center justify-center gap-[6px] min-h-[30px] p-[6px_9px] border border-[#EEDFC6] rounded-[7px] bg-[#FBF5EB] text-[#1A1612] text-[10px] font-[500] hover:border-[#C59B58] transition cursor-pointer mt-1 no-underline">
              Khám phá sản phẩm <ArrowRight size={13} className="text-[#B88E4F]" />
            </Link>
          )}
          {category === 'PROMOTION' && (
            <Link to="/customer/vouchers" className="inline-flex items-center justify-center gap-[6px] min-h-[30px] p-[6px_9px] border border-[#EEDFC6] rounded-[7px] bg-[#FBF5EB] text-[#1A1612] text-[10px] font-[500] hover:border-[#C59B58] transition cursor-pointer mt-1 no-underline">
              Xem kho voucher <ArrowRight size={13} className="text-[#B88E4F]" />
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-[10px]">
          {items.map((item) => {
            const itemCategory = getCategory(item.type);
            const Icon =
              itemCategory === 'ORDER'
                ? Package
                : itemCategory === 'PROMOTION'
                  ? Ticket
                  : Bell;
            const categoryLabel =
              itemCategory === 'ORDER'
                ? 'Đơn hàng'
                : itemCategory === 'PROMOTION'
                  ? 'Ưu đãi'
                  : 'SCANMS';
            const busy = markingIds.includes(item.id) || markingAll;
            const date = new Date(item.createdAt);
            const validDate = !Number.isNaN(date.getTime());
            return (
              <article
                className={`relative grid grid-cols-[32px_minmax(0,1fr)_auto] @max-[699px]:grid-cols-[32px_minmax(0,1fr)] items-start gap-[10px] @max-[449px]:gap-[8px] p-[12px_14px] @max-[449px]:p-[12px_10px] border rounded-[12px] bg-white shadow-[0_2px_5px_rgba(35,29,21,0.02)] hover:border-[#EEDFC6] transition ${!item.isRead ? 'border-[#EEDFC6] before:content-[\'\'] before:absolute before:left-0 before:top-[12px] before:bottom-[12px] before:w-[3px] before:rounded-[0_3px_3px_0] before:bg-[#C59B58]' : 'border-[#EAE4D7]'}`}
                key={item.id}
              >
                <span className="grid place-items-center shrink-0 w-[32px] h-[34px] border border-[#EEDFC6] rounded-[9px] bg-[#FBF5EB] text-[#B88E4F] mt-[2px]" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-[5px_8px] mb-[5px] text-[10px] @max-[449px]:text-[9px] text-[#7D715E] leading-[1.4]">
                    <span className="p-[2px_5px] rounded-[4px] bg-[#FBF5EB] text-[9px] font-[550] text-[#B88E4F]">{categoryLabel}</span>
                    {validDate && (
                      <time dateTime={item.createdAt} className="inline-flex items-center gap-[4px] tabular-nums text-[9px]">
                        <Clock size={11} aria-hidden="true" />
                        {date.toLocaleString('vi-VN', {
                          timeZone: 'Asia/Ho_Chi_Minh',
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </time>
                    )}
                    {!item.isRead && (
                      <span className="inline-flex items-center gap-[4px] text-[#B88E4F] text-[9px]">
                        <i aria-hidden="true" className="w-[4px] h-[4px] rounded-full bg-[#C59B58] not-italic inline-block" />
                        Chưa đọc
                      </span>
                    )}
                  </div>
                  <h3 className={`m-0 font-inherit text-[13px] @max-[449px]:text-[12px] leading-[1.5] text-[#1A1612] ${!item.isRead ? 'font-[650]' : 'font-[550]'}`}>
                    <button type="button" className="block p-0 border-0 bg-transparent text-inherit text-left hover:text-[#B88E4F] transition break-words cursor-pointer focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-2" onClick={() => void onOpen(item)}>
                      {item.title}
                    </button>
                  </h3>
                  <p className="m-0 mt-[4px] text-[11px] text-[#7D715E] leading-[1.6] break-words whitespace-pre-line">{item.message}</p>
                  {(item.data?.orderSn ||
                    item.data?.trackingNumber ||
                    item.data?.voucherCode) && (
                    <div className="flex flex-wrap gap-[5px] mt-[7px]">
                      {item.data?.orderSn && (
                        <span className="p-[2px_6px] border border-[#EAE4D7] rounded-[5px] bg-[#FAF8F5] text-[#7D715E] text-[10px] leading-[1.4] break-words">Mã đơn: {item.data.orderSn}</span>
                      )}
                      {item.data?.trackingNumber && (
                        <span className="p-[2px_6px] border border-[#EAE4D7] rounded-[5px] bg-[#FAF8F5] text-[#7D715E] text-[10px] leading-[1.4] break-words">Vận đơn: {item.data.trackingNumber}</span>
                      )}
                      {item.data?.voucherCode && (
                        <span className="p-[2px_6px] border border-[#EAE4D7] rounded-[5px] bg-[#FAF8F5] text-[#7D715E] text-[10px] leading-[1.4] break-words">Mã: {item.data.voucherCode}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end @max-[699px]:col-start-2 @max-[699px]:justify-start @max-[699px]:mt-[2px] self-center gap-[6px]">
                  {!item.isRead && (
                    <button
                      type="button"
                      className="grid place-items-center shrink-0 w-[30px] h-[30px] border border-[#EAE4D7] rounded-[7px] bg-white text-[#B88E4F] hover:border-[#C59B58] hover:bg-[#FBF5EB] transition cursor-pointer disabled:opacity-55 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-2"
                      title="Đánh dấu đã đọc"
                      aria-label={`Đánh dấu đã đọc: ${item.title}`}
                      disabled={busy}
                      onClick={(event) => void markRead(event, item)}
                    >
                      {busy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-[5px] min-h-[30px] p-[6px_9px] border border-[#EEDFC6] rounded-[7px] bg-[#FBF5EB] text-[#1A1612] text-[10px] font-[500] leading-[1.4] hover:border-[#C59B58] transition cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-2"
                    onClick={() => void onOpen(item)}
                  >
                    {itemCategory === 'ORDER'
                      ? 'Xem đơn mua'
                      : itemCategory === 'PROMOTION'
                        ? 'Xem ưu đãi'
                        : 'Xem chi tiết'}
                    <ArrowRight size={13} className="text-[#B88E4F]" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!loading && items.length > 0 && error && (
        <div className="flex items-center justify-between flex-wrap gap-[8px] p-[10px_12px] border border-[#EAE4D7] rounded-[9px] bg-white text-[#7D715E] text-[11px]" role="alert">
          <span className="break-words">{error}</span>
          <button type="button" className="inline-flex items-center justify-center gap-[6px] p-[7px_10px] border border-[#EEDFC6] rounded-[7px] bg-[#FBF5EB] text-[#DC2626] text-[11px] font-[500] leading-[1.4] hover:border-[#C59B58] cursor-pointer" onClick={onRetry}>Thử lại</button>
        </div>
      )}
      {!loading && items.length > 0 && hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-[6px] min-h-[32px] p-[7px_10px] border border-[#EEDFC6] rounded-[7px] bg-white text-[#1A1612] text-[11px] font-[500] leading-[1.4] hover:border-[#C59B58] transition cursor-pointer disabled:opacity-55 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-2"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore && <Loader2 size={14} className="animate-spin text-[#B88E4F]" />}
            {loadingMore ? 'Đang tải…' : 'Xem thông báo cũ hơn'}
          </button>
        </div>
      )}
    </section>
  );
}
