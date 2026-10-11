import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, LogIn, LogOut, Store, Camera, Loader2, Edit2 } from 'lucide-react';
import { NAVIGATION_BY_ROLE } from '../../config/navigation.config';
import { authService, type UserProfile } from '../../services/auth.service';
import { uploadService } from '../../services/upload.service';
import { orderService } from '../../services/order.service';
import { notificationsService } from '../../services/notifications.service';
import { toast } from '../../utils/toast';

export interface SidebarProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
}

export function Sidebar({ currentUser, onLogout }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const [activeWs, setActiveWs] = useState(() => authService.getActiveWorkspace());
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleWsChange = () => {
      setActiveWs(authService.getActiveWorkspace());
    };
    window.addEventListener('scanms_workspace_changed', handleWsChange);
    window.addEventListener('storage', handleWsChange);
    return () => {
      window.removeEventListener('scanms_workspace_changed', handleWsChange);
      window.removeEventListener('storage', handleWsChange);
    };
  }, []);

  const role = (() => {
    if (activeWs === 'shop') return 'SHOP_MANAGER';
    if (activeWs === 'kol') return 'COLLABORATOR';
    if (activeWs === 'customer') return 'CUSTOMER';
    if (activeWs === 'admin') {
      return currentUser?.role === 'SYSTEM_MANAGER' ? 'SYSTEM_MANAGER' : 'SYSTEM_ADMIN';
    }
    return currentUser?.role || 'COLLABORATOR';
  })();

  const [pendingOrdersCount, setPendingOrdersCount] = useState<number | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState<{ ORDER?: number; PROMOTION?: number; SYSTEM?: number }>({});

  useEffect(() => {
    let mounted = true;
    if (role === 'SHOP_MANAGER') {
      orderService
        .getMyStoreOrders({ status: 'PENDING', limit: 1 })
        .then((res) => {
          if (mounted && res?.pagination?.total !== undefined) {
            setPendingOrdersCount(res.pagination.total);
          }
        })
        .catch(() => {});
    }

    notificationsService
      .getUnreadDetails()
      .then((res) => {
        if (mounted && res?.categoryUnreadCounts) {
          setUnreadNotifs(res.categoryUnreadCounts);
        }
      })
      .catch(() => {});

    const handleOrderUpdate = () => {
      if (role === 'SHOP_MANAGER') {
        orderService
          .getMyStoreOrders({ status: 'PENDING', limit: 1 })
          .then((res) => {
            if (mounted && res?.pagination?.total !== undefined) {
              setPendingOrdersCount(res.pagination.total);
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener('scanms_order_updated', handleOrderUpdate);
    window.addEventListener('scanms_notification_received', handleOrderUpdate);

    return () => {
      mounted = false;
      window.removeEventListener('scanms_order_updated', handleOrderUpdate);
      window.removeEventListener('scanms_notification_received', handleOrderUpdate);
    };
  }, [role]);

  const getItemBadge = (path: string, staticBadge?: string) => {
    if (staticBadge) {
      return { text: staticBadge, isHighlight: false };
    }
    if (path === '/merchant/orders') {
      if (pendingOrdersCount !== null && pendingOrdersCount > 0) {
        return { text: String(pendingOrdersCount), isHighlight: true };
      }
      if (unreadNotifs.ORDER && unreadNotifs.ORDER > 0) {
        return { text: String(unreadNotifs.ORDER), isHighlight: true };
      }
    }
    if (path === '/merchant/products') {
      if (unreadNotifs.SYSTEM && unreadNotifs.SYSTEM > 0) {
        return { text: 'Mới', isHighlight: true };
      }
    }
    if (path === '/merchant/customer-messages') {
      if (unreadNotifs.PROMOTION && unreadNotifs.PROMOTION > 0) {
        return { text: String(unreadNotifs.PROMOTION), isHighlight: false };
      }
    }
    if (path === '/customer/orders') {
      if (unreadNotifs.ORDER && unreadNotifs.ORDER > 0) {
        return { text: String(unreadNotifs.ORDER), isHighlight: true };
      }
    }
    return null;
  };

  const navConfig = NAVIGATION_BY_ROLE[role] || NAVIGATION_BY_ROLE.COLLABORATOR;
  const isLinkActive = (path: string) => {
    if (path === '/' || path === '/collaborator/dashboard') {
      return currentPath === '/' || currentPath === '/collaborator/dashboard';
    }

    if (path === '/collaborator/marketing') {
      return (
        currentPath.startsWith('/collaborator/marketing') ||
        currentPath.startsWith('/collaborator/referral-links') ||
        currentPath.startsWith('/collaborator/links') ||
        currentPath.startsWith('/collaborator/media-hub') ||
        currentPath.startsWith('/collaborator/coupons')
      );
    }

    if (path === '/collaborator/collaboration') {
      return (
        currentPath.startsWith('/collaborator/collaboration') ||
        currentPath.startsWith('/collaborator/sample-requests') ||
        currentPath.startsWith('/collaborator/samples') ||
        currentPath.startsWith('/collaborator/messages') ||
        currentPath.startsWith('/collaborator/campaigns') ||
        currentPath === '/chat'
      );
    }

    if (path === '/collaborator/profile') {
      return (
        currentPath.startsWith('/collaborator/profile') ||
        currentPath.startsWith('/collaborator/kyc') ||
        currentPath.startsWith('/collaborator/social-channels') ||
        currentPath.startsWith('/collaborator/tiers') ||
        currentPath.startsWith('/collaborator/leaderboard') ||
        currentPath.startsWith('/collaborator/bonus-progress')
      );
    }

    if (path === '/merchant/kol-hub') {
      return (
        currentPath.startsWith('/merchant/kol-hub') ||
        currentPath.startsWith('/merchant/sample-requests') ||
        currentPath.startsWith('/merchant/kol-recommendations') ||
        currentPath.startsWith('/merchant/collaborators') ||
        currentPath.startsWith('/merchant/messages')
      );
    }

    if (path === '/merchant/promotions') {
      return (
        currentPath.startsWith('/merchant/promotions') ||
        currentPath.startsWith('/merchant/coupons') ||
        currentPath.startsWith('/merchant/commission-rules') ||
        currentPath.startsWith('/merchant/referral-links')
      );
    }

    if (path === '/admin/affiliate-oversight') {
      return (
        currentPath.startsWith('/admin/affiliate-oversight') ||
        currentPath.startsWith('/admin/referral-links') ||
        currentPath.startsWith('/admin/coupons')
      );
    }

    if (path === '/admin/analytics') {
      return (
        currentPath.startsWith('/admin/analytics') ||
        currentPath.startsWith('/admin/leaderboard') ||
        currentPath.startsWith('/admin/kol-recommendations')
      );
    }

    if (path === '/admin/users') {
      return (
        currentPath.startsWith('/admin/users') ||
        currentPath.startsWith('/merchant/kyc-approval')
      );
    }

    if (path === '/admin/fraud-sentinel') {
      return (
        currentPath.startsWith('/admin/fraud-sentinel') ||
        currentPath.startsWith('/merchant/fraud-sentinel') ||
        currentPath.startsWith('/merchant/ai-fraud')
      );
    }

    if (path === '/admin/audit-logs') {
      return (
        currentPath.startsWith('/admin/audit-logs') ||
        currentPath.startsWith('/admin/audit') ||
        currentPath.startsWith('/merchant/audit-logs')
      );
    }

    return currentPath === path || currentPath.startsWith(`${path}/`);
  };

  const displayName = role === 'SHOP_MANAGER'
    ? currentUser?.stores?.[0]?.name || currentUser?.fullName || 'Gian Hàng Của Bạn'
    : currentUser?.fullName || currentUser?.email || 'Đối Tác Tiếp Thị';

  const editProfilePath = role === 'SHOP_MANAGER'
    ? '/merchant/settings'
    : role === 'SYSTEM_ADMIN' || role === 'SYSTEM_MANAGER'
    ? '/admin/profile'
    : '/collaborator/profile';

  const editProfileLabel = role === 'SHOP_MANAGER'
    ? 'Cài Đặt Gian Hàng'
    : role === 'SYSTEM_ADMIN' || role === 'SYSTEM_MANAGER'
    ? 'Hồ sơ cá nhân'
    : 'Sửa Hồ Sơ';

  return (
    <aside data-workspace-role={role} className="workspace-sidebar w-full lg:w-[250px] shrink-0 p-3.5 sticky top-[var(--workspace-header-height,69px)] self-start text-left select-none flex flex-col gap-2.5 z-30">
      {/* Hidden file input for avatar upload */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)');
            return;
          }

          if (file.size > 5 * 1024 * 1024) {
            toast.error('Kích thước ảnh tối đa 5MB');
            return;
          }

          setUploading(true);
          try {
            const secureUrl = await uploadService.uploadImage(file, 'scanms/avatars');
            await authService.updateAvatar(secureUrl);
            toast.success('Cập nhật ảnh đại diện thành công!');
          } catch (err: any) {
            console.error('Lỗi tải ảnh đại diện:', err);
            toast.error(err?.response?.data?.message || err?.message || 'Không thể tải ảnh đại diện lên');
          } finally {
            setUploading(false);
            e.target.value = '';
          }
        }}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
      />

      {/* User Identity Header (SCANMS UI Reference Style matching Customer) */}
      <div className="flex items-center gap-3 px-1 pt-1 pb-1">
        <div className="relative shrink-0 group">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploading}
            className="w-12 h-12 rounded-full border border-[#EAE4D7] overflow-hidden bg-[#FAF8F5] flex items-center justify-center text-[#8C6226] font-bold text-lg select-none relative cursor-pointer group-hover:opacity-90 transition shadow-2xs"
            title="Bấm vào để tải/đổi ảnh đại diện"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 text-[#B88E4F] animate-spin" />
            ) : currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>
                {currentUser?.fullName?.charAt(0).toUpperCase() || (role === 'SHOP_MANAGER' ? 'S' : 'K')}
              </span>
            )}
            {!uploading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-4 h-4 text-white drop-shadow" />
              </div>
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1 text-left">
          <strong className="block text-sm font-bold text-[#1A1612] truncate" title={displayName}>
            {displayName}
          </strong>
          <Link
            to={editProfilePath}
            className="inline-flex items-center gap-1 text-xs text-[#7D715E] hover:text-[#C59B58] transition-colors mt-0.5 cursor-pointer font-normal"
          >
            <Edit2 className="w-3 h-3 text-[#7D715E]" />
            <span>{editProfileLabel}</span>
          </Link>
        </div>
      </div>

      {/* SCANMS UI Reference Minimalist Navigation List */}
      <nav className="flex flex-col gap-0.5 text-xs sm:text-[13px]" aria-label="Menu chức năng">
        {navConfig.items.map((item) => {
          const active = isLinkActive(item.path);
          const Icon = item.icon;
          const badge = getItemBadge(item.path, item.badge);

          return (
            <div key={item.path} className="flex flex-col">
              <Link
                to={item.path}
                aria-current={active ? 'page' : undefined}
                className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-[#FAF5EB] text-[#B88E4F] font-bold border border-[#EEDFC6]/70 shadow-2xs'
                    : 'text-[#574C3D] hover:bg-[#FAF8F5] hover:text-[#B88E4F] font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? 'text-[#B88E4F]' : 'text-[#7D715E] group-hover:text-[#B88E4F]'
                  }`}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {badge && (
                  <span
                    className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 transition-transform ${
                      badge.isHighlight
                        ? 'bg-[#C59B58] text-white shadow-2xs animate-pulse'
                        : 'bg-[#F3EFE6] text-[#7D715E] border border-[#EAE4D7]'
                    }`}
                  >
                    {badge.text}
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions (SCANMS UI Reference Style) */}
      <div className="pt-3 flex flex-col gap-1 text-xs sm:text-[13px]">
        {currentUser ? (
          <>
            {/* Sàn Mua Sắm Link */}
            <Link
              to="/marketplace"
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-medium text-[#7D715E] hover:text-[#B88E4F] hover:bg-[#FAF8F5] transition cursor-pointer group"
              title="Quay lại Sàn Mua Sắm SCANMS"
            >
              <ArrowLeft className="w-4 h-4 text-[#7D715E] group-hover:text-[#B88E4F] transition-colors shrink-0" aria-hidden="true" />
              <Store className="w-4 h-4 text-[#7D715E] group-hover:text-[#B88E4F] shrink-0" />
              <span>Sàn Mua Sắm</span>
            </Link>

            {/* Đăng xuất */}
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-[13px] font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer text-left w-full"
            >
              <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Đăng xuất</span>
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-[#C59B58] hover:bg-[#B88E4F] text-white transition cursor-pointer text-center w-full shadow-2xs"
          >
            <LogIn className="w-3.5 h-3.5 shrink-0" />
            <span>Đăng nhập</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
