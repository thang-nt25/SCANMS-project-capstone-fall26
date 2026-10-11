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
import './CustomerNotificationsTab.css';

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
      className="customer-notifications"
      aria-labelledby="customer-notifications-heading"
    >
      <div className="cn-controls">
        <header className="cn-header">
          <div className="cn-heading-group">
            <span className="cn-heading-icon" aria-hidden="true">
              <Bell size={18} />
            </span>
            <div>
              <div className="cn-heading-line">
                <h1 id="customer-notifications-heading">{heading.title}</h1>
                {currentUnread > 0 && (
                  <span className="cn-count">{currentUnread} chưa đọc</span>
                )}
              </div>
              <p>{heading.description}</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="cn-mark-all"
              disabled={markingAll || loading}
              onClick={() => void markAll()}
            >
              {markingAll ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CheckCheck size={15} />
              )}
              Đọc tất cả
            </button>
          )}
        </header>

        <nav className="cn-filters" aria-label="Lọc thông báo">
          {categories.map(({ key, label, icon: Icon }) => {
            const unread = key === 'ALL' ? unreadCount : categoryUnread[key];
            return (
              <button
                type="button"
                key={key}
                aria-pressed={category === key}
                className={`cn-filter${category === key ? ' is-active' : ''}`}
                onClick={() => onSelectCategory(key)}
              >
                <Icon size={15} />
                <span>{label}</span>
                {unread > 0 && <span className="cn-filter-count">{unread}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {loading ? (
        <div className="cn-state" role="status">
          <Loader2 size={26} className="animate-spin" />
          <p>Đang tải thông báo…</p>
        </div>
      ) : error && items.length === 0 ? (
        <div className="cn-state cn-error-state" role="alert">
          <Bell size={25} />
          <p>{error}</p>
          <button type="button" className="cn-retry" onClick={onRetry}>
            Thử tải lại
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="cn-state">
          <span className="cn-empty-icon">
            <Bell size={27} />
          </span>
          <h2>Chưa có thông báo</h2>
          <p>Các cập nhật mới trong mục này sẽ xuất hiện tại đây.</p>
          {category === 'ORDER' && (
            <Link to="/marketplace" className="cn-detail">
              Khám phá sản phẩm <ArrowRight size={14} />
            </Link>
          )}
          {category === 'PROMOTION' && (
            <Link to="/customer/vouchers" className="cn-detail">
              Xem kho voucher <ArrowRight size={14} />
            </Link>
          )}
        </div>
      ) : (
        <div className="cn-list">
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
                className={`cn-item${!item.isRead ? ' is-unread' : ''}`}
                key={item.id}
              >
                <span className="cn-item-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <div className="cn-item-content">
                  <div className="cn-meta">
                    <span className="cn-category">{categoryLabel}</span>
                    {validDate && (
                      <time dateTime={item.createdAt}>
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
                      <span className="cn-new">
                        <i aria-hidden="true" />
                        Chưa đọc
                      </span>
                    )}
                  </div>
                  <h3>
                    <button type="button" onClick={() => void onOpen(item)}>
                      {item.title}
                    </button>
                  </h3>
                  <p className="cn-message">{item.message}</p>
                  {(item.data?.orderSn ||
                    item.data?.trackingNumber ||
                    item.data?.voucherCode) && (
                    <div className="cn-chips">
                      {item.data?.orderSn && (
                        <span>Mã đơn: {item.data.orderSn}</span>
                      )}
                      {item.data?.trackingNumber && (
                        <span>Vận đơn: {item.data.trackingNumber}</span>
                      )}
                      {item.data?.voucherCode && (
                        <span>Mã: {item.data.voucherCode}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="cn-item-actions">
                  {!item.isRead && (
                    <button
                      type="button"
                      className="cn-mark-read"
                      title="Đánh dấu đã đọc"
                      aria-label={`Đánh dấu đã đọc: ${item.title}`}
                      disabled={busy}
                      onClick={(event) => void markRead(event, item)}
                    >
                      {busy ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Check size={15} />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    className="cn-detail"
                    onClick={() => void onOpen(item)}
                  >
                    {itemCategory === 'ORDER'
                      ? 'Xem đơn mua'
                      : itemCategory === 'PROMOTION'
                        ? 'Xem ưu đãi'
                        : 'Xem chi tiết'}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {!loading && items.length > 0 && error && (
        <div className="cn-inline-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>Thử lại</button>
        </div>
      )}
      {!loading && items.length > 0 && hasMore && (
        <div className="cn-load-more-wrap">
          <button
            type="button"
            className="cn-load-more"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore && <Loader2 size={15} className="animate-spin" />}
            {loadingMore ? 'Đang tải…' : 'Xem thông báo cũ hơn'}
          </button>
        </div>
      )}
    </section>
  );
}
