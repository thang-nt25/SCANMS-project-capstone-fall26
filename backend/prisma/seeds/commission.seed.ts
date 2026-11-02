import {
  precedenceCommissionRate,
  campaignBonusRate,
  liveBonusRate,
  tierBonusByName,
} from '../../src/modules/commissions/commission-policy';
import { exclusiveDealBonus } from '../../src/modules/orders/exclusive-deal-bonus';
import { amount } from './seed.helpers';
import type { SeedDataset } from './seed.types';

/** Historical snapshots use the SAME policy functions as checkout, at purchase time. */
export function seedCommissionBreakdown(
  data: SeedDataset,
  input: {
    collaboratorId: string;
    productId: string;
    storeId: string;
    referralLinkId: string;
    liveSessionId?: string;
    at: Date;
  },
) {
  const profile = data.profiles.find(
    (row) => row.userId === input.collaboratorId,
  );
  const tier = data.tiers.find((row) => row.id === profile?.tierId);
  const deal = data.deals.find(
    (row) =>
      row.status === 'APPROVED' &&
      row.storeId === input.storeId &&
      row.collaboratorId === input.collaboratorId &&
      row.productId === input.productId &&
      row.reviewedAt &&
      new Date(row.reviewedAt) <= input.at,
  );
  const link = data.referralLinks.find(
    (row) =>
      row.id === input.referralLinkId &&
      row.storeId === input.storeId &&
      row.collaboratorId === input.collaboratorId,
  );
  const campaign = data.campaigns.find((row) => row.id === link?.campaignId);
  const participating = data.campaignParticipants.some(
    (row) =>
      row.campaignId === campaign?.id &&
      row.collaboratorId === input.collaboratorId &&
      row.status === 'ACCEPTED' &&
      row.joinedAt &&
      new Date(row.joinedAt) <= input.at,
  );
  const session = data.liveSessions.find(
    (row) =>
      row.id === input.liveSessionId &&
      row.storeId === input.storeId &&
      row.creatorId === input.collaboratorId &&
      (row.status === 'LIVE' || row.status === 'ENDED') &&
      row.inviteStatus === 'ACCEPTED' &&
      data.liveProducts.some(
        (product) =>
          product.sessionId === row.id && product.productId === input.productId,
      ),
  );
  const tierBonus = tierBonusByName(tier?.name);
  const dealBonus = exclusiveDealBonus(
    deal
      ? {
          ...deal,
          approvedCommissionRate: deal.approvedCommissionRate,
        }
      : undefined,
    input.productId,
    input.collaboratorId,
    input.storeId,
  );
  const dealRate = dealBonus ? 10 + dealBonus : 0;
  const campaignBonus =
    participating && campaign
      ? campaignBonusRate(
          {
            ...campaign,
            isActive: campaign.isActive ?? true,
            bonusCommissionRate: campaign.bonusCommissionRate,
            bonusBudgetTotal: campaign.bonusBudgetTotal,
            startDate: new Date(campaign.startDate),
            endDate: new Date(campaign.endDate),
          },
          input.storeId,
          input.at,
        )
      : 0;
  // ENDED is the current state. Reconstruct LIVE only inside its historical time window.
  const liveBonus = session
    ? liveBonusRate(
        {
          ...session,
          status: 'LIVE',
          startsAt: new Date(session.startsAt),
          endsAt: new Date(session.endsAt),
          commissionRate: amount(session.commissionRate),
        },
        input.at,
      )
    : 0;
  const campaignRate = campaignBonus ? 10 + campaignBonus : 0;
  const campaignWins = campaignRate > Math.max(dealRate, 10 + tierBonus);
  return {
    base: 10,
    tier: tierBonus,
    deal: dealRate,
    campaign: campaignWins ? campaignBonus : 0,
    live: liveBonus,
    rate: precedenceCommissionRate(
      tierBonus,
      dealRate,
      campaignRate,
      liveBonus,
    ),
    campaignId: campaignWins ? campaign!.id! : null,
  };
}
