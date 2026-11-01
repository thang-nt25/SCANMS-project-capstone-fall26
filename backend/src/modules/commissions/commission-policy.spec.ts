import 'reflect-metadata';
import { validateSync } from 'class-validator';
import { CreateExclusiveDealDto } from '../affiliate-deals/dto/create-exclusive-deal.dto';
import { additiveCommissionRate, campaignBonusRate, liveBonusRate, splitCommissionFunding, tierBonusByName } from './commission-policy';

describe('Word additive commission contract', () => {
  const now = new Date('2026-10-16T12:00:00Z');
  const campaign = { storeId: 'shop', isActive: true, startDate: new Date(now.getTime() - 1000),
    endDate: new Date(now.getTime() + 1000), bonusCommissionRate: 2, bonusBudgetTotal: 100000, bonusBudgetUsed: 1000 };
  const live = { status: 'LIVE', startsAt: campaign.startDate, endsAt: campaign.endDate, commissionRate: 3 };

  const combinations: number[][] = [];
  for (const tier of [0, 1, 2, 3]) for (const deal of [0, 1, 2, 3])
    for (const sale of [0, 1, 2]) for (const flash of [0, 2, 3]) combinations.push([tier, deal, sale, flash]);
  it.each(combinations)('adds tier %s, max(deal %s, campaign %s), live %s correctly', (tier, deal, sale, flash) => {
    expect(additiveCommissionRate(tier, deal, sale, flash)).toBe(10 + tier + Math.max(deal, sale) + flash);
  });
  it('caps the aggregate defensively at 25%, with valid all-in maximum of 19% (10 + 3 + max(3,2) + 3)', () => {
    expect(additiveCommissionRate(3, 3, 2, 3)).toBe(19);
    expect(additiveCommissionRate(30, 30, 20, 30)).toBe(25);
  });
  it('correctly splits funding between shop and platform (tier funded by platform)', () => {
    // Basic KOL (tier 0): Shop pays 10%, platform 0%
    expect(splitCommissionFunding(0, 0, 0, 0)).toEqual({ totalRate: 10, shopRate: 10, platformRate: 0 });
    // Diamond KOL (tier 3) with basic product: Shop pays 10%, platform pays 3%
    expect(splitCommissionFunding(3, 0, 0, 0)).toEqual({ totalRate: 13, shopRate: 10, platformRate: 3 });
    // Diamond KOL with 2% deal and 3% live: Shop pays 10 + 2 + 3 = 15%, platform pays 3% -> Total 18%
    expect(splitCommissionFunding(3, 2, 1, 3)).toEqual({ totalRate: 18, shopRate: 15, platformRate: 3 });
  });
  it.each([['Đồng (Bronze)', 0], ['Bạc (Silver)', 1], ['Vàng (Gold)', 2], ['Kim Cương (Diamond)', 3],
    ['Vàng', 2], ['Kim Cương', 3]] as const)('maps %s to the canonical bonus %s', (name, rate) => {
    expect(tierBonusByName(name)).toBe(rate);
  });
  it('applies the active campaign only in its own shop and within its budget', () => {
    expect(campaignBonusRate(campaign, 'shop', now)).toBe(2);
    expect(campaignBonusRate(campaign, 'other', now)).toBe(0);
    expect(campaignBonusRate({ ...campaign, isActive: false }, 'shop', now)).toBe(0);
    expect(campaignBonusRate({ ...campaign, startDate: new Date(now.getTime() + 1) }, 'shop', now)).toBe(0);
    expect(campaignBonusRate({ ...campaign, endDate: now }, 'shop', now)).toBe(0);
    expect(campaignBonusRate({ ...campaign, startDate: now }, 'shop', now)).toBe(2);
  });
  it.each([null, 0, -1, NaN])('rejects missing or invalid budget %s', budget => {
    expect(campaignBonusRate({ ...campaign, bonusBudgetTotal: budget }, 'shop', now)).toBe(0);
  });
  it('stops paying campaign bonus at budget exhaustion and rejects legacy 5%', () => {
    expect(campaignBonusRate({ ...campaign, bonusBudgetUsed: 100000 }, 'shop', now)).toBe(0);
    expect(campaignBonusRate({ ...campaign, bonusCommissionRate: 5 }, 'shop', now)).toBe(0);
  });
  it.each(['SCHEDULED', 'PAUSED', 'ENDED', 'CANCELLED', 'PENDING_CREATOR'])('never pays a Live bonus in %s', status => {
    expect(liveBonusRate({ ...live, status }, now)).toBe(0);
  });
  it('pays only valid micro bonuses inside the LIVE interval', () => {
    expect(liveBonusRate(live, now)).toBe(3);
    expect(liveBonusRate({ ...live, commissionRate: 2 }, now)).toBe(2);
    expect(liveBonusRate({ ...live, commissionRate: 13 }, now)).toBe(0);
    expect(liveBonusRate({ ...live, startsAt: new Date(now.getTime() + 1) }, now)).toBe(0);
    expect(liveBonusRate({ ...live, endsAt: now }, now)).toBe(0);
  });
  it.each([11, 12, 13])('requires explicit video review commitment for Deal total %s', proposedCommissionRate => {
    const dto = Object.assign(new CreateExclusiveDealDto(), {
      productId: '11111111-1111-4111-8111-111111111111', proposedCommissionRate,
      salesCommitment: 'Thực hiện video review', videoReviewCommitment: true,
      targetRevenue: 10000000, commitmentDays: 30,
    });
    expect(validateSync(dto)).toHaveLength(0);
    dto.videoReviewCommitment = false;
    expect(validateSync(dto).map(error => error.property)).toContain('videoReviewCommitment');
  });
});

