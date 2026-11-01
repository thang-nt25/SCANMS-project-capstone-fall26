import { useState, type ChangeEvent, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ChevronRight, Heart, Handshake, Loader2, LogOut, MapPin, Megaphone, MessageSquare, Settings, ShieldCheck, ShoppingBag, Store, Wallet, Ticket, Package, ChartNoAxesCombined } from 'lucide-react';
import type { UserProfile } from '../../services/auth.service';
import { accountMenuLinks, type AccountMenuIcon } from '@/utils/account-menu';

type Role = UserProfile['role'];

const roleNames: Record<Role, string> = {
  CUSTOMER: 'Khách hàng',
  COLLABORATOR: 'Nhà sáng tạo KOL/KOC',
  SHOP_MANAGER: 'Chủ gian hàng',
  SYSTEM_MANAGER: 'Nhân viên vận hành',
  SYSTEM_ADMIN: 'Quản trị viên',
};

interface AccountMenuProps {
  id: string;
  user: UserProfile | null;
  role: Role;
  onClose: () => void;
  onLogout: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onAvatarUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
}

export function AccountMenu({ id, user, role, onClose, onLogout, inputRef, onAvatarUpload, uploading }: AccountMenuProps) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const name = user?.fullName || user?.email || roleNames[role];
  const avatar = user?.avatarUrl;
  const links = accountMenuLinks(role, user?.role || role);
  const icons = { orders: ShoppingBag, address: MapPin, heart: Heart, voucher: Ticket, wallet: Wallet, kol: Megaphone, shop: Store, products: Package, chat: MessageSquare, shield: ShieldCheck, chart: ChartNoAxesCombined, settings: Settings, handshake: Handshake, marketplace: Store } satisfies Record<AccountMenuIcon, typeof Store>;

  return (
    <div id={id} className="account-menu absolute z-50 top-full right-0 w-[min(296px,calc(100vw-24px))] max-h-[calc(100dvh-80px)] overflow-y-auto mt-2 p-2 border border-[#eae4d7] rounded-[14px] bg-white text-[#1a1612] text-left shadow-[0_12px_30px_rgba(35,29,21,.12)] data-[role=CUSTOMER]:w-[min(280px,calc(100vw-24px))] data-[role=CUSTOMER]:rounded-xl [&_:is(a,button):focus-visible]:outline-2 [&_:is(a,button):focus-visible]:outline-[#b88e4f] [&_:is(a,button):focus-visible]:outline-offset-2" data-role={role}>
      <div className="account-menu__identity flex items-center gap-3 px-2.5 pt-3 pb-3.5 border-b border-[#eae4d7] [[data-role=CUSTOMER]_&]:pt-2.5">
        <div className="account-menu__avatar relative grid size-11 flex-none place-items-center border border-[#eedfc6] rounded-full bg-[#fbf5eb] text-[#b88e4f] text-base font-semibold [&>img]:block [&>img]:size-11 [&>img]:min-w-11 [&>img]:max-w-11 [&>img]:max-h-11 [&>img]:aspect-square [&>img]:rounded-[inherit] [&>img]:object-cover">
          {role === 'CUSTOMER' ? <Link to="/customer/profile" onClick={onClose} className="account-menu__avatar-link grid size-full place-items-center rounded-[inherit] text-inherit no-underline [&_img]:block [&_img]:size-full [&_img]:object-cover [&_img]:rounded-[inherit]" aria-label="Xem tài khoản">
            {avatar && failedAvatar !== avatar ? <img src={avatar} alt="" onError={() => setFailedAvatar(avatar)} /> : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
          </Link> : avatar && failedAvatar !== avatar
            ? <img src={avatar} alt="" onError={() => setFailedAvatar(avatar)} />
            : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
          {role !== 'CUSTOMER' && <button type="button" className="account-menu__avatar-edit absolute -right-[3px] -bottom-[3px] grid size-[21px] place-items-center border border-[#eae4d7] rounded-full bg-white text-[#7d715e] cursor-pointer hover:text-[#b88e4f] disabled:cursor-wait disabled:opacity-65" onClick={() => inputRef.current?.click()} disabled={uploading} aria-label="Thay ảnh đại diện">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>}
        </div>
        <div className="account-menu__identity-text flex min-w-0 flex-1 flex-col items-start gap-0.5 [&>strong]:block [&>strong]:max-w-full [&>strong]:truncate [&>strong]:text-[#1a1612] [&>strong]:text-sm [&>strong]:font-[650] [&>span:not(.account-menu__role)]:block [&>span:not(.account-menu__role)]:max-w-full [&>span:not(.account-menu__role)]:truncate [&>span:not(.account-menu__role)]:text-[#7d715e] [&>span:not(.account-menu__role)]:text-xs">
          <strong title={name}>{name}</strong>
          {role === 'CUSTOMER' ? <Link to="/customer/profile" onClick={onClose} className="account-menu__profile-link inline-flex min-h-[26px] items-center gap-[3px] text-[#7d715e] text-xs no-underline hover:text-[#b88e4f]">Xem tài khoản<ChevronRight size={13} aria-hidden="true" /></Link> : <>
            {user?.email && <span title={user.email}>{user.email}</span>}
            <span className="account-menu__role max-w-full mt-[3px] truncate text-[#a47639] text-[11px] font-semibold">{roleNames[role]}</span>
          </>}
        </div>
        <input type="file" ref={inputRef} onChange={onAvatarUpload} accept="image/png,image/jpeg,image/webp,image/jpg" className="hidden" />
      </div>
      <nav className="account-menu__links grid gap-0.5 py-2 [&_a]:flex [&_a]:w-full [&_a]:min-h-[38px] [&_a]:items-center [&_a]:gap-2.5 [&_a]:border-0 [&_a]:rounded-lg [&_a]:bg-transparent [&_a]:px-2.5 [&_a]:py-[7px] [&_a]:text-[#1a1612] [&_a]:text-[13px] [&_a]:font-medium [&_a]:leading-[1.4] [&_a]:text-left [&_a]:no-underline [&_a:hover]:bg-[#faf8f5] [&_a:hover]:text-[#986b2f] [[data-role=CUSTOMER]_&_a]:min-h-10" aria-label="Tài khoản">
        {links.map(item => {
          const Icon = icons[item.icon];
          return <Link key={item.to} to={item.to} onClick={onClose}><span className="account-menu__icon grid size-5 flex-none place-items-center text-[#b88e4f] [&_svg]:size-[17px] [&_svg]:stroke-[1.7]"><Icon aria-hidden="true" /></span><span>{item.label}</span></Link>;
        })}
      </nav>
      <div className="account-menu__footer pt-[7px] border-t border-[#eae4d7] [&_button]:flex [&_button]:w-full [&_button]:min-h-[38px] [&_button]:items-center [&_button]:gap-2.5 [&_button]:border-0 [&_button]:rounded-lg [&_button]:bg-transparent [&_button]:px-2.5 [&_button]:py-[7px] [&_button]:text-[#b42318] [&_button]:text-[13px] [&_button]:font-medium [&_button]:leading-[1.4] [&_button]:text-left [&_button]:cursor-pointer [&_button:hover]:bg-[#fff6f4] [[data-role=CUSTOMER]_&_button]:min-h-10">
        <button type="button" onClick={onLogout}><LogOut size={17} aria-hidden="true" /><span>Đăng xuất</span></button>
      </div>
    </div>
  );
}
