import type { ChatCard } from '@/types/campaigns.types';

export interface CouponProposalCard {
  type: 'COUPON_PROPOSAL' | 'COUPON_PROPOSAL_APPROVED';
  code: string;
  couponId?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  discountPercent?: number;
  desiredDiscount?: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  validityDays?: number;
  expiresAt?: string;
  scopeType?: string;
  note?: string;
  storeName?: string;
  status?: string;
}

export function parseCouponProposalCard(text: string): CouponProposalCard | null {
  const card = parseChatContent(text);
  if (card?.type !== 'COUPON_PROPOSAL' && card?.type !== 'COUPON_PROPOSAL_APPROVED') return null;
  const stringValue = (value: unknown) => typeof value === 'string' ? value.trim() : undefined;
  const numberValue = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  return {
    type: card.type,
    code: stringValue(card.code) ?? '',
    couponId: stringValue(card.couponId),
    discountType: card.discountType === 'FIXED_AMOUNT' || card.discountType === 'PERCENTAGE'
      ? card.discountType : undefined,
    discountValue: numberValue(card.discountValue),
    discountPercent: numberValue(card.discountPercent),
    desiredDiscount: numberValue(card.desiredDiscount),
    minimumOrderAmount: numberValue(card.minimumOrderAmount),
    maximumDiscountAmount: numberValue(card.maximumDiscountAmount),
    validityDays: numberValue(card.validityDays),
    expiresAt: stringValue(card.expiresAt),
    scopeType: stringValue(card.scopeType),
    note: stringValue(card.note),
    storeName: stringValue(card.storeName),
    status: stringValue(card.status),
  };
}

/** Resolve shared files and links without allowing executable URLs or credentials. */
export function chatContentUrl(value?: string, baseUrl?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const source = value.trim();
  if (!/^https?:\/\//i.test(source) && !/^\/(?!\/)/.test(source)) return undefined;
  try {
    const url = new URL(source, baseUrl);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href : undefined;
  } catch { return undefined; }
}

export function parseChatContent(text: string): Record<string, unknown> | null {
  try {
    const card = JSON.parse(text);
    return card && typeof card === 'object' && !Array.isArray(card) && typeof card.type === 'string'
      ? card : null;
  } catch { return null; }
}

export function parseCampaignCard(text: string): ChatCard | null {
  const card = parseChatContent(text);
  if (!card || !['CAMPAIGN_INVITE', 'CAMPAIGN_ACCEPTED', 'CAMPAIGN_REJECTED'].includes(card.type as string)) return null;
  return card as unknown as ChatCard;
}

export function chatContentText(text: string): string {
  const proposal = parseCouponProposalCard(text);
  if (proposal) {
    const approved = proposal.type === 'COUPON_PROPOSAL_APPROVED' || proposal.status === 'APPROVED';
    return [proposal.code ? `Đề xuất mã riêng: ${proposal.code}` : 'Đề xuất mã riêng', proposal.storeName, proposal.note,
      approved ? 'Đã duyệt' : proposal.status === 'REJECTED' ? 'Đã từ chối' : 'Chờ duyệt']
      .filter(Boolean).join('\n');
  }
  const card = parseChatContent(text);
  if (!card) return text;
  const fields = ['productTitle', 'campaignName', 'storeName', 'couponCode', 'personalMessage', 'message', 'salesCommitment', 'shopResponse'];
  const parts = fields.flatMap(key => typeof card[key] === 'string' && card[key] ? [card[key] as string] : []);
  const rate = card.approvedCommissionRate ?? card.proposedCommissionRate ?? card.bonusCommissionRate;
  if (typeof rate === 'number') parts.push(`Hoa hồng: ${rate}%`);
  const statuses: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', ACCEPTED: 'Đã chấp nhận' };
  const status = typeof card.status === 'string' ? statuses[card.status] : undefined;
  if (status) parts.push(status);
  // Unrecognized JSON remains readable rather than becoming a meaningless generic label.
  return parts.length ? parts.join('\n') : text;
}
