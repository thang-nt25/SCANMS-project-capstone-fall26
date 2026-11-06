import type { ComponentType } from 'react';
import {
  TrendingUp,
  Link2,
  Wallet,
  MessageSquare,
  ShoppingBag,
  Store,
  Box,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Users,
  Tag,
  Heart,
  User,
  Package,
  Radio,
  Bell,
  ReceiptText,
  RotateCcw,
  UserPlus,
  Megaphone,
  type LucideProps,
} from 'lucide-react';

export interface NavItemConfig {
  path: string;
  label: string;
  icon: ComponentType<LucideProps>;
  badge?: string;
  numBadge?: string;
  group?: number; // 1, 2, 3 for natural optical spacing (Group with space, not lines)
}

export interface RoleNavigationGroup {
  title: string;
  subTitle: string;
  items: NavItemConfig[];
}

export const NAVIGATION_BY_ROLE: Record<string, RoleNavigationGroup> = {
  CUSTOMER: {
    title: 'TÀI KHOẢN KHÁCH HÀNG',
    subTitle: 'Khách Mua Sắm',
    items: [
      { path: '/customer/orders', label: 'Đơn hàng', icon: ShoppingBag, group: 1 },
      { path: '/customer/wallet', label: 'Ví mua sắm', icon: Wallet, badge: 'Ví', group: 1 },
      { path: '/customer/vouchers', label: 'Mã ưu đãi', icon: Tag, group: 1 },
      { path: '/customer/wishlist', label: 'Yêu thích', icon: Heart, group: 1 },
      { path: '/customer/notifications', label: 'Thông báo', icon: Bell, group: 1 },
      { path: '/customer/profile', label: 'Tài khoản', icon: User, group: 2 },
      { path: '/customer/upgrade', label: 'Nâng cấp Đối tác', icon: Megaphone, group: 2 },
    ],
  },
  COLLABORATOR: {
    title: 'KHÔNG GIAN ĐỐI TÁC',
    subTitle: 'Nhà Sáng Tạo & KOC Tiếp Thị',
    items: [
      { path: '/collaborator/dashboard', label: 'Tổng quan', icon: TrendingUp, group: 1 },
      { path: '/collaborator/marketing', label: 'Công cụ tiếp thị', icon: Link2, group: 1 },
      { path: '/collaborator/collaboration', label: 'Hợp tác & Hàng mẫu', icon: MessageSquare, group: 1 },
      { path: '/collaborator/live-sessions', label: 'Phiên Live', icon: Radio, group: 1 },
      { path: '/collaborator/wallet', label: 'Thu nhập & Đối soát', icon: Wallet, group: 2 },
      { path: '/collaborator/profile', label: 'Hồ sơ cá nhân', icon: User, group: 2 },
    ],
  },
  SHOP_MANAGER: {
    title: 'QUẢN TRỊ NHÃN HÀNG',
    subTitle: 'Giám Đốc Nhãn Hàng Trực Thuộc',
    items: [
      { path: '/merchant/dashboard', label: 'Tổng quan', icon: Store, group: 1 },
      { path: '/merchant/orders', label: 'Quản lý đơn hàng', icon: ShoppingBag, group: 1 },
      { path: '/merchant/products', label: 'Sản phẩm', icon: Box, group: 1 },
      { path: '/merchant/kol-hub', label: 'Mạng lưới Đối tác', icon: Users, group: 2 },
      { path: '/merchant/promotions', label: 'Khuyến mại & Đãi ngộ', icon: Tag, group: 2 },
      { path: '/merchant/live-sessions', label: 'Phiên Live', icon: Radio, group: 2 },
      { path: '/merchant/customer-messages', label: 'Chăm sóc khách hàng', icon: MessageSquare, group: 2 },
      { path: '/merchant/settings', label: 'Cài đặt nhãn hàng', icon: Settings, group: 3 },
    ],
  },
  SYSTEM_ADMIN: {
    title: 'QUẢN TRỊ TỐI CAO',
    subTitle: 'Ban Giám Đốc Điều Hành',
    items: [
      { path: '/admin/analytics', label: 'Báo cáo doanh thu', icon: TrendingUp, group: 1 },
      { path: '/admin/payouts', label: 'Quyết toán & Thuế', icon: ReceiptText, group: 1 },
      { path: '/admin/vip-exceptions', label: 'Ngoại lệ VIP', icon: ShieldCheck, group: 1 },
      { path: '/admin/personnel', label: 'Nhân sự & Nhãn hàng', icon: UserPlus, group: 2 },
      { path: '/admin/users', label: 'Thẩm định eKYC', icon: ShieldCheck, group: 2 },
      { path: '/admin/pricing', label: 'Kiểm duyệt giá sàn', icon: Tag, group: 2 },
      { path: '/admin/product-moderation', label: 'Kiểm duyệt sản phẩm', icon: Box, group: 2 },
      { path: '/admin/sample-requests', label: 'Trọng tài hàng mẫu', icon: Package, group: 2 },
      { path: '/admin/customer-reviews', label: 'Khiếu nại khách hàng', icon: MessageSquare, group: 3 },
      { path: '/admin/return-disputes', label: 'Khiếu nại đổi trả', icon: RotateCcw, group: 3 },
      { path: '/admin/affiliate-oversight', label: 'Giám sát tiếp thị', icon: Link2, group: 3 },
      { path: '/admin/fraud-sentinel', label: 'An ninh gian lận', icon: ShieldAlert, group: 3 },
      { path: '/admin/audit-logs', label: 'Nhật ký kiểm toán', icon: ShieldCheck, group: 3 },
      ...((import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_TOOLS === 'true') ? [{ path: '/admin/internal-traffic-test', label: 'Kiểm thử chống spam', icon: ShieldAlert, group: 3 }] : [])
    ],
  },
  SYSTEM_MANAGER: {
    title: 'VẬN HÀNH & KẾ TOÁN SÀN',
    subTitle: 'Chuyên Viên Vận Hành Hệ Thống',
    items: [
      { path: '/admin/analytics', label: 'Báo cáo vận hành', icon: TrendingUp, group: 1 },
      { path: '/admin/payouts', label: 'Duyệt rút tiền', icon: ReceiptText, group: 1 },
      { path: '/admin/users', label: 'Thẩm định eKYC', icon: ShieldCheck, group: 2 },
      { path: '/admin/pricing', label: 'Kiểm duyệt giá sàn', icon: Tag, group: 2 },
      { path: '/admin/product-moderation', label: 'Kiểm duyệt sản phẩm', icon: Box, group: 2 },
      { path: '/admin/sample-requests', label: 'Trọng tài hàng mẫu', icon: Package, group: 2 },
      { path: '/admin/customer-reviews', label: 'Khiếu nại khách hàng', icon: MessageSquare, group: 3 },
      { path: '/admin/return-disputes', label: 'Khiếu nại đổi trả', icon: RotateCcw, group: 3 },
      { path: '/admin/affiliate-oversight', label: 'Giám sát tiếp thị', icon: Link2, group: 3 },
      { path: '/admin/fraud-sentinel', label: 'Cảnh báo gian lận', icon: ShieldAlert, group: 3 },
      { path: '/admin/audit-logs', label: 'Nhật ký kiểm toán', icon: ShieldCheck, group: 3 },
      ...((import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_TOOLS === 'true') ? [{ path: '/admin/internal-traffic-test', label: 'Kiểm thử chống spam', icon: ShieldAlert, group: 3 }] : [])
    ],
  },
};
