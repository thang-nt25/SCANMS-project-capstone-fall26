import { Prisma } from '@prisma/client';
import { splitCommissionEscrow } from './commission-escrow-split';

describe('Live bonus and Deal KPI escrow separation', () => {
  it.each([
    // amount, applied, tier, without-live, ordinary escrow, KPI escrow
    [180000, 18, 10, 16, 120000, 60000],
    [180000, 18, 13, 16, 150000, 30000],
    [250000, 25, 13, 24, 140000, 110000],
    [120000, 12, 10, 10, 120000, 0],
    [150000, 15, 12, null, 120000, 30000],
    [90000, 18, 10, 16, 60000, 30000],
  ])(
    'splits %s at %s%% with tier %s%% and pre-Live rate %s%%',
    (amount, applied, tier, regular, pending, conditional) => {
      const result = splitCommissionEscrow(
        new Prisma.Decimal(amount),
        new Prisma.Decimal(applied),
        new Prisma.Decimal(tier),
        regular == null ? null : new Prisma.Decimal(regular),
      );
      expect(Number(result.pending)).toBe(pending);
      expect(Number(result.conditional)).toBe(conditional);
      expect(result.pending.plus(result.conditional).equals(amount)).toBe(true);
    },
  );

  it('preserves cents and total after an earlier partial refund', () => {
    const amount = new Prisma.Decimal('12345.67');
    const result = splitCommissionEscrow(
      amount,
      new Prisma.Decimal(18),
      new Prisma.Decimal(10),
      new Prisma.Decimal(16),
    );
    expect(result.pending.plus(result.conditional).equals(amount)).toBe(true);
    expect(result.pending.decimalPlaces()).toBeLessThanOrEqual(2);
  });
});
