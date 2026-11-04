import { ChartNoAxesCombined, Handshake, LayoutDashboard, Link2, ListChecks, MoreHorizontal, Package, ReceiptText, ShieldCheck, ShoppingBag, UserRound, Users, Wallet, MessageSquare } from 'lucide-react';
export type WorkspaceMobileRole = 'COLLABORATOR' | 'SHOP_MANAGER' | 'SYSTEM_MANAGER' | 'SYSTEM_ADMIN';
type MobileItem = { label: string; icon: typeof Wallet; to?: string; paths?: string[]; menu?: 'all' | 'review' | 'claims' | 'control' };
const review = ['/admin/users', '/admin/kyc', '/admin/pricing', '/admin/product-moderation', '/admin/sample-requests'];
const claims = ['/admin/customer-reviews', '/admin/return-disputes', '/admin/returns', '/admin/disputes', '/admin/arbitration'];
export const WORKSPACE_MOBILE_ITEMS: Record<WorkspaceMobileRole, MobileItem[]> = {
  COLLABORATOR: [
    { label: 'Tổng quan', icon: LayoutDashboard, to: '/collaborator/dashboard' },
    { label: 'Tiếp thị', icon: Link2, to: '/collaborator/marketing', paths: ['/collaborator/marketing', '/collaborator/campaigns'] },
    { label: 'Hợp tác', icon: Handshake, to: '/collaborator/collaboration' },
    { label: 'Ví thù lao', icon: Wallet, to: '/collaborator/wallet' },
    { label: 'Tôi', icon: UserRound, menu: 'all' },
  ],
  SHOP_MANAGER: [
    { label: 'Tổng quan', icon: LayoutDashboard, to: '/merchant/dashboard' },
    { label: 'Đơn hàng', icon: ShoppingBag, to: '/merchant/orders', paths: ['/merchant/orders', '/merchant/returns', '/merchant/return-requests'] },
    { label: 'Sản phẩm', icon: Package, to: '/merchant/products', paths: ['/merchant/products', '/merchant/pricing'] },
    { label: 'Đối tác', icon: Users, to: '/merchant/kol-hub' },
    { label: 'Thêm', icon: MoreHorizontal, menu: 'all' },
  ],
  SYSTEM_MANAGER: [
    { label: 'Tổng quan', icon: LayoutDashboard, to: '/admin/analytics' },
    { label: 'Duyệt rút', icon: ReceiptText, to: '/admin/finance/payouts', paths: ['/admin/payouts', '/admin/finance'] },
    { label: 'Kiểm duyệt', icon: ListChecks, menu: 'review', paths: review },
    { label: 'Khiếu nại', icon: MessageSquare, menu: 'claims', paths: claims },
    { label: 'Tôi', icon: UserRound, menu: 'all' },
  ],
  SYSTEM_ADMIN: [
    { label: 'Báo cáo', icon: ChartNoAxesCombined, to: '/admin/analytics' },
    { label: 'Quyết toán', icon: ReceiptText, to: '/admin/finance/payouts', paths: ['/admin/payouts', '/admin/finance'] },
    { label: 'Nhân sự', icon: Users, to: '/admin/personnel', paths: ['/admin/personnel', '/admin/internal-staff'] },
    { label: 'Kiểm soát', icon: ShieldCheck, menu: 'control', paths: [...review, ...claims, '/admin/affiliate-oversight', '/admin/fraud-sentinel'] },
    { label: 'Thêm', icon: MoreHorizontal, menu: 'all' },
  ],
};
export function workspaceMobileRole(path: string, role: string, workspaces: string[]): WorkspaceMobileRole | null {
  if (path.startsWith('/collaborator/') && workspaces.includes('kol')) return 'COLLABORATOR';
  if (path.startsWith('/merchant/') && workspaces.includes('shop')) return 'SHOP_MANAGER';
  if (path.startsWith('/admin/') && workspaces.includes('admin')) return role === 'SYSTEM_MANAGER' ? 'SYSTEM_MANAGER' : role === 'SYSTEM_ADMIN' ? 'SYSTEM_ADMIN' : null;
  return null;
}
export function mobileItemMatches(path: string, item: MobileItem) {
  return (item.paths || (item.to ? [item.to] : [])).some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}
