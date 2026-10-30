import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService, type UserProfile } from '../../services/auth.service';
import { uploadService } from '../../services/upload.service';
import { toast } from '../../utils/toast';
import { NotificationDropdown } from './NotificationDropdown';
import { ScanMSLogo } from '../common/ScanMSLogo';
import { HeaderAccountButton } from './HeaderAccountButton';
import { useHoverDisclosure } from '@/hooks/useHoverDisclosure';
import { AccountMenu } from './AccountMenu';
import { AccountConnectionStatus } from './AccountConnectionStatus';
import { ProductSearchBox } from './ProductSearchBox';

export interface TopbarProps {
  currentUser: UserProfile | null;
  onLogout?: () => void;
}

export function Topbar({
  currentUser,
  onLogout,
}: TopbarProps) {
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => document.documentElement.style.setProperty('--workspace-header-height', `${header.getBoundingClientRect().height}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const location = useLocation();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const accountHover = useHoverDisclosure(isMenuOpen, setIsMenuOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(() => authService.getActiveWorkspace());
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setIsMenuOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!isMenuOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        menuRef.current?.querySelector<HTMLButtonElement>('button[aria-controls="topbar-account-menu"]')?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const syncWorkspace = () => setActiveWorkspace(authService.getActiveWorkspace());
    window.addEventListener('scanms_workspace_changed', syncWorkspace);
    window.addEventListener('storage', syncWorkspace);
    return () => {
      window.removeEventListener('scanms_workspace_changed', syncWorkspace);
      window.removeEventListener('storage', syncWorkspace);
    };
  }, []);

  useEffect(() => setActiveWorkspace(authService.getActiveWorkspace()), [location.pathname]);

  const role = activeWorkspace === 'shop'
    ? 'SHOP_MANAGER'
    : activeWorkspace === 'admin'
    ? currentUser?.role === 'SYSTEM_MANAGER' ? 'SYSTEM_MANAGER' : 'SYSTEM_ADMIN'
    : activeWorkspace === 'customer' || location.pathname.startsWith('/customer')
    ? 'CUSTOMER'
    : 'COLLABORATOR';
  const isShop = role === 'SHOP_MANAGER';
  const isCustomer = role === 'CUSTOMER';
  const isAdmin = role === 'SYSTEM_ADMIN' || role === 'SYSTEM_MANAGER';

  const displaySub = isShop
    ? currentUser?.stores?.[0]?.name || 'Chủ gian hàng'
    : isCustomer
    ? 'Khách mua sắm'
    : isAdmin
    ? role === 'SYSTEM_MANAGER' ? 'Vận hành & tuân thủ' : 'Quản trị hệ thống'
    : currentUser?.collaboratorProfile?.tier?.name
    ? `KOL Hạng ${currentUser.collaboratorProfile.tier.name}`
    : 'KOL / KOC Đối Tác';

  const handleLogoutClick = () => {
    setIsMenuOpen(false);
    if (onLogout) {
      onLogout();
    } else {
      authService.logout();
    }
  };

  const handleSearch = (value: string) => {
    const query = value.trim();
    if (query) {
      navigate('/search?q=' + encodeURIComponent(query));
    } else {
      navigate('/marketplace');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (err: any) {
      console.error('Lỗi tải ảnh đại diện:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Không thể tải ảnh đại diện lên');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <header ref={headerRef} className="scanms-site-header sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE4D7] shadow-2xs">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[68px] flex items-center justify-between gap-3 sm:gap-6 relative z-30">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/marketplace" className="flex items-center gap-2 group" title="Về trang chủ Sàn SCANMS">
            <ScanMSLogo size="md" className="scanms-header-logo" />
          </Link>
        </div>

        {/* Center: Search Box */}
        <ProductSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onClear={() => setSearchQuery('')}
          className="hidden md:block min-w-0 w-full flex-1 max-w-xl lg:max-w-2xl xl:max-w-3xl mx-2"
        />

        {/* Right: Actions, Notifications & User Card */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <AccountConnectionStatus userId={currentUser?.id} />
          <NotificationDropdown />

          <div className="relative z-50" ref={menuRef} onPointerEnter={accountHover.enterTrigger} onPointerLeave={accountHover.closeSoon}
            onFocusCapture={accountHover.cancelClose}
            onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) accountHover.closeSoon(); }}>
            <HeaderAccountButton
              user={currentUser}
              role={role}
              expanded={isMenuOpen}
              menuId="topbar-account-menu"
              detail={displaySub}
              onClick={accountHover.toggle}
            />

            {isMenuOpen && (
              <AccountMenu id="topbar-account-menu" user={currentUser} role={role} onClose={() => setIsMenuOpen(false)} onLogout={handleLogoutClick} inputRef={avatarInputRef} onAvatarUpload={handleAvatarUpload} uploading={uploading} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
