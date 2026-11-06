import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Store,
  Shield,
  ShieldCheck,
  User,
  Megaphone,
} from 'lucide-react';
import { authService, type UserProfile } from '../../services/auth.service';
import { uploadService } from '../../services/upload.service';
import { toast } from '../../utils/toast';
import { ScanMSLogo } from '../common/ScanMSLogo';
import { AccountConnectionStatus } from './AccountConnectionStatus';
import { NotificationDropdown } from './NotificationDropdown';
import { HeaderAccountButton } from './HeaderAccountButton';
import { AccountMenu } from './AccountMenu';

export interface WorkspaceHeaderProps {
  currentUser: UserProfile | null;
  onLogout?: () => void;
}

export function WorkspaceHeader({
  currentUser: initialUser,
  onLogout,
}: WorkspaceHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(
    () => initialUser || authService.getCurrentUser(),
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(() =>
    authService.getActiveWorkspace(),
  );

  const menuRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Sync user and workspace
  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
    const syncUser = () => setCurrentUser(authService.getCurrentUser());
    const syncWorkspace = () =>
      setActiveWorkspace(authService.getActiveWorkspace());

    window.addEventListener('auth-user-updated', syncUser);
    window.addEventListener('scanms_workspace_changed', syncWorkspace);
    window.addEventListener('storage', syncWorkspace);
    return () => {
      window.removeEventListener('auth-user-updated', syncUser);
      window.removeEventListener('scanms_workspace_changed', syncWorkspace);
      window.removeEventListener('storage', syncWorkspace);
    };
  }, []);

  useEffect(() => {
    setActiveWorkspace(authService.getActiveWorkspace());
  }, [location.pathname]);

  // Click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine role in workspace
  const role =
    activeWorkspace === 'shop'
      ? 'SHOP_MANAGER'
      : activeWorkspace === 'admin'
      ? currentUser?.role === 'SYSTEM_MANAGER'
        ? 'SYSTEM_MANAGER'
        : 'SYSTEM_ADMIN'
      : activeWorkspace === 'customer' || location.pathname.startsWith('/customer')
      ? 'CUSTOMER'
      : 'COLLABORATOR';

  // Role details & dynamic badge
  let badgeTitle = 'KOL Đối Tác Tiếp Thị';
  let badgeSub = 'Kênh Sáng Tạo Nội Dung';
  let BadgeIcon = Megaphone;

  if (role === 'SHOP_MANAGER') {
    badgeTitle = currentUser?.stores?.[0]?.name || 'Gian Hàng Sora Skin';
    badgeSub = 'Cửa Hàng Trực Thuộc';
    BadgeIcon = Store;
  } else if (role === 'SYSTEM_ADMIN') {
    badgeTitle = 'Tổng Quản Trị Hệ Thống';
    badgeSub = 'Ban Quản Trị Toàn Sàn';
    BadgeIcon = ShieldCheck;
  } else if (role === 'SYSTEM_MANAGER') {
    badgeTitle = 'Vận Hành & Tuân Thủ';
    badgeSub = 'Kiểm Soát Rủi Ro & Đối Soát';
    BadgeIcon = Shield;
  } else if (role === 'CUSTOMER') {
    badgeTitle = 'Cổng Khách Hàng';
    badgeSub = 'Quản Lý Mua Sắm';
    BadgeIcon = User;
  } else {
    // COLLABORATOR
    const tierName = currentUser?.collaboratorProfile?.tier?.name;
    badgeTitle = tierName ? `KOL Hạng ${tierName}` : 'KOL Đối Tác Tiếp Thị';
    badgeSub = 'Kênh Sáng Tạo Nội Dung';
    BadgeIcon = Megaphone;
  }

  const handleLogout = () => {
    setIsMenuOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
      navigate('/login');
    }
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)');
      e.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa 5MB');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const secureUrl = await uploadService.uploadImage(file, 'scanms/avatars');
      await authService.updateAvatar(secureUrl);
      setCurrentUser(authService.getCurrentUser());
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (err: any) {
      console.error('Lỗi tải ảnh đại diện:', err);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể tải ảnh đại diện lên',
      );
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <header className="scanms-site-header workspace-topbar sticky top-0 z-40 bg-gradient-to-r from-[#2A1E11] via-[#4A3418] to-[#2A1E11] border-b border-[#D4AF70]/30 shadow-sm text-[#FFF8ED]">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* LEFT: BRAND LOGO + DYNAMIC ROLE/STORE BADGE */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/marketplace"
            className="flex items-center gap-2 group transition-transform hover:scale-[1.02]"
            title="Về trang chủ Sàn SCANMS"
          >
            <ScanMSLogo size="sm" darkMode={true} showSubtitle={false} className="items-center" />
          </Link>

          <div className="h-5 w-[1px] bg-[#D4AF70]/30 shrink-0" />

          {/* Role-Adaptive Badge */}
          <div className="flex items-center gap-2 py-1 px-3 rounded-full bg-black/30 border border-[#D4AF70]/30 shadow-xs">
            <BadgeIcon className="w-3.5 h-3.5 text-[#D4AF70] shrink-0" />
            <div className="flex items-center gap-1.5 text-xs">
              <strong className="text-white font-semibold tracking-tight whitespace-nowrap">
                {badgeTitle}
              </strong>
              <span className="text-[#D4AF70]/50 select-none hidden sm:inline">·</span>
              <span className="text-[#D4AF70] text-[11px] font-medium hidden sm:inline whitespace-nowrap">
                {badgeSub}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: CLEAN BREATHING ROOM (NO PUBLIC CONSUMER SEARCH BAR) */}
        <div className="flex-1 min-w-0" />

        {/* RIGHT: SHORTCUT "SÀN MUA SẮM" + SOCKET + NOTIFICATIONS + ACCOUNT */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
          {/* Quick link to Storefront */}
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-[#FFF8ED] hover:text-white text-xs font-semibold border border-[#D4AF70]/30 transition shadow-xs cursor-pointer"
            title="Xem trang bán hàng công khai của Sàn SCANMS"
          >
            <ShoppingBag size={13} className="text-[#D4AF70]" />
            <span className="hidden md:inline">Sàn Mua Sắm</span>
          </Link>

          <span className="text-[#D4AF70]/30 select-none hidden sm:inline">|</span>

          {/* Real-time Socket Connection Status */}
          <AccountConnectionStatus userId={currentUser?.id} />

          {/* Real-time Notifications */}
          <div className="flex items-center">
            <NotificationDropdown darkMode={true} />
          </div>

          <span className="text-[#D4AF70]/30 select-none hidden sm:inline">|</span>

          {/* Account Menu Trigger */}
          <div className="relative z-50 flex items-center" ref={menuRef}>
            <HeaderAccountButton
              user={currentUser}
              role={role}
              expanded={isMenuOpen}
              menuId="workspace-account-menu"
              detail={badgeTitle}
              darkMode={true}
              onClick={() => setIsMenuOpen((prev) => !prev)}
            />

            {isMenuOpen && (
              <AccountMenu
                id="workspace-account-menu"
                user={currentUser}
                role={role}
                onClose={() => setIsMenuOpen(false)}
                onLogout={handleLogout}
                inputRef={avatarInputRef}
                onAvatarUpload={handleAvatarUpload}
                uploading={uploading}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
