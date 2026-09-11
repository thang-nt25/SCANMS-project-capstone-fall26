import type { ComponentType } from 'react';
import {
  TrendingUp,
  Link2,
  Share2,
  Images,
  Package,
  Trophy,
  Wallet,
  MessageSquare,
  ShoppingBag,
  Search,
  Store,
  Box,
  Settings,
  ShieldCheck,
  Users,
  SlidersHorizontal,
  type LucideProps,
} from 'lucide-react';

export interface NavItemConfig {
  path: string;
  label: string;
  icon: ComponentType<LucideProps>;
  badge?: string;
  numBadge?: string;
}

export interface RoleNavigationGroup {
  title: string;
  subTitle: string;
  items: NavItemConfig[];
}

export const NAVIGATION_BY_ROLE: Record<string, RoleNavigationGroup> = {
  COLLABORATOR: {
    title: 'CHỨC NĂNG KOL / CTV (10)',
    subTitle: 'Không gian KOL / CTV',
    items: [
      { path: '/collaborator/dashboard', label: 'Tổng quan KOL', icon: TrendingUp, numBadge: '01' },
      { path: '/collaborator/links', label: 'Link và QR', icon: Link2, numBadge: '02' },
      { path: '/collaborator/social-channels', label: 'Kênh xã hội', icon: Share2, numBadge: '03' },
      { path: '/collaborator/media-hub', label: 'Kho nội dung', icon: Images, numBadge: '04' },
      { path: '/collaborator/samples', label: 'Hàng mẫu', icon: Package, numBadge: '05' },
      { path: '/collaborator/sample-requests', label: 'Xin mẫu dùng thử', icon: Package, numBadge: '05b' },
      { path: '/collaborator/campaigns', label: 'Chiến dịch mời', icon: Trophy, numBadge: '06' },
      { path: '/collaborator/tiers', label: 'Bảng vinh danh', icon: Trophy, numBadge: '06b' },
      { path: '/collaborator/stats', label: 'Dashboard doanh số', icon: TrendingUp, numBadge: '07' },
      { path: '/collaborator/kyc', label: 'Ví của tôi', icon: Wallet, numBadge: '08' },
      { path: '/collaborator/messages', label: 'Tin nhắn', icon: MessageSquare, numBadge: '09' },
      { path: '/storefront', label: 'Trang mua hàng', icon: ShoppingBag, numBadge: '10' },
    ],
  },
  SHOP_MANAGER: {
    title: 'CHỨC NĂNG CHỦ SHOP (09)',
    subTitle: 'Không gian Chủ Shop',
    items: [
      { path: '/merchant/dashboard', label: 'Tổng quan Shop', icon: Store, numBadge: '01' },
      { path: '/merchant/stats', label: 'Dashboard doanh số', icon: TrendingUp, numBadge: '02' },
      { path: '/merchant/products', label: 'Danh mục sản phẩm', icon: Box, numBadge: '03' },
      { path: '/collaborator/media-hub', label: 'Kho tài nguyên', icon: Images, numBadge: '04' },
      { path: '/merchant/campaigns', label: 'Chiến dịch affiliate', icon: Trophy, numBadge: '05' },
      { path: '/merchant/sample-requests', label: 'Quản lý hàng mẫu', icon: Package, numBadge: '06' },
      { path: '/merchant/settings', label: 'Cài đặt gian hàng', icon: Settings, numBadge: '07' },
      { path: '/merchant/kyc-approval', label: 'Duyệt KYC CTV', icon: ShieldCheck, numBadge: '08' },
      { path: '/merchant/messages', label: 'Tin nhắn hỗ trợ', icon: MessageSquare, numBadge: '09' },
    ],
  },
  SYSTEM_ADMIN: {
    title: 'QUẢN TRỊ TOÀN SÀN',
    subTitle: 'Không gian Quản Trị Hệ Thống',
    items: [
      { path: '/admin/users', label: 'Quản lý User & KYC', icon: Users, numBadge: '01' },
      { path: '/merchant/products', label: 'Danh mục Toàn sàn', icon: Box, numBadge: '02' },
      { path: '/collaborator/tiers', label: 'Cấp bậc toàn sàn', icon: Trophy, numBadge: '03' },
      { path: '/merchant/settings', label: 'Cấu hình Sàn & Shop', icon: SlidersHorizontal, numBadge: '04' },
    ],
  },
  SYSTEM_MANAGER: {
    title: 'QUẢN TRỊ TOÀN SÀN',
    subTitle: 'Không gian Quản Trị Hệ Thống',
    items: [
      { path: '/admin/users', label: 'Quản lý User & KYC', icon: Users, numBadge: '01' },
      { path: '/merchant/products', label: 'Danh mục Toàn sàn', icon: Box, numBadge: '02' },
      { path: '/collaborator/tiers', label: 'Cấp bậc toàn sàn', icon: Trophy, numBadge: '03' },
      { path: '/merchant/settings', label: 'Cấu hình Sàn & Shop', icon: SlidersHorizontal, numBadge: '04' },
    ],
  },
};
