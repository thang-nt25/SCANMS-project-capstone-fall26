import { useState, useEffect, useRef, type ReactNode } from 'react';
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
  cartPage?: boolean;
  navigation?: ReactNode;
  layout?: 'marketplace' | 'cart' | 'standard';
  sticky?: boolean;
  cartCount?: number;
  onOpenCart?: () => void;
  onOpenTracking?: () => void;
  defaultSearchQuery?: string;
  onSearchSubmit?: (query: string) => void;
  onOpenFilter?: () => void;
}

export function PublicHeader({
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
  const loginUrl = productLoginUrl(`${location.pathname}${location.search}${location.hash}`);
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
    authService.logout(`${location.pathname}${location.search}${location.hash}`);
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

  return (
    <header className={`scanms-site-header public-commerce-header ${cartPage ? 'public-commerce-header--cart' : ''} ${isMarketplace ? 'public-commerce-header--marketplace' : ''} ${sticky ? 'sticky top-0' : 'relative'} z-40 bg-white border-b border-[#EAE4D7]`} data-shortcuts={hasShortcuts}>
      <div className="public-commerce-header__inner max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[68px] flex items-center justify-between gap-3 sm:gap-6 relative z-30">
        {/* Left: Brand Logo */}
        <div className="public-commerce-header__brand flex items-center gap-2 shrink-0">
          <Link to="/marketplace" className="flex items-center gap-2 group" title="Về trang chủ Sàn SCANMS">
            <ScanMSLogo size="md" className="scanms-header-logo" showSubtitle={!cartPage} />
          </Link>
          {cartPage && <h1 className="public-commerce-header__cart-title">Giỏ hàng</h1>}
        </div>

        <ProductSearchBox value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch}
          onClear={handleClearSearch}
          className="hidden lg:block min-w-0 w-full flex-1 max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-2" />

        {!cartPage && <div className="public-commerce-header__cart-slot">
          <HeaderCartPreview count={effectiveCartCount} onOpenCart={handleCartClick} />
        </div>}

        <div className="public-commerce-header__actions flex items-center gap-2 sm:gap-3.5 shrink-0">
          {/* Quick Tracking Button */}
          <button
            type="button"
            onClick={() => {
              if (onOpenTracking) {
                onOpenTracking();
              } else {
                navigate('/tracking');
              }
            }}
            className="public-commerce-header__tracking"
            title="Tra cứu lộ trình đơn hàng & vận chuyển"
            aria-label="Tra cứu đơn hàng"
          >
            <Package size={20} aria-hidden="true" />
            <span className="hidden sm:inline">Tra cứu đơn</span>
          </button>

          {/* Trung tâm thông báo & Live stream notification cho toàn bộ Khách hàng & Người dùng */}
          <NotificationDropdown />

          {/* AUTHENTICATION & ROLE SECTION */}
          {currentUser ? (
            /* Logged in User Profile & Workspace Link */
            <div className="flex items-center gap-2">
              {/* Shared account trigger for every role */}
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
            </div>
          ) : (
            /* Guest (Not Logged In) Authentication Actions */
            <div className="flex items-center gap-1.5">
              <Link
                to={loginUrl}
                className="inline-flex items-center gap-2 whitespace-nowrap px-2 sm:px-3 py-2 rounded-xl text-xs font-bold text-[#1A1612] bg-[#FBF5EB] border border-[#EEDFC6] hover:bg-[#F3EFE6] hover:border-[#C59B58] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F]"
                aria-label="Đăng nhập hoặc đăng ký"
                title="Đăng nhập hoặc đăng ký"
              >
                <User className="h-4 w-4 text-[#B88E4F]" aria-hidden="true" />
                <span className="hidden sm:inline">Đăng nhập / Đăng ký</span>
              </Link>
            </div>
          )}
        </div>
        {navigation && <div className="public-commerce-header__navigation">{navigation}</div>}
      </div>

      <div className="public-commerce-header__mobile-search lg:hidden px-4 pb-3 pt-1 border-t border-[#F3EFE6] bg-[#FFFEFC] relative z-10">
        <ProductSearchBox value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch}
          onClear={handleClearSearch} onFilter={onOpenFilter || location.pathname !== '/search' ? handleFilterClick : undefined} />
      </div>
    </header>
  );
}
