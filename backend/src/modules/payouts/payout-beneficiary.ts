import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { walletBalanceConsistency } from '../wallets/wallet-balance-consistency';

/** Check again at approval; a beneficiary may have changed since reservation. */
export async function assertPayoutBeneficiary(
  tx: Prisma.TransactionClient,
  payout: {
    collaboratorId: string;
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
  },
) {
  const user = await tx.user.findUnique({
    where: { id: payout.collaboratorId },
    include: { collaboratorProfile: true, wallet: { include: { storeWallets: true } } },
  });
  const profile = user?.collaboratorProfile;
  const normalize = (value: string | null | undefined) =>
    value?.trim().toUpperCase();
  if (
    !user?.isActive ||
    user.isDeleted ||
    user.role !== 'COLLABORATOR' ||
    profile?.kycStatus !== 'VERIFIED' ||
    !payout.bankName?.trim() ||
    !payout.bankAccountNumber?.trim() ||
    !payout.bankAccountName?.trim() ||
    normalize(profile.bankName) !== normalize(payout.bankName) ||
    normalize(profile.bankAccountNumber) !==
      normalize(payout.bankAccountNumber) ||
    normalize(profile.bankAccountName) !== normalize(payout.bankAccountName)
  ) {
    throw new BadRequestException(
      'Tài khoản nhận tiền cần được eKYC lại hoặc không khớp hồ sơ đã xác minh',
    );
  }
  if (
    user.wallet?.availableBalance.lt(0) ||
    user.wallet?.earningsReviewRequired ||
    (user.wallet && walletBalanceConsistency(user.wallet, user.wallet.storeWallets ?? []).requiresReview)
  ) {
    throw new BadRequestException(
      'Thu nhập đang có khoản thu hồi; cần đối soát trước khi giải ngân',
    );
  }
}
