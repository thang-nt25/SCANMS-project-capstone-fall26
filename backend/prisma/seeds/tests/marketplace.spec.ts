import { activeSponsoredPlacements } from '../../../src/modules/stores/sponsored-placement.config';
import { buildDataset } from '../build-dataset';
import { buildMarketplaceDemoPlan } from '../marketplace.seed';
import { jsonObject, seedId } from '../seed.helpers';
import { validateDataset } from '../validate-dataset';
import type { SeedContext } from '../seed.types';

const context: SeedContext = {
  referenceDate: new Date('2026-10-17T10:00:00Z'),
  frontendUrl: 'http://localhost:5173',
  passwordHash: 'test-only',
  shipping: [],
};

describe('Quy marketplace seed contract', () => {
  it('builds two explicitly selected demo placements accepted by the real config parser without applying environment changes', () => {
    const previous = process.env.MARKETPLACE_SPONSORED_PLACEMENTS;
    const data = buildDataset(context);
    const plan = buildMarketplaceDemoPlan(data, context);
    const active = activeSponsoredPlacements(
      JSON.stringify(plan.placements),
      context.referenceDate.getTime(),
    );
    expect(active.map((row) => row.storeId)).toEqual([
      seedId('store:0'),
      seedId('store:1'),
    ]);
    expect(active.every((row) => row.headline.startsWith('[DEMO]'))).toBe(true);
    expect(plan.autoApplied).toBe(false);
    expect(plan.warning).toContain('not evidence of real payment');
    expect(process.env.MARKETPLACE_SPONSORED_PLACEMENTS).toBe(previous);
  });

  it('does not publish expired demo placements or an unverified seed shop', () => {
    const data = buildDataset(context);
    const plan = buildMarketplaceDemoPlan(data, context);
    expect(
      activeSponsoredPlacements(
        JSON.stringify(plan.placements),
        Date.parse(plan.placements[0].endsAt),
      ),
    ).toEqual([]);
    data.stores[0].isVerified = false;
    expect(() => buildMarketplaceDemoPlan(data, context)).toThrow(
      'active verified seed shop',
    );
  });

  it('pins a member product for all five live sessions without faking current viewers', () => {
    const data = buildDataset(context);
    for (const session of data.liveSessions) {
      const pinned = jsonObject(session.governance).pinnedProductId;
      expect(
        data.liveProducts.some(
          (row) => row.sessionId === session.id && row.productId === pinned,
        ),
      ).toBe(true);
      if (session.status === 'LIVE')
        expect(
          data.liveViewers.some((row) => row.sessionId === session.id),
        ).toBe(false);
    }
  });

  it('rejects cross-session pins and fake attendance in active rooms', () => {
    const data = buildDataset(context);
    data.liveSessions[0].governance = {
      ...jsonObject(data.liveSessions[0].governance),
      pinnedProductId: data.products[3].id,
    };
    expect(() => validateDataset(data)).toThrow(
      'live pin must belong to its session',
    );
    const other = buildDataset(context);
    other.liveViewers.push({
      sessionId: other.liveSessions[0].id!,
      clientId: 'fabricated-live-viewer',
    });
    expect(() => validateDataset(other)).toThrow(
      'must not fabricate current viewers',
    );
  });
});
