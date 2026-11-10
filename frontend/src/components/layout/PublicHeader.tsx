import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Shield,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react';
import { ProductSearchBox } from './ProductSearchBox';
import { ScanMSLogo } from '../common/ScanMSLogo';
import { HeaderAccountButton } from './HeaderAccountButton';
import { AccountMenu } from './AccountMenu';
import { authService, type UserProfile } from '../../services/auth.service';
import { uploadService } from '../../services/upload.service';
import { toast } from '../../utils/toast';
import { useCart } from '../../context/CartContext';
import { NotificationDropdown } from './NotificationDropdown';
import { AccountConnectionStatus } from './AccountConnectionStatus';
import { productLoginUrl } from '../../utils/login-return';
import { HeaderCartPreview } from '../cart/HeaderCartPreview';

export interface PublicHeaderProps {
  showShoppingActions?: boolean;
  cartPage?: boolean;
  navigation?: ReactNode;
  layout?: 'marketplace' | 'cart' | 'standard' | 'workspace';
  sticky?: boolean;
  cartCount?: number;
  onOpenCart?: () => void;
  onOpenTracking?: () => void;
  defaultSearchQuery?: string;
  onSearchSubmit?: (query: string) => void;
  onOpenFilter?: () => void;
}

export function PublicHeader({
  showShoppingActions = true,
  cartPage = false,
  navigation,
  layout,
  sticky = true,
  cartCount,
  onOpenCart,
  defaultSearchQuery = '',
  onSearchSubmit,
  onOpenFilter,
}: PublicHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const loginUrl = productLoginUrl(`${location.pathname}${location.search}${location.hash}`);
  const { totalCount, openCart } = useCart();

  const effectiveCartCount = cartCount !== undefined ? cartCount : totalCount;
  const handleCartClick = onOpenCart || openCart;

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showOrderLoginModal, setShowOrderLoginModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setIsUserMenuOpen(false), [location.pathname, location.search]);
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        userMenuRef.current?.querySelector<HTMLButtonElement>('button[aria-controls="public-account-menu"]')?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [isUserMenuOpen]);

  useEffect(() => {
    setSearchQuery(defaultSearchQuery);
  }, [defaultSearchQuery]);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    const token = localStorage.getItem('token');
    if (token) {
      authService
        .getMe()
        .then((fresh) => {
          if (fresh && fresh.id) setCurrentUser(fresh);
        })
        .catch(() => {
          // Token expired or invalid
        });
    }

    const handleUserSync = () => {
      setCurrentUser(authService.getCurrentUser());
    };
    window.addEventListener('auth-user-updated', handleUserSync);
    return () => window.removeEventListener('auth-user-updated', handleUserSync);
  }, [location.pathname]);

  // Click outside listener for user dropdown menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    const query = value.trim();
    if (onSearchSubmit) onSearchSubmit(query);
    else navigate('/search?q=' + encodeURIComponent(query));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (onSearchSubmit) onSearchSubmit('');
    else if (location.pathname === '/search' || location.pathname === '/marketplace/search') {
      const params = new URLSearchParams(location.search);
      params.delete('q');
      params.delete('page');
      navigate({ pathname: location.pathname, search: params.toString() });
    }
  };

  const handleFilterClick = () => {
    if (onOpenFilter) {
      onOpenFilter();
    } else if (location.pathname !== '/search') {
      navigate('/search');
    }
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    authService.logout(`${location.pathname}${location.search}${location.hash}`);
  };

  const handleOrdersClick = () => {
    if (currentUser) {
      navigate('/customer/orders');
    } else {
      setShowOrderLoginModal(true);
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

    setUploadingAvatar(true);
    try {
      const secureUrl = await uploadService.uploadImage(file, 'scanms/avatars');
      await authService.updateAvatar(secureUrl);
      setCurrentUser(authService.getCurrentUser());
      toast.success('Cập nhật ảnh đại diện thành công!');
    } catch (err: any) {
      console.error('Lỗi tải ảnh đại diện:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Không thể tải ảnh đại diện lên');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const role = currentUser?.role;
  const isShop = role === 'SHOP_MANAGER';
  const storeName = currentUser?.stores?.[0]?.name || 'Gian Hàng Đối Tác';
  const displayRoleDetail = isShop
    ? storeName
    : role === 'SYSTEM_ADMIN'
    ? 'Tổng Quản Trị'
    : role === 'SYSTEM_MANAGER'
    ? 'Vận Hành & Tuân Thủ'
    : role === 'COLLABORATOR'
    ? currentUser?.collaboratorProfile?.tier?.name
      ? `KOL Hạng ${currentUser.collaboratorProfile.tier.name}`
      : 'KOL / KOC Đối Tác'
    : 'Khách mua sắm';
  const isMarketplace = layout === 'marketplace' || Boolean(navigation);
  const hasShortcuts = Boolean(navigation);

  const kocLink = currentUser?.role === 'COLLABORATOR'
    ? '/collaborator/dashboard'
    : currentUser?.role === 'CUSTOMER'
      ? '/customer/portal'
      : '/login?returnUrl=' + encodeURIComponent('/collaborator/dashboard');

  const shopLink = (currentUser?.role === 'SHOP_MANAGER' || currentUser?.role === 'SYSTEM_ADMIN')
    ? '/merchant/dashboard'
    : '/login?role=shop&returnUrl=' + encodeURIComponent('/merchant/dashboard');

  const renderTopHeader = () => (
    <div className="h-12 bg-gradient-to-r from-[#3a2a12] via-[#5a3d19] to-[#3a2a12] text-[#fff8ed] hidden sm:flex items-center justify-between px-4 sm:px-10 text-[13px] border-b border-[#d4af70]/30 relative z-50">
      {/* Left: Ecosystem links */}
      <div className="flex items-center gap-4 font-medium">
        <Link to={kocLink} className="flex items-center gap-1.5" title="Bàn làm việc KOC / Cổng Tiếp thị liên kết">
          <Shield size={14} className="text-[#d4af70]" />
          <span>Kênh KOC Tiếp Thị</span>
        </Link>
        <span className="text-[#d4af70]/40 select-none mx-1">·</span>
        <Link to={shopLink} className="flex items-center gap-1.5" title="Quản trị gian hàng nội bộ">
          <Store size={14} className="text-[#d4af70]" />
          <span>Quản Trị Nhãn Hàng</span>
        </Link>
      </div>

      {/* Right: Utilities */}
      <div className="flex items-center gap-3.5">
        {showShoppingActions && (
          <button
            type="button"
            onClick={handleOrdersClick}
            className="inline-flex items-center gap-1.5 cursor-pointer font-medium text-[#fff8ed] hover:text-[#d4af70] transition-colors"
            title="Xem danh sách và tiến độ đơn hàng"
          >
            <ShoppingBag size={14} className="text-[#d4af70]" />
            <span>Đơn hàng</span>
          </button>
        )}

        <span className="text-[#d4af70]/30 select-none">|</span>

        {/* Notifications */}
        <div className="flex items-center gap-3">
          <AccountConnectionStatus userId={currentUser?.id} />
          <NotificationDropdown darkMode={true} />
        </div>

        <span className="text-[#d4af70]/30 select-none">|</span>

        {/* Account Trigger */}
        {currentUser ? (
          <div
            className="relative z-50 flex items-center"
            ref={userMenuRef}
          >
            <HeaderAccountButton
              user={currentUser}
              role={currentUser.role}
              expanded={isUserMenuOpen}
              menuId="public-account-menu"
              detail={displayRoleDetail}
              darkMode={true}
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
            />
            {isUserMenuOpen && (
              <AccountMenu
                id="public-account-menu"
                user={currentUser}
                role={currentUser.role}
                onClose={() => setIsUserMenuOpen(false)}
                onLogout={handleLogout}
                inputRef={avatarInputRef}
                onAvatarUpload={handleAvatarUpload}
                uploading={uploadingAvatar}
              />
            )}
          </div>
        ) : (
          <Link
            to={loginUrl}
            className="inline-flex items-center gap-1.5 font-bold text-[#fff8ed] hover:text-[#d4af70] transition-colors"
          >
            <User size={14} className="text-[#d4af70]" />
            <span>Đăng nhập / Đăng ký</span>
          </Link>
        )}
      </div>
    </div>
  );

  const renderOrderLoginModal = () => {
    if (!showOrderLoginModal) return null;
    return (
      <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-[#fffdf9] border border-[#eadbc5] rounded-2xl p-6 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={() => setShowOrderLoginModal(false)}
            className="absolute top-4 right-4 p-1.5 rounded-full text-[#7d715e] hover:bg-[#f3efe6] transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3.5 mb-3">
            <div className="w-11 h-11 rounded-full bg-[#fbf5eb] border border-[#eedfc6] flex items-center justify-center text-[#b88e4f] shrink-0">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1a1612]">Đăng nhập để xem Đơn hàng</h3>
              <p className="text-xs text-[#7d715e] mt-0.5">Quản lý và theo dõi tiến độ đơn hàng SCANMS</p>
            </div>
          </div>
          <p className="text-sm text-[#5c4d3c] leading-relaxed mb-6 bg-[#faf8f5] p-3.5 rounded-xl border border-[#eae4d7]">
            Vui lòng đăng nhập tài khoản của bạn để tra cứu lịch sử mua sắm, hành trình vận chuyển bưu tá GHN và yêu cầu bảo hành đổi trả sản phẩm.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowOrderLoginModal(false)}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#7d715e] hover:bg-[#f3efe6] transition-colors cursor-pointer"
            >
              Để sau
            </button>
            <button
              type="button"
              onClick={() => {
                setShowOrderLoginModal(false);
                navigate('/login?returnUrl=' + encodeURIComponent('/customer/orders'));
              }}
              className="bg-[linear-gradient(135deg,#c99545,#94621f)] text-white border-0 rounded-full py-2.5 px-5 text-xs font-semibold cursor-pointer no-underline inline-flex items-center gap-2 transition-all duration-200 shadow-sm hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(160,105,35,0.25)]"
            >
              Đăng nhập ngay
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <header
      className={`scanms-site-header public-commerce-header ${cartPage ? 'public-commerce-header--cart' : ''} ${isMarketplace ? 'public-commerce-header--marketplace' : ''} ${sticky ? 'sticky top-0' : 'relative'} z-40`}
      data-shortcuts={hasShortcuts}
      data-shopping-actions={showShoppingActions}
    >
      {/* TẦNG 1: TOP UTILITY STRIP */}
      {renderTopHeader()}

      {/* TẦNG 2: MAIN HEADER */}
      <div className="bg-[#fffaf3]/96 border-b border-[#eadbc5] py-4 sm:py-[18px] px-4 sm:px-10 shadow-[0_4px_16px_rgba(80,50,20,0.04)] relative z-40">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[280px_1fr_180px] items-center gap-2 lg:gap-7 max-w-[1600px] mx-auto">
          {/* Col 1 (280px): Logo */}
          <div className="flex items-center gap-3">
            <Link to="/marketplace" className="flex items-center gap-2 group" title="Về trang chủ Sàn SCANMS">
              <ScanMSLogo size="md" darkMode={false} className="scanms-header-logo [&_.scanms-logo-subtitle]:hidden sm:[&_.scanms-logo-subtitle]:block" showSubtitle={!cartPage} />
            </Link>
            <div className="hidden sm:block h-8 w-[1px] bg-[#d4af70]/40 order-last ml-1" />
            {cartPage && <h1 className="text-xl font-bold ml-2 text-[#302317]">Giỏ hàng</h1>}
          </div>

          {/* Col 2 (1fr): Search */}
          <div className="hidden lg:flex items-center w-full">
            <ProductSearchBox
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              onClear={handleClearSearch}
              className="w-full"
            />
          </div>

          {/* Col 3 (180px): Cart */}
          {showShoppingActions && !cartPage && (
            <div className="hidden lg:flex justify-end items-center">
              <HeaderCartPreview count={effectiveCartCount} onOpenCart={handleCartClick} />
            </div>
          )}

          {/* Mobile cluster */}
          <div className="flex lg:hidden items-center justify-end gap-2">
            <NotificationDropdown />
            {showShoppingActions && !cartPage && (
              <HeaderCartPreview count={effectiveCartCount} onOpenCart={handleCartClick} />
            )}
            {currentUser ? (
              <div className="relative" ref={userMenuRef}>
                <HeaderAccountButton
                  user={currentUser}
                  role={currentUser.role}
                  expanded={isUserMenuOpen}
                  menuId="public-account-menu-mobile"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                />
                {isUserMenuOpen && <AccountMenu id="public-account-menu-mobile" user={currentUser} role={currentUser.role} onClose={() => setIsUserMenuOpen(false)} onLogout={handleLogout} inputRef={avatarInputRef} onAvatarUpload={handleAvatarUpload} uploading={uploadingAvatar} />}
              </div>
            ) : (
              <Link to={loginUrl} className="p-2 text-[#302317]" aria-label="Đăng nhập">
                <User size={20} />
              </Link>
            )}
          </div>
        </div>

        {/* Floating Navigation Capsule — Overlapping 50% outside header */}
        {navigation && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-50 hidden lg:flex justify-center pointer-events-auto">
            {navigation}
          </div>
        )}
      </div>

      {/* Mobile Search Bar & Navigation */}
      <div className="lg:hidden px-4 pb-3 pt-2 bg-[#fffaf3] border-b border-[#eadbc5] relative z-10">
        <ProductSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onFilter={onOpenFilter || location.pathname !== '/search' ? handleFilterClick : undefined}
        />
        {navigation && <div className="mt-2 flex w-full min-w-0 max-w-full justify-start overflow-x-auto overscroll-x-contain pb-1 sm:justify-center">{navigation}</div>}
      </div>

      {/* Modal Popup Yêu Cầu Đăng Nhập Khi Bấm "Đơn hàng" */}
      {renderOrderLoginModal()}
    </header>
  );
}
