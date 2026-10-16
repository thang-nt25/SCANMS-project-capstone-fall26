import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  Bell,
  CheckCheck,
  ShoppingBag,
  DollarSign,
  ShieldAlert,
  Info,
  Clock,
  Loader2,
  Radio,
  X,
} from 'lucide-react';
import { notificationsService, type AppNotification } from '../../services/notifications.service';
import { authService } from '../../services/auth.service';
import { liveBroadcastService } from '@/services/live-broadcast.service';
import { getNotificationSection } from '../../utils/notificationCategories';
import './NotificationDropdown.css';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ORDER' | 'PROMOTION' | 'SYSTEM'>('ALL');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelTop, setPanelTop] = useState(72);
  const [panelRight, setPanelRight] = useState(12);

  useEffect(() => {
    if (!isOpen) return;
    const position = () => {
      const bounds = bellRef.current?.getBoundingClientRect();
      setPanelTop((bounds?.bottom || 64) + 8);
      setPanelRight(window.innerWidth < 640 ? 12 : Math.max(12, window.innerWidth - (bounds?.right || window.innerWidth - 12)));
    };
    position();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setIsOpen(false); bellRef.current?.focus(); }
    };
    window.addEventListener("resize", position);
    document.addEventListener("keydown", dismiss);
    panelRef.current?.focus();
    return () => { window.removeEventListener("resize", position); document.removeEventListener("keydown", dismiss); };
  }, [isOpen]);

  // Phát âm thanh chime nhẹ khi có thông báo mới (Web Audio API)
  const playNotificationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  const getLiveNotifications = (): AppNotification[] => {
    const broadcasts = liveBroadcastService.getAllBroadcasts();
    return broadcasts.map((b) => ({
      id: b.id,
      userId: 'current',
      title: b.title,
      message: `${b.storeName} • ${b.creatorName}: Đang livestream trực tiếp trợ giá cực sốc! ${b.discountText || 'Vào xem ngay'}`,
      type: 'LIVE_SESSION_BROADCAST',
      data: { sessionId: b.sessionId, liveUrl: b.liveUrl },
      isRead: !!b.isRead,
      createdAt: b.createdAt,
    }));
  };

  const fetchUnreadCount = async () => {
    const unreadBroadcasts = liveBroadcastService.getUnreadBroadcasts().length;
    const user = authService.getCurrentUser();
    let backendUnread = 0;
    if (user) {
      const unreadCount = await notificationsService.getUnreadCount();
      if (unreadCount === null) return;
      backendUnread = unreadCount;
    }
    const totalCount = backendUnread + unreadBroadcasts;
    setUnreadCount((prev) => {
      if (totalCount > prev && prev > 0) {
        playNotificationChime();
      }
      return totalCount;
    });
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const user = authService.getCurrentUser();
      let backendItems: AppNotification[] = [];
      let backendUnread = 0;

      if (user) {
        try {
          const res = await notificationsService.getNotifications(activeTab, 1, 20);
          backendItems = res.items || [];
          backendUnread = res.unreadCount || 0;
        } catch {
          backendItems = [];
        }
      }

      // Merge broadcast notifications for ALL and PROMOTION tabs
      const liveItems = getLiveNotifications();
      const now = Date.now();
      // Lọc bỏ bất kỳ thông báo phiên live nào từ backend mà đã hết thời gian endsAt hoặc đã kết thúc
      const validBackendItems = backendItems.filter((item) => {
        if (item.type.startsWith('LIVE_') || item.type.includes('LIVE')) {
          if (item.type === 'LIVE_SESSION_ENDED') {
            return false;
          }
          const endsAt = (item.data as any)?.endsAt;
          if (endsAt) {
            const endMs = new Date(endsAt).getTime();
            if (Number.isFinite(endMs) && endMs <= now) {
              return false;
            }
          }
          const createdMs = new Date(item.createdAt).getTime();
          if (item.type === 'LIVE_SESSION_STARTED' && Number.isFinite(createdMs) && (now - createdMs > 2 * 3600 * 1000)) {
            return false;
          }
        }
        return true;
      });

      // Tránh trùng lặp nếu cả backend lẫn local broadcast đều có cùng sessionId
      const liveSessionIds = new Set(liveItems.map((i) => i.data?.sessionId).filter(Boolean));
      const deduplicatedBackend = validBackendItems.filter((item) => {
        if (item.type === 'LIVE_GOVERNANCE') return true;
        if (item.type.startsWith('LIVE_') || item.type.includes('LIVE')) {
          const sId = (item.data as any)?.sessionId;
          if (sId && liveSessionIds.has(sId)) {
            return false;
          }
        }
        return true;
      });

      let combined: AppNotification[] = [];

      if (activeTab === 'ALL') {
        combined = [...liveItems, ...deduplicatedBackend];
      } else if (activeTab === 'PROMOTION') {
        combined = [
          ...liveItems,
          ...deduplicatedBackend.filter((item) => getNotificationSection(item.type) === 'PROMOTION'),
        ];
      } else {
        combined = deduplicatedBackend.filter(
          (item) => getNotificationSection(item.type) === activeTab,
        );
      }

      setNotifications(combined);
      const unreadBroadcasts = liveBroadcastService.getUnreadBroadcasts().length;
      setUnreadCount(backendUnread + unreadBroadcasts);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    // Tự động kiểm tra unread định kỳ mỗi 10 giây (khi hết giờ kết thúc phiên live, chuông lập tức hạ số)
    const interval = setInterval(fetchUnreadCount, 10000);

    // Lắng nghe sự kiện livestream phát sóng thời gian thực cho mọi Role
    const handleNewLive = () => {
      playNotificationChime();
      void fetchNotifications();
      void fetchUnreadCount();
    };

    const handleLiveRead = () => {
      void fetchNotifications();
      void fetchUnreadCount();
    };

    window.addEventListener('scanms-new-live-broadcast', handleNewLive);
    window.addEventListener('scanms-live-broadcast-read', handleLiveRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener('scanms-new-live-broadcast', handleNewLive);
      window.removeEventListener('scanms-live-broadcast-read', handleLiveRead);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchNotifications();
    }
  }, [isOpen, activeTab]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    liveBroadcastService.markAllAsRead();
    try {
      await notificationsService.markAllAsRead();
    } catch {}
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      if (notif.type.startsWith('LIVE_') || notif.type.includes('LIVE')) {
        liveBroadcastService.markAsRead(notif.id);
      } else {
        try {
          await notificationsService.markAsRead(notif.id);
        } catch {}
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setIsOpen(false);

    if (notif.type === 'LIVE_GOVERNANCE') {
      const role = authService.getCurrentUser()?.role;
      const sessionQuery = `session=${encodeURIComponent(notif.data?.sessionId || '')}`;
      if (role === 'COLLABORATOR') navigate(`/collaborator/live-sessions?${sessionQuery}`);
      else if (role === 'SHOP_MANAGER') navigate(`/merchant/promotions?tab=live-sessions&${sessionQuery}`);
      else if (role === 'SYSTEM_ADMIN' || role === 'SYSTEM_MANAGER') navigate(`/admin/affiliate-oversight?tab=live-sessions&${sessionQuery}`);
      return;
    }

    // 1. Live stream broadcast notification -> dẫn thẳng vào phòng livestream
    if ((notif.type.startsWith('LIVE_') || notif.type.includes('LIVE')) && !notif.type.startsWith('LIVE_ORDER_')) {
      const liveUrl = notif.data?.liveUrl;
      if (liveUrl) {
        if (liveUrl.startsWith('http')) {
          try {
            const urlObj = new URL(liveUrl);
            if (urlObj.origin === window.location.origin) {
              navigate(urlObj.pathname + urlObj.search);
              return;
            } else {
              window.open(liveUrl, '_blank');
              return;
            }
          } catch {
            window.open(liveUrl, '_blank');
            return;
          }
        } else if (liveUrl.startsWith('/')) {
          navigate(liveUrl);
          return;
        }
      }
      const sessionId = notif.data?.sessionId || notif.data?.id || 'demo';
      navigate(`/live/${sessionId}`);
      return;
    }

    // 2. Action URL routing neu co san
    let actionUrl = notif.data?.actionUrl;
    if (actionUrl === '/customer/upgrade' && (notif.type === 'WELCOME' || notif.type === 'SYSTEM' || !notif.type.includes('UPGRADE'))) {
      actionUrl = '/marketplace';
    }
    if (actionUrl) {
      navigate(actionUrl);
      return;
    }

    // 3. Deep-link routing based on notification type
    const user = authService.getCurrentUser();
    const userRole = user?.role;
    const orderId = notif.data?.orderId || notif.data?.orderSn || notif.data?.id;
    const returnId = notif.data?.returnId || notif.data?.returnRequestId;
    const payoutId = notif.data?.payoutId;

    if (notif.type.startsWith('SAMPLE_')) {
      if (userRole === 'SYSTEM_ADMIN' || userRole === 'SYSTEM_MANAGER') navigate('/admin/sample-requests');
      else if (userRole === 'SHOP_MANAGER') navigate('/merchant/kol-hub?tab=samples');
      else if (userRole === 'COLLABORATOR') navigate('/collaborator/collaboration?tab=samples');
      return;
    }

    if (
      notif.type.startsWith('ORDER_') ||
      notif.type.startsWith('DISPUTE_') ||
      notif.type.startsWith('RETURN_') ||
      notif.type.startsWith('LIVE_ORDER_')
    ) {
      if (returnId) {
        if (userRole === 'CUSTOMER') {
          navigate(`/customer/returns/${encodeURIComponent(returnId)}`);
          return;
        } else if (userRole === 'SHOP_MANAGER') {
          navigate(`/merchant/return-requests?returnId=${encodeURIComponent(returnId)}`);
          return;
        } else if (userRole === 'SYSTEM_ADMIN' || userRole === 'SYSTEM_MANAGER') {
          navigate(`/admin/disputes?returnId=${encodeURIComponent(returnId)}`);
          return;
        }
      }

      if (userRole === 'CUSTOMER') {
        navigate(orderId ? `/customer/orders?orderId=${encodeURIComponent(orderId)}` : '/customer/orders');
      } else if (userRole === 'SHOP_MANAGER') {
        navigate(orderId ? `/merchant/orders?orderId=${encodeURIComponent(orderId)}` : '/merchant/orders');
      } else if (userRole === 'SYSTEM_ADMIN' || userRole === 'SYSTEM_MANAGER') {
        navigate(orderId ? `/admin/disputes?orderId=${encodeURIComponent(orderId)}` : '/admin/disputes');
      }
    } else if (notif.type.startsWith('COMMISSION_') || notif.type.startsWith('PAYOUT_')) {
      if (userRole === 'COLLABORATOR') {
        navigate(payoutId ? `/collaborator/wallet?payoutId=${encodeURIComponent(payoutId)}` : '/collaborator/wallet');
      } else if (userRole === 'SHOP_MANAGER') {
        navigate(payoutId ? `/merchant/payouts?payoutId=${encodeURIComponent(payoutId)}` : '/merchant/payouts');
      }
    } else if (notif.type.startsWith('KYC_')) {
      if (userRole === 'SYSTEM_ADMIN' || userRole === 'SHOP_MANAGER') {
        navigate('/merchant/kyc-approval');
      } else {
        navigate('/collaborator/profile?tab=kyc');
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type === 'LIVE_GOVERNANCE') return <ShieldAlert className="h-4 w-4 text-[#B88E4F]" />;
    if (type.startsWith('ORDER_') || type.startsWith('LIVE_ORDER_')) {
      return <ShoppingBag className="w-4 h-4 text-[#C59B58]" />;
    }
    if (type.startsWith('LIVE_') || type.includes('LIVE')) {
      return (
        <div className="relative">
          <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
        </div>
      );
    }
    if (type.startsWith('ORDER_')) {
      return <ShoppingBag className="w-4 h-4 text-[#C59B58]" />;
    }
    if (type.startsWith('COMMISSION_') || type.startsWith('PAYOUT_')) {
      return <DollarSign className="w-4 h-4 text-[#B88E4F]" />;
    }
    if (type.startsWith('DISPUTE_')) {
      return <ShieldAlert className="w-4 h-4 text-[#DC2626]" />;
    }
    return <Info className="w-4 h-4 text-[#B88E4F]" />;
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

  return (
    <div className="scanms-notifications" ref={dropdownRef}>
      <button ref={bellRef} type="button" onClick={() => setIsOpen(!isOpen)} className="scanms-notification-bell" title="Thông báo SCANMS" aria-label={"Thông báo: " + unreadCount + " chưa đọc"} aria-expanded={isOpen} aria-controls="scanms-notification-panel">
        <Bell size={18} />
        {unreadCount > 0 && <span className="scanms-notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {isOpen && createPortal(
        <div id="scanms-notification-panel" ref={panelRef} role="region" aria-label="Trung tâm thông báo" tabIndex={-1} className="scanms-notification-panel" style={{ '--notification-top': panelTop + 'px', '--notification-right': panelRight + 'px' } as React.CSSProperties}>
          <header className="scanms-notification-header">
            <div className="scanms-notification-heading">
              <span className="scanms-notification-heading-icon"><Bell size={18} /></span>
              <div><div className="scanms-notification-heading-title"><h3>Thông báo</h3>{unreadCount > 0 && <span className="scanms-notification-new">{unreadCount} mới</span>}</div><p>Cập nhật dành cho bạn</p></div>
            </div>
            <div className="scanms-notification-header-actions">
              {unreadCount > 0 && <button type="button" onClick={handleMarkAllRead} className="scanms-notification-read-all"><CheckCheck size={13} /><span>Đọc tất cả</span></button>}
              <button type="button" aria-label="Đóng thông báo" className="scanms-notification-close" onClick={() => { setIsOpen(false); bellRef.current?.focus(); }}><X size={15} /></button>
            </div>
          </header>
          <div className="scanms-notification-tabs" role="group" aria-label="Loại thông báo">
            {([
              {id:'ALL',label:'Tất cả'}, {id:'ORDER',label:'Đơn hàng'},
              {id:'PROMOTION',label:'Live & ưu đãi'}, {id:'SYSTEM',label:'Hệ thống'},
            ] as const).map(tab => <button type="button" key={tab.id} aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
          </div>
          <div className="scanms-notification-list" aria-busy={loading}>
            {loading ? <div className="scanms-notification-empty" role="status"><Loader2 size={22} className="animate-spin" /><p>Đang tải thông báo…</p></div>
              : !notifications.length ? <div className="scanms-notification-empty"><Bell size={24} /><h4>Chưa có thông báo</h4><p>Thông báo mới sẽ xuất hiện tại đây.</p></div>
              : notifications.map(n => {
                const isLive = n.type.startsWith('LIVE_') || n.type.includes('LIVE');
                const expanded = expandedMessages.has(n.id);
                const section = getNotificationSection(n.type);
                return <div key={n.id} className={'scanms-notification-entry' + (!n.isRead ? ' is-unread' : '')}>
                <button type="button" onClick={() => void handleNotificationClick(n)} className="scanms-notification-item">
                  <span className="scanms-notification-icon">{getNotificationIcon(n.type)}</span>
                  <span className="scanms-notification-content">
                    <span className="scanms-notification-title-row"><strong title={n.title}>{n.title}</strong>{!n.isRead && <span className="scanms-notification-unread-dot" aria-label="Chưa đọc" />}</span>
                    <span className={'scanms-notification-message' + (expanded ? ' is-expanded' : '')}>{n.message}</span>
                    <span className="scanms-notification-meta"><span className="scanms-notification-category">{section === 'ORDER' ? 'Đơn hàng' : section === 'PROMOTION' ? 'Live & ưu đãi' : 'Hệ thống'}</span><time dateTime={n.createdAt} title={new Date(n.createdAt).toLocaleString('vi-VN')}><Clock size={11} />{formatTimeAgo(n.createdAt)}</time>{isLive && <span className="scanms-notification-live-link">Xem phiên live →</span>}</span>
                  </span>
                </button>
                {n.message.length > 100 && <button type="button" className="scanms-notification-expand" aria-expanded={expanded} onClick={() => setExpandedMessages(prev => { const next = new Set(prev); if (next.has(n.id)) next.delete(n.id); else next.add(n.id); return next; })}>{expanded ? 'Thu gọn' : 'Xem đầy đủ'}</button>}
                </div>;
              })}
          </div>
          <footer className="scanms-notification-footer"><span className="scanms-notification-footer-dot" />Cập nhật hoạt động trên SCANMS</footer>
        </div>, document.body
      )}
    </div>
  );
};
