import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildDataset } from '../build-dataset';
import { validateDataset } from '../validate-dataset';
import { amount, DAY_MS, demoEan13, seedId } from '../seed.helpers';
import type { SeedContext } from '../seed.types';
import { inventoryBaseline } from '../inventory.seed';

const context: SeedContext = {
  referenceDate: new Date('2026-10-16T05:00:00Z'),
  frontendUrl: 'http://localhost:5173',
  passwordHash: 'test-only',
  shipping: [],
};

describe('Capstone dataset business integrity', () => {
  it('builds the complete linked dataset deterministically', () => {
    const data = buildDataset(context);
    expect(buildDataset(context)).toEqual(data);
    expect(data.stores).toHaveLength(15);
    expect(data.profiles).toHaveLength(20);
    expect(data.users.filter((row) => row.role === 'CUSTOMER')).toHaveLength(
      30,
    );
    expect(data.products).toHaveLength(30);
    expect(data.variants).toHaveLength(120);
    expect(data.orders).toHaveLength(60);
    expect(data.reviews).toHaveLength(66);
    expect(data.samples).toHaveLength(20);
    expect(data.payouts).toHaveLength(2);
    expect(
      data.payouts.every(
        (row) =>
          amount(row.amount) === 2_000_000 &&
          amount(row.taxAmount) === 200_000 &&
          amount(row.netAmount) === 1_800_000,
      ),
    ).toBe(true);
    expect(new Set(data.orders.map((row) => row.status))).toEqual(
      new Set([
        'COMPLETED',
        'PENDING',
        'SHIPPING',
        'DELIVERED',
        'RETURN_REQUESTED',
      ]),
    );
  });

  it('provides an inventory opening balance that accounts for every sold/reserved and sample unit', () => {
    const data = buildDataset(context);
    const baseline = inventoryBaseline(data);
    expect(baseline).toHaveLength(120);
    for (const entry of baseline)
      expect(
        entry.openingStock - entry.soldOrReserved - entry.grantedSamples,
      ).toBe(entry.closingStock);
    expect(baseline.reduce((sum, row) => sum + row.grantedSamples, 0)).toBe(15);
    expect(baseline.reduce((sum, row) => sum + row.soldOrReserved, 0)).toBe(
      data.orderItems.reduce((sum, item) => sum + item.quantity, 0),
    );
  });

  it('uses valid restricted-circulation EAN-13 checksums and UUID v5 identifiers', () => {
    for (let index = 0; index < 30; index++) {
      const barcode = demoEan13(index);
      expect(barcode).toMatch(/^200\d{10}$/);
      expect(
        [...barcode].reduce(
          (sum, digit, offset) =>
            sum + Number(digit) * (offset % 2 === 0 ? 1 : 3),
          0,
        ) % 10,
      ).toBe(0);
    }
    expect(seedId('customer:0')).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-5[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    );
  });

  it('references only checked-in local assets for catalogue, avatars, evidence and video', () => {
    const data = buildDataset(context);
    const urls = [
      ...data.users.map((row) => row.avatarUrl),
      ...data.stores.map((row) => row.logoUrl),
      ...data.products.map((row) => row.imageUrl),
      ...data.mediaAssets.map((row) => row.urlOrContent),
      ...data.payouts.map((row) => row.proofImageUrl),
    ].filter((url): url is string => Boolean(url));
    for (const url of urls)
      expect(
        existsSync(
          resolve(
            __dirname,
            '../../../../frontend/public',
            new URL(url).pathname.slice(1),
          ),
        ),
      ).toBe(true);
  });

  it('rejects early release of escrow funds and reviews of uncompleted orders', () => {
    const data = buildDataset(context);
    data.orders[0].completedAt = new Date(
      new Date(data.orders[0].deliveredAt!).getTime() + 13 * DAY_MS,
    );
    expect(() => validateDataset(data)).toThrow('escrow released');
    const other = buildDataset(context);
    other.orders[0].status = 'SHIPPING';
    expect(() => validateDataset(other)).toThrow(
      'review requires a completed order',
    );
  });

  it('rejects stale variants and cross-shop order items', () => {
    const data = buildDataset(context);
    data.orderItems[0].variantId = data.variants[8].id;
    expect(() => validateDataset(data)).toThrow(
      'cross-shop order item or stale variant',
    );
  });

  it('rejects forged wallet balances and broken ledger chains', () => {
    const data = buildDataset(context);
    data.wallets[0].availableBalance = 10_000;
    expect(() => validateDataset(data)).toThrow(
      'wallet balance does not reconcile',
    );
    const other = buildDataset(context);
    other.ledgers[0].balanceAfter = 1;
    expect(() => validateDataset(other)).toThrow('broken wallet ledger chain');
  });

  it('rejects sample deadlines before receipt and voucher double-stacking', () => {
    const data = buildDataset(context);
    data.samples[0].deadlineAt = new Date();
    expect(() => validateDataset(data)).toThrow(
      'sample deadline/video before receipt',
    );
    const other = buildDataset(context);
    other.coupons[0].stackableWithShopVoucher = true;
    expect(() => validateDataset(other)).toThrow(
      'two shop merchandise vouchers cannot stack',
    );
  });

  it('rejects payout tax snapshots that do not match the existing tax service', () => {
    const data = buildDataset(context);
    data.payouts[0].taxAmount = 0;
    expect(() => validateDataset(data)).toThrow('payout tax/net mismatch');
  });

  it('includes supplied sandbox shipping fees in both the order payment and wallet debit', () => {
    const data = buildDataset({
      ...context,
      shipping: [
        {
          orderKey: 'customer-2-order-2',
          environment: 'sandbox',
          provider: 'GHN',
          orderCode: 'SBX12345',
          fee: 25000,
          status: 'transporting',
          capturedAt: '2026-10-16T05:00:00Z',
          evidenceFile: 'verified-response.json',
        },
      ],
    });
    const order = data.orders.find(
      (row) => row.externalOrderSn === 'SEED-DH-02-2',
    )!;
    expect(amount(order.shippingFee)).toBe(25000);
    expect(
      amount(data.payments.find((row) => row.orderId === order.id)!.amount),
    ).toBe(amount(order.finalAmount));
    expect(
      amount(
        data.ledgers.find(
          (row) =>
            row.referenceType === 'ORDER_PAYMENT' &&
            row.referenceId === order.id,
        )!.amount,
      ),
    ).toBe(-amount(order.finalAmount));
  });

  it('rejects a sandbox delivery snapshot attached to an unpaid order', () => {
    expect(() =>
      buildDataset({
        ...context,
        shipping: [
          {
            orderKey: 'customer-1-order-2',
            environment: 'sandbox',
            provider: 'GHN',
            orderCode: 'SBX12345',
            fee: 25000,
            status: 'delivered',
            capturedAt: '2026-10-16T05:00:00Z',
            evidenceFile: 'response.json',
          },
        ],
      }),
    ).toThrow('sandbox shipment status does not match');
  });
});
