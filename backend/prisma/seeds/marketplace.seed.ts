import type { SponsoredPlacementConfig } from '../../src/modules/stores/sponsored-placement.config';
import { ADMIN_ID, assertSeed, daysFrom, seedId } from './seed.helpers';
import type { SeedContext, SeedDataset } from './seed.types';

/** Free test grants backed by database rows, never fabricated payment confirmations. */
export function buildSponsoredFixtures(data: SeedDataset, context: SeedContext): void {
  for (const index of [0, 1]) {
    data.sponsoredPlacements.push({
      id: seedId(`sponsored-placement:${index}`),
      requestKey: seedId(`sponsored-request:${index}`),
      storeId: seedId(`store:${index}`),
      requestedById: seedId(`shop-owner:${index}`),
      reviewedById: ADMIN_ID,
      headline: `[TEST] Gian hàng tài trợ ${data.stores[index].name}`,
      startsAt: daysFrom(context, -1),
      endsAt: daysFrom(context, 14),
      status: 'APPROVED',
      fundingType: 'PLATFORM_GRANT',
      amount: 0,
      reviewNote: 'Gói sàn cấp miễn phí để nghiệm thu Capstone; không có giao dịch thanh toán quảng cáo thật.',
      reviewedAt: context.referenceDate,
      createdAt: context.referenceDate,
    });
  }
}

/** Configuration fixture, NOT a database row or proof of an actual paid booking. */
export function buildMarketplaceDemoPlan(
  data: SeedDataset,
  context: SeedContext,
) {
  const placements: SponsoredPlacementConfig[] = [0, 1].map((index) => {
    const store = data.stores.find(
      (row) => row.id === seedId(`store:${index}`),
    );
    assertSeed(
      store?.isActive &&
        store.isVerified &&
        store.onboardingStatus === 'VERIFIED',
      'demo sponsored store must be an active verified seed shop',
    );
    return {
      storeId: store.id!,
      startsAt: daysFrom(context, -1).toISOString(),
      endsAt: daysFrom(context, 14).toISOString(),
      headline: `[DEMO] Khám phá bộ sưu tập ${store.name}`.slice(0, 160),
      paymentStatus: 'CONFIRMED',
    };
  });
  return {
    source: 'SYNTHETIC_CAPSTONE',
    warning:
      'DEMO ONLY. CONFIRMED is a test fixture, not evidence of real payment. Never publish as a real paid booking.',
    environmentVariable: 'MARKETPLACE_SPONSORED_PLACEMENTS',
    autoApplied: false,
    placements,
  } as const;
}
