import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, House, Radio, Store, UserRound } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useScanmsChat } from '@/context/ScanmsChatContext';
import { authService } from '@/services/auth.service';
import { notificationsService } from '@/services/notifications.service';
import { productLoginUrl } from '@/utils/login-return';
import './ShoppingMobileNavigation.css';

// Shopping destinations only: workspaces and full-screen task flows keep their own navigation.
export function ShoppingMobileNavigation() {
  const location = useLocation();
  const { isCartOpen, isCheckoutOpen } = useCart();
  const { isOpen: chatOpen, isMinimized: chatMinimized } = useScanmsChat();
  const [user, setUser] = useState(authService.getCurrentUser);
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const path = location.pathname;
  const home = ['/', '/marketplace', '/store', '/storefront'].includes(path);
  const shopping = home || path === '/discover/live' || /^\/(search|marketplace\/search|shops?|stores|products|tracking|order-tracking)(\/|$)/.test(path) ||
    (/^\/customer(\/|$)/.test(path) && !/\/(upgrade|returns|topup)(\/|$)/.test(path));
  const checkout = ['1', 'true'].includes(new URLSearchParams(location.search).get('checkout') || '');
  const visible = shopping && !checkout && !isCartOpen && !isCheckoutOpen && !(chatOpen && !chatMinimized) && !keyboardOpen;

  useEffect(() => {
    if (mobile && shopping && !location.hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, mobile, shopping]);

  useEffect(() => {
    const sync = () => setUser(authService.getCurrentUser());
    window.addEventListener('auth-user-updated', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('auth-user-updated', sync); window.removeEventListener('storage', sync); };
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const sync = () => setMobile(media.matches);
    media.addEventListener('change', sync);
    const keyboard = () => {
      const editing = document.activeElement?.matches('input,textarea,[contenteditable="true"]');
      setKeyboardOpen(Boolean(editing && window.visualViewport && window.innerHeight - window.visualViewport.height > 140));
    };
    window.visualViewport?.addEventListener('resize', keyboard);
    document.addEventListener('focusout', keyboard);
    return () => { media.removeEventListener('change', sync); window.visualViewport?.removeEventListener('resize', keyboard); document.removeEventListener('focusout', keyboard); };
  }, []);
  useEffect(() => {
    if (shopping) document.documentElement.dataset.shoppingMobile = 'true';
    else delete document.documentElement.dataset.shoppingMobile;
    if (visible) document.documentElement.dataset.shoppingMobileNav = 'true';
    else delete document.documentElement.dataset.shoppingMobileNav;
    return () => { delete document.documentElement.dataset.shoppingMobile; delete document.documentElement.dataset.shoppingMobileNav; };
  }, [shopping, visible]);

  const { data: unread } = useQuery({
    queryKey: ['shopping-mobile-unread', user?.id], queryFn: () => notificationsService.getUnreadCount(),
    enabled: mobile && shopping && Boolean(user && localStorage.getItem('token')), refetchInterval: 30000,
  });
  const privateLink = (to: string) => user && localStorage.getItem('token') ? to : productLoginUrl(to, 'CUSTOMER');
  const items = [
    { label: 'Trang chủ', icon: House, to: '/marketplace', active: home && !location.hash },
    { label: 'Gian hàng', icon: Store, to: '/stores', active: location.hash === '#featured-stores' || /^\/(shops?|stores)(\/|$)/.test(path) },
    { label: 'Live', icon: Radio, to: '/discover/live', active: path === '/discover/live' || (home && location.hash === '#live') },
    { label: 'Thông báo', icon: Bell, to: privateLink('/customer/notifications'), active: path === '/customer/notifications', badge: unread || 0 },
    { label: 'Tôi', icon: UserRound, to: privateLink('/customer/account'), active: path.startsWith('/customer') && path !== '/customer/notifications' },
  ];
  if (!visible) return null;
  return <>
    <div aria-hidden="true" className="h-[calc(64px+env(safe-area-inset-bottom,0px))] shrink-0 sm:hidden" />
    <nav aria-label="Điều hướng mua sắm" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-[#EAE4D7] bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-3px_16px_rgb(35_29_21/4%)] sm:hidden">
      {items.map(({ label, icon: Icon, to, active, badge }) => <Link key={label} to={to} aria-current={active ? 'page' : undefined}
        onClick={() => { if (location.pathname === to && !location.hash) window.scrollTo({ top: 0, behavior: 'instant' }); }}
        className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] leading-4 no-underline outline-offset-[-3px] focus-visible:outline-2 focus-visible:outline-[#B88E4F] ${active ? 'font-semibold text-[#8C6226]' : 'font-medium text-[#7D715E]'}`}>
        <span className={`relative flex h-8 w-12 items-center justify-center rounded-full ${active ? 'bg-[#FBF5EB]' : ''}`}><Icon size={22} strokeWidth={active ? 2 : 1.7} aria-hidden="true" />
          {Boolean(badge) && <span aria-label={`${badge} thông báo chưa đọc`} className="absolute right-0 top-0 min-w-4 rounded-full bg-[#DC2626] px-1 text-center text-[9px] leading-4 text-white">{badge! > 99 ? '99+' : badge}</span>}
        </span><span className="whitespace-nowrap">{label}</span>
      </Link>)}
    </nav>
  </>;
}
