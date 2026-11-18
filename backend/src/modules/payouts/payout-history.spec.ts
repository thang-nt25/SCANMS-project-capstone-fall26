import { Prisma } from '@prisma/client';
import { PayoutsService } from './payouts.service';

describe('payout history refund evidence', () => {
  it('filters before pagination and only reports refunds backed by ledger entries', async () => {
    const row = (id: string) => ({ id, status: 'REJECTED', amount: new Prisma.Decimal(200000), taxAmount: new Prisma.Decimal(20000), netAmount: new Prisma.Decimal(180000) });
    const prisma: any = {
      payoutRequest: { findMany: jest.fn().mockResolvedValue([row('refunded'), row('unconfirmed')]), count: jest.fn().mockResolvedValue(12) },
      $transaction: (calls: Promise<unknown>[]) => Promise.all(calls),
      financialLedger: { findMany: jest.fn().mockResolvedValue([
        { referenceId: 'refunded', amount: new Prisma.Decimal(120000) },
        { referenceId: 'refunded', amount: new Prisma.Decimal(80000) },
      ]) },
    };
    const service = new PayoutsService(prisma, {} as any, {} as any, {} as any);
    const result = await service.getMyWithdrawals('kol', { page: 2, limit: 10, status: 'REJECTED' });
    expect(prisma.payoutRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { collaboratorId: 'kol', status: 'REJECTED' }, skip: 10, take: 10, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }));
    expect(prisma.financialLedger.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ wallet: { collaboratorId: 'kol' }, referenceType: 'PAYOUT_REQUEST', transactionType: 'PAYOUT_REJECT_REFUND', balanceBucket: 'AVAILABLE', amount: { gt: 0 } }) }));
    expect(result.requests.map(request => request.refundedAmount)).toEqual(['200000.00', null]);
    expect(result.total).toBe(12);
  });
});
