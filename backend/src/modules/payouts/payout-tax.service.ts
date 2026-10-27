import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Fixed FR-23 project rules, not a general-purpose legal/tax policy engine.
// Keep the summary contract compatible: zero means every positive withdrawal.
export const PAYOUT_TAX_THRESHOLD = '0.00';
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
    const taxAmount = grossAmount
      .mul(PAYOUT_TAX_RATE)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return { grossAmount, taxAmount, netAmount: grossAmount.minus(taxAmount) };
  }
}
