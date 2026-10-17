export interface SponsoredPlacementConfig {
  storeId: string;
  startsAt: string;
  endsAt: string;
  headline: string;
  paymentStatus: 'CONFIRMED';
}

// Operations publishes only booked, paid placements. Never infer sponsorship from store order.
export function activeSponsoredPlacements(raw: string | undefined, now = Date.now()): SponsoredPlacementConfig[] {
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
  const seen = new Set<string>();
  return parsed.filter((item): item is SponsoredPlacementConfig => {
    if (!item || typeof item !== 'object') return false;
    const valid = typeof item.storeId === 'string'
      && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(item.storeId)
      && item.paymentStatus === 'CONFIRMED'
      && typeof item.startsAt === 'string' && typeof item.endsAt === 'string'
      && Date.parse(item.startsAt) <= now && Date.parse(item.endsAt) > now
      && typeof item.headline === 'string' && item.headline.trim().length > 0
      && item.headline.length <= 160 && !seen.has(item.storeId);
    if (valid) seen.add(item.storeId);
    return valid;
  }).slice(0, 6);
}
