import { Prisma, UserRole } from '@prisma/client';
import { CustomerWithdrawalsService } from './customer-withdrawals.service';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { PayoutBillService } from './payout-bill.service';

describe('Customer withdrawal list totals', () => {
  const setup = () => {
    const prisma = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'customer' }]) },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'request' }]),
      customerWithdrawal: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(23),
        groupBy: jest.fn().mockResolvedValue([
          { status: 'PENDING', _sum: { amount: new Prisma.Decimal(4600000) }, _count: { _all: 23 } },
        ]),
      },
      $transaction: jest.fn((queries) => Promise.all(queries)),
    };
    const service = new CustomerWithdrawalsService(prisma as unknown as PrismaService, {} as WalletsService, {} as PayoutBillService);
    return { prisma, service };
  };
  it('keeps global totals independent from the selected status, search and page', async () => {
    const { prisma, service } = setup();
    const result = await service.list({ id: 'operator', email: 'operator@test.dev', role: UserRole.SYSTEM_MANAGER },
      { page: 2, limit: 10, status: 'APPROVED', search: 'RKH-abcdef12' }, true);
    expect(result.summary.PENDING).toEqual({ amount: '4600000', count: 23 });
    expect(prisma.customerWithdrawal.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
    expect(prisma.customerWithdrawal.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 10, take: 10, where: expect.objectContaining({ status: 'APPROVED', OR: expect.arrayContaining([{ id: { in: ['request'] } }]) }),
    }));
  });
  it('scopes customer totals to their own wallet', async () => {
    const { prisma, service } = setup();
    await service.list({ id: 'customer', email: 'customer@test.dev', role: UserRole.CUSTOMER }, { page: 1, limit: 10 });
    expect(prisma.customerWithdrawal.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'customer' } }));
    expect(prisma.customerWithdrawal.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'customer' } }));
  });
});
