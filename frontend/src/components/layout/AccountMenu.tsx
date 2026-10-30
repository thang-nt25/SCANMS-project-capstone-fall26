import { useState, type ChangeEvent, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ChevronRight, Heart, Handshake, Loader2, LogOut, MapPin, Megaphone, MessageSquare, Settings, ShieldCheck, ShoppingBag, Store, Wallet, Ticket, Package, ChartNoAxesCombined } from 'lucide-react';
import type { UserProfile } from '../../services/auth.service';
import { accountMenuLinks, type AccountMenuIcon } from '@/utils/account-menu';
import './AccountMenu.css';

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
    <div id={id} className="account-menu" data-role={role}>
      <div className="account-menu__identity">
        <div className="account-menu__avatar">
          {role === 'CUSTOMER' ? <Link to="/customer/profile" onClick={onClose} className="account-menu__avatar-link" aria-label="Xem tài khoản">
            {avatar && failedAvatar !== avatar ? <img src={avatar} alt="" onError={() => setFailedAvatar(avatar)} /> : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
          </Link> : avatar && failedAvatar !== avatar
            ? <img src={avatar} alt="" onError={() => setFailedAvatar(avatar)} />
            : <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
          {role !== 'CUSTOMER' && <button type="button" className="account-menu__avatar-edit" onClick={() => inputRef.current?.click()} disabled={uploading} aria-label="Thay ảnh đại diện">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>}
        </div>
        <div className="account-menu__identity-text">
          <strong title={name}>{name}</strong>
          {role === 'CUSTOMER' ? <Link to="/customer/profile" onClick={onClose} className="account-menu__profile-link">Xem tài khoản<ChevronRight size={13} aria-hidden="true" /></Link> : <>
            {user?.email && <span title={user.email}>{user.email}</span>}
            <span className="account-menu__role">{roleNames[role]}</span>
          </>}
        </div>
        <input type="file" ref={inputRef} onChange={onAvatarUpload} accept="image/png,image/jpeg,image/webp,image/jpg" className="hidden" />
      </div>
      <nav className="account-menu__links" aria-label="Tài khoản">
        {links.map(item => {
          const Icon = icons[item.icon];
          return <Link key={item.to} to={item.to} onClick={onClose}><span className="account-menu__icon"><Icon aria-hidden="true" /></span><span>{item.label}</span></Link>;
        })}
      </nav>
      <div className="account-menu__footer">
        <button type="button" onClick={onLogout}><LogOut size={17} aria-hidden="true" /><span>Đăng xuất</span></button>
      </div>
    </div>
  );
}
