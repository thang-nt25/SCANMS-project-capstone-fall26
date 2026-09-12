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
  Gift,
  Target,
  Tag,
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
    title: 'CHỨC NĂNG KOL / CTV',
    subTitle: 'Không gian KOL / CTV',
    items: [
      { path: '/collaborator/dashboard', label: 'Tổng quan KOL', icon: TrendingUp, numBadge: '01' },
      { path: '/collaborator/referral-links', label: 'Link tiếp thị (FR-10)', icon: Link2, numBadge: '02' },
      { path: '/collaborator/coupons', label: 'Coupon tiếp thị (FR-12)', icon: Tag, numBadge: '03' },
      { path: '/collaborator/bonus-progress', label: 'Tiến độ thưởng doanh số', icon: Target, numBadge: '04' },
      { path: '/collaborator/campaigns', label: 'Chiến dịch mời', icon: Gift, numBadge: '05' },
      { path: '/collaborator/sample-requests', label: 'Hàng mẫu', icon: Package, numBadge: '06' },
      { path: '/collaborator/social-channels', label: 'Kênh xã hội', icon: Share2, numBadge: '07' },
      { path: '/collaborator/media-hub', label: 'Kho nội dung', icon: Images, numBadge: '08' },
      { path: '/collaborator/tiers', label: 'Bảng vinh danh', icon: Trophy, numBadge: '09' },
      { path: '/collaborator/kyc', label: 'Ví & KYC', icon: Wallet, numBadge: '10' },
      { path: '/collaborator/messages', label: 'Tin nhắn', icon: MessageSquare, numBadge: '11' },
      { path: '/storefront', label: 'Trang mua hàng', icon: ShoppingBag, numBadge: '12' },
      { path: '/tracking', label: 'Tra cứu đơn', icon: Search, numBadge: '13' },
    ],
  },
  SHOP_MANAGER: {
    title: 'CHỨC NĂNG CHỦ SHOP',
    subTitle: 'Không gian Chủ Shop',
    items: [
      { path: '/merchant/dashboard', label: 'Tổng quan Shop', icon: Store, numBadge: '01' },
      { path: '/merchant/products', label: 'Danh mục sản phẩm', icon: Box, numBadge: '02' },
      { path: '/merchant/referral-links', label: 'Quản lý Link tiếp thị', icon: Link2, numBadge: '03' },
      { path: '/merchant/coupons', label: 'Quản lý Coupon KOL (FR-12)', icon: Tag, numBadge: '04' },
      { path: '/merchant/commission-rules', label: 'Chính sách thưởng doanh số', icon: Trophy, numBadge: '05' },
      { path: '/merchant/campaigns', label: 'Chiến dịch & Mời KOL', icon: Gift, numBadge: '06' },
      { path: '/merchant/sample-requests', label: 'Duyệt gửi hàng mẫu', icon: Package, numBadge: '07' },
      { path: '/collaborator/media-hub', label: 'Kho tài nguyên', icon: Images, numBadge: '08' },
      { path: '/merchant/settings', label: 'Cài đặt gian hàng', icon: Settings, numBadge: '09' },
      { path: '/merchant/kyc-approval', label: 'Duyệt KYC CTV', icon: ShieldCheck, numBadge: '10' },
      { path: '/merchant/messages', label: 'Tin nhắn hỗ trợ', icon: MessageSquare, numBadge: '11' },
    ],
  },
  SYSTEM_ADMIN: {
    title: 'QUẢN TRỊ TOÀN SÀN',
    subTitle: 'Không gian Quản Trị Hệ Thống',
    items: [
      { path: '/admin/users', label: 'Quản lý User & KYC', icon: Users, numBadge: '01' },
      { path: '/admin/referral-links', label: 'Quản trị Link toàn sàn', icon: Link2, numBadge: '02' },
      { path: '/admin/coupons', label: 'Quản trị Coupon (FR-12)', icon: Tag, numBadge: '03' },
      { path: '/merchant/products', label: 'Danh mục Toàn sàn', icon: Box, numBadge: '04' },
      { path: '/collaborator/tiers', label: 'Cấp bậc toàn sàn', icon: Trophy, numBadge: '05' },
      { path: '/merchant/settings', label: 'Cấu hình Sàn & Shop', icon: SlidersHorizontal, numBadge: '06' },
    ],
  },
  SYSTEM_MANAGER: {
    title: 'QUẢN TRỊ TOÀN SÀN',
    subTitle: 'Không gian Quản Trị Hệ Thống',
    items: [
      { path: '/admin/users', label: 'Quản lý User & KYC', icon: Users, numBadge: '01' },
      { path: '/admin/referral-links', label: 'Quản trị Link toàn sàn', icon: Link2, numBadge: '02' },
      { path: '/admin/coupons', label: 'Quản trị Coupon (FR-12)', icon: Tag, numBadge: '03' },
      { path: '/merchant/products', label: 'Danh mục Toàn sàn', icon: Box, numBadge: '04' },
      { path: '/collaborator/tiers', label: 'Cấp bậc toàn sàn', icon: Trophy, numBadge: '05' },
      { path: '/merchant/settings', label: 'Cấu hình Sàn & Shop', icon: SlidersHorizontal, numBadge: '06' },
    ],
  },
};
