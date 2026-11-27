import { Prisma } from '@prisma/client';
import { FinanceReportService } from './finance-report.service';
const d = (value: number) => new Prisma.Decimal(value);
describe('escrow standard and conditional Deal amounts', () => {
  it('applies the review filter before paginating and uses it for totals', async () => {
    const commission = { findMany: jest.fn(), count: jest.fn(), aggregate: jest.fn() };
    const prisma = { commission, $transaction: jest.fn().mockResolvedValue([[], 21, { _sum: {} }]) };
    const result = await new FinanceReportService(prisma as never).escrow(2, true);
    const { where } = commission.findMany.mock.calls[0][0];
    expect(where).toEqual({ status: 'PENDING', order: { OR: [
      { rawPayload: { path: ['selfReferralReviewRequired'], equals: true } },
      { returnRequests: { some: { OR: [
        { status: { notIn: ['CLOSED', 'EXPIRED', 'COMPLETED', 'REFUNDED', 'EXCHANGE_SHIPPED', 'AWAITING_CUSTOMER_CONFIRMATION'] } },
        { dispute: { is: { status: 'OPEN' } } },
      ] } } },
    ] } });
    expect(commission.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ order: { createdAt: 'desc' } }, { id: 'desc' }],
      skip: 20,
      take: 20,
    }));
    expect(commission.count).toHaveBeenCalledWith({ where });
    expect(commission.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(result).toMatchObject({ page: 2, total: 21 });
  });
  it('keeps legacy base fallback and separates held Deal amounts without changing money', async () => {
    const row = (id: string, total: number, base: number | null, deal: number, state: string, returns: any[] = []) => ({
      id, status: 'PENDING', commissionAmount: d(total), baseCommissionAmount: base === null ? null : d(base), dealBonusAmount: d(deal), dealBonusStatus: state,
      order: { status: 'DELIVERED', rawPayload: {}, returnRequests: returns },
    });
    const rows = [row('legacy', 41600, null, 0, 'NONE'), row('a',40000,27500,12500,'PENDING_KPI'),row('b',80000,55000,25000,'PENDING_KPI'),row('qualified',110,100,10,'QUALIFIED'),row('revoked',110,100,10,'CLAWED_BACK')];
    const prisma = { commission: { findMany: jest.fn(),count: jest.fn(),aggregate: jest.fn() }, $transaction: jest.fn().mockResolvedValue([rows,5,{_sum:{commissionAmount:d(161820)}}]) };
    const result = await new FinanceReportService(prisma as never).escrow();
    expect(result.items.slice(0,3).map(item=>[item.pendingStandardAmount,item.pendingDealAmount])).toEqual([['41600.00','0.00'],['27500.00','12500.00'],['55000.00','25000.00']]);
    expect(result.items[3].pendingDealAmount).toBe('10.00');
    expect(result.items[4].pendingDealAmount).toBe('0.00');
    expect(result.pendingAmount).toBe('161820.00');
  });
  it('includes remaining Deal funds after standard commission was released without counting standard twice', async () => {
    const rows = [{ id: 'released-base', status: 'APPROVED', commissionAmount: d(40000), baseCommissionAmount: d(27500), dealBonusAmount: d(12500), dealBonusStatus: 'PENDING_KPI', dealProposalId: 'deal-id', order: { status: 'DELIVERED', rawPayload: {}, returnRequests: [] } }];
    const findMany = jest.fn();
    const prisma = { commission: { findMany, count: jest.fn(), aggregate: jest.fn() }, $transaction: jest.fn().mockResolvedValue([rows, 1, { _sum: { commissionAmount: d(40000) } }]) };
    const result = await new FinanceReportService(prisma as never).escrow();
    expect(findMany.mock.calls[0][0].where.OR[1]).toEqual({ status: { in: ['APPROVED', 'PAID'] }, dealBonusStatus: 'PENDING_KPI', dealBonusAmount: { gt: 0 } });
    expect(result.items[0]).toMatchObject({ pendingStandardAmount: '0.00', pendingDealAmount: '12500.00', dealProposalId: 'deal-id' });
  });
  it('retains blockers from earlier open disputes even if the latest return is closed', async () => {
    const row={id:'a',commissionAmount:d(100),baseCommissionAmount:d(100),dealBonusAmount:d(0),dealBonusStatus:'NONE',order:{status:'RETURN_REQUESTED',rawPayload:{selfReferralReviewRequired:true},returnRequests:[{id:'latest-closed',status:'CLOSED',dispute:null},{id:'earlier-dispute',status:'COMPLETED',dispute:{status:'OPEN'}}]}};
    const prisma={commission:{findMany:jest.fn(),count:jest.fn(),aggregate:jest.fn()},$transaction:jest.fn().mockResolvedValue([[row],1,{_sum:{commissionAmount:d(100)}}])};
    const result=await new FinanceReportService(prisma as never).escrow();
    expect(result.items[0].order.holdReasons).toHaveLength(2);
    expect(result.items[0].order.reviewReturnId).toBe('earlier-dispute');
    expect(result.items[0].order.returnRequest?.status).toBe('CLOSED');
  });
  it('does not repeat the order status blocker while an exchange is in progress', async () => {
    const row={id:'exchange',commissionAmount:d(100),baseCommissionAmount:d(100),dealBonusAmount:d(0),dealBonusStatus:'NONE',order:{status:'RETURN_REQUESTED',rawPayload:{selfReferralReviewRequired:true},returnRequests:[{id:'exchange-return',status:'EXCHANGE_SHIPPED',dispute:null}]}};
    const prisma={commission:{findMany:jest.fn(),count:jest.fn(),aggregate:jest.fn()},$transaction:jest.fn().mockResolvedValue([[row],1,{_sum:{commissionAmount:d(100)}}])};
    const result=await new FinanceReportService(prisma as never).escrow();
    expect(result.items[0].order.holdReasons).toHaveLength(2);
    expect(result.items[0].order.reviewReturnId).toBe('exchange-return');
  });

});
