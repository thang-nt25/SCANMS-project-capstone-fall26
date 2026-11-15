import { Prisma } from '@prisma/client';
import { AdminPayoutsController } from './admin-payouts.controller';
jest.mock('./payout-monthly-tax', () => ({ payoutMonthlySummaries: jest.fn().mockResolvedValue(new Map()) }));
jest.mock('./payout-risk', () => ({ evaluatePayoutRisk: jest.fn().mockReturnValue({}) }));
describe('admin rejected payout refund evidence', () => {
  it('requires positive available refund entries scoped to each request owner', async () => {
    const request = (id: string, owner: string) => ({ id, status: 'REJECTED', collaboratorId: owner, createdAt: new Date(), collaborator: { id: owner, wallet: { id: owner } } });
    const prisma = {
      $transaction: jest.fn().mockResolvedValue([[request('a', 'owner-a'), request('b', 'owner-b')], 2]),
      payoutRequest: { findMany: jest.fn(), count: jest.fn() },
      financialLedger: { findMany: jest.fn().mockResolvedValue([{ referenceId: 'a', amount: new Prisma.Decimal(200000) }]), groupBy: jest.fn().mockResolvedValue([]) },
    };
    const controller = new AdminPayoutsController(prisma as never, { serializePayout: (row: unknown) => row } as never, {} as never, {} as never, {} as never);
    const result = await controller.list({} as never);
    expect(prisma.financialLedger.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
      referenceType: 'PAYOUT_REQUEST', transactionType: 'PAYOUT_REJECT_REFUND', balanceBucket: 'AVAILABLE', amount: { gt: 0 },
      OR: [{ referenceId: 'a', wallet: { collaboratorId: 'owner-a' } }, { referenceId: 'b', wallet: { collaboratorId: 'owner-b' } }],
    } }));
    expect(result.requests.map(row => row.refundedAmount)).toEqual(['200000.00', null]);
  });
});
