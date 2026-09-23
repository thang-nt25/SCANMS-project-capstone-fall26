import { useState, useEffect, useRef, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Package,
  TrendingUp,
  User,
  LogOut,
  ChevronDown,
  Store,
  Sparkles,
  Shield,
  Settings,
  MessageSquare,
  Wallet,
  ShoppingBag,
  MapPin,
  Heart,
} from 'lucide-react';
import { ScanMSLogo } from '../common/ScanMSLogo';
import { WorkspaceSwitcher } from '../common/WorkspaceSwitcher';
import { authService, type UserProfile } from '../../services/auth.service';

export interface PublicHeaderProps {
  cartCount?: number;
  onOpenCart?: () => void;
  onOpenTracking?: () => void;
  defaultSearchQuery?: string;
  onSearchSubmit?: (query: string) => void;
}

export function PublicHeader({
  cartCount = 0,
  onOpenCart,
  onOpenTracking,
  defaultSearchQuery = '',
  onSearchSubmit,
}: PublicHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());
  const [searchQuery, setSearchQuery] = useState(defaultSearchQuery);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (onSearchSubmit) {
      onSearchSubmit(query);
    } else {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    authService.logout();
  };

  const role = currentUser?.role;
  const isCustomer = role === 'CUSTOMER';
  const isKol = role === 'COLLABORATOR';
  const isShop = role === 'SHOP_MANAGER';
  const isAdmin = role === 'SYSTEM_ADMIN' || role === 'SYSTEM_MANAGER';

  const workspacePath = isCustomer
    ? '/customer/orders'
    : isShop
    ? '/merchant/dashboard'
    : isAdmin
    ? '/admin/users'
    : '/collaborator/dashboard';

  const workspaceLabel = isCustomer
    ? 'Đơn Mua Của Tôi 🛍️'
    : isShop
    ? 'Vào Quản Lý Shop ↗'
    : isAdmin
    ? 'Vào Ban Quản Trị ↗'
    : 'Vào Không Gian KOL ↗';

  const storeName = currentUser?.stores?.[0]?.name || 'Gian Hàng Đối Tác';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#EAE4D7] shadow-2xs">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/marketplace" className="flex items-center gap-2 group" title="Về trang chủ Sàn SCANMS">
            <ScanMSLogo size="sm" />
          </Link>
        </div>

        {/* Center: Search Form */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex items-center">
          <div className="relative w-full flex items-center">
            <Search className="w-4 h-4 text-[#7D715E] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm, thương hiệu hoặc gian hàng..."
              className="w-full pl-10 pr-24 py-2 bg-[#FAF8F5] border border-[#EAE4D7] rounded-full text-xs font-medium text-[#1A1612] placeholder-[#7D715E]/70 focus:bg-white focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 outline-none transition"
            />
            <button
              type="submit"
              className="absolute right-1.5 px-3.5 py-1 bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold rounded-full transition shadow-2xs cursor-pointer"
            >
              Tìm
            </button>
          </div>
        </form>

        {/* Right Navigation & User Status */}
        <div className="flex items-center gap-2 sm:gap-3">
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
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition cursor-pointer"
            title="Tra cứu đơn hàng"
          >
            <Package className="w-4 h-4 text-[#B88E4F]" />
            <span>Tra cứu đơn</span>
          </button>

          {/* Leaderboard Link */}
          <Link
            to="/leaderboard"
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#7D715E] hover:text-[#1A1612] hover:bg-[#F3EFE6] transition"
            title="Bảng xếp hạng doanh số & thưởng"
          >
            <TrendingUp className="w-4 h-4 text-[#B88E4F]" />
            <span>BXH Doanh Số</span>
          </Link>

          {/* Quick Cart Button */}
          <button
            type="button"
            onClick={onOpenCart}
            className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#1A1612] bg-[#FAF8F5] border border-[#EAE4D7] hover:bg-[#F3EFE6] transition cursor-pointer shadow-2xs"
            title="Mở giỏ hàng"
          >
            <ShoppingCart className="w-4 h-4 text-[#B88E4F]" />
            <span className="hidden sm:inline">Giỏ hàng</span>
            {cartCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#C59B58] text-white text-[10px] font-black flex items-center justify-center -mr-1">
                {cartCount}
              </span>
            )}
          </button>

          {/* AUTHENTICATION & ROLE SECTION */}
          {currentUser ? (
            /* Logged in User Profile & Workspace Link */
            <div className="flex items-center gap-2">
              {/* Workspace Switcher Component */}
              <WorkspaceSwitcher variant="header" />

              {/* User Dropdown Pill */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-full bg-[#F3EFE6] border border-[#EAE4D7] hover:bg-[#EAE4D7] transition cursor-pointer shadow-2xs"
                  title="Xem thông tin tài khoản và đăng xuất"
                >
                  <span className="w-7 h-7 rounded-full bg-[#EEDFC6] text-[#B88E4F] flex items-center justify-center font-bold text-xs shrink-0 border border-[#E4D3B7]">
                    {currentUser.fullName?.[0]?.toUpperCase() || 'U'}
                  </span>
                  <div className="text-left hidden md:block max-w-[140px]">
                    <strong className="block text-xs font-bold text-[#1A1612] truncate leading-none">
                      {currentUser.fullName || currentUser.email}
                    </strong>
                    <span className="block text-[10px] font-semibold text-[#B88E4F] truncate leading-tight mt-0.5">
                      {isCustomer ? '🛍️ Khách Mua Hàng' : isKol ? '⭐ KOL / KOC' : isShop ? `🏪 ${storeName}` : '🛡️ Quản Trị'}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-[#A49B8B] transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-[#B88E4F]' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#EAE4D7] rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 text-left">
                    {/* User Identity Box */}
                    <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#EAE4D7] mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-[#EEDFC6] text-[#B88E4F] flex items-center justify-center font-black text-sm shrink-0 border border-[#E4D3B7]">
                          {currentUser.fullName?.[0]?.toUpperCase() || 'U'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <strong className="block text-xs font-bold text-[#1A1612] truncate">
                            {currentUser.fullName || 'Người dùng SCANMS'}
                          </strong>
                          <span className="block text-[11px] text-[#7D715E] truncate">
                            {currentUser.email}
                          </span>
                        </div>
                      </div>

                      {/* Official Role Badge */}
                      <div className="mt-2 pt-2 border-t border-[#EAE4D7] flex items-center justify-between text-[11px]">
                        <span className="text-[#7D715E] font-medium">Vai trò:</span>
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                          {isCustomer
                            ? '🛍️ Khách Mua Sắm'
                            : isKol
                            ? '⭐ KOL / KOC Đối Tác'
                            : isShop
                            ? `🏪 Chủ Shop (${storeName})`
                            : '🛡️ Quản Trị Hệ Thống'}
                        </span>
                      </div>
                    </div>

                    {/* Navigation Options */}
                    <div className="space-y-1 py-1">
                      {isCustomer && (
                        <>
                          <Link
                            to="/customer/orders"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                          >
                            <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
                            <span>Đơn mua của tôi</span>
                          </Link>
                          <Link
                            to="/customer/addresses"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                          >
                            <MapPin className="w-4 h-4 text-[#B88E4F]" />
                            <span>Sổ địa chỉ nhận hàng</span>
                          </Link>
                          <Link
                            to="/customer/wishlist"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                          >
                            <Heart className="w-4 h-4 text-[#B88E4F]" />
                            <span>Sản phẩm yêu thích</span>
                          </Link>
                          <Link
                            to="/customer/profile"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                          >
                            <Settings className="w-4 h-4 text-[#7D715E]" />
                            <span>Hồ sơ & Bảo mật</span>
                          </Link>
                        </>
                      )}

                      {!isCustomer && (
                        <Link
                          to={workspacePath}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                        >
                          {isKol && <Sparkles className="w-4 h-4 text-[#B88E4F]" />}
                          {isShop && <Store className="w-4 h-4 text-[#B88E4F]" />}
                          {isAdmin && <Shield className="w-4 h-4 text-[#B88E4F]" />}
                          <span>{workspaceLabel}</span>
                        </Link>
                      )}

                      {!isCustomer && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            authService.switchWorkspace('customer', navigate);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition text-left cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4 text-[#B88E4F]" />
                          <span>Đơn mua cá nhân (Cổng Khách Hàng)</span>
                        </button>
                      )}

                      {isCustomer && (
                        <Link
                          to="/customer/orders?tab=upgrade"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#B88E4F] bg-[#FBF5EB] rounded-xl hover:bg-[#F3EFE6] border border-[#EEDFC6] transition mt-1"
                        >
                          <Sparkles className="w-4 h-4 text-[#B88E4F]" />
                          <span>Nâng cấp Đối tác (KOL / Shop)</span>
                        </Link>
                      )}

                      {isKol && (
                        <>
                          <Link
                            to="/collaborator/collaboration?tab=messages"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                          >
                            <MessageSquare className="w-4 h-4 text-[#B88E4F]" />
                            <span>Tin nhắn & Hợp tác Shop</span>
                          </Link>
                          <Link
                            to="/collaborator/wallet"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                          >
                            <Wallet className="w-4 h-4 text-[#B88E4F]" />
                            <span>Ví hoa hồng & Rút tiền</span>
                          </Link>
                        </>
                      )}

                      {isShop && (
                        <>
                          <Link
                            to="/merchant/products"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                          >
                            <Store className="w-4 h-4 text-[#B88E4F]" />
                            <span>Quản lý kho sản phẩm</span>
                          </Link>
                          <Link
                            to="/merchant/kol-hub?tab=messages"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                          >
                            <MessageSquare className="w-4 h-4 text-[#B88E4F]" />
                            <span>KOL Hub & Tin nhắn đối tác</span>
                          </Link>
                        </>
                      )}

                      {!isCustomer && (
                        <Link
                          to={isShop ? '/merchant/settings' : isAdmin ? '/admin/users' : '/collaborator/profile'}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#1A1612] rounded-xl hover:bg-[#F3EFE6] transition"
                        >
                          <Settings className="w-4 h-4 text-[#7D715E]" />
                          <span>Cài đặt & Hồ sơ tài khoản</span>
                        </Link>
                      )}
                    </div>

                    {/* Explicit Logout Button */}
                    <div className="pt-2 mt-1 border-t border-[#EAE4D7]">
                      <button
                        type="button"
                        onClick={handleLogout}
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
          ) : (
            /* Guest (Not Logged In) Authentication Actions */
            <div className="flex items-center gap-2">
              <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F3EFE6] text-[#7D715E]">
                <User className="w-3.5 h-3.5" />
                <span>Khách mua sắm</span>
              </span>

              <Link
                to="/login"
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-[#1A1612] bg-[#FAF8F5] border border-[#EAE4D7] hover:bg-[#F3EFE6] hover:border-[#C59B58] transition shadow-2xs"
              >
                Đăng nhập
              </Link>

              <Link
                to="/register"
                className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#C59B58] hover:bg-[#B88E4F] transition shadow-2xs"
              >
                Đăng ký đối tác
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
