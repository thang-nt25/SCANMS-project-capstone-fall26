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
  return Number.isFinite(rate) && rate >= 1 && rate <= 4 &&
    Number.isFinite(budget) && budget > 0 && Number.isFinite(used) && used >= 0 && used < budget ? rate : 0;
}

export function liveBonusRate(session: {
  status: string; startsAt: Date; endsAt: Date; commissionRate: unknown;
} | null | undefined, now = new Date()): number {
  if (!session || session.status !== 'LIVE' || session.startsAt > now || session.endsAt <= now) return 0;
  const rate = Number(session.commissionRate);
  return rate === 2 || rate === 3 ? rate : 0;
}

/**
 * Best-Benefit Precedence Rule (Chuẩn mới SCANMS Enterprise):
 * Rate = min(25%, max(Deal VIP, Campaign, TierRate, Base 10%) + Live Bonus)
 */
export function precedenceCommissionRate(
  tierBonus: number = 0,
  dealRate: number = 0,
  campaignRate: number = 0,
  liveBonus: number = 0,
  baseRate: number = BASE_COMMISSION_RATE,
): number {
  const effectiveTierRate = baseRate + tierBonus;
  const bestRate = Math.max(dealRate, campaignRate, effectiveTierRate, baseRate);
  return Math.min(MAX_COMMISSION_RATE, bestRate + liveBonus);
}

export function splitCommissionFunding(tierBonus: number, dealRate: number, campaignRate: number, liveBonus: number): {
  totalRate: number;
  shopRate: number;
  platformRate: number;
} {
  const totalRate = precedenceCommissionRate(tierBonus, dealRate, campaignRate, liveBonus);
  const tierWins = BASE_COMMISSION_RATE + tierBonus >= Math.max(dealRate, campaignRate);
  const platformRate = tierWins ? Math.min(tierBonus, totalRate - BASE_COMMISSION_RATE) : 0;
  const shopRate = totalRate - platformRate;
  return { totalRate, shopRate, platformRate };
}

