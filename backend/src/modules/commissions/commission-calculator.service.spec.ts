import { Prisma } from '@prisma/client';
import { CommissionCalculatorService } from './commission-calculator.service';

describe('CommissionCalculatorService', () => {
  const service = new CommissionCalculatorService();

  it('uses fixed base 10 despite legacy product overrides and rounds every item', () => {
    const result = service.calculateOrderCommission(
      [
        {
          id: 'item-custom-rate',
          quantity: 3,
          unitPrice: new Prisma.Decimal('100.01'),
          customCommissionRate: new Prisma.Decimal('12.5'),
        },
        {
          id: 'item-default-rate',
          quantity: 2,
          unitPrice: new Prisma.Decimal('200'),
          customCommissionRate: null,
        },
      ],
      new Prisma.Decimal('10'),
      new Prisma.Decimal('2.5'),
    );

    expect(result.items[0].appliedCommissionRate.toString()).toBe('12.5');
    expect(result.items[0].calculatedCommissionAmount.toFixed(2)).toBe('37.50');
    expect(result.items[1].appliedCommissionRate.toString()).toBe('12.5');
    expect(result.items[1].calculatedCommissionAmount.toFixed(2)).toBe('50.00');
    expect(result.totalCommissionAmount.toFixed(2)).toBe('87.50');
  });

  it('ignores legacy 99 percent product rate and caps the tier bonus at 3', () => {
    const result = service.calculateOrderCommission(
      [
        {
          id: 'item-id',
          quantity: 1,
          unitPrice: new Prisma.Decimal('250000'),
          customCommissionRate: new Prisma.Decimal('99'),
        },
      ],
      new Prisma.Decimal('10'),
      new Prisma.Decimal('5'),
    );

    expect(result.items[0].appliedCommissionRate.toString()).toBe('13');
    expect(result.totalCommissionAmount.toFixed(2)).toBe('32500.00');
  });

  it('calculates unsnapshotted remuneration on the original item price', () => {
    const result = service.calculateOrderCommission(
      [
        {
          id: 'item',
          quantity: 1,
          unitPrice: new Prisma.Decimal(1000000),
          customCommissionRate: null,
        },
      ],
      new Prisma.Decimal(10),
      new Prisma.Decimal(0),
      new Prisma.Decimal(500000),
    );
    expect(result.totalCommissionAmount.toFixed(2)).toBe('100000.00');
  });

  it('keeps a finalized snapshot despite subsequent rate and tier changes', () => {
    const result = service.calculateOrderCommission(
      [
        {
          id: 'item',
          quantity: 1,
          unitPrice: new Prisma.Decimal(1000000),
          customCommissionRate: new Prisma.Decimal(50),
          appliedCommissionRate: new Prisma.Decimal(15),
          calculatedCommissionAmount: new Prisma.Decimal(50000),
          commissionSnapshotAt: new Date(),
        },
      ],
      new Prisma.Decimal(80),
      new Prisma.Decimal(5),
      new Prisma.Decimal(500000),
    );
    expect(result.items[0].appliedCommissionRate.toString()).toBe('15');
    expect(result.totalCommissionAmount.toFixed(2)).toBe('50000.00');
  });

  it('does not recalculate a finalized zero commission as a new non-zero rate', () => {
    const result = service.calculateOrderCommission(
      [
        {
          id: 'item',
          quantity: 1,
          unitPrice: new Prisma.Decimal(1000000),
          customCommissionRate: new Prisma.Decimal(50),
          appliedCommissionRate: new Prisma.Decimal(0),
          calculatedCommissionAmount: new Prisma.Decimal(0),
          commissionSnapshotAt: new Date(),
        },
      ],
      new Prisma.Decimal(10),
      new Prisma.Decimal(0),
    );
    expect(result.totalCommissionAmount.toString()).toBe('0');
  });
});
