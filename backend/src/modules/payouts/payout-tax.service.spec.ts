import { Prisma } from '@prisma/client';
import { PayoutTaxService } from './payout-tax.service';

describe('PayoutTaxService FR-23 assignment policy', () => {
  const service = new PayoutTaxService();
  it.each([
    ['200000', '0.00', '200000.00'],
    ['1999999.99', '0.00', '1999999.99'],
    ['2000000', '200000.00', '1800000.00'],
    ['2000000.05', '200000.01', '1800000.04'],
    ['5000000', '500000.00', '4500000.00'],
    ['9999999999999.99', '1000000000000.00', '8999999999999.99'],
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
  it.each(['0', '-1', 'NaN', 'Infinity', '0.001'])(
    'rejects invalid gross %s',
    (amount) => {
      expect(() => service.calculateTax(new Prisma.Decimal(amount))).toThrow(
        'không hợp lệ',
      );
    },
  );
});
