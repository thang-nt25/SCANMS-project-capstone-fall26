import { Injectable } from '@nestjs/common';
import { KycStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WithdrawalPolicyService } from './withdrawal-policy.service';

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
}
