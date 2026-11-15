import { FinanceReportService } from './finance-report.service';
import { FinanceReportController } from './finance-report.controller';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';

describe('Finance pending-work badges', () => {
  let db: any;
  let service: FinanceReportService;
  beforeEach(() => {
    db = {
      payoutRequest: { count: jest.fn().mockResolvedValue(3) },
      customerWithdrawal: { count: jest.fn().mockResolvedValue(1) },
      commission: { count: jest.fn().mockResolvedValue(2) },
      storeMonthlyRewardPolicy: { findMany: jest.fn().mockResolvedValue([{ yearMonth: '2026-12' }, { yearMonth: '2027-01' }]) },
      storeMonthlyRewardGrant: { findMany: jest.fn().mockResolvedValue([{ policy: { yearMonth: '2026-11' } }, { policy: { yearMonth: '2026-11' } }]) },
    };
    service = new FinanceReportService(db);
  });
  it('counts only unresolved work and includes pending monthly work from all months', async () => {
    expect(await service.pendingWork('reviewer')).toMatchObject({ kol: 3, customer: 1, escrow: 2, monthly: { policies: 2, grants: 2, total: 4, months: ['2026-11', '2026-12', '2027-01'] } });
    expect(db.customerWithdrawal.count).toHaveBeenCalledWith({ where: { status: 'PENDING' } });
  });
  it('does not count a clean fourteen-day countdown as an approval task', async () => {
    await service.pendingWork('reviewer');
    const where = db.commission.count.mock.calls[0][0].where;
    expect(where.status).toBe('PENDING');
    expect(where.order.OR).toEqual([
      { rawPayload: { path: ['selfReferralReviewRequired'], equals: true } },
      { returnRequests: { some: { OR: [
        { status: { notIn: ['CLOSED', 'EXPIRED', 'COMPLETED', 'REFUNDED'] } },
        { dispute: { is: { status: 'OPEN' } } },
      ] } } },
    ]);
  });
  it('excludes self-approval work from the operator queue', async () => {
    await service.pendingWork('reviewer');
    expect(db.storeMonthlyRewardPolicy.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PENDING', createdBy: { not: 'reviewer' } } }));
    expect(db.storeMonthlyRewardGrant.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PENDING', requestedBy: { not: 'reviewer' }, policy: { status: 'APPROVED' } } }));
  });
  it('returns actual zeros without manufacturing alerts', async () => {
    for (const model of [db.payoutRequest, db.customerWithdrawal, db.commission]) model.count.mockResolvedValue(0);
    db.storeMonthlyRewardPolicy.findMany.mockResolvedValue([]); db.storeMonthlyRewardGrant.findMany.mockResolvedValue([]);
    expect(await service.pendingWork('reviewer')).toMatchObject({ kol: 0, customer: 0, escrow: 0, monthly: { total: 0, months: [] } });
  });
  it('limits the endpoint to system manager and admin', () => {
    expect(Reflect.getMetadata(ROLES_KEY, FinanceReportController.prototype.pendingWork)).toEqual(['SYSTEM_MANAGER', 'SYSTEM_ADMIN']);
  });
});
