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
    const prisma = { auditLog: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn() }, notification: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({id: 'notice', createdAt: new Date('2026-11-15')}) }, $queryRaw: jest.fn(), $transaction: jest.fn(), payoutRequest: { findUnique: jest.fn().mockResolvedValue(request) }, financialLedger: { findMany: jest.fn().mockResolvedValue([{ id: 'ledger', amount: d(-200000), createdAt: new Date() }]) } };
    prisma.$transaction.mockImplementation(callback => callback(prisma));
    const controller = new AdminPayoutsController(prisma as never, {} as never, {} as never, {} as never, {} as never);
    return { controller, prisma, request };
  };
  it('returns actual evidence and missing tax information without claiming tax verification', async () => {
    const { controller, prisma } = setup();
    const result = await controller.evidence('payout');
    expect(result.requestStatus).toBe('PENDING');
    expect(result.profile).toMatchObject({ idNumberMasked: '•••• 9012', taxCode: null, bankName: 'VCB' });
    expect(result.payout).toMatchObject({ amount: '200000.00', taxAmount: '20000.00', netAmount: '180000.00', hasBill: false });
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
  it('sends missing tax information to the correct KOL and records an audit without changing payout money', async () => {
    const { controller, prisma, request } = setup();
    await controller.requestInformation('payout', { id: 'operator' } as never, { codes: ['TAX_ID'] });
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'kol', type: 'PAYOUT_INFORMATION_REQUESTED', data: expect.objectContaining({ actionUrl: '/collaborator/profile?tab=kyc&section=identity&required=TAX_ID', codes: ['TAX_ID'] }) }) });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 'operator', details: expect.objectContaining({ payoutId: 'payout', codes: ['TAX_ID'] }) }) });
    expect(request.status).toBe('PENDING');
    expect(request.amount.toNumber()).toBe(200000);
  });
  it('does not resend the same items within 24 hours', async () => {
    const { controller, prisma } = setup();
    prisma.notification.findFirst.mockResolvedValue({ createdAt: new Date('2026-11-15') } as never);
    expect(await controller.requestInformation('payout', { id: 'operator' } as never, { codes: ['TAX_ID'] })).toMatchObject({ alreadySent: true });
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
  it('allows bank review and tax supplementation on a completed payout without rewriting it', async () => {
    const { controller, prisma, request } = setup();
    request.status = 'APPROVED';
    request.collaborator.collaboratorProfile.bankAccountNumber = 'other';
    await controller.requestInformation('payout', { id: 'operator' } as never, { codes: ['BENEFICIARY_MATCH'] });
    await controller.requestInformation('payout', { id: 'operator' } as never, { codes: ['TAX_ID'] });
    expect(prisma.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({ title: 'Cần kiểm tra hồ sơ chi trả', userId: 'kol' }) });
    expect(request.status).toBe('APPROVED');
  });
  it('rejects internal accounting issues, passed checks and closed payouts', async () => {
    const { controller, prisma, request } = setup();
    for (const code of ['FUNDED_PAYOUT', 'BENEFICIARY_MATCH'])
      await expect(controller.requestInformation('payout', { id: 'operator' } as never, { codes: [code] })).rejects.toThrow();
    request.status = 'REJECTED';
    await expect(controller.requestInformation('payout', { id: 'operator' } as never, { codes: ['TAX_ID'] })).rejects.toThrow();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
