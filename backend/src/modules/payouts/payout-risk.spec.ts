import { Prisma } from '@prisma/client';
import { evaluatePayoutRisk, type PayoutRiskInput } from './payout-risk';

const decimal = (value: number) => new Prisma.Decimal(value);
function fixture(): PayoutRiskInput {
  return {
    amount: decimal(2064800), taxAmount: decimal(206480), netAmount: decimal(1858320), status: 'PENDING',
    bankName: 'MB', bankAccountNumber: '123', bankAccountName: 'CREATOR', fundedAmount: decimal(-2064800),
    collaborator: { role: 'COLLABORATOR', isActive: true, isDeleted: false,
      collaboratorProfile: { kycStatus: 'VERIFIED', taxCode: 'TEST-TAX', bankName: 'MB', bankAccountNumber: '123', bankAccountName: 'CREATOR' },
      wallet: { availableBalance: decimal(0), pendingBalance: decimal(0), earningsReviewRequired: false, storeWallets: [] },
    },
  };
}

describe('payout evidence checks, not a fraud probability', () => {
  it('lists the underlying checks without claiming 100% safety', () => {
    expect(evaluatePayoutRisk(fixture())).toMatchObject({ status: 'CLEAR', passedChecks: 7, totalChecks: 7 });
    expect(evaluatePayoutRisk(fixture()).disclaimer).toContain('không phải xác suất');
  });
  it.each(['isActive', 'isDeleted', 'role', 'kyc', 'bank', 'funding', 'wallet', 'allocation', 'tax'])(
    'blocks invalid %s evidence', kind => {
      const request = fixture();
      if (kind === 'isActive') request.collaborator.isActive = false;
      if (kind === 'isDeleted') request.collaborator.isDeleted = true;
      if (kind === 'role') request.collaborator.role = 'CUSTOMER';
      if (kind === 'kyc') request.collaborator.collaboratorProfile!.kycStatus = 'PENDING';
      if (kind === 'bank') request.bankAccountNumber = '999';
      if (kind === 'funding') request.fundedAmount = decimal(-1);
      if (kind === 'wallet') request.collaborator.wallet!.earningsReviewRequired = true;
      if (kind === 'allocation') request.collaborator.wallet!.storeWallets = [{ availableBalance: decimal(1), pendingBalance: decimal(0) }];
      if (kind === 'tax') { request.amount = decimal(1500000); request.taxAmount = decimal(150000); request.netAmount = decimal(1350000); }
      expect(evaluatePayoutRisk(request).status).toBe('BLOCKED');
    },
  );
  it('flags missing tax ID for review instead of fabricating an identifier', () => {
    const request = fixture();
    request.collaborator.collaboratorProfile!.taxCode = null;
    expect(evaluatePayoutRisk(request)).toMatchObject({ status: 'REVIEW', passedChecks: 6 });
  });
  it('does not require a tax ID for a withdrawal below the tax threshold', () => {
    const request = fixture();
    request.amount = decimal(1500000); request.taxAmount = decimal(0); request.netAmount = decimal(1500000); request.fundedAmount = decimal(-1500000);
    request.collaborator.collaboratorProfile!.taxCode = null;
    expect(evaluatePayoutRisk(request).status).toBe('CLEAR');
  });
  it('does not retroactively reprice a processing or paid tax snapshot', () => {
    const request = fixture();
    request.amount = decimal(1500000); request.taxAmount = decimal(150000); request.netAmount = decimal(1350000); request.fundedAmount = decimal(-1500000);
    for (const status of ['PROCESSING', 'APPROVED']) { request.status = status; expect(evaluatePayoutRisk(request).status).toBe('CLEAR'); }
  });
});
