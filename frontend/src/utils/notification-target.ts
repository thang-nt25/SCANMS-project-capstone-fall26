import type { UserProfile } from '@/services/auth.service';

type Role = UserProfile['role'];
type Notification = { type: string; data?: Record<string, unknown> };
const param = (value: unknown) => typeof value === 'string' && value.trim() ? encodeURIComponent(value.trim()) : '';

/** Resolve the notification families that do not carry an action URL. */
export function notificationTarget(notification: Notification, role: Role): string | null {
  const { type, data = {} } = notification;
  const admin = role === 'SYSTEM_ADMIN' || role === 'SYSTEM_MANAGER';
  if (type.startsWith('CAMPAIGN_')) {
    if (role === 'COLLABORATOR') return '/collaborator/collaboration?tab=messages' + (param(data.storeId) ? '&shop=' + param(data.storeId) : '');
    if (role === 'SHOP_MANAGER') return '/merchant/kol-hub?tab=messages' + (param(data.collaboratorId) ? '&kol=' + param(data.collaboratorId) : '');
    if (admin) return '/admin/affiliate-oversight';
  }
  if (type.startsWith('KYC_')) return admin ? '/admin/users' : role === 'SHOP_MANAGER' ? '/customer/upgrade/shop' : role === 'CUSTOMER' ? '/customer/upgrade' : '/collaborator/profile?tab=kyc';
  if (type === 'KOL_APPROVED') return '/collaborator/dashboard';
  if (type === 'KOL_REJECTED' || type === 'KOL_NEEDS_INFO') return '/customer/upgrade/kol';
  if (type === 'SHOP_APPROVED') return '/merchant/dashboard';
  if (type === 'SHOP_REJECTED' || type === 'SHOP_NEEDS_INFO') return '/customer/upgrade/shop';
  if (type.startsWith('SAMPLE_')) {
    if (admin) return '/admin/sample-requests';
    if (role === 'SHOP_MANAGER') return '/merchant/kol-hub?tab=samples';
    if (role === 'COLLABORATOR') return '/collaborator/collaboration?tab=samples' + (param(data.storeId) ? '&shop=' + param(data.storeId) : '');
  }
  if (type.startsWith('PAYOUT_') || type.startsWith('COMMISSION_')) {
    const payout = param(data.payoutId);
    if (admin) return '/admin/finance' + (payout ? '?payoutId=' + payout : '');
    if (role === 'COLLABORATOR') return '/collaborator/wallet' + (payout ? '?payoutId=' + payout : '');
    if (role === 'SHOP_MANAGER') return '/merchant/wallet?tab=commissions' + (payout ? '&payoutId=' + payout : '');
  }
  if (role === 'COLLABORATOR' && type.startsWith('ORDER_')) return '/customer/orders' + (param(data.orderId) ? '?orderId=' + param(data.orderId) : '');
  return null;
}

export function localNotificationAction(value: unknown): string | null {
  // A notification action is an in-app destination, never a protocol-relative URL.
  return typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\\\u0000-\u001f]/.test(value) ? value : null;
}
