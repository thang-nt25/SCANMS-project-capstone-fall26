import { useState } from 'react';
import { Megaphone, Shield, ShoppingBag, Store } from 'lucide-react';
import type { UserProfile } from '../../services/auth.service';

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
  COLLABORATOR: { label: 'KOL/KOC', icon: Megaphone },
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
      className="header-account-trigger flex items-center shrink-0 box-border w-auto max-w-[176px] min-w-0 h-[44px] gap-[8px] p-[5px_6px_5px_7px] border-0 bg-transparent text-[#1A1612] text-left cursor-pointer outline-none focus-visible:outline-2 focus-visible:outline-[#B88E4F] focus-visible:outline-offset-[3px] max-[639px]:w-[44px] max-[639px]:justify-center max-[639px]:p-[5px]"
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
      <span className="grid place-items-center shrink-0 w-[30px] h-[30px] overflow-hidden border border-[#EAE4D7] rounded-full bg-[#FBF5EB] text-[#B88E4F] text-[12px] font-[600]" aria-hidden="true">
        {avatarUrl && failedAvatar !== avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" onError={() => setFailedAvatar(avatarUrl)} />
        ) : (
          <span>{fullName.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="flex min-w-0 flex-col items-start gap-[1px] max-[639px]:hidden">
        <strong className="block w-full max-w-full truncate text-[12px] font-[600] text-[#1A1612] leading-[15px]">{name}</strong>
        <span className="inline-flex items-center gap-[3px] text-[#7D715E] text-[10px] font-[500] leading-[14px] whitespace-nowrap">
          <RoleIcon className="w-[10px] h-[10px] shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </span>
      </span>
    </button>
  );
}
