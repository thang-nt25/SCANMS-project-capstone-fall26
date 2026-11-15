import { Prisma } from '@prisma/client';
import { AdminPayoutsController } from './admin-payouts.controller';

describe('payout evidence', () => {
  const d = (value: number) => new Prisma.Decimal(value);
  const setup = () => {
    const request = {
      id: 'payout', collaboratorId: 'kol', status: 'PENDING', storeId: null,
      amount: d(200000), taxAmount: d(20000), netAmount: d(180000),
      bankName: 'VCB', bankAccountNumber: '123456', bankAccountName: 'KOL', taxContext: null,
      collaborator: { fullName: 'KOL', role: 'COLLABORATOR', isActive: true, isDeleted: false,
        collaboratorProfile: { kycStatus: 'VERIFIED', idCardNumber: '123456789012', taxCode: '', bankName: 'VCB', bankAccountNumber: '123456', bankAccountName: 'KOL', updatedAt: new Date('2026-11-13'), socialLinksJson: { frontCardUrl: 'https://example.test/front.png', backCardUrl: 'javascript:alert(1)', privateNote: 'hidden' } },
        wallet: { availableBalance: d(0), pendingBalance: d(0), earningsReviewRequired: false, storeWallets: [] },
      },
    };
    const prisma = { payoutRequest: { findUnique: jest.fn().mockResolvedValue(request) }, financialLedger: { findMany: jest.fn().mockResolvedValue([{ id: 'ledger', amount: d(-200000), createdAt: new Date() }]) } };
    const controller = new AdminPayoutsController(prisma as never, {} as never, {} as never, {} as never, {} as never);
    return { controller, prisma, request };
  };
  it('returns actual evidence and missing tax information without claiming tax verification', async () => {
    const { controller, prisma } = setup();
    const result = await controller.evidence('payout');
    expect(result.requestStatus).toBe('PENDING');
    const tax = result.checks.find(check => check.code === 'TAX_ID')!;
    expect(tax.passed).toBe(false);
    expect(tax.missing).toContain('mã số thuế');
    expect(tax.detail.join(' ')).toContain('chưa xác minh');
    const kyc = result.checks.find(check => check.code === 'VERIFIED_KYC')!;
    expect(kyc.documents[0].url).toBe('https://example.test/front.png');
    expect(kyc.documents[1].url).toBeNull();
    expect(JSON.stringify(result)).not.toContain('123456789012');
    expect(JSON.stringify(result)).not.toContain('privateNote');
    expect(prisma.financialLedger.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ referenceId: 'payout', wallet: { collaboratorId: 'kol' } }) }));
  });
  it('reports missing profile and missing documents safely', async () => {
    const { controller, request } = setup();
    request.collaborator.collaboratorProfile = null as never;
    const result = await controller.evidence('payout');
    expect(result.checks.find(check => check.code === 'VERIFIED_KYC')).toMatchObject({ passed: false, documents: [{ url: null }, { url: null }] });
  });
});
