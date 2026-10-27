import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
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
  MessageSquare,
  Volume2,
  VolumeX,
  ArrowRight,
} from 'lucide-react';
import { notificationsService, type AppNotification } from '../../services/notifications.service';
import { authService } from '../../services/auth.service';
import { liveBroadcastService } from '@/services/live-broadcast.service';
import { getNotificationSection } from '../../utils/notification-categories.utils';
import { useChatNotifications } from '../../hooks/useChatNotifications';

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
  const notificationListRef = useRef<HTMLDivElement>(null);
  const [panelPosition, setPanelPosition] = useState({ top: 72, right: 12, maxHeight: 480 });
  const listRequest = useRef(0);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const position = () => {
      const bounds = bellRef.current?.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop || 0;
      const viewportBottom = viewportTop + (viewport?.height || window.innerHeight);
      const below = Math.max(0, viewportBottom - (bounds?.bottom || 64) - 18);
      const above = Math.max(0, (bounds?.top || 64) - viewportTop - 18);
      const openAbove = below < 220 && above > below;
      const fitViewport = Math.max(above, below) < 180;
      const maxHeight = Math.min(480, Math.max(0, fitViewport ? viewportBottom - viewportTop - 20 : openAbove ? above : below));
      const top = fitViewport ? viewportTop + 10 : openAbove ? (bounds?.top || 64) - 8 - maxHeight : Math.min((bounds?.bottom || 64) + 8, viewportBottom - 10);
      const width = Math.min(380, window.innerWidth - 20);
      const right = Math.min(Math.max(10, window.innerWidth - (bounds?.right || window.innerWidth - 10)), Math.max(10, window.innerWidth - width - 10));
      setPanelPosition(previous => previous.top === top && previous.right === right && previous.maxHeight === maxHeight ? previous : { top, right, maxHeight });
    };
    position();
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setIsOpen(false); bellRef.current?.focus(); }
    };
    window.addEventListener("resize", position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    document.addEventListener("keydown", dismiss);
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
      document.removeEventListener("keydown", dismiss);
    };
  }, [isOpen]);

  const getLiveNotifications = useCallback((): AppNotification[] => {
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
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    const unreadBroadcasts = liveBroadcastService.getUnreadBroadcasts().length;
    const user = authService.getCurrentUser();
    let backendUnread = 0;
    if (user) {
      const unreadCount = await notificationsService.getUnreadCount();
      if (user.id !== authService.getCurrentUser()?.id) return;
      if (unreadCount === null) return;
      backendUnread = unreadCount;
    }
    const totalCount = backendUnread + unreadBroadcasts;
    setUnreadCount(totalCount);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const requestId = ++listRequest.current;
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
      if (user?.id !== authService.getCurrentUser()?.id || requestId !== listRequest.current) return;

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

      setNotifications(combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      const unreadBroadcasts = liveBroadcastService.getUnreadBroadcasts().length;
      setUnreadCount(backendUnread + unreadBroadcasts);
    } catch {
    } finally {
      if (requestId === listRequest.current) setLoading(false);
    }
  }, [activeTab, getLiveNotifications]);

  const { soundOn, soundBlocked, toggleSound, unlockSound, playChime } = useChatNotifications(() => {
    void fetchUnreadCount();
    if (isOpen) void fetchNotifications();
  });

  useEffect(() => {
    fetchUnreadCount();
    // Tự động kiểm tra unread định kỳ mỗi 10 giây (khi hết giờ kết thúc phiên live, chuông lập tức hạ số)
    const interval = setInterval(fetchUnreadCount, 10000);

    // Lắng nghe sự kiện livestream phát sóng thời gian thực cho mọi Role
    const handleNewLive = () => {
      playChime();
      void fetchNotifications();
      void fetchUnreadCount();
    };

    const handleLiveRead = () => {
      void fetchNotifications();
      void fetchUnreadCount();
    };
    const handleFocus = () => { void fetchUnreadCount(); };

    window.addEventListener('scanms-new-live-broadcast', handleNewLive);
    window.addEventListener('scanms-live-broadcast-read', handleLiveRead);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('scanms-new-live-broadcast', handleNewLive);
      window.removeEventListener('scanms-live-broadcast-read', handleLiveRead);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchUnreadCount, fetchNotifications, playChime]);

  useEffect(() => {
    if (isOpen) {
      if (notificationListRef.current) notificationListRef.current.scrollTop = 0;
      setExpandedMessages(new Set());
      void fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

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

    if (notif.type === 'PRODUCT_REVIEW_REPORTED') {
      const role = authService.getCurrentUser()?.role;
      if (role === 'SYSTEM_ADMIN' || role === 'SYSTEM_MANAGER') navigate(`/admin/customer-reviews?filter=PENDING&review=${encodeURIComponent(notif.data?.reviewId || '')}`);
      return;
    }

    if (notif.type === 'LIVE_GOVERNANCE') {
      const role = authService.getCurrentUser()?.role;
      const sessionQuery = `session=${encodeURIComponent(notif.data?.sessionId || '')}`;
      if (role === 'COLLABORATOR') navigate(`/collaborator/live-sessions?${sessionQuery}`);
      else if (role === 'SHOP_MANAGER') navigate(`/merchant/live-sessions?${sessionQuery}`);
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
    if (type === 'CHAT_MESSAGE') return <MessageSquare className="h-4 w-4 text-[#B88E4F]" />;
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
    <div className="relative" ref={dropdownRef}>
      <button
        ref={bellRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative grid place-items-center w-[36px] h-[36px] border border-[#EAE4D7] rounded-full bg-white text-[#7D715E] cursor-pointer hover:bg-[#FBF5EB] hover:text-[#B88E4F] transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[-2px]"
        title="Thông báo SCANMS"
        aria-label={"Thông báo: " + unreadCount + " chưa đọc"}
        aria-expanded={isOpen}
        aria-controls="scanms-notification-panel"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-[4px] -right-[4px] grid place-items-center min-w-[17px] h-[17px] px-[4px] border-2 border-white rounded-[20px] bg-[#DC2626] text-white text-[9px] font-[600] leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {isOpen && createPortal(
        <div
          id="scanms-notification-panel"
          ref={panelRef}
          role="region"
          aria-label="Trung tâm thông báo"
          tabIndex={-1}
          className="scanms-notifications fixed z-[100] flex flex-col w-[380px] max-w-[calc(100vw_-_20px)] min-h-0 overflow-hidden border border-[#EAE4D7] rounded-[14px] bg-[color:#FFFFFF] text-[color:#1A1612]! shadow-[0_10px_32px_rgb(35_29_21_/_12%)] text-left outline-none [&_:is(button,[tabindex='0']):focus-visible]:outline-[2px] [&_:is(button,[tabindex='0']):focus-visible]:outline-solid [&_:is(button,[tabindex='0']):focus-visible]:outline-[#B88E4F] [&_:is(button,[tabindex='0']):focus-visible]:outline-offset-[-2px]"
          style={{ top: panelPosition.top, right: panelPosition.right, maxHeight: panelPosition.maxHeight }}
        >
          <header className="scanms-notifications-header flex items-center justify-between flex-wrap shrink-0 gap-[4px_6px] p-[8px_12px] bg-[color:#FFFFFF] [&_button]:min-h-[32px] [&_button]:cursor-pointer [@media_(max-width:359px)]:p-[6px_10px] [@media_(max-width:359px)]:[&_h3]:text-[13px] [@media_(max-width:359px)]:[&_>_div:first-child]:gap-[5px] [@media_(max-width:359px)]:[&_>_div:last-child]:gap-[1px]">
            <div className="flex items-center gap-[7px]">
              <h3 className="m-0 text-[14px] leading-[1.5] font-[600] text-[#1A1612]">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="p-[3px_6px] border border-[#EEDFC6] rounded-[6px] bg-[#FBF5EB] text-[#B88E4F] text-[9px] leading-[1.3]">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <div className="flex items-center gap-[4px]">
              <button
                type="button"
                onClick={toggleSound}
                aria-label={soundOn ? 'Tắt âm báo tin nhắn' : 'Bật âm báo tin nhắn'}
                title={soundOn ? 'Tắt âm báo tin nhắn' : 'Bật âm báo tin nhắn'}
                className="grid place-items-center w-[28px] h-[28px] rounded-[6px] text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#B88E4F]"
              >
                {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="inline-flex items-center justify-center gap-[4px] min-h-[28px] p-[5px_6px] rounded-[6px] text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#1A1612] text-[10px] font-[500] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[-2px]"
                >
                  <CheckCheck size={13} className="text-[#B88E4F]" />
                  <span>Đọc tất cả</span>
                </button>
              )}
              <button
                type="button"
                aria-label="Đóng thông báo"
                className="inline-flex items-center justify-center w-[26px] min-h-[28px] rounded-[6px] text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#1A1612] text-[10px] font-[500] cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[-2px]"
                onClick={() => { setIsOpen(false); bellRef.current?.focus(); }}
              >
                <X size={15} />
              </button>
            </div>
          </header>

          {soundOn && soundBlocked && (
            <button type="button" onClick={() => void unlockSound()} className="mx-3 mb-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-3 py-2 text-left text-[11px] text-[#B88E4F]">
              Trình duyệt chưa cho phát âm báo. Bấm để bật âm thanh.
            </button>
          )}

          <div className="scanms-notifications-tabs grid grid-cols-[repeat(4,minmax(0,1fr))] gap-[3px] shrink-0 p-[0_10px_8px] border-b border-b-[#EAE4D7] bg-[color:#FFFFFF] [&_>_button]:min-w-0 [&_>_button]:min-h-[32px]" role="group" aria-label="Loại thông báo">
            {([
              { id: 'ALL', label: 'Tất cả' },
              { id: 'ORDER', label: 'Đơn hàng' },
              { id: 'PROMOTION', label: 'Live & ưu đãi' },
              { id: 'SYSTEM', label: 'Hệ thống' },
            ] as const).map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-[32px] p-[6px_4px] border rounded-[7px] text-[10px] font-[500] leading-[1.4] whitespace-nowrap cursor-pointer transition-colors hover:bg-[#FBF5EB] focus-visible:outline-2 focus-visible:outline-[#C59B58] focus-visible:outline-offset-[-2px] ${
                    isActive
                      ? 'border-[#EEDFC6] bg-[#FBF5EB] text-[#1A1612]'
                      : 'border-transparent bg-white text-[#7D715E]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="scanms-notifications-list flex-auto min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#D9C5A3_#FAF8F5]! touch-pan-y [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:w-[5px]! [&::-webkit-scrollbar-thumb]:rounded-[8px]! [&::-webkit-scrollbar-thumb]:bg-[color:#D9C5A3]!" ref={notificationListRef} role="region" aria-label="Danh sách thông báo" tabIndex={0} aria-busy={loading}>
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-[7px] p-[34px_16px] text-[#7D715E] text-center" role="status">
                <Loader2 size={22} className="animate-spin text-[#B88E4F]" />
                <p className="text-[11px] leading-[1.6] m-0">Đang tải thông báo…</p>
              </div>
            ) : !notifications.length ? (
              <div className="flex flex-col items-center justify-center gap-[7px] p-[34px_16px] text-[#7D715E] text-center">
                <Bell size={24} className="text-[#B88E4F]" />
                <h4 className="text-[12px] font-[500] text-[#1A1612] m-0">Chưa có thông báo</h4>
                <p className="text-[11px] leading-[1.6] m-0">Thông báo mới sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              notifications.map(n => {
                const isLive = n.type.startsWith('LIVE_') || n.type.includes('LIVE');
                const expanded = expandedMessages.has(n.id);
                return (
                  <article key={n.id} className="scanms-notification-item min-w-0 p-[10px_12px_8px] border-b border-b-[#F3EFE6] bg-[color:#FFFFFF] [&:last-child]:border-b-0 [&[data-read='false']:not(:hover)]:bg-[color:#FDFAF5] [&:hover]:bg-[color:#FAF8F5] [&[data-read='true']_.scanms-notification-title]:font-[500] [&:has(.scanms-notification-message[data-expanded='true'])_.scanms-notification-title]:whitespace-normal [&:has(.scanms-notification-message[data-expanded='true'])_.scanms-notification-title]:[overflow-wrap:anywhere] [@media_(max-width:359px)]:pl-[10px] [@media_(max-width:359px)]:pr-[10px]" data-notification-id={n.id} data-read={n.isRead}>
                    <button
                      type="button"
                      onClick={() => void handleNotificationClick(n)}
                      className="scanms-notification-open [font-family:inherit]! [font-size:inherit] [font-weight:inherit] leading-[inherit] [font-style:inherit] [font-variant:inherit] [font-stretch:inherit] flex items-start gap-[9px] w-full min-w-0 p-0 border-0 rounded-[5px] bg-transparent text-[color:inherit]! text-left cursor-pointer"
                    >
                      <span className="scanms-notification-icon grid place-items-center shrink-0 w-[29px] h-[29px] mt-[1px] border border-[#EEDFC6] rounded-[8px] bg-[color:#FFFFFF] text-[color:#B88E4F]!" aria-hidden="true">
                        {getNotificationIcon(n.type)}
                      </span>
                      <span className="block flex-1 min-w-0">
                        <span className="flex items-start gap-[8px]">
                          <strong title={n.title} className="scanms-notification-title block flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[color:#1A1612]! text-[12px] font-[600] leading-[1.5]">
                            {n.title}
                          </strong>
                          {!n.isRead && <span className="shrink-0 w-[5px] h-[5px] mt-[6px] rounded-full bg-[#C59B58]" aria-label="Chưa đọc" />}
                        </span>
                        <span className="scanms-notification-message [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden [overflow-wrap:anywhere] mt-[3px] text-[color:#7D715E]! text-[11px] leading-[1.55] [&[data-expanded='true']]:block" data-expanded={expanded}>
                          {n.message}
                        </span>
                      </span>
                    </button>
                    <div className="scanms-notification-meta flex items-center justify-between flex-wrap gap-[3px_8px] min-h-[20px] m-[3px_0_0_38px] text-[color:#8A642C]! text-[10px] leading-[1.5] [&_>_time]:inline-flex [&_>_time]:items-center [&_>_time]:gap-[4px] [&_>_time]:text-[color:#7D715E]! [&_>_time_>_svg]:shrink-0">
                      <time dateTime={n.createdAt}><Clock size={10} aria-hidden="true" />{formatTimeAgo(n.createdAt)}</time>
                      {isLive && <span>Phiên live</span>}
                    {(n.message.length > 100 || n.title.length > 52) && (
                      <button
                        type="button"
                        className="scanms-notification-expand [font-family:inherit]! text-[10px] [font-weight:inherit] leading-[1.5] [font-style:inherit] [font-variant:inherit] [font-stretch:inherit] min-h-[22px] ml-auto p-[2px_0_2px_8px] border-0 rounded-[4px] bg-transparent text-[color:#8A642C]! cursor-pointer [&:hover]:underline [&:hover]:underline-offset-[3px]"
                        aria-expanded={expanded}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedMessages(prev => {
                            const next = new Set(prev);
                            if (next.has(n.id)) next.delete(n.id);
                            else next.add(n.id);
                            return next;
                          });
                        }}
                      >
                        {expanded ? 'Thu gọn' : 'Xem thêm'}
                      </button>
                    )}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <footer className="scanms-notifications-footer flex items-center justify-center shrink-0 min-h-[40px] border-t border-t-[#EAE4D7] bg-[color:#FFFFFF] [&_>_button]:[font-family:inherit]! [&_>_button]:text-[11px] [&_>_button]:font-[550] [&_>_button]:leading-[inherit] [&_>_button]:[font-style:inherit] [&_>_button]:[font-variant:inherit] [&_>_button]:[font-stretch:inherit] [&_>_button]:inline-flex [&_>_button]:items-center [&_>_button]:justify-center [&_>_button]:gap-[8px] [&_>_button]:w-full [&_>_button]:min-h-[40px] [&_>_button]:p-[10px_12px] [&_>_button]:border-0 [&_>_button]:bg-[color:#FFFFFF] [&_>_button]:text-[color:#8A642C]! [&_>_button]:cursor-pointer [&_>_button:hover]:bg-[color:#FBF5EB] [&_>_span]:p-[10px] [&_>_span]:text-[color:#7D715E]! [&_>_span]:text-[10px]">
            {authService.getCurrentUser()?.role === 'CUSTOMER' || authService.getActiveWorkspace() === 'customer'
              ? <button type="button" onClick={() => { setIsOpen(false); navigate('/customer/notifications'); }}>Xem tất cả thông báo<ArrowRight size={14} aria-hidden="true" /></button>
              : <span>Cập nhật hoạt động trên SCANMS</span>}
          </footer>
        </div>,
        document.body
      )}
    </div>
  );
};
