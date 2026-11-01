export type PartnerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';

/** Tier is an authoritative profile value, not a rank guessed from revenue. */
export function normalizePartnerTier(tier: unknown): PartnerTier | undefined {
  const name = typeof tier === 'string' ? tier : tier && typeof tier === 'object' && 'name' in tier ? String(tier.name ?? '') : '';
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'D').toUpperCase();
  if (normalized.includes('DIAMOND') || normalized.includes('KIM CUONG')) return 'DIAMOND';
  if (normalized.includes('GOLD') || normalized.includes('VANG')) return 'GOLD';
  if (normalized.includes('SILVER') || normalized.includes('BAC')) return 'SILVER';
  if (normalized.includes('BRONZE') || normalized.includes('DONG')) return 'BRONZE';
  return undefined;
}

export function tierRemuneration(tier: unknown) {
  const normalized = normalizePartnerTier(tier);
  if (!normalized) return undefined;
  return { BRONZE: 10, SILVER: 11, GOLD: 12, DIAMOND: 13 }[normalized];
}
