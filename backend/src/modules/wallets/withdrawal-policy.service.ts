import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

const DEFAULT_MIN_PAYOUT_AMOUNT = '200000.00';

@Injectable()
export class WithdrawalPolicyService {
  readonly minimumAmount: Prisma.Decimal;

  constructor(configService: ConfigService) {
    const configuredAmount = String(
      configService.get<string>('MIN_PAYOUT_AMOUNT') ??
        DEFAULT_MIN_PAYOUT_AMOUNT,
    );
    if (!/^\d{1,13}(\.\d{1,2})?$/.test(configuredAmount)) {
      throw new Error('MIN_PAYOUT_AMOUNT must be a valid monetary amount');
    }
    this.minimumAmount = new Prisma.Decimal(configuredAmount);
    if (this.minimumAmount.lessThanOrEqualTo(0)) {
      throw new Error('MIN_PAYOUT_AMOUNT must be greater than zero');
    }
  }
}
