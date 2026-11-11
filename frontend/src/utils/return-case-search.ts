import type { ReturnDetail } from '../services/return.service';

const normalize = (value: unknown): string => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[đĐ]/g, 'd')
  .toLowerCase()
  .trim();

/** Search only the cases already loaded in the Manager queues. */
export function searchReturnCases(cases: ReturnDetail[], query: string): ReturnDetail[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const unique = new Map<string, ReturnDetail>();
  for (const item of cases) unique.set(item.id, item);

  return [...unique.values()].filter((item) => {
    const searchable = normalize([
      item.id,
      item.order.externalOrderSn,
      item.order.storeName,
      item.order.customerName,
      item.order.customerPhone,
      item.order.outboundGhnTrackingNumber,
      item.customerShipment?.trackingNumber,
      item.exchangeShipment?.trackingNumber,
      item.ghnClaim?.ghnReference,
      item.status,
    ].join(' '));
    return tokens.every((token) => searchable.includes(token));
  }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}
