import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Bell, ChevronRight, LogOut, Store, UserRound, X } from 'lucide-react';
import { authService, type UserProfile } from '@/services/auth.service';
import { NAVIGATION_BY_ROLE } from '@/config/navigation.config';
import { WORKSPACE_MOBILE_ITEMS, mobileItemMatches, workspaceMobileRole } from '@/config/workspace-mobile-navigation';
import { useScanmsChat } from '@/context/ScanmsChatContext';
import { useCart } from '@/context/CartContext';

export function WorkspaceMobileNavigation({ user }: { user: UserProfile | null }) {
  const location = useLocation();
  const navigate = useNavigate();
  const chat = useScanmsChat();
  const cart = useCart();
  const [mobile, setMobile] = useState(() => matchMedia('(max-width: 639px)').matches);
  const [blocked, setBlocked] = useState(false);
  const [menu, setMenu] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const workspaces = user ? authService.getUserAvailableWorkspaces(user).map(workspace => workspace.key) : [];
  const role = user && localStorage.getItem('token') ? workspaceMobileRole(location.pathname, user.role, workspaces) : null;
  const items = role ? WORKSPACE_MOBILE_ITEMS[role] : [];
  const visible = mobile && role && !blocked && !cart.isCartOpen && !cart.isCheckoutOpen && !(chat.isOpen && !chat.isMinimized);
  const selected = items.findIndex(item => mobileItemMatches(location.pathname, item));
  const activeIndex = selected < 0 ? 4 : selected;
  useEffect(() => { setMenu(null); }, [location.pathname, location.search]);
  useEffect(() => {
    if (mobile && role) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, mobile, role]);
  useEffect(() => {
    const media = matchMedia('(max-width: 639px)');
    const sync = () => setMobile(media.matches);
    const update = () => {
      const editing = document.activeElement?.matches('input,textarea,[contenteditable="true"]');
      const keyboard = editing && window.visualViewport && window.innerHeight - window.visualViewport.height > 140;
      const modal = [...document.querySelectorAll('dialog[open]:not([data-workspace-menu]),[role="dialog"][aria-modal="true"]:not([data-workspace-menu])')].some(element => element.getClientRects().length > 0);
      setBlocked(Boolean(keyboard || document.fullscreenElement || modal));
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open', 'aria-modal'] });
    media.addEventListener('change', sync);
    window.visualViewport?.addEventListener('resize', update);
    document.addEventListener('focusout', update);
    document.addEventListener('fullscreenchange', update);
    update();
    return () => { observer.disconnect(); media.removeEventListener('change', sync); window.visualViewport?.removeEventListener('resize', update); document.removeEventListener('focusout', update); document.removeEventListener('fullscreenchange', update); };
  }, []);
  useEffect(() => {
    if (visible) document.documentElement.dataset.workspaceMobileNav = 'true';
    else delete document.documentElement.dataset.workspaceMobileNav;
    return () => { delete document.documentElement.dataset.workspaceMobileNav; };
  }, [visible]);
  useEffect(() => {
    if (menu === null || !visible) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; dialog.current?.close(); };
  }, [menu, visible]);
  if (!visible || !role || !user) return null;
  const group = menu === null ? null : items[menu];
  const menuItems = NAVIGATION_BY_ROLE[role].items.filter(item => !group?.paths || group.menu === 'all' || group.paths.some(path => item.path === path));
  const profile = role === 'COLLABORATOR' ? '/collaborator/profile' : role === 'SHOP_MANAGER' ? '/merchant/settings' : '/admin/profile';
  const close = () => setMenu(null);
  const entryClass = 'flex min-h-12 items-center gap-3 rounded-xl border border-[#EAE4D7] bg-white px-3 py-3 text-sm text-[#1A1612] no-underline';
  return <>
    <div aria-hidden="true" className="h-[calc(64px+env(safe-area-inset-bottom,0px))] shrink-0" />
    <nav aria-label="Điều hướng không gian làm việc" data-role={role} className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-[#EAE4D7] bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-3px_16px_rgb(35_29_21/4%)]">
      {items.map((item, index) => {
        const active = menu === null ? activeIndex === index : menu === index;
        const Icon = item.icon;
        const className = `touch-manipulation flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] leading-4 no-underline focus-visible:outline-[#B88E4F] ${active ? 'font-semibold text-[#8C6226]' : 'font-medium text-[#7D715E]'}`;
        const content = <><span className={`flex h-8 w-12 items-center justify-center rounded-full ${active ? 'bg-[#FBF5EB]' : ''}`}><Icon size={22} strokeWidth={active ? 2 : 1.7} aria-hidden="true" /></span><span className="whitespace-nowrap">{item.label}</span></>;
        return item.to ? <Link key={item.label} to={item.to} onClick={() => { if (location.pathname === item.to) window.scrollTo({ top: 0, behavior: 'instant' }); }} aria-current={active ? 'page' : undefined} className={className}>{content}</Link> : <button key={item.label} type="button" aria-haspopup="dialog" aria-expanded={menu === index} aria-current={active ? 'page' : undefined} onClick={() => setMenu(index)} className={className}>{content}</button>;
      })}
    </nav>
    {createPortal(<dialog ref={dialog} data-workspace-menu aria-label={group?.label || 'Chức năng'} onCancel={close} onClick={event => { if (event.target === event.currentTarget) close(); }} className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border-0 bg-[#FAF8F5] p-0 text-[#1A1612] shadow-xl backdrop:bg-[#231D15]/35">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#EAE4D7] bg-white px-4 py-3"><h2 className="m-0 text-base font-semibold">{group?.menu === 'all' ? NAVIGATION_BY_ROLE[role].title : group?.label}</h2><button type="button" autoFocus onClick={close} aria-label="Đóng menu" className="touch-manipulation grid size-11 place-items-center rounded-full text-[#7D715E]"><X size={21} /></button></header>
      <div className="space-y-2 p-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
        {group?.menu === 'all' && <Link onClick={close} to={profile} className={entryClass}><UserRound size={21} className="text-[#B88E4F]" /><span className="min-w-0 flex-1 truncate font-semibold">{user.fullName || 'Hồ sơ của tôi'}</span><ChevronRight size={16} /></Link>}
        {menuItems.map(item => { const Icon = item.icon; return <Link key={item.path} to={item.path} onClick={close} className={entryClass}><Icon size={20} className="shrink-0 text-[#B88E4F]" /><span className="flex-1">{item.label}</span><ChevronRight size={16} /></Link>; })}
        {group?.menu === 'all' && <>
          <Link onClick={close} to="/customer/notifications" className={entryClass}><Bell size={20} className="text-[#B88E4F]" /><span className="flex-1">Thông báo</span><ChevronRight size={16} /></Link>
          <Link onClick={close} to="/marketplace" className={entryClass}><Store size={20} className="text-[#B88E4F]" /><span className="flex-1">Sàn mua sắm</span><ChevronRight size={16} /></Link>
          <button type="button" onClick={() => { close(); authService.logout(); navigate('/login'); }} className={`${entryClass} w-full text-[#DC2626]`}><LogOut size={20} />Đăng xuất</button>
        </>}
      </div>
    </dialog>, document.body)}
  </>;
}
