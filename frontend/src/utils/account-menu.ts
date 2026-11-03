import type { UserProfile } from '@/services/auth.service';

type Role = UserProfile['role'];
export type AccountMenuIcon = 'orders' | 'address' | 'heart' | 'voucher' | 'wallet' | 'kol' | 'shop' | 'products' | 'chat' | 'shield' | 'chart' | 'settings' | 'handshake' | 'marketplace';
export interface AccountMenuLink { label: string; to: string; icon: AccountMenuIcon }

export function accountMenuLinks(role: Role, accountRole: Role = role): AccountMenuLink[] {
  const items: AccountMenuLink[] = [];
  if (role === 'CUSTOMER') {
    items.push(
      { label: 'Đơn mua', to: '/customer/orders', icon: 'orders' },
      { label: 'Yêu thích', to: '/customer/wishlist', icon: 'heart' },
      { label: 'Kho voucher', to: '/customer/vouchers', icon: 'voucher' },
      { label: 'Ví SCANMS', to: '/customer/wallet', icon: 'wallet' },
    );
  } else if (role === 'COLLABORATOR') {
    items.push(
      { label: 'Không gian KOL/KOC', to: '/collaborator/dashboard', icon: 'kol' },
      { label: 'Ví hoa hồng', to: '/collaborator/wallet', icon: 'wallet' },
      { label: 'Hợp tác & tin nhắn', to: '/collaborator/collaboration', icon: 'chat' },
    );
  } else if (role === 'SHOP_MANAGER') {
    items.push(
      { label: 'Tổng quan gian hàng', to: '/merchant/dashboard', icon: 'shop' },
      { label: 'Quản lý đơn hàng', to: '/merchant/orders', icon: 'orders' },
      { label: 'Quản lý sản phẩm', to: '/merchant/products', icon: 'products' },
      { label: 'Tin nhắn đối tác', to: '/merchant/kol-hub?tab=messages', icon: 'chat' },
    );
  } else {
    if (role === 'SYSTEM_ADMIN') items.push({ label: 'Tổng quan quản trị', to: '/admin/analytics', icon: 'chart' });
    items.push(
      { label: 'Duyệt hồ sơ đối tác', to: '/admin/users', icon: 'shield' },
      { label: 'Kiểm duyệt sản phẩm', to: '/admin/product-moderation', icon: 'products' },
      { label: 'Xử lý khiếu nại', to: '/admin/disputes', icon: 'chat' },
    );
  }
  const profile = role === 'CUSTOMER' ? '/customer/profile' : role === 'COLLABORATOR' ? '/collaborator/profile' : role === 'SHOP_MANAGER' ? '/merchant/settings' : '/admin/profile';
  if (role !== 'CUSTOMER') items.push({ label: role === 'SHOP_MANAGER' ? 'Cài đặt gian hàng' : 'Hồ sơ & cài đặt', to: profile, icon: 'settings' });
  if (role !== 'CUSTOMER') items.push({ label: 'Đơn mua cá nhân', to: '/customer/orders', icon: 'orders' });
  // Buyers keep a route back to their own workspace without exposing a role switcher.
  if (role === 'CUSTOMER' && accountRole !== 'CUSTOMER') {
    const home = accountMenuLinks(accountRole)[0];
    items.push(home);
  }
  return items;
}
