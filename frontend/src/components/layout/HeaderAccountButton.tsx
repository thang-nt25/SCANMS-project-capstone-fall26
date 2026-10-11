import { useState } from 'react';
import { ChevronDown, Shield, ShoppingBag, Star, Store } from 'lucide-react';
import type { UserProfile } from '../../services/auth.service';
import './HeaderAccountButton.css';

interface HeaderAccountButtonProps {
  user: UserProfile | null;
  role: UserProfile['role'];
  expanded: boolean;
  menuId: string;
  detail?: string;
  onClick: () => void;
}

const roles = {
  CUSTOMER: { label: 'Khách mua sắm', icon: ShoppingBag },
  COLLABORATOR: { label: 'KOL/KOC', icon: Star },
  SHOP_MANAGER: { label: 'Chủ shop', icon: Store },
  SYSTEM_MANAGER: { label: 'Vận hành', icon: Shield },
  SYSTEM_ADMIN: { label: 'Admin', icon: Shield },
};

export function HeaderAccountButton({ user, role, expanded, menuId, detail, onClick }: HeaderAccountButtonProps) {
  const [failedAvatar, setFailedAvatar] = useState<string | null>(null);
  const { label, icon: RoleIcon } = roles[role];
  const fullName = user?.fullName || user?.email || label;
  const name = fullName.replace(/\s*\((?:Top\s+KOL|KOL[^)]*|Vận Hành & Tuân Thủ|Super Admin|Admin|Ban Quản Trị Tối Cao|Quản trị viên Hệ thống)\)\s*$/iu, '').trim() || fullName;
  const avatarUrl = user?.avatarUrl;
  const description = `${fullName} · ${label}${detail && detail !== label ? ` · ${detail}` : ''}`;

  return (
    <button
      type="button"
      className="scanms-header-account"
      aria-expanded={expanded}
      aria-haspopup="true"
      aria-controls={menuId}
      aria-label={`Tài khoản ${description}`}
      title={description}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && expanded) onClick();
      }}
    >
      <span className="sha-avatar" aria-hidden="true">
        {avatarUrl && failedAvatar !== avatarUrl ? (
          <img src={avatarUrl} alt="" onError={() => setFailedAvatar(avatarUrl)} />
        ) : (
          <span>{fullName.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="sha-identity">
        <strong>{name}</strong>
        <span className="sha-role"><RoleIcon aria-hidden="true" />{label}</span>
      </span>
      <ChevronDown className="sha-chevron" aria-hidden="true" />
    </button>
  );
}
