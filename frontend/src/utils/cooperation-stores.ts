import type { StoreCooperation, StoreCooperationStatus } from '../hooks/useStoreCooperations';

export interface PartnerStore {
  id: string;
  conversationId?: string;
  cooperationId?: string;
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
  cooperationStatus?: StoreCooperationStatus;
  requestedByKol?: boolean;
  cooperationNote?: string | null;
  hasCooperationHistory?: boolean;
}

function cooperationPreviewText(relation: StoreCooperation): string {
  if (relation.status === 'PENDING') {
    return relation.requestedByKol
      ? 'Đang chờ Shop duyệt yêu cầu'
      : 'Lời mời hợp tác từ Shop';
  }
  if (relation.status === 'APPROVED') return 'Đã liên kết hợp tác';
  if (relation.status === 'TERMINATED') return 'Hợp tác đã chấm dứt';
  if (relation.status === 'BLOCKED') return 'Cửa hàng đã khóa hợp tác';
  return 'Hợp tác đã bị từ chối';
}

/** Invitations do not require a chat. Merge by Store ID without creating chats
 * or manufacturing unread messages just to display a cooperation request. */
export function mergeCooperationStores(contacts: PartnerStore[], relations: StoreCooperation[]): PartnerStore[] {
  const stores = new Map(contacts.map(store => [store.id, { ...store }]));
  for (const relation of relations) {
    const current = stores.get(relation.storeId);
    const preview = cooperationPreviewText(relation);
    const hasHistory = Boolean(
      current?.hasCooperationHistory ||
        (current?.messageCount ?? 0) > 0 ||
        (current?.pendingSamplesCount ?? 0) > 0 ||
        relation.hasHistory,
    );
    stores.set(relation.storeId, {
      ...current,
      id: relation.storeId,
      cooperationId: relation.id,
      name: current?.name || relation.store?.name || 'Gian hàng đối tác',
      logoUrl: current?.logoUrl || relation.store?.logoUrl || undefined,
      cooperationStatus: relation.status,
      requestedByKol: relation.requestedByKol,
      cooperationNote: relation.note ?? current?.cooperationNote,
      hasCooperationHistory: hasHistory,
      lastMessageText: current?.lastMessageText || preview,
      lastMessageAt: current?.lastMessageAt || relation.updatedAt || relation.createdAt,
    });
  }
  return [...stores.values()].sort((a, b) =>
    (Date.parse(b.lastMessageAt || '') || 0) - (Date.parse(a.lastMessageAt || '') || 0));
}
