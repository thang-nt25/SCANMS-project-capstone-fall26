import type { ChatCard } from '@/types/campaigns.types';

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
