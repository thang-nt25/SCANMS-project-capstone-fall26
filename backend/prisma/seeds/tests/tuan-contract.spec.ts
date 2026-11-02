import { buildDataset } from '../build-dataset';
import { seedCommissionBreakdown } from '../commission.seed';
import { amount, commissionAmount, jsonObject, seedId } from '../seed.helpers';
import { validateDataset } from '../validate-dataset';
import type { SeedContext } from '../seed.types';

const context: SeedContext = {
  referenceDate: new Date('2026-10-18T05:00:00Z'),
  frontendUrl: 'http://localhost:5173',
  passwordHash: 'test-only',
  shipping: [],
};

describe('Tuan checkout contracts in seed v3', () => {
  it('uses best-benefit policy, product-scoped VIP and micro Live bonus', () => {
    const data = buildDataset(context);
    const order = data.orders.find(
      (row) => row.externalOrderSn === 'SEED-DH-03-1',
    )!;
    const items = data.orderItems.filter((row) => row.orderId === order.id);
    // Bronze 0, VIP +2 only on first product, campaign +1, historical Live +2.
    expect(items.map((row) => amount(row.appliedCommissionRate))).toEqual([
      14, 13,
    ]);
    expect(items.map((row) => amount(row.regularCommissionRate))).toEqual([
      12, 11,
    ]);
    expect(
      data.campaigns.every(
        (row) =>
          amount(row.bonusBudgetUsed) > 0 &&
          amount(row.bonusBudgetUsed) <= amount(row.bonusBudgetTotal),
      ),
    ).toBe(true);
    expect(
      data.orders.some(
        (row) => row.attributedCollaboratorId === seedId('creator:17'),
      ),
    ).toBe(true);
  });

  it('does not award a foreign VIP or Live bonus outside its historical window', () => {
    const data = buildDataset(context);
    const input = {
      collaboratorId: seedId('creator:2'),
      productId: seedId('product:6'),
      storeId: seedId('store:2'),
      referralLinkId: seedId('campaign-link:2'),
      liveSessionId: seedId('live:2'),
      at: new Date(data.liveSessions[2].startsAt),
    };
    expect(seedCommissionBreakdown(data, input)).toMatchObject({
      deal: 12,
      live: 2,
    });
    expect(
      seedCommissionBreakdown(data, { ...input, at: context.referenceDate }),
    ).toMatchObject({ live: 0 });
    expect(
      seedCommissionBreakdown(data, {
        ...input,
        productId: seedId('product:7'),
      }),
    ).toMatchObject({ deal: 0 });
    expect(
      seedCommissionBreakdown(data, {
        ...input,
        collaboratorId: seedId('creator:3'),
      }),
    ).toMatchObject({ deal: 0, campaign: 0, live: 0 });
  });

  it('seeds only creator coupons and calculates remuneration on original goods value, before freight', () => {
    const data = buildDataset(context);
    expect(data.coupons).toHaveLength(21);
    expect(data.stackedRedemptions).toHaveLength(0);
    expect(data.coupons.filter((row) => row.benefitType !== 'SHIPPING')).toHaveLength(20);
    expect(data.coupons.find((row) => row.codeNormalized === 'SCANMSFREESHIP')).toMatchObject({
      benefitType: 'SHIPPING', fundingSource: 'PLATFORM_FUNDED', discountValue: 100,
    });
    expect(data.savedCoupons).toHaveLength(30);
    const order = data.orders.find(
      (row) => row.externalOrderSn === 'SEED-DH-02-2',
    )!;
    const item = data.orderItems.find((row) => row.orderId === order.id)!;
    const netGoods =
      amount(order.subtotalAmount) - amount(order.couponDiscountAmount);
    expect(amount(item.calculatedCommissionAmount)).toBe(
      commissionAmount(amount(item.unitPrice) * item.quantity, amount(item.appliedCommissionRate)),
    );
    expect(amount(order.discountAmount)).toBe(amount(order.couponDiscountAmount));
    expect(amount(order.finalAmount)).toBe(
      netGoods + amount(order.shippingFee),
    );
    const flow4 = data.orders.find((row) => row.externalOrderSn === 'SEED-DH-04-2')!;
    const flow4Item = data.orderItems.find((row) => row.orderId === flow4.id)!;
    expect(flow4.attributedCollaboratorId).toBe(seedId('creator:0'));
    expect(flow4.couponCodeSnapshot).toBe('THAONHI16');
    expect(amount(flow4.subtotalAmount)).toBe(450_000);
    expect(amount(flow4.couponDiscountAmount)).toBe(22_500);
    expect(amount(flow4Item.appliedCommissionRate)).toBe(16);
    expect(amount(flow4Item.calculatedCommissionAmount)).toBe(72_000);
  });

  it('keeps synthetic freight distinct from actual zero-cost sandbox evidence', () => {
    const data = buildDataset(context);
    expect(
      data.orders.every(
        (row) =>
          amount(row.shippingFee) > 0 &&
          jsonObject(row.rawPayload).shippingFeeSource === 'SYNTHETIC_DEMO' &&
          jsonObject(row.rawPayload).ghnTotalFee === null,
      ),
    ).toBe(true);
    const evidence = buildDataset({
      ...context,
      shipping: [
        {
          orderKey: 'customer-2-order-2',
          environment: 'sandbox',
          provider: 'GHN',
          orderCode: 'SBX12345',
          fee: 0,
          status: 'transporting',
          capturedAt: context.referenceDate.toISOString(),
          evidenceFile: 'test-response.json',
        },
      ],
    });
    const zero = evidence.orders.find(
      (row) => row.externalOrderSn === 'SEED-DH-02-2',
    )!;
    expect(amount(zero.shippingFee)).toBe(0);
    expect(jsonObject(zero.rawPayload)).toMatchObject({
      ghnIsReal: true,
      ghnTotalFee: 0,
    });
    expect(
      evidence.stackedRedemptions.filter((row) => row.orderId === zero.id),
    ).toHaveLength(0);
  });

  it('maps all sample addresses and never claims unknown sample freight was paid or free', () => {
    const data = buildDataset(context);
    expect(
      data.samples.every(
        (row) => row.ghnProvinceId && row.ghnDistrictId && row.ghnWardCode,
      ),
    ).toBe(true);
    expect(data.sampleShippingCharges).toHaveLength(15);
    expect(
      data.sampleShippingCharges.every(
        (row) =>
          row.environment === 'TEST' &&
          row.amount === null &&
          row.status === 'PENDING_CONFIRMATION' &&
          row.payer === 'SHOP' &&
          row.codAmount === 0,
      ),
    ).toBe(true);
  });

  it.each([
    [
      'Live total instead of bonus',
      (data: ReturnType<typeof buildDataset>) => {
        data.liveSessions[0].commissionRate = 12;
      },
    ],
    [
      'campaign overspend',
      (data: ReturnType<typeof buildDataset>) => {
        data.campaigns[0].bonusBudgetUsed = 6_000_000;
      },
    ],
    [
      'sample freight reported as paid',
      (data: ReturnType<typeof buildDataset>) => {
        data.sampleShippingCharges[0].amount = 0;
      },
    ],
    [
      'cross-Shop creator coupon',
      (data: ReturnType<typeof buildDataset>) => {
        data.redemptions[0].couponId = seedId('kol-coupon:1');
      },
    ],
  ])('rejects %s before database writes', (_name, mutate) => {
    const data = buildDataset(context);
    mutate(data);
    expect(() => validateDataset(data)).toThrow();
  });
});
