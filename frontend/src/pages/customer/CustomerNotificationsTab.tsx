import { useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  CheckCheck,
  Loader2,
  Package,
  Ticket,
} from 'lucide-react';
import type {
  AppNotification,
  NotificationCategory,
} from '../../services/notifications.service';
import { CustomerNotificationCard } from './CustomerNotificationCard';

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
  },
  ORDER: {
    title: 'Thông báo đơn hàng',
  },
  PROMOTION: {
    title: 'Ưu đãi & khuyến mãi',
  },
  SYSTEM: {
    title: 'Cập nhật SCANMS',
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
      aria-label={heading.title}
    >
      <div className="flex w-full min-w-0 items-center flex-wrap gap-[12px] p-[10px_12px] @max-[449px]:p-[8px] border border-[#EAE4D7] rounded-[12px] bg-white shadow-[0_2px_6px_rgba(35,29,21,0.02)]">
        <nav className="grid flex-1 min-w-0 grid-cols-4 @max-[699px]:basis-full @max-[449px]:grid-cols-2 gap-[6px]" aria-label="Lọc thông báo">
          {categories.map(({ key, label, icon: Icon }) => {
            const unread = key === 'ALL' ? unreadCount : categoryUnread[key];
            const isActive = category === key;
            return (
              <button
                type="button"
                key={key}
                aria-pressed={isActive}
                className={`inline-flex items-center justify-center min-w-0 gap-[6px] min-h-[40px] px-[10px] @max-[449px]:px-[6px] py-[8px] border rounded-[8px] text-[12px] font-[500] leading-[1.4] cursor-pointer transition focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-2 ${isActive ? 'bg-[#FBF5EB] border-[#EEDFC6] text-[#1A1612] font-[600]' : 'bg-white border-transparent text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#1A1612]'}`}
                onClick={() => onSelectCategory(key)}
              >
                <Icon size={14} className={isActive ? 'text-[#B88E4F]' : ''} />
                <span>{label}</span>
                {unread > 0 && <span className="min-w-[16px] px-[4px] py-[1px] rounded-[5px] bg-[#F3EFE6] text-[#B88E4F] text-center text-[9px] leading-[1.4]">{unread}</span>}
              </button>
            );
          })}
        </nav>
        {unreadCount > 0 && (
          <button
            type="button"
            className="ml-auto inline-flex items-center justify-center shrink-0 gap-[6px] min-h-[40px] px-[12px] py-[8px] border border-[#EEDFC6] rounded-[8px] bg-[#FAF8F5] text-[#1A1612] text-[12px] font-[500] whitespace-nowrap cursor-pointer hover:border-[#C59B58] hover:bg-[#FBF5EB] transition disabled:opacity-55 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-2"
            disabled={markingAll || loading}
            onClick={() => void markAll()}
          >
            {markingAll ? (
              <Loader2 size={14} className="animate-spin text-[#B88E4F]" aria-hidden="true" />
            ) : (
              <CheckCheck size={14} className="text-[#B88E4F]" aria-hidden="true" />
            )}
            Đọc tất cả
          </button>
        )}
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
        <div className="customer-notification-list [container:notification-list_/_inline-size]! grid! gap-[12px]! min-w-0! [&_.customer-notification-card]:min-w-0! [&_.customer-notification-card]:overflow-hidden! [&_.customer-notification-card]:[border:1px_solid_#EAE4D7]! [&_.customer-notification-card]:rounded-[16px]! [&_.customer-notification-card]:bg-[#FFFFFF]! [&_.customer-notification-card]:shadow-[0_2px_8px_rgb(35_29_21_/_2%)]! [&_.customer-notification-card]:[transition:border-color_160ms,box-shadow_160ms]! [&_.customer-notification-card[data-read='false']]:border-[#EEDFC6]! [&_.customer-notification-card:hover:hover]:border-[#C59B58]! [&_.customer-notification-card:hover:hover]:shadow-[0_4px_16px_rgb(35_29_21_/_4%)]! [&_.customer-notification-main]:grid! [&_.customer-notification-main]:grid-cols-[44px_minmax(0,1fr)]! [&_.customer-notification-main]:[align-items:start]! [&_.customer-notification-main]:gap-[14px]! [&_.customer-notification-main]:p-[18px_20px_14px]! [&_.customer-notification-icon]:grid! [&_.customer-notification-icon]:place-items-center! [&_.customer-notification-icon]:w-[44px]! [&_.customer-notification-icon]:h-[44px]! [&_.customer-notification-icon]:[border:1px_solid_#EEDFC6]! [&_.customer-notification-icon]:rounded-[13px]! [&_.customer-notification-icon]:bg-[#FBF5EB]! [&_.customer-notification-icon]:text-[#B88E4F]! [&_.customer-notification-card[data-read='true']_.customer-notification-icon]:border-[#EAE4D7]! [&_.customer-notification-card[data-read='true']_.customer-notification-icon]:bg-[#FAF8F5]! [&_.customer-notification-card[data-read='true']_.customer-notification-icon]:text-[#7D715E]! [&_.customer-notification-content]:min-w-0! [&_.customer-notification-meta]:flex! [&_.customer-notification-meta]:items-center! [&_.customer-notification-meta]:flex-wrap! [&_.customer-notification-meta]:gap-[8px_12px]! [&_.customer-notification-meta]:min-h-[22px]! [&_.customer-notification-meta]:mb-[5px]! [&_.customer-notification-meta]:text-[11px]! [&_.customer-notification-meta]:leading-[1.5]! [&_.customer-notification-category]:text-[#7D715E]! [&_.customer-notification-category]:text-[12px]! [&_.customer-notification-category]:font-[600]! [&_.customer-notification-unread]:inline-flex! [&_.customer-notification-unread]:items-center! [&_.customer-notification-unread]:gap-[5px]! [&_.customer-notification-read]:inline-flex! [&_.customer-notification-read]:items-center! [&_.customer-notification-read]:gap-[5px]! [&_.customer-notification-unread]:p-[2px_7px]! [&_.customer-notification-unread]:[border:1px_solid_#EEDFC6]! [&_.customer-notification-unread]:rounded-[6px]! [&_.customer-notification-unread]:bg-[#FBF5EB]! [&_.customer-notification-unread]:text-[#8A642C]! [&_.customer-notification-unread]:text-[10px]! [&_.customer-notification-unread_i]:w-[4px]! [&_.customer-notification-unread_i]:h-[4px]! [&_.customer-notification-unread_i]:rounded-[50%]! [&_.customer-notification-unread_i]:bg-[#C59B58]! [&_.customer-notification-read]:text-[#7D715E]! [&_.customer-notification-read]:text-[10px]! [&_.customer-notification-card_h3]:m-0! [&_.customer-notification-card_h3]:text-[#1A1612]! [&_.customer-notification-card_h3]:[font-family:inherit]! [&_.customer-notification-card_h3]:text-[15px]! [&_.customer-notification-card_h3]:font-[650]! [&_.customer-notification-card_h3]:leading-[1.5]! [&_.customer-notification-card_h3]:tracking-[-.15px]! [&_.customer-notification-card[data-read='true']_h3]:font-[550]! [&_.customer-notification-card_h3_button]:block! [&_.customer-notification-card_h3_button]:max-w-full! [&_.customer-notification-card_h3_button]:m-0! [&_.customer-notification-card_h3_button]:p-0! [&_.customer-notification-card_h3_button]:border-0! [&_.customer-notification-card_h3_button]:[border-style:none]! [&_.customer-notification-card_h3_button]:bg-[transparent]! [&_.customer-notification-card_h3_button]:text-[inherit]! [&_.customer-notification-card_h3_button]:[font-family:inherit]! [&_.customer-notification-card_h3_button]:[font-style:inherit]! [&_.customer-notification-card_h3_button]:[font-variant:inherit]! [&_.customer-notification-card_h3_button]:[font-stretch:inherit]! [&_.customer-notification-card_h3_button]:leading-[inherit]! [&_.customer-notification-card_h3_button]:text-left! [&_.customer-notification-card_h3_button]:[overflow-wrap:anywhere]! [&_.customer-notification-card_h3_button]:cursor-pointer! [&_.customer-notification-card_h3_button]:[transition:color_160ms]! [&_.customer-notification-card_h3_button:hover]:text-[#8A642C]! [&_.customer-notification-message]:m-[6px_0_0]! [&_.customer-notification-message]:text-[#7D715E]! [&_.customer-notification-message]:text-[13px]! [&_.customer-notification-message]:leading-[1.7]! [&_.customer-notification-message]:whitespace-pre-line! [&_.customer-notification-message]:[overflow-wrap:anywhere]! [&_.customer-notification-references]:flex! [&_.customer-notification-references]:flex-wrap! [&_.customer-notification-references]:gap-[6px]! [&_.customer-notification-references]:mt-[10px]! [&_.customer-notification-references_>_span]:min-w-0! [&_.customer-notification-references_>_span]:max-w-full! [&_.customer-notification-references_>_span]:p-[4px_8px]! [&_.customer-notification-references_>_span]:[border:1px_solid_#EAE4D7]! [&_.customer-notification-references_>_span]:rounded-[6px]! [&_.customer-notification-references_>_span]:bg-[#FAF8F5]! [&_.customer-notification-references_>_span]:text-[#7D715E]! [&_.customer-notification-references_>_span]:text-[11px]! [&_.customer-notification-references_>_span]:leading-[1.5]! [&_.customer-notification-references_>_span]:[overflow-wrap:anywhere]! [&_.customer-notification-references_strong]:text-[#4A3F33]! [&_.customer-notification-references_strong]:font-[550]! [&_.customer-notification-footer]:flex! [&_.customer-notification-footer]:items-center! [&_.customer-notification-footer]:justify-between! [&_.customer-notification-footer]:flex-wrap! [&_.customer-notification-footer]:gap-[10px_16px]! [&_.customer-notification-footer]:m-[0_20px_0_78px]! [&_.customer-notification-footer]:p-[10px_0_14px]! [&_.customer-notification-footer]:[border-top:1px_solid_#F3EFE6]! [&_.customer-notification-time]:inline-flex! [&_.customer-notification-time]:items-center! [&_.customer-notification-time]:flex-wrap! [&_.customer-notification-time]:gap-[6px]! [&_.customer-notification-time]:min-w-0! [&_.customer-notification-time]:text-[#7D715E]! [&_.customer-notification-time]:text-[11px]! [&_.customer-notification-time]:leading-[1.5]! [&_.customer-notification-time]:tabular-nums! [&_.customer-notification-time_svg]:shrink-0! [&_.customer-notification-actions]:flex! [&_.customer-notification-actions]:items-center! [&_.customer-notification-actions]:justify-end! [&_.customer-notification-actions]:gap-[8px]! [&_.customer-notification-actions]:ml-auto! [&_.customer-notification-actions_button]:inline-flex! [&_.customer-notification-actions_button]:items-center! [&_.customer-notification-actions_button]:justify-center! [&_.customer-notification-actions_button]:gap-[7px]! [&_.customer-notification-actions_button]:min-h-[40px]! [&_.customer-notification-actions_button]:p-[9px_12px]! [&_.customer-notification-actions_button]:[border:1px_solid_transparent]! [&_.customer-notification-actions_button]:rounded-[9px]! [&_.customer-notification-actions_button]:[font-family:inherit]! [&_.customer-notification-actions_button]:text-[12px]! [&_.customer-notification-actions_button]:font-[550]! [&_.customer-notification-actions_button]:leading-[1.5]! [&_.customer-notification-actions_button]:whitespace-nowrap! [&_.customer-notification-actions_button]:cursor-pointer! [&_.customer-notification-actions_button]:[transition:background_160ms,border-color_160ms,color_160ms]! [&_.customer-notification-actions_button_svg]:shrink-0! [&_.customer-notification-actions_button_svg]:text-[#B88E4F]! [&_.customer-notification-actions_.customer-notification-mark]:bg-[#FFFFFF]! [&_.customer-notification-actions_.customer-notification-mark]:text-[#7D715E]! [&_.customer-notification-actions_.customer-notification-mark:hover]:border-[#EAE4D7]! [&_.customer-notification-actions_.customer-notification-mark:hover]:bg-[#FAF8F5]! [&_.customer-notification-actions_.customer-notification-mark:hover]:text-[#1A1612]! [&_.customer-notification-actions_.customer-notification-open]:min-w-[116px]! [&_.customer-notification-actions_.customer-notification-open]:border-[#EEDFC6]! [&_.customer-notification-actions_.customer-notification-open]:bg-[#FBF5EB]! [&_.customer-notification-actions_.customer-notification-open]:text-[#1A1612]! [&_.customer-notification-actions_.customer-notification-open:hover]:border-[#C59B58]! [&_.customer-notification-actions_.customer-notification-open:hover]:bg-[#F3EFE6]! [&_.customer-notification-actions_button:disabled]:opacity-[.55]! [&_.customer-notification-actions_button:disabled]:cursor-wait! [&_.customer-notification-card_button:focus-visible]:[outline:2px_solid_#C59B58]! [&_.customer-notification-card_button:focus-visible]:outline-offset-[3px]! [&_.customer-notification-spinner]:animate-[customer-notification-spin_.8s_linear_infinite]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-main]:grid-cols-[40px_minmax(0,1fr)]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-main]:gap-[12px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-main]:p-[16px_16px_12px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-icon]:w-[40px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-icon]:h-[40px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-icon]:rounded-[11px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-card_h3]:text-[14px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-message]:text-[12px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-footer]:m-[0_16px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-footer]:p-[12px_0]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-actions_button]:min-h-[44px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-mark_span]:absolute! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-mark_span]:w-[1px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-mark_span]:h-[1px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-mark_span]:p-0! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-mark_span]:m-[-1px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-mark_span]:overflow-hidden! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-mark_span]:[clip:rect(0,0,0,0)]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-mark_span]:whitespace-nowrap! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-mark_span]:border-0! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-mark_span]:[border-style:none]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-actions_.customer-notification-mark]:w-[44px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-actions_.customer-notification-mark]:p-[10px]! [@container_notification-list_(max-width:620px)]:[&_.customer-notification-actions_.customer-notification-mark]:border-[#EAE4D7]! [@container_notification-list_(max-width:400px)]:[&_.customer-notification-footer]:gap-[10px]! [@container_notification-list_(max-width:400px)]:[&_.customer-notification-time]:[flex-basis:100%]! [@container_notification-list_(max-width:400px)]:[&_.customer-notification-actions]:w-full! [@container_notification-list_(max-width:400px)]:[&_.customer-notification-actions_.customer-notification-open]:min-w-0! [@container_notification-list_(max-width:400px)]:[&_.customer-notification-actions_.customer-notification-open]:flex-[1]! [@media_(prefers-reduced-motion:reduce)]:[&_.customer-notification-card]:[transition:none]! [@media_(prefers-reduced-motion:reduce)]:[&_.customer-notification-card_h3_button]:[transition:none]! [@media_(prefers-reduced-motion:reduce)]:[&_.customer-notification-actions_button]:[transition:none]! [@media_(prefers-reduced-motion:reduce)]:[&_.customer-notification-spinner]:animate-none!">
          {items.map((item) => (
            <CustomerNotificationCard key={item.id} item={item}
              category={getCategory(item.type)} busy={markingIds.includes(item.id) || markingAll}
              onOpen={() => void onOpen(item)}
              onMarkRead={(event) => void markRead(event, item)} />
          ))}
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
