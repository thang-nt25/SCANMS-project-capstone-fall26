import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Store,
  LogOut,
  Settings,
  Camera,
  Loader2,
  ShoppingBag,
  Handshake,
  Megaphone,
  ShieldCheck,
  Shield,
  Check,
  MapPin,
  Heart,
  Wallet,
  MessageSquare,
} from 'lucide-react';
import { authService, type UserProfile } from '../../services/auth.service';
import { uploadService } from '../../services/upload.service';
import { toast } from '../../utils/toast';
import { NotificationDropdown } from './NotificationDropdown';
import { ScanMSLogo } from '../common/ScanMSLogo';
import { HeaderAccountButton } from './HeaderAccountButton';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(() => authService.getActiveWorkspace());
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  const workspaces = currentUser ? authService.getUserAvailableWorkspaces(currentUser) : [];

  const displayName =
    currentUser?.fullName ||
    (isShop ? 'Chủ gian hàng' : isCustomer ? 'Khách mua sắm' : isAdmin ? 'Quản trị viên' : 'Cộng tác viên');
  const displaySub = isShop
    ? currentUser?.stores?.[0]?.name || 'Chủ gian hàng'
    : isCustomer
    ? 'Khách mua sắm'
    : isAdmin
    ? role === 'SYSTEM_MANAGER' ? 'Vận hành & tuân thủ' : 'Quản trị hệ thống'
    : currentUser?.collaboratorProfile?.tier?.name
    ? `KOL Hạng ${currentUser.collaboratorProfile.tier.name}`
    : 'KOL / KOC Đối Tác';

  const avatarInitial = currentUser?.fullName?.charAt(0).toUpperCase() || (isShop ? 'S' : isCustomer ? 'K' : isAdmin ? 'A' : 'K');

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
  };

  const getWorkspaceIcon = (key: string, iconClass = 'w-3.5 h-3.5') => {
    switch (key) {
      case 'kol':
        return <Megaphone className={`${iconClass} text-[#B88E4F]`} />;
      case 'shop':
        return <Store className={`${iconClass} text-[#B88E4F]`} />;
      case 'admin':
        return <ShieldCheck className={`${iconClass} text-[#B88E4F]`} />;
      default:
        return <ShoppingBag className={`${iconClass} text-[#B88E4F]`} />;
    }
  };

  const profilePath = isShop
    ? '/merchant/settings'
    : isCustomer
    ? '/customer/profile'
    : isAdmin
    ? '/admin/profile'
    : '/collaborator/profile';

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

          <div className="relative z-50" ref={menuRef}>
            <HeaderAccountButton
              user={currentUser}
              role={role}
              expanded={isMenuOpen}
              menuId="topbar-account-menu"
              detail={displaySub}
              onClick={() => setIsMenuOpen((open) => !open)}
            />

            {isMenuOpen && (
              <div
                id="topbar-account-menu"
                className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#EAE4D7] rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-left max-h-[calc(100vh-80px)] overflow-y-auto no-scrollbar"
              >
                {/* User Identity Box */}
                <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative group shrink-0">
                      {currentUser?.avatarUrl ? (
                        <img
                          src={currentUser.avatarUrl}
                          alt="Avatar"
                          className="w-10 h-10 rounded-xl object-cover border border-[#E8D4B0] shadow-2xs"
                        />
                      ) : (
                        <span className="w-10 h-10 rounded-xl bg-[#EAE4D7] text-[#B88E4F] flex items-center justify-center font-bold text-sm border border-[#EAE4D7]">
                          {avatarInitial}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          avatarInputRef.current?.click();
                        }}
                        disabled={uploading}
                        title="Bấm để tải ảnh đại diện lên"
                        className="absolute -bottom-1 -right-1 p-1 rounded-full bg-[#C59B58] hover:bg-[#B88E4F] text-white shadow-xs border-2 border-white transition cursor-pointer"
                      >
                        {uploading ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Camera className="w-2.5 h-2.5" />
                        )}
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <strong className="block text-xs font-bold text-[#1A1612] truncate">
                        {currentUser?.fullName || displayName}
                      </strong>
                      <span className="block text-[11px] text-[#7D715E] truncate mt-0.5">
                        {currentUser?.email || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="mt-2 pt-2 border-t border-[#EAE4D7] flex items-center justify-between text-[11px]">
                    <span className="text-[#7D715E] font-medium">Vai trò hiện tại:</span>
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[#FBF5EB] text-[#B88E4F] border border-[#EAE4D7]">
                      {isCustomer
                        ? 'Khách Mua Sắm'
                        : role === 'COLLABORATOR'
                        ? 'KOL / KOC Đối Tác'
                        : isShop
                        ? `Chủ Shop (${currentUser?.stores?.[0]?.name || 'Gian Hàng'})`
                        : 'Quản Trị Hệ Thống'}
                    </span>
                  </div>
                </div>

                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                />

                {/* Navigation Options */}
                <div className="space-y-1 py-1">
                  {isCustomer ? (
                    <>
                      <Link
                        to="/customer/orders"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                      >
                        <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
                        <span>Đơn mua của tôi</span>
                      </Link>
                      <Link
                        to="/customer/addresses"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                      >
                        <MapPin className="w-4 h-4 text-[#B88E4F]" />
                        <span>Sổ địa chỉ nhận hàng</span>
                      </Link>
                      <Link
                        to="/customer/wishlist"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                      >
                        <Heart className="w-4 h-4 text-[#B88E4F]" />
                        <span>Sản phẩm yêu thích</span>
                      </Link>
                    </>
                  ) : isShop ? (
                    <>
                      <Link
                        to="/merchant/orders"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                      >
                        <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
                        <span>Quản lý đơn hàng</span>
                      </Link>
                      <Link
                        to="/merchant/products"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                      >
                        <Store className="w-4 h-4 text-[#B88E4F]" />
                        <span>Quản lý kho sản phẩm</span>
                      </Link>
                      <Link
                        to="/merchant/kol-hub?tab=messages"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                      >
                        <MessageSquare className="w-4 h-4 text-[#B88E4F]" />
                        <span>KOL Hub & Tin nhắn đối tác</span>
                      </Link>
                    </>
                  ) : role === 'COLLABORATOR' ? (
                    <>
                      <Link
                        to="/collaborator/dashboard"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                      >
                        <Megaphone className="w-4 h-4 text-[#B88E4F]" />
                        <span>Không gian làm việc KOL</span>
                      </Link>
                      <Link
                        to="/collaborator/wallet"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                      >
                        <Wallet className="w-4 h-4 text-[#B88E4F]" />
                        <span>Ví hoa hồng & Rút tiền</span>
                      </Link>
                      <Link
                        to="/collaborator/collaboration"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                      >
                        <MessageSquare className="w-4 h-4 text-[#B88E4F]" />
                        <span>Hợp tác gian hàng & Chat</span>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/admin/users"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                      >
                        <Shield className="w-4 h-4 text-[#B88E4F]" />
                        <span>Quản trị & Phân quyền</span>
                      </Link>
                    </>
                  )}

                  <Link
                    to={profilePath}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                  >
                    <Settings className="w-4 h-4 text-[#7D715E]" />
                    <span>Cài đặt & Hồ sơ</span>
                  </Link>

                  <Link
                    to="/marketplace"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                  >
                    <Store className="w-4 h-4 text-[#B88E4F]" />
                    <span>Sàn mua sắm công khai</span>
                  </Link>

                  {/* Hợp tác với chúng tôi */}
                  <Link
                    to="/customer/upgrade"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 text-xs font-bold text-[#B88E4F] bg-gradient-to-r from-[#FBF5EB] to-[#F7EDE0] hover:from-[#F3EFE6] hover:to-[#EAE4D7] rounded-xl border border-[#EEDFC6] transition mt-1 shadow-2xs group"
                    title="Nộp hồ sơ trở thành KOL Tiếp Thị hoặc Mở Shop kinh doanh"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Handshake className="w-4 h-4 text-[#B88E4F] shrink-0 group-hover:scale-105 transition-transform" />
                      <span className="truncate">Hợp tác với chúng tôi</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black uppercase bg-[#C59B58] text-white shrink-0 shadow-2xs">
                      MỚI
                    </span>
                  </Link>
                </div>

                {/* Chuyển vai trò (Role Switcher) */}
                {workspaces.length > 1 && (
                  <div className="pt-2 mt-1 border-t border-[#EAE4D7]">
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7D715E] flex items-center justify-between">
                      <span>Chuyển vai trò</span>
                      <span className="text-[9.5px] font-bold text-[#B88E4F] bg-[#FBF5EB] px-1.5 py-0.2 rounded-full border border-[#EEDFC6]">
                        {workspaces.length} vai trò
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      {workspaces.map((ws) => {
                        const isActive = ws.key === activeWorkspace;
                        return (
                          <button
                            key={ws.key}
                            type="button"
                            onClick={() => {
                              setIsMenuOpen(false);
                              authService.switchWorkspace(ws.key, navigate);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-xl transition cursor-pointer text-left ${
                              isActive
                                ? 'bg-[#FBF5EB] border border-[#C59B58] font-bold text-[#B88E4F] shadow-2xs'
                                : 'hover:bg-[#FAF8F5] border border-transparent hover:border-[#EAE4D7] text-[#1A1612] font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-white border border-[#EAE4D7] flex items-center justify-center shrink-0 shadow-2xs">
                                {getWorkspaceIcon(ws.key, 'w-3 h-3')}
                              </div>
                              <span className="truncate text-xs">{ws.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-[#FAF8F5] border border-[#EAE4D7] text-[#7D715E]">
                                {ws.badge}
                              </span>
                              {isActive && <Check className="w-3.5 h-3.5 text-[#B88E4F]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Đăng xuất */}
                <div className="pt-2 mt-1 border-t border-[#EAE4D7]">
                  <button
                    type="button"
                    onClick={handleLogoutClick}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 rounded-xl transition w-full text-left cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
