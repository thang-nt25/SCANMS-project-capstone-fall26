import type { SeedContext, SeedDataset } from './seed.types';
import { buildIdentities } from './identity.seed';
import { buildCatalog } from './catalog.seed';
import { buildMarketing } from './marketing.seed';
import { buildOrders } from './orders.seed';
import { buildSamples } from './samples.seed';
import { buildFinance } from './finance.seed';
import { validateDataset } from './validate-dataset';
import { buildChatNotifications } from './chat-notifications.seed';
import { buildSponsoredFixtures } from './marketplace.seed';

/** Pure construction allows financial and relationship invariants to run without a database. */
export function buildDataset(context: SeedContext): SeedDataset {
  const data: SeedDataset = {
    users: [],
    tiers: [],
    profiles: [],
    socialChannels: [],
    addresses: [],
    stores: [],
    sponsoredPlacements: [],
    products: [],
    variants: [],
    mediaAssets: [],
    collaborations: [],
    follows: [],
    campaigns: [],
    campaignParticipants: [],
    campaignProducts: [],
    conversations: [],
    messages: [],
    deals: [],
    referralLinks: [],
    coupons: [],
    couponProducts: [],
    redemptions: [],
    stackedRedemptions: [],
    savedCoupons: [],
    liveSessions: [],
    liveProducts: [],
    liveViewers: [],
    orders: [],
    orderItems: [],
    commissions: [],
    payments: [],
    reviews: [],
    samples: [],
    sampleEvents: [],
    sampleShippingCharges: [],
    returns: [],
    returnItems: [],
    returnEvents: [],
    wallets: [],
    storeWallets: [],
    ledgers: [],
    payouts: [],
    notifications: [],
  };
  buildIdentities(data, context);
  buildCatalog(data, context);
  buildSponsoredFixtures(data, context);
  buildMarketing(data, context);
  buildOrders(data, context);
  buildSamples(data, context);
  buildFinance(data, context);
  buildChatNotifications(data);
  validateDataset(data);
  return data;
}
