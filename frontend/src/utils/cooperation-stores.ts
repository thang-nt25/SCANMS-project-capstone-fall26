import type { StoreCooperation } from '../hooks/useStoreCooperations';

export interface PartnerStore {
  id: string;
  conversationId?: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  ownerAvatarUrl?: string;
  ownerName?: string;
  category?: string;
  defaultCommissionRate?: number;
  rating?: number;
  location?: string;
  totalProducts?: number;
  unreadCount?: number;
  messageCount?: number;
  pendingSamplesCount?: number;
  lastMessageText?: string;
  lastMessageAt?: string;
  cooperationStatus?: StoreCooperation['status'];
  requestedByKol?: boolean;
}

/** Invitations do not require a chat. Merge by Store ID without creating chats
 * or manufacturing unread messages just to display a cooperation request. */
export function mergeCooperationStores(contacts: PartnerStore[], relations: StoreCooperation[]): PartnerStore[] {
  const stores = new Map(contacts.map(store => [store.id, { ...store }]));
  for (const relation of relations) {
    const current = stores.get(relation.storeId);
    const preview = relation.status === 'PENDING'
      ? relation.requestedByKol ? 'Đang chờ Shop duyệt yêu cầu' : 'Lời mời hợp tác từ Shop'
      : relation.status === 'APPROVED' ? 'Đã liên kết hợp tác' : 'Hợp tác đã bị từ chối';
    stores.set(relation.storeId, {
      ...current,
      id: relation.storeId,
      name: current?.name || relation.store?.name || 'Gian hàng đối tác',
      logoUrl: current?.logoUrl || relation.store?.logoUrl || undefined,
      cooperationStatus: relation.status,
      requestedByKol: relation.requestedByKol,
      lastMessageText: current?.lastMessageText || preview,
      lastMessageAt: current?.lastMessageAt || relation.updatedAt || relation.createdAt,
    });
  }
  return [...stores.values()].sort((a, b) =>
    (Date.parse(b.lastMessageAt || '') || 0) - (Date.parse(a.lastMessageAt || '') || 0));
}
