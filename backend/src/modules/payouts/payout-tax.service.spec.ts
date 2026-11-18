import { Prisma } from '@prisma/client';
import { PayoutTaxService } from './payout-tax.service';

describe('PayoutTaxService fixed 10% withdrawal policy', () => {
  const service = new PayoutTaxService();
  it.each([
    ['200000', '20000.00', '180000.00'],
    ['1000000', '100000.00', '900000.00'],
    ['1999999.99', '200000.00', '1799999.99'],
    ['2000000.10', '200000.01', '1800000.09'],
    ['15000000', '1500000.00', '13500000.00'],
    ['35000000', '3500000.00', '31500000.00'],
    ['100000000', '10000000.00', '90000000.00'],
  ])('calculates gross %s, tax %s and net %s exactly', (gross, tax, net) => {
    const calculation = service.calculateTax(new Prisma.Decimal(gross));
    expect(calculation.taxAmount.toFixed(2)).toBe(tax);
    expect(calculation.netAmount.toFixed(2)).toBe(net);
    expect(
      calculation.taxAmount
        .plus(calculation.netAmount)
        .equals(calculation.grossAmount),
    ).toBe(true);
  });
  it.each([
    ['0', '40000.00'], ['10000000', '40000.00'], ['10000001', '40000.00'],
    ['30000000', '40000.00'], ['60000000', '40000.00'], ['100000000', '40000.00'],
    ['110000000', '40000.00'], ['9800000', '40000.00'], ['99900000', '40000.00'],
  ])('taxes a 400k withdrawal after monthly gross %s as %s', (before, expected) => {
    expect(service.calculateTax(new Prisma.Decimal(400000), new Prisma.Decimal(before)).taxAmount.toFixed(2)).toBe(expected);
  });
  it('preserves old flat-rate snapshots and validates monthly snapshots with their own base', () => {
    expect(service.calculateSnapshot(new Prisma.Decimal(400000)).taxAmount.toFixed(2)).toBe('40000.00');
    expect(service.calculateSnapshot(new Prisma.Decimal(400000), { policy: 'FLAT_10_PERCENT_V1' }).taxAmount.toFixed(2)).toBe('40000.00');
    expect(service.calculateSnapshot(new Prisma.Decimal(400000), { policy: 'MONTHLY_PROGRESSIVE_V1', monthlyGrossBefore: '110000000' }).taxAmount.toFixed(2)).toBe('140000.00');
  });
  it.each(['0', '-1', 'NaN', 'Infinity', '0.001'])(
    'rejects invalid gross %s',
    (amount) => {
      expect(() => service.calculateTax(new Prisma.Decimal(amount))).toThrow(
        'không hợp lệ',
      );
    },
  );
});
