import { FinanceReportService } from './finance-report.service';

describe('escrow movement trace', () => {
  function setup(found: boolean = true) {
    const prisma = {
      commission: { findUnique: jest.fn().mockResolvedValue(found ? { id: 'commission-a', collaboratorId: 'kol-a', order: { externalOrderSn: 'DH-A' } } : null) },
      financialLedger: { findMany: jest.fn().mockResolvedValue([{ id: 'entry-a', amount: '-27500', balanceBucket: 'PENDING' }]), count: jest.fn().mockResolvedValue(11) },
      $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
    };
    return { prisma, service: new FinanceReportService(prisma as never) };
  }
  it('traces only the exact commission in its owner wallet and paginates without altering money', async () => {
    const { prisma, service } = setup();
    const report = await service.escrowMovements('commission-a', 2);
    expect(prisma.financialLedger.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { referenceType: 'COMMISSION', referenceId: 'commission-a', wallet: { collaboratorId: 'kol-a' } },
      skip: 10, take: 10, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    }));
    expect(prisma.financialLedger.count).toHaveBeenCalledWith({ where: expect.objectContaining({ referenceId: 'commission-a' }) });
    expect(report).toMatchObject({ total: 11, page: 2, limit: 10, orderCode: 'DH-A', items: [{ id: 'entry-a', amount: '-27500' }] });
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
