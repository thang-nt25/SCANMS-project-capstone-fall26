import { Injectable } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WithdrawalPolicyService } from './withdrawal-policy.service';
import {
  PAYOUT_TAX_RATE,
  PAYOUT_TAX_THRESHOLD,
} from '../payouts/payout-tax.service';
import { QueryLedgerDto } from './dto/query-ledger.dto';

@Injectable()
export class WalletSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: WithdrawalPolicyService,
  ) {}

  async getMyWallet(collaboratorId: string) {
    const [wallet, profile] = await Promise.all([
      this.prisma.wallet.findUnique({ where: { collaboratorId } }),
      this.prisma.collaboratorProfile.findUnique({
        where: { userId: collaboratorId },
        select: {
          kycStatus: true,
          bankName: true,
          bankAccountNumber: true,
          bankAccountName: true,
        },
      }),
    ]);

    const hasBankAccount = Boolean(
      profile?.bankName.trim() &&
      profile.bankAccountNumber.trim() &&
      profile.bankAccountName.trim(),
    );

    return {
      pendingBalance: wallet?.pendingBalance.toFixed(2) ?? '0.00',
      availableBalance: wallet?.availableBalance.toFixed(2) ?? '0.00',
      minimumWithdrawalAmount: this.policy.minimumAmount.toFixed(2),
      withdrawalTaxPolicy: {
        threshold: PAYOUT_TAX_THRESHOLD,
        rate: PAYOUT_TAX_RATE,
      },
      kycStatus: profile?.kycStatus ?? KycStatus.UNVERIFIED,
      canWithdraw:
        profile?.kycStatus === KycStatus.VERIFIED &&
        hasBankAccount &&
        Boolean(
          wallet?.availableBalance.greaterThanOrEqualTo(
            this.policy.minimumAmount,
          ),
        ),
      bankAccount:
        hasBankAccount && profile
          ? {
              bankName: profile.bankName,
              maskedAccountNumber: `••••${profile.bankAccountNumber.slice(-4)}`,
              accountName: profile.bankAccountName,
            }
          : null,
    };
  }

  async getMyLedger(collaboratorId: string, query: QueryLedgerDto) {
    const where = { wallet: { collaboratorId } };
    const [entries, total] = await this.prisma.$transaction([
      this.prisma.financialLedger.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.financialLedger.count({ where }),
    ]);
    return {
      entries: entries.map((entry) => ({
        ...entry,
        amount: entry.amount.toFixed(2),
        balanceBefore: entry.balanceBefore.toFixed(2),
        balanceAfter: entry.balanceAfter.toFixed(2),
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
