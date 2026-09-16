import type { ComponentType } from 'react';
import {
  TrendingUp,
  Link2,
  Images,
  Package,
  Trophy,
  Wallet,
  MessageSquare,
  ShoppingBag,
  Store,
  Box,
  Settings,
  ShieldCheck,
  Users,
  Gift,
  Tag,
  Award,
  Sparkles,
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
    title: 'KHÔNG GIAN KOL / CTV',
    subTitle: 'KOL / CTV Tiếp Thị',
    items: [
      { path: '/collaborator/dashboard', label: 'Tổng quan & Doanh số', icon: TrendingUp },
      { path: '/collaborator/referral-links', label: 'Công cụ Tiếp thị', icon: Link2 },
      { path: '/collaborator/campaigns', label: 'Chiến dịch & Mời hợp tác', icon: Gift },
      { path: '/collaborator/sample-requests', label: 'Hàng mẫu trải nghiệm', icon: Package },
      { path: '/collaborator/media-hub', label: 'Kho nội dung Media', icon: Images },
      { path: '/collaborator/tiers', label: 'Cấp bậc & Bảng vinh danh', icon: Award },
      { path: '/collaborator/wallet', label: 'Ví & Rút hoa hồng', icon: Wallet },
      { path: '/collaborator/kyc', label: 'Hồ sơ & Xác thực KYC', icon: ShieldCheck },
      { path: '/collaborator/messages', label: 'Tin nhắn trao đổi', icon: MessageSquare },
    ],
  },
  SHOP_MANAGER: {
    title: 'QUẢN LÝ GIAN HÀNG',
    subTitle: 'Chủ Shop Bán Lẻ',
    items: [
      { path: '/merchant/dashboard', label: 'Tổng quan Gian hàng', icon: Store },
      { path: '/merchant/orders', label: 'Quản lý Đơn hàng', icon: ShoppingBag },
      { path: '/merchant/products', label: 'Danh mục Sản phẩm', icon: Box },
      { path: '/merchant/coupons', label: 'Mã giảm giá & Tiếp thị', icon: Tag },
      { path: '/merchant/campaigns', label: 'Chiến dịch & Gợi ý KOL', icon: Gift },
      { path: '/merchant/sample-requests', label: 'Duyệt gửi hàng mẫu', icon: Package },
      { path: '/merchant/payouts', label: 'Duyệt chi trả KOL', icon: Wallet },
      { path: '/merchant/messages', label: 'Tin nhắn trao đổi', icon: MessageSquare },
      { path: '/merchant/settings', label: 'Cài đặt gian hàng', icon: Settings },
    ],
  },
  SYSTEM_ADMIN: {
    title: 'QUẢN TRỊ TOÀN SÀN',
    subTitle: 'Hệ Thống & Vận Hành',
    items: [
      { path: '/admin/analytics', label: 'Analytics Toàn sàn', icon: TrendingUp },
      { path: '/admin/users', label: 'Quản lý Người dùng & KYC', icon: Users },
      { path: '/admin/referral-links', label: 'Quản trị Link & Coupon', icon: Link2 },
      { path: '/merchant/products', label: 'Danh mục Toàn sàn', icon: Box },
      { path: '/admin/leaderboard', label: 'Bảng vinh danh Top KOL', icon: Trophy },
      { path: '/merchant/kol-recommendations', label: 'AI Khớp nối KOL', icon: Sparkles },
      { path: '/merchant/settings', label: 'Cấu hình Hệ thống', icon: Settings },
    ],
  },
  SYSTEM_MANAGER: {
    title: 'VẬN HÀNH HỆ THỐNG',
    subTitle: 'Hệ Thống & Vận Hành',
    items: [
      { path: '/admin/analytics', label: 'Analytics Toàn sàn', icon: TrendingUp },
      { path: '/admin/users', label: 'Quản lý Người dùng & KYC', icon: Users },
      { path: '/admin/referral-links', label: 'Quản trị Link & Coupon', icon: Link2 },
      { path: '/merchant/products', label: 'Danh mục Toàn sàn', icon: Box },
      { path: '/admin/leaderboard', label: 'Bảng vinh danh Top KOL', icon: Trophy },
      { path: '/merchant/kol-recommendations', label: 'AI Khớp nối KOL', icon: Sparkles },
      { path: '/merchant/settings', label: 'Cấu hình Hệ thống', icon: Settings },
    ],
  },
};
