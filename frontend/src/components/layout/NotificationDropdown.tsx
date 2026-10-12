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
import { getNotificationSection } from '../../utils/notification-categories.utils';

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ORDER' | 'PROMOTION' | 'SYSTEM'>('ALL');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
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
      return <DollarSign className="w-4 h-4 text-[#059669]" />;
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
          className="fixed z-[100] flex flex-col w-[380px] max-w-[calc(100vw-24px)] max-h-[min(520px,calc(100dvh-var(--notification-top)-12px))] border border-[#EAE4D7] rounded-[14px] bg-white text-[#1A1612] shadow-[0_12px_32px_rgb(35_29_21_/_0.1)] overflow-hidden text-left outline-none max-[639px]:right-[12px] max-[639px]:w-[calc(100vw-24px)]"
          style={{ top: panelTop, right: panelRight }}
        >
          <header className="flex items-center justify-between shrink-0 gap-[12px] p-[13px_14px_11px]">
            <div className="flex items-center gap-[7px]">
              <h3 className="m-0 text-[14px] leading-[1.5] font-[600] text-[#1A1612]">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="p-[3px_6px] border border-[#EEDFC6] rounded-[6px] bg-[#FBF5EB] text-[#B88E4F] text-[9px] leading-[1.3]">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <div className="flex items-center gap-[4px]">
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

          <div className="grid grid-cols-4 gap-[4px] p-[0_12px_11px] shrink-0 border-b border-[#EAE4D7]" role="group" aria-label="Loại thông báo">
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

          <div className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin]" aria-busy={loading}>
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
                return (
                  <button
                    type="button"
                    key={n.id}
                    onClick={() => void handleNotificationClick(n)}
                    className="relative flex items-start gap-[10px] w-full p-[13px_14px] border-b border-[#EAE4D7] last:border-b-0 bg-white hover:bg-[#FAF8F5] text-left transition-colors cursor-pointer"
                  >
                    <span className="grid place-items-center shrink-0 w-[28px] h-[28px] mt-[1px] border border-[#EEDFC6] rounded-[8px] bg-white text-[#B88E4F]">
                      {getNotificationIcon(n.type)}
                    </span>
                    <span className="block flex-1 min-w-0">
                      <span className="flex items-start gap-[8px]">
                        <strong title={n.title} className={`line-clamp-2 flex-1 text-[#1A1612] text-[12px] leading-[1.5] ${!n.isRead ? 'font-[600]' : 'font-[500]'}`}>
                          {n.title}
                        </strong>
                        {!n.isRead && <span className="shrink-0 w-[5px] h-[5px] mt-[6px] rounded-full bg-[#C59B58]" aria-label="Chưa đọc" />}
                      </span>
                      <span className="line-clamp-2 mt-[4px] text-[#7D715E] text-[11px] leading-[1.6] block">
                        {n.message}
                      </span>
                      <span className="flex items-center justify-between flex-wrap gap-[5px] mt-[7px]">
                        <time dateTime={n.createdAt} className="inline-flex items-center gap-[4px] text-[#9A8E7C] text-[9px] leading-[1.5]">
                          <Clock size={11} />
                          {formatTimeAgo(n.createdAt)}
                        </time>
                        {isLive && <span className="text-[#B88E4F] text-[9px] font-[500] hover:underline">Xem phiên live →</span>}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <footer className="flex items-center justify-center gap-[5px] shrink-0 p-[10px_12px] border-t border-[#EAE4D7] bg-white text-[#9A8E7C] text-[9px] leading-[1.5]">
            <span className="w-[4px] h-[4px] rounded-full bg-[#C59B58]" />
            Cập nhật hoạt động trên SCANMS
          </footer>
        </div>,
        document.body
      )}
    </div>
  );
};
