import { Prisma } from '@prisma/client';
import { PayoutTaxService } from './payout-tax.service';
import { walletBalanceConsistency } from '../wallets/wallet-balance-consistency';

type Money = Prisma.Decimal;
type Balance = { availableBalance: Money; pendingBalance: Money };
export type PayoutRiskInput = {
  amount: Money;
  taxAmount: Money;
  netAmount: Money;
  status: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  fundedAmount: Money | null;
  collaborator: {
    role: string;
    isActive: boolean;
    isDeleted: boolean;
    collaboratorProfile: {
      kycStatus: string;
      taxCode: string | null;
      bankName: string;
      bankAccountNumber: string;
      bankAccountName: string;
    } | null;
    wallet: (Balance & { earningsReviewRequired: boolean; storeWallets: Balance[] }) | null;
  };
};

export function evaluatePayoutRisk(request: PayoutRiskInput) {
  const profile = request.collaborator.collaboratorProfile;
  const wallet = request.collaborator.wallet;
  const normalize = (value: string | null | undefined) => value?.trim().toUpperCase();
  const bankMatches = ['bankName', 'bankAccountNumber', 'bankAccountName'].every(key => {
    const field = key as 'bankName' | 'bankAccountNumber' | 'bankAccountName';
    return Boolean(normalize(request[field])) && normalize(request[field]) === normalize(profile?.[field]);
  });
  let taxMatches = request.amount.gt(0) && request.taxAmount.gte(0) && request.netAmount.gt(0) && request.taxAmount.plus(request.netAmount).eq(request.amount);
  if (taxMatches && request.status === 'PENDING') {
    const expected = new PayoutTaxService().calculateTax(request.amount);
    taxMatches = expected.taxAmount.eq(request.taxAmount) && expected.netAmount.eq(request.netAmount);
  }
  const checks = [
    { code: 'ACTIVE_COLLABORATOR', label: 'Tài khoản KOL hoạt động', passed: request.collaborator.role === 'COLLABORATOR' && request.collaborator.isActive && !request.collaborator.isDeleted, blocking: true },
    { code: 'VERIFIED_KYC', label: 'KYC đã xác minh', passed: profile?.kycStatus === 'VERIFIED', blocking: true },
    { code: 'BENEFICIARY_MATCH', label: 'Ngân hàng khớp hồ sơ KYC', passed: bankMatches, blocking: true },
    { code: 'WALLET_CONSISTENCY', label: 'Ví không có khoản chờ đối soát', passed: Boolean(wallet && !wallet.earningsReviewRequired && !wallet.availableBalance.isNegative() && !wallet.pendingBalance.isNegative() && !walletBalanceConsistency(wallet, wallet.storeWallets).requiresReview), blocking: true },
    { code: 'FUNDED_PAYOUT', label: 'Có đủ bút toán giữ tiền', passed: Boolean(request.fundedAmount?.eq(request.amount.negated())), blocking: true },
    { code: 'TAX_SNAPSHOT', label: 'Số tiền và thuế hợp lệ', passed: taxMatches, blocking: true },
    { code: 'TAX_ID', label: 'Mã số thuế cho khoản khấu trừ', passed: request.taxAmount.isZero() || Boolean(profile?.taxCode?.trim()), blocking: false },
  ];
  return {
    status: checks.some(check => !check.passed && check.blocking) ? 'BLOCKED' as const : checks.some(check => !check.passed) ? 'REVIEW' as const : 'CLEAR' as const,
    passedChecks: checks.filter(check => check.passed).length,
    totalChecks: checks.length,
    checks,
    disclaimer: 'Kết quả kiểm tra điều kiện tại thời điểm tải, không phải xác suất an toàn hay bảo đảm không có gian lận.',
  };
}
