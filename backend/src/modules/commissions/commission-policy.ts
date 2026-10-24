export const BASE_COMMISSION_RATE = 10;
export const MAX_COMMISSION_RATE = 25;

export function tierBonusByName(name = ''): number {
  const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/diamond|kim cuong/.test(key)) return 3;
  if (/gold|vang/.test(key)) return 2;
  if (/silver|bac/.test(key)) return 1;
  return 0;
}

export function campaignBonusRate(campaign: {
  storeId: string; isActive: boolean; startDate: Date; endDate: Date;
  bonusCommissionRate: unknown; bonusBudgetTotal: unknown; bonusBudgetUsed?: unknown;
} | null | undefined, storeId: string, now = new Date()): number {
  if (!campaign || campaign.storeId !== storeId || !campaign.isActive ||
      campaign.startDate > now || campaign.endDate <= now) return 0;
  const rate = Number(campaign.bonusCommissionRate);
  const budget = Number(campaign.bonusBudgetTotal);
  const used = Number(campaign.bonusBudgetUsed || 0);
  return Number.isFinite(rate) && rate >= 1 && rate <= 2 &&
    Number.isFinite(budget) && budget > 0 && Number.isFinite(used) && used >= 0 && used < budget ? rate : 0;
}

export function liveBonusRate(session: {
  status: string; startsAt: Date; endsAt: Date; commissionRate: unknown;
} | null | undefined, now = new Date()): number {
  if (!session || session.status !== 'LIVE' || session.startsAt > now || session.endsAt <= now) return 0;
  const rate = Number(session.commissionRate);
  return rate === 2 || rate === 3 ? rate : 0;
}

export function additiveCommissionRate(tier: number, deal: number, campaign: number, live: number): number {
  const shopNegotiated = Math.max(deal, campaign);
  return Math.min(MAX_COMMISSION_RATE, BASE_COMMISSION_RATE + tier + shopNegotiated + live);
}

export function splitCommissionFunding(tier: number, deal: number, campaign: number, live: number): {
  totalRate: number;
  shopRate: number;
  platformRate: number;
} {
  const shopNegotiated = Math.max(deal, campaign);
  const rawShopRate = BASE_COMMISSION_RATE + shopNegotiated + live;
  const rawPlatformRate = tier;
  const totalRate = Math.min(MAX_COMMISSION_RATE, rawShopRate + rawPlatformRate);
  const shopRate = Math.min(rawShopRate, totalRate);
  const platformRate = totalRate - shopRate;
  return { totalRate, shopRate, platformRate };
}

