import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Fixed FR-23 project rules, not a general-purpose legal/tax policy engine.
export const PAYOUT_TAX_THRESHOLD = '2000000.00';
export const PAYOUT_TAX_RATE = '0.10';

@Injectable()
export class PayoutTaxService {
  calculateTax(grossAmount: Prisma.Decimal) {
    if (
      !grossAmount.isFinite() ||
      grossAmount.lessThanOrEqualTo(0) ||
      grossAmount.decimalPlaces() > 2
    ) {
      throw new BadRequestException('Số tiền tính thuế không hợp lệ');
    }
    const taxAmount = grossAmount.greaterThanOrEqualTo(PAYOUT_TAX_THRESHOLD)
      ? grossAmount
          .mul(PAYOUT_TAX_RATE)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      : new Prisma.Decimal(0);
    return { grossAmount, taxAmount, netAmount: grossAmount.minus(taxAmount) };
  }
}
