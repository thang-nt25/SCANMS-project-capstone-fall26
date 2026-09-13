import { Prisma } from '@prisma/client';
import { CommissionCalculatorService } from './commission-calculator.service';

describe('CommissionCalculatorService', () => {
  const service = new CommissionCalculatorService();

  it('calculates and rounds commission for every order item', () => {
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

    expect(result.items[0].appliedCommissionRate.toString()).toBe('15');
    expect(result.items[0].calculatedCommissionAmount.toFixed(2)).toBe('45.00');
    expect(result.items[1].appliedCommissionRate.toString()).toBe('12.5');
    expect(result.items[1].calculatedCommissionAmount.toFixed(2)).toBe('50.00');
    expect(result.totalCommissionAmount.toFixed(2)).toBe('95.00');
  });

  it('caps the final commission rate at 100 percent', () => {
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

    expect(result.items[0].appliedCommissionRate.toString()).toBe('100');
    expect(result.totalCommissionAmount.toFixed(2)).toBe('250000.00');
  });

  it('allocates order discount before calculating unsnapshotted commission', () => {
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
    expect(result.totalCommissionAmount.toFixed(2)).toBe('50000.00');
  });

  it('keeps a finalized snapshot despite subsequent rate and tier changes', () => {
    const result = service.calculateOrderCommission(
      [
        {
          id: 'item',
          quantity: 1,
          unitPrice: new Prisma.Decimal(1000000),
          customCommissionRate: new Prisma.Decimal(50),
          appliedCommissionRate: new Prisma.Decimal(10),
          calculatedCommissionAmount: new Prisma.Decimal(50000),
          commissionSnapshotAt: new Date(),
        },
      ],
      new Prisma.Decimal(80),
      new Prisma.Decimal(5),
      new Prisma.Decimal(500000),
    );
    expect(result.items[0].appliedCommissionRate.toString()).toBe('10');
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
