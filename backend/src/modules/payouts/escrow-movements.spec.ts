import { FinanceReportService } from './finance-report.service';

describe('escrow movement trace', () => {
  function setup(found = true, refunds = [{ id: 'refund-a' }]) {
    const prisma = {
      commission: { findUnique: jest.fn().mockResolvedValue(found ? { id: 'commission-a', collaboratorId: 'kol-a', order: { externalOrderSn: 'DH-A', refunds } } : null) },
      financialLedger: { findMany: jest.fn().mockResolvedValue([{ id: 'entry-a', amount: '-27500', balanceBucket: 'PENDING' }]), count: jest.fn().mockResolvedValue(11) },
      $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
    };
    return { prisma, service: new FinanceReportService(prisma as never) };
  }
  it('paginates commission entries and refund clawbacks for the same order and owner wallet', async () => {
    const { prisma, service } = setup();
    const report = await service.escrowMovements('commission-a', 2);
    const where = {
      wallet: { collaboratorId: 'kol-a' },
      OR: [
        { referenceType: 'COMMISSION', referenceId: 'commission-a' },
        { referenceType: 'ORDER_REFUND', referenceId: { in: ['refund-a'] }, transactionType: 'REVERSAL' },
      ],
    };
    expect(prisma.financialLedger.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where,
      skip: 10, take: 10, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
    expect(prisma.financialLedger.count).toHaveBeenCalledWith({ where });
    expect(report).toMatchObject({ total: 11, page: 2, limit: 10, orderCode: 'DH-A', items: [{ id: 'entry-a', amount: '-27500' }] });
  });
  it('scopes the refund branch to an empty set for orders without a refund', async () => {
    const { prisma, service } = setup(true, []);
    await service.escrowMovements('commission-a');
    expect(prisma.financialLedger.findMany.mock.calls[0][0].where.OR[1].referenceId).toEqual({ in: [] });
  });
  it('rejects a missing commission before querying any ledger', async () => {
    const { prisma, service } = setup(false);
    await expect(service.escrowMovements('missing')).rejects.toThrow('Không tìm thấy');
    expect(prisma.financialLedger.findMany).not.toHaveBeenCalled();
  });
  it.each([0, -1, 1.5, NaN])('rejects invalid page %s', async page => {
    const { prisma, service } = setup();
    await expect(service.escrowMovements('commission-a', page)).rejects.toThrow('Trang không hợp lệ');
    expect(prisma.commission.findUnique).not.toHaveBeenCalled();
  });
});
