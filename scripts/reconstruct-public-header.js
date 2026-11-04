const fs = require('fs');
const path = require('path');

const publicHeaderTsx = `import { useState, useEffect, useRef, type ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Package,
  User,
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
import { productLoginUrl } from '../../utils/login-return';
import './PublicHeader.css';
import { HeaderCartPreview } from '../cart/HeaderCartPreview';
import { useHoverDisclosure } from '@/hooks/useHoverDisclosure';

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
  onOpenTracking,
  defaultSearchQuery = '',
  onSearchSubmit,
  onOpenFilter,
}: PublicHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const loginUrl = productLoginUrl(\`\${location.pathname}\${location.search}\${location.hash}\`);
  const { totalCount, openCart } = useCart();

  const effectiveCartCount = cartCount !== undefined ? cartCount : totalCount;
  const handleCartClick = onOpenCart || openCart;

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const accountHover = useHoverDisclosure(isUserMenuOpen, setIsUserMenuOpen);
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
    authService.logout(\`\${location.pathname}\${location.search}\${location.hash}\`);
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
  const isMarketplace = layout === 'marketplace' || Boolean(navigation);
  const hasShortcuts = Boolean(navigation);

  if (layout === 'workspace') {
    return (
      <header className={\`scanms-site-header public-commerce-header public-commerce-header--workspace \${sticky ? 'sticky top-0' : 'relative'} z-40 bg-white border-b border-[#EAE4D7] shadow-xs text-[#1A1612]\`}>
        <div className="public-commerce-header__inner max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[68px] flex items-center justify-between gap-3 sm:gap-6 relative z-30">
          <div className="public-commerce-header__brand flex items-center gap-2 shrink-0">
            <Link to="/marketplace" className="flex items-center gap-2 group" title="Về trang chủ Sàn SCANMS">
              <ScanMSLogo size="md" darkMode={false} className="scanms-header-logo" showSubtitle={false} />
            </Link>
          </div>
          <ProductSearchBox
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
            onClear={handleClearSearch}
            className="hidden lg:block min-w-0 w-full flex-1 max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-2"
          />
          <div className="public-commerce-header__actions flex items-center gap-2 sm:gap-3.5 shrink-0">
            <NotificationDropdown />
            {currentUser ? (
              <div className="relative z-50" ref={userMenuRef} onPointerEnter={accountHover.enterTrigger} onPointerLeave={accountHover.closeSoon}
                onFocusCapture={accountHover.cancelClose}
                onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) accountHover.closeSoon(); }}>
                <HeaderAccountButton
                  user={currentUser}
                  role={currentUser.role}
                  expanded={isUserMenuOpen}
                  menuId="public-account-menu"
                  detail={isShop ? storeName : undefined}
                  onClick={accountHover.toggle}
                />
                {isUserMenuOpen && (
                  <AccountMenu id="public-account-menu" user={currentUser} role={currentUser.role} onClose={() => setIsUserMenuOpen(false)} onLogout={handleLogout} inputRef={avatarInputRef} onAvatarUpload={handleAvatarUpload} uploading={uploadingAvatar} />
                )}
              </div>
            ) : (
              <Link
                to={loginUrl}
                className="inline-flex items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-[#1A1612] bg-[#FAF8F5] border border-[#EAE4D7] hover:bg-[#F3EFE6] shadow-xs transition-colors"
              >
                <User className="h-4 w-4" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={\`scanms-site-header public-commerce-header \${cartPage ? 'public-commerce-header--cart' : ''} \${isMarketplace ? 'public-commerce-header--marketplace' : ''} \${sticky ? 'sticky top-0' : 'relative'} z-40\`}
      data-shortcuts={hasShortcuts}
      data-shopping-actions={showShoppingActions}
    >
      {/* TẦNG 1: THANH TIỆN ÍCH THƯỢNG TẦNG (TOP UTILITY STRIP - 34px) */}
      <div className="public-commerce-header__top-bar bg-[#F3EFE6] border-b border-[#EAE4D7] text-[#7D715E] hidden sm:block">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 h-[34px] flex items-center justify-between text-xs">
          {/* Cụm Bên Trái: Cổng chuyển đổi hệ sinh thái */}
          <div className="flex items-center gap-3 sm:gap-4 font-medium">
            <Link to="/kol/workspace" className="hover:text-[#B88E4F] transition-colors flex items-center gap-1.5" title="Dành cho Nhà sáng tạo KOC / Đối tác tiếp thị">
              <span>Kênh Tiếp Thị KOC</span>
            </Link>
            <span className="text-[#DFD6C5] select-none">|</span>
            <Link to="/shop/dashboard" className="hover:text-[#B88E4F] transition-colors flex items-center gap-1.5" title="Dành cho Giám đốc Nhãn hàng">
              <span>Cổng Nhãn Hàng Trực Thuộc</span>
            </Link>
          </div>

          {/* Cụm Bên Phải: Tra cứu đơn GHN, Thông báo, Tài khoản/Đăng nhập */}
          <div className="flex items-center gap-3">
            {/* Tra cứu đơn GHN */}
            {showShoppingActions && (
              <button
                type="button"
                onClick={() => {
                  if (onOpenTracking) onOpenTracking();
                  else navigate('/tracking');
                }}
                className="public-commerce-header__tracking-top inline-flex items-center gap-1.5 hover:text-[#1A1612] transition-colors cursor-pointer text-xs font-medium"
                title="Tra cứu lộ trình đơn hàng & vận chuyển GHN"
                aria-label="Tra cứu đơn hàng"
              >
                <Package size={14} className="text-[#7D715E]" />
                <span>Tra cứu đơn</span>
              </button>
            )}

            <span className="text-[#DFD6C5] select-none">|</span>

            {/* Trung tâm thông báo */}
            <div className="flex items-center">
              <NotificationDropdown />
            </div>

            <span className="text-[#DFD6C5] select-none">|</span>

            {/* Tài khoản hoặc Đăng nhập */}
            {currentUser ? (
              <div
                className="relative z-50 flex items-center"
                ref={userMenuRef}
                onPointerEnter={accountHover.enterTrigger}
                onPointerLeave={accountHover.closeSoon}
                onFocusCapture={accountHover.cancelClose}
                onBlurCapture={event => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) accountHover.closeSoon();
                }}
              >
                <HeaderAccountButton
                  user={currentUser}
                  role={currentUser.role}
                  expanded={isUserMenuOpen}
                  menuId="public-account-menu"
                  detail={isShop ? storeName : undefined}
                  onClick={accountHover.toggle}
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
                className="inline-flex items-center gap-1.5 font-bold text-[#1A1612] hover:text-[#B88E4F] transition-colors text-xs"
                title="Đăng nhập hoặc đăng ký"
              >
                <User size={13} className="text-[#1A1612]" />
                <span>Đăng nhập / Đăng ký</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* TẦNG 2: THANH TRUNG TÂM THƯƠNG MẠI (MAIN COMMERCE BAR) */}
      <div className="public-commerce-header__main-bar bg-[#FAF8F5] border-b border-[#EAE4D7] shadow-[0_4px_20px_-2px_rgba(35,29,21,0.05)] text-[#1A1612]">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-4 sm:gap-8 relative z-30">
          {/* Cột 1 (Trái): Logo Thương hiệu & Khẳng định Sàn Tiếp Thị */}
          <div className="public-commerce-header__brand flex items-center gap-3 shrink-0">
            <Link to="/marketplace" className="flex items-center gap-2 group" title="Về trang chủ Sàn SCANMS">
              <ScanMSLogo size="md" darkMode={false} className="scanms-header-logo [&_.scanms-logo-subtitle]:hidden sm:[&_.scanms-logo-subtitle]:block" showSubtitle={!cartPage} />
            </Link>
            {cartPage && <h1 className="public-commerce-header__cart-title text-xl font-bold ml-2 text-[#1A1612]">Giỏ hàng</h1>}
          </div>

          {/* Cột 2 (Giữa): Ô Tìm Kiếm Omnibox + Lối Tắt Cách Đáy 10px */}
          <div className="hidden lg:flex flex-col items-center flex-1 max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-4">
            <ProductSearchBox
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
              onClear={handleClearSearch}
              className="w-full"
            />
            {navigation && (
              <div className="public-commerce-header__navigation-row mt-2.5 w-full flex justify-center">
                {navigation}
              </div>
            )}
          </div>

          {/* Cột 3 (Phải): Đảo Giỏ Hàng Nổi Bật (Desktop) */}
          {showShoppingActions && !cartPage && (
            <div className="public-commerce-header__cart-island shrink-0 hidden lg:flex items-center">
              <HeaderCartPreview count={effectiveCartCount} onOpenCart={handleCartClick} />
            </div>
          )}

          {/* Cụm Tiện ích Thu gọn trên Mobile / Tablet (khi Top Bar bị ẩn) */}
          <div className="flex lg:hidden items-center gap-2 shrink-0">
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
                  onClick={accountHover.toggle}
                />
              </div>
            ) : (
              <Link to={loginUrl} className="p-2 text-[#1A1612]" aria-label="Đăng nhập">
                <User size={20} />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Thanh Tìm kiếm & Lối tắt trên Mobile / Tablet */}
      <div className="public-commerce-header__mobile-search lg:hidden px-4 pb-3 pt-2 bg-[#FAF8F5] border-b border-[#EAE4D7] relative z-10">
        <ProductSearchBox
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          onFilter={onOpenFilter || location.pathname !== '/search' ? handleFilterClick : undefined}
        />
        {navigation && <div className="mt-2 flex justify-center">{navigation}</div>}
      </div>
    </header>
  );
}
`;

fs.writeFileSync(path.join(__dirname, '../frontend/src/components/layout/PublicHeader.tsx'), publicHeaderTsx, 'utf8');
console.log('Successfully written PublicHeader.tsx');
