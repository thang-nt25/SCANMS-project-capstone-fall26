import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { activeDealMap, dealScope } from '../deal-scope.policy';
import {
  eligibleRevenue,
  evaluateRevenueKpi,
  validateRevenueKpi,
} from '../deal-kpi.policy';
import { assertFloor } from '../../pricing/pricing-policy';
import { cosineSimilarity } from '../../products/product-semantic-matcher.service';
import { precedenceCommissionRate } from '../../commissions/commission-policy';

describe('Enterprise contract and price policies', () => {
  it('canonicalizes a selected scope independently of product selection order', () => {
    expect(dealScope('a', 'SELECTED_PRODUCTS', ['b', 'a'])).toEqual(
      dealScope('a', 'SELECTED_PRODUCTS', ['a', 'b']),
    );
    expect(() => dealScope('a', 'SELECTED_PRODUCTS', ['b', 'c'])).toThrow(
      BadRequestException,
    );
    expect(() => dealScope('a', 'SINGLE_PRODUCT', ['a', 'b'])).toThrow(
      BadRequestException,
    );
    expect(dealScope('a', 'STORE_WIDE').scopeKey).toBe('STORE_WIDE');
  });
  it('requires revenue and an explicit finite commitment window', () => {
    for (const value of [NaN, Infinity, 0, -1, 1e13])
      expect(() => validateRevenueKpi(value, 30)).toThrow();
    expect(() => validateRevenueKpi(1e7, 0)).toThrow();
    expect(validateRevenueKpi(1e7, 30).targetRevenue).toBe(1e7);
  });
  it('uses net-goods snapshots and item attribution, excluding another creator and shipping', () => {
    const deal = {
      productId: 'a',
      storeId: 's',
      collaboratorId: 'k',
      status: 'APPROVED',
      scopeType: 'STORE_WIDE',
    };
    const order = {
      attributedCollaboratorId: 'k',
      shippingFee: 1e6,
      rawPayload: {
        goodsPricing: [{ productId: 'a', variantId: null, netGoods: 80 }],
      },
      orderItems: [
        { productId: 'a', quantity: 1, unitPrice: 100 },
        {
          productId: 'b',
          quantity: 2,
          unitPrice: 100,
          referralLinkId: 'other',
          referralLink: { collaboratorId: 'different' },
        },
      ],
    };
    expect(eligibleRevenue(order, deal)).toBe(80);
    expect(
      eligibleRevenue(
        { ...order, rawPayload: {}, couponDiscountAmount: 30 },
        { ...deal, scopeType: 'SINGLE_PRODUCT' },
      ),
    ).toBe(90);
  });
  it('does not sanction before settlement and evaluates revenue rather than number of orders', () => {
    const now = new Date('2026-11-01T00:00:00Z');
    const deal = {
      productId: 'p',
      storeId: 's',
      collaboratorId: 'k',
      status: 'APPROVED',
      targetRevenue: new Prisma.Decimal(1000),
      commitmentStartedAt: new Date('2026-09-01'),
      commitmentEndsAt: new Date('2026-10-01'),
      settlementEndsAt: new Date('2026-10-15'),
    };
    expect(evaluateRevenueKpi(deal, 999, 2000, 100, 2, now).canTerminate).toBe(
      true,
    );
    expect(evaluateRevenueKpi(deal, 1000, 0, 1, 0, now).state).toBe('ACHIEVED');
    expect(
      evaluateRevenueKpi(deal, 0, 1000, 0, 2, new Date('2026-10-10')).state,
    ).toBe('SETTLING');
    const waiting = evaluateRevenueKpi({ ...deal, status: 'PENDING_ADMIN_APPROVAL', commitmentStartedAt: null, commitmentEndsAt: null, settlementEndsAt: null }, 0, 0);
    expect(waiting.state).toBe('PENDING_ADMIN_APPROVAL');
    expect(waiting.targetRevenue).toBe(1000);
    expect(waiting.canTerminate).toBe(false);
  });
  it('resolves overlapping scopes at the best rate and does not apply a different store contract', async () => {
    const db: any = {
      exclusiveDealProposal: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'whole',
            collaboratorId: 'k',
            storeId: 's',
            scopeType: 'STORE_WIDE',
            approvedCommissionRate: 15,
            scopeProducts: [],
          },
          {
            id: 'selected',
            collaboratorId: 'k',
            storeId: 's',
            scopeType: 'SELECTED_PRODUCTS',
            approvedCommissionRate: 18,
            scopeProducts: [{ productId: 'a' }],
          },
        ]),
      },
    };
    const resolved = await activeDealMap(db, [
      { collaboratorId: 'k', storeId: 's', productId: 'a' },
      { collaboratorId: 'k', storeId: 's', productId: 'future' },
      { collaboratorId: 'k', storeId: 'other', productId: 'b' },
    ]);
    expect(resolved.get('k:a').id).toBe('selected');
    expect(resolved.get('k:future').id).toBe('whole');
    expect(resolved.has('k:b')).toBe(false);
  });
  it('enforces decimal MAP boundaries after coupon reductions', () => {
    expect(() => assertFloor('99.99', '100')).toThrow();
    expect(() => assertFloor('100', '100')).not.toThrow();
    expect(() => assertFloor('0', null)).not.toThrow(); // Legacy unset MAP only.
  });
  it('uses true cosine scores and rejects invalid embeddings', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
    expect(() => cosineSimilarity([0, 0], [1, 1])).toThrow();
    expect(() => cosineSimilarity([NaN], [1])).toThrow();
  });
  it('chooses the best absolute rate, adds Live once and caps new orders at 25%', () => {
    expect(precedenceCommissionRate(3, 16, 12, 2)).toBe(18);
    expect(precedenceCommissionRate(3, 0, 0, 2)).toBe(15);
    expect(precedenceCommissionRate(3, 25, 14, 3)).toBe(25);
  });
});
