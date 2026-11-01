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
  section?: string;
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
      { path: '/customer/orders', label: 'Đơn hàng', icon: ShoppingBag, section: 'MUA SẮM & VÍ' },
      { path: '/customer/wallet', label: 'Ví mua sắm', icon: Wallet, badge: 'Ví', section: 'MUA SẮM & VÍ' },
      { path: '/customer/vouchers', label: 'Mã ưu đãi', icon: Tag, section: 'MUA SẮM & VÍ' },
      { path: '/customer/wishlist', label: 'Yêu thích', icon: Heart, section: 'MUA SẮM & VÍ' },
      { path: '/customer/notifications', label: 'Thông báo', icon: Bell, section: 'MUA SẮM & VÍ' },
      { path: '/customer/profile', label: 'Tài khoản', icon: User, section: 'TÀI KHOẢN & BẢO MẬT' },
      { path: '/customer/upgrade', label: 'Nâng cấp Đối tác', icon: Megaphone, section: 'TÀI KHOẢN & BẢO MẬT' },
    ],
  },
  COLLABORATOR: {
    title: 'KHÔNG GIAN ĐỐI TÁC',
    subTitle: 'Nhà Sáng Tạo & KOC Tiếp Thị',
    items: [
      { path: '/collaborator/dashboard', label: 'Tổng quan', icon: TrendingUp, section: 'TỔNG QUAN' },
      { path: '/collaborator/marketing', label: 'Link & Mã tiếp thị', icon: Link2, section: 'TIẾP THỊ & HỢP TÁC' },
      { path: '/collaborator/campaigns', label: 'Chiến dịch', icon: Tag, badge: 'Mới', section: 'TIẾP THỊ & HỢP TÁC' },
      { path: '/collaborator/collaboration', label: 'Hàng mẫu trải nghiệm', icon: MessageSquare, section: 'TIẾP THỊ & HỢP TÁC' },
      { path: '/collaborator/live-sessions', label: 'Phiên Live', icon: Radio, section: 'TIẾP THỊ & HỢP TÁC' },
      { path: '/collaborator/wallet', label: 'Ví thù lao', icon: Wallet, section: 'TÀI CHÍNH & HỒ SƠ' },
      { path: '/collaborator/profile', label: 'Hồ sơ & Cấp bậc', icon: ShieldCheck, section: 'TÀI CHÍNH & HỒ SƠ' },
    ],
  },
  SHOP_MANAGER: {
    title: 'QUẢN TRỊ NHÃN HÀNG',
    subTitle: 'Giám Đốc Nhãn Hàng Trực Thuộc',
    items: [
      { path: '/merchant/dashboard', label: 'Tổng quan', icon: Store, section: 'TỔNG QUAN' },
      { path: '/merchant/orders', label: 'Quản lý đơn hàng', icon: ShoppingBag, section: 'VẬN HÀNH & HÀNG HÓA' },
      { path: '/merchant/products', label: 'Sản phẩm', icon: Box, section: 'VẬN HÀNH & HÀNG HÓA' },
      { path: '/merchant/kol-hub', label: 'Mạng lưới Đối tác', icon: Users, section: 'TIẾP THỊ & HỢP TÁC' },
      { path: '/merchant/promotions', label: 'Chiến dịch nhãn hàng', icon: Tag, section: 'TIẾP THỊ & HỢP TÁC' },
      { path: '/merchant/live-sessions', label: 'Phiên Live', icon: Radio, section: 'TIẾP THỊ & HỢP TÁC' },
      { path: '/merchant/customer-messages', label: 'Chăm sóc khách hàng', icon: MessageSquare, section: 'CHĂM SÓC KHÁCH HÀNG' },
      { path: '/merchant/wallet', label: 'Báo cáo tài chính', icon: Wallet, section: 'TÀI CHÍNH & CÀI ĐẶT' },
      { path: '/merchant/settings', label: 'Cài đặt nhãn hàng', icon: Settings, section: 'TÀI CHÍNH & CÀI ĐẶT' },
    ],
  },
  SYSTEM_ADMIN: {
    title: 'QUẢN TRỊ TỐI CAO',
    subTitle: 'Ban Giám Đốc Điều Hành',
    items: [
      { path: '/admin/analytics', label: 'Báo cáo doanh thu', icon: TrendingUp, section: 'TÀI CHÍNH & HIỆU SUẤT' },
      { path: '/admin/payouts', label: 'Quyết toán & Thuế', icon: ReceiptText, section: 'TÀI CHÍNH & HIỆU SUẤT' },
      { path: '/admin/personnel', label: 'Nhân sự & Nhãn hàng', icon: UserPlus, section: 'QUẢN TRỊ NHÂN SỰ & ĐỐI TÁC' },
      { path: '/admin/users', label: 'Thẩm định eKYC', icon: ShieldCheck, section: 'QUẢN TRỊ NHÂN SỰ & ĐỐI TÁC' },
      { path: '/admin/product-moderation', label: 'Kiểm duyệt sản phẩm', icon: Box, section: 'KIỂM SOÁT VẬN HÀNH & KHIẾU NẠI' },
      { path: '/admin/sample-requests', label: 'Trọng tài hàng mẫu', icon: Package, section: 'KIỂM SOÁT VẬN HÀNH & KHIẾU NẠI' },
      { path: '/admin/customer-reviews', label: 'Khiếu nại & Đổi trả', icon: MessageSquare, section: 'KIỂM SOÁT VẬN HÀNH & KHIẾU NẠI' },
      { path: '/admin/affiliate-oversight', label: 'Giám sát tiếp thị', icon: Link2, section: 'KIỂM SOÁT VẬN HÀNH & KHIẾU NẠI' },
      { path: '/admin/fraud-sentinel', label: 'An ninh gian lận', icon: ShieldAlert, section: 'AN NINH & BẢO MẬT' },
      { path: '/admin/audit-logs', label: 'Nhật ký kiểm toán', icon: ShieldCheck, section: 'AN NINH & BẢO MẬT' },
    ],
  },
  SYSTEM_MANAGER: {
    title: 'VẬN HÀNH & KẾ TOÁN SÀN',
    subTitle: 'Chuyên Viên Vận Hành Hệ Thống',
    items: [
      { path: '/admin/analytics', label: 'Báo cáo vận hành', icon: TrendingUp, section: 'TỔNG QUAN' },
      { path: '/admin/payouts', label: 'Duyệt rút tiền', icon: ReceiptText, section: 'TÀI CHÍNH & ĐỐI SOÁT' },
      { path: '/admin/users', label: 'Thẩm định eKYC', icon: ShieldCheck, section: 'THẨM ĐỊNH & KIỂM DUYỆT' },
      { path: '/admin/product-moderation', label: 'Kiểm duyệt sản phẩm', icon: Box, section: 'THẨM ĐỊNH & KIỂM DUYỆT' },
      { path: '/admin/sample-requests', label: 'Trọng tài hàng mẫu', icon: Package, section: 'THẨM ĐỊNH & KIỂM DUYỆT' },
      { path: '/admin/customer-reviews', label: 'Khiếu nại & Đổi trả', icon: MessageSquare, section: 'KIỂM SOÁT VẬN HÀNH' },
      { path: '/admin/affiliate-oversight', label: 'Giám sát tiếp thị', icon: Link2, section: 'GIÁM SÁT TIẾP THỊ' },
      { path: '/admin/fraud-sentinel', label: 'Cảnh báo gian lận', icon: ShieldAlert, section: 'AN NINH & TRA CỨU' },
      { path: '/admin/audit-logs', label: 'Nhật ký kiểm toán', icon: ShieldCheck, section: 'AN NINH & TRA CỨU' },
    ],
  },
};
