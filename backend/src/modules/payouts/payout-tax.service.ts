import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Flow 5 blueprint policy. Existing payout snapshots are never recalculated.
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
    const taxAmount = grossAmount.lessThan(PAYOUT_TAX_THRESHOLD)
      ? new Prisma.Decimal(0)
      : grossAmount
          .mul(PAYOUT_TAX_RATE)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
    return { grossAmount, taxAmount, netAmount: grossAmount.minus(taxAmount) };
  }
}
