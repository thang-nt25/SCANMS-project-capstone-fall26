import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// SCANMS project policy: fixed withholding on each new withdrawal.
// This is a product rule, not a declaration of an individual's statutory tax regime.
export const PAYOUT_TAX_THRESHOLD = '0.00';
export const PAYOUT_TAX_RATE = '0.10';
export const PAYOUT_TAX_POLICY = 'FLAT_10_PERCENT_V1';
export const PAYOUT_TAX_BRACKETS = [{ ceiling: null, rate: PAYOUT_TAX_RATE }] as const;
const LEGACY_MONTHLY_BRACKETS = [
  { ceiling: '10000000', rate: '0.05' },
  { ceiling: '30000000', rate: '0.10' },
  { ceiling: '60000000', rate: '0.20' },
  { ceiling: '100000000', rate: '0.30' },
  { ceiling: null, rate: '0.35' },
] as const;

export function payoutTaxMonth(now = new Date()) {
  const local = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = local.getUTCFullYear(), month = local.getUTCMonth();
  return {
    month: `${year}-${String(month + 1).padStart(2, '0')}`,
    start: new Date(Date.UTC(year, month, 1, -7)),
    end: new Date(Date.UTC(year, month + 1, 1, -7)),
  };
}

@Injectable()
export class PayoutTaxService {
  calculateTax(grossAmount: Prisma.Decimal, monthlyGross = new Prisma.Decimal(0)) {
    if (!grossAmount.isFinite() || grossAmount.lte(0) || grossAmount.decimalPlaces() > 2 || !monthlyGross.isFinite() || monthlyGross.lt(0) || monthlyGross.decimalPlaces() > 2)
      throw new BadRequestException('Số tiền tính thuế không hợp lệ');
    const taxAmount = grossAmount.mul(PAYOUT_TAX_RATE).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return { grossAmount, taxAmount, netAmount: grossAmount.minus(taxAmount), segments: [{ amount: grossAmount.toFixed(2), rate: PAYOUT_TAX_RATE }] };
  }
  private calculateLegacyMonthlyTax(grossAmount: Prisma.Decimal, monthlyGross = new Prisma.Decimal(0)) {
    if (
      !grossAmount.isFinite() ||
      grossAmount.lessThanOrEqualTo(0) ||
      grossAmount.decimalPlaces() > 2 || !monthlyGross.isFinite() || monthlyGross.lt(0) || monthlyGross.decimalPlaces() > 2
    ) {
      throw new BadRequestException('Số tiền tính thuế không hợp lệ');
    }
    let position = monthlyGross, remaining = grossAmount, rawTax = new Prisma.Decimal(0);
    const segments: { amount: string; rate: string }[] = [];
    for (const bracket of LEGACY_MONTHLY_BRACKETS) {
      const room = bracket.ceiling === null ? remaining : Prisma.Decimal.max(new Prisma.Decimal(bracket.ceiling).minus(position), 0);
      const portion = Prisma.Decimal.min(remaining, room);
      if (portion.gt(0)) {
        rawTax = rawTax.plus(portion.mul(bracket.rate));
        segments.push({ amount: portion.toFixed(2), rate: bracket.rate });
        position = position.plus(portion); remaining = remaining.minus(portion);
      }
      if (remaining.isZero()) break;
    }
    const taxAmount = rawTax.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return { grossAmount, taxAmount, netAmount: grossAmount.minus(taxAmount), segments };
  }

  calculateSnapshot(gross: Prisma.Decimal, context?: Prisma.JsonValue | null) {
    if (context == null) {
      const taxAmount = gross.mul('0.10').toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      return { taxAmount, netAmount: gross.minus(taxAmount) };
    }
    if (typeof context === 'object' && !Array.isArray(context) && context.policy === PAYOUT_TAX_POLICY) return this.calculateTax(gross);
    if (typeof context !== 'object' || Array.isArray(context) || context.policy !== 'MONTHLY_PROGRESSIVE_V1' || typeof context.monthlyGrossBefore !== 'string')
      throw new BadRequestException('Snapshot chính sách thuế không hợp lệ');
    return this.calculateLegacyMonthlyTax(gross, new Prisma.Decimal(context.monthlyGrossBefore));
  }
}
