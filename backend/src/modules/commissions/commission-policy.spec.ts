import 'reflect-metadata';
import { validateSync } from 'class-validator';
import { CreateExclusiveDealDto } from '../affiliate-deals/dto/create-exclusive-deal.dto';
import { precedenceCommissionRate, campaignBonusRate, splitCommissionFunding, tierBonusByName } from './commission-policy';

describe('Best-benefit remuneration contract', () => {
  const now = new Date('2026-10-16T12:00:00Z');
  const campaign = { storeId: 'shop', isActive: true, startDate: new Date(now.getTime() - 1000),
    endDate: new Date(now.getTime() + 1000), bonusCommissionRate: 2, bonusBudgetTotal: 100000, bonusBudgetUsed: 1000 };

  const combinations: number[][] = [];
  for (const tier of [0, 1, 2, 3]) for (const deal of [0, 12, 16])
    for (const sale of [0, 11, 14]) combinations.push([tier, deal, sale]);
  it.each(combinations)('takes max of tier %s, deal %s, campaign %s', (tier, deal, sale) => {
    expect(precedenceCommissionRate(tier, deal, sale)).toBe(Math.max(10 + tier, deal, sale, 10));
  });
  it('caps at 25% and takes a 16% VIP rate without tier or campaign stacking', () => {
    expect(precedenceCommissionRate(3, 16, 12)).toBe(16);
    expect(precedenceCommissionRate(3, 30, 20)).toBe(25);
  });
  it('correctly splits funding between shop and platform (tier funded by platform)', () => {
    // Basic KOL (tier 0): Shop pays 10%, platform 0%
    expect(splitCommissionFunding(0, 0, 0)).toEqual({ totalRate: 10, shopRate: 10, platformRate: 0 });
    // Diamond KOL (tier 3) with basic product: Shop pays 10%, platform pays 3%
    expect(splitCommissionFunding(3, 0, 0)).toEqual({ totalRate: 13, shopRate: 10, platformRate: 3 });
    // A VIP rate overrides the tier: the shop funds the agreed rate.
    expect(splitCommissionFunding(3, 16, 12)).toEqual({ totalRate: 16, shopRate: 16, platformRate: 0 });
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
  it('stops paying campaign bonus at budget exhaustion and rejects rates beyond 16% total', () => {
    expect(campaignBonusRate({ ...campaign, bonusBudgetUsed: 100000 }, 'shop', now)).toBe(0);
    expect(campaignBonusRate({ ...campaign, bonusCommissionRate: 4 }, 'shop', now)).toBe(4);
    expect(campaignBonusRate({ ...campaign, bonusCommissionRate: 7 }, 'shop', now)).toBe(0);
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

