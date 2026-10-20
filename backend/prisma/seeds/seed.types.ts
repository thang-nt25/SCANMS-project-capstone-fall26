import type { Prisma } from '@prisma/client';

/** Rows are deliberately typed against the real schema, not ad-hoc DTOs. */
export interface SeedDataset {
  users: Prisma.UserCreateManyInput[];
  tiers: Prisma.CollaboratorTierCreateManyInput[];
  profiles: Prisma.CollaboratorProfileCreateManyInput[];
  socialChannels: Prisma.CollaboratorSocialChannelCreateManyInput[];
  addresses: Prisma.CustomerAddressCreateManyInput[];
  stores: Prisma.StoreCreateManyInput[];
  sponsoredPlacements: Prisma.SponsoredPlacementCreateManyInput[];
  products: Prisma.ProductCreateManyInput[];
  variants: Prisma.ProductVariantCreateManyInput[];
  mediaAssets: Prisma.MediaAssetCreateManyInput[];
  collaborations: Prisma.StoreCollaboratorCreateManyInput[];
  follows: Prisma.StoreFollowCreateManyInput[];
  campaigns: Prisma.CampaignCreateManyInput[];
  campaignParticipants: Prisma.CampaignParticipantCreateManyInput[];
  campaignProducts: Prisma.CampaignProductCreateManyInput[];
  conversations: Prisma.ConversationCreateManyInput[];
  messages: Prisma.ChatMessageCreateManyInput[];
  deals: Prisma.ExclusiveDealProposalCreateManyInput[];
  referralLinks: Prisma.ReferralLinkCreateManyInput[];
  coupons: Prisma.CouponCreateManyInput[];
  couponProducts: Prisma.CouponProductCreateManyInput[];
  redemptions: Prisma.CouponRedemptionCreateManyInput[];
  stackedRedemptions: Prisma.StackedVoucherRedemptionCreateManyInput[];
  savedCoupons: Prisma.CustomerSavedCouponCreateManyInput[];
  liveSessions: Prisma.LiveShoppingSessionCreateManyInput[];
  liveProducts: Prisma.LiveSessionProductCreateManyInput[];
  liveViewers: Prisma.LiveSessionViewerCreateManyInput[];
  orders: Prisma.OrderCreateManyInput[];
  orderItems: Prisma.OrderItemCreateManyInput[];
  commissions: Prisma.CommissionCreateManyInput[];
  payments: Prisma.PaymentTransactionCreateManyInput[];
  reviews: Prisma.ProductReviewCreateManyInput[];
  samples: Prisma.SampleProductRequestCreateManyInput[];
  sampleEvents: Prisma.SampleRequestEventCreateManyInput[];
  sampleShippingCharges: Prisma.SampleShippingChargeCreateManyInput[];
  returns: Prisma.ReturnRequestCreateManyInput[];
  returnItems: Prisma.ReturnItemCreateManyInput[];
  returnEvents: Prisma.ReturnEventCreateManyInput[];
  wallets: Prisma.WalletCreateManyInput[];
  storeWallets: Prisma.StoreWalletCreateManyInput[];
  ledgers: Prisma.FinancialLedgerCreateManyInput[];
  payouts: Prisma.PayoutRequestCreateManyInput[];
  notifications: Prisma.NotificationCreateManyInput[];
}

export type SeedTable = keyof SeedDataset;

export interface SeedContext {
  referenceDate: Date;
  frontendUrl: string;
  passwordHash: string;
  shipping: ShippingFixture[];
}

/** Optional evidence exported from an actual GHN sandbox run. Never call GHN live from a seed. */
export interface ShippingFixture {
  orderKey: string;
  environment: 'sandbox';
  provider: 'GHN';
  orderCode: string;
  fee: number;
  status: 'transporting' | 'delivered';
  capturedAt: string;
  evidenceFile: string;
}
