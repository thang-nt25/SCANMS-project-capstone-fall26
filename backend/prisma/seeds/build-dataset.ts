import type { SeedContext, SeedDataset } from './seed.types';
import { buildIdentities } from './identity.seed';
import { buildCatalog } from './catalog.seed';
import { buildMarketing } from './marketing.seed';
import { buildOrders } from './orders.seed';
import { buildSamples } from './samples.seed';
import { buildFinance } from './finance.seed';
import { validateDataset } from './validate-dataset';

/** Pure construction allows financial and relationship invariants to run without a database. */
export function buildDataset(context: SeedContext): SeedDataset {
  const data: SeedDataset = {
    users: [],
    tiers: [],
    profiles: [],
    socialChannels: [],
    addresses: [],
    stores: [],
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
  buildMarketing(data, context);
  buildOrders(data, context);
  buildSamples(data, context);
  buildFinance(data, context);
  validateDataset(data);
  return data;
}
