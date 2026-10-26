import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { Prisma, PayoutStatus } from '@prisma/client';
import { QueryMerchantPayoutsDto, MerchantPayoutFilter } from './dto/manage-payout.dto';
import { merchantPayoutScopes, merchantPayoutWhere } from './merchant-payout-query';
import { MerchantPayoutsService } from './merchant-payouts.service';

describe('merchant payout filters and store-wide aggregates', () => {
  const storeId = '2f67001b-09a5-5958-85fd-5f401831c871';
  const now = new Date('2026-10-25T23:00:00Z'); // 06:00 VN, 26 October
  const dto = (values = {}) => Object.assign(new QueryMerchantPayoutsDto(), values);
  it('accepts composed filters, trims search and retains safe pagination defaults', () => {
    const query = plainToInstance(QueryMerchantPayoutsDto, { search: '  Nguyen  ', filter: 'PENDING' });
    expect(validateSync(query)).toEqual([]);
    expect(query).toMatchObject({ page: 1, limit: 10, search: 'Nguyen', filter: 'PENDING' });
  });
  it.each([{ filter: 'BOGUS' }, { search: 'x'.repeat(201) }, { page: '0' }, { limit: '101' }])('rejects invalid query %j', values => {
    expect(validateSync(plainToInstance(QueryMerchantPayoutsDto, values)).length).toBeGreaterThan(0);
  });
  it('uses a half-open Vietnam day, not the UTC date or request creation date', () => {
    const scopes = merchantPayoutScopes(storeId, now);
    expect(scopes.start.toISOString()).toBe('2026-10-25T17:00:00.000Z');
    expect(scopes.end.toISOString()).toBe('2026-10-26T17:00:00.000Z');
    expect(scopes.approvedToday).toEqual({ storeId, status: PayoutStatus.APPROVED, processedAt: { gte: scopes.start, lt: scopes.end } });
  });
  it('intersects status, KPI and search while preserving the store scope', () => {
    const result = merchantPayoutWhere(storeId, dto({ status: PayoutStatus.PENDING, filter: MerchantPayoutFilter.KYC, search: 'An' }), now);
    const clauses = result.AND as Prisma.PayoutRequestWhereInput[];
    expect(result.storeId).toBe(storeId);
    expect(clauses).toHaveLength(3);
    expect(clauses[0]).toEqual({ status: 'PENDING' });
    expect(clauses[1]).toEqual(merchantPayoutScopes(storeId, now).kyc);
    expect(clauses[2].OR).toEqual(expect.arrayContaining([{ collaborator: { is: { fullName: { contains: 'An', mode: 'insensitive' } } } }]));
  });
  it('searches complete payout UUIDs exactly, without applying LIKE to a UUID column', () => {
    const result = merchantPayoutWhere(storeId, dto({ search: storeId }), now);
    expect((result.AND as Prisma.PayoutRequestWhereInput[])[0].OR).toContainEqual({ id: storeId });
  });
  it('never counts tax on pending or rejected requests as withheld', () => {
    expect(merchantPayoutScopes(storeId, now).tax).toEqual({ storeId, status: 'APPROVED', taxAmount: { gt: 0 } });
  });

  function createService(total = 25) {
    const tx = { payoutRequest: {
      count: jest.fn().mockResolvedValueOnce(total).mockResolvedValueOnce(2),
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn()
        .mockResolvedValueOnce({ _count: { _all: 40 }, _sum: { netAmount: new Prisma.Decimal('1234567.89') } })
        .mockResolvedValueOnce({ _count: { _all: 3 }, _sum: { netAmount: new Prisma.Decimal('2700000.00') } })
        .mockResolvedValueOnce({ _count: { _all: 9 }, _sum: { taxAmount: new Prisma.Decimal('900000.10') } }),
    } };
    const prisma = { $transaction: jest.fn(async callback => callback(tx)) };
    const service = Object.assign(Object.create(MerchantPayoutsService.prototype), { prisma, bills: { maxBillBytes: 5242880 } }) as MerchantPayoutsService;
    const ownership = jest.spyOn(service, 'assertStoreOwnership').mockResolvedValue({ id: storeId } as never);
    return { service, tx, prisma, ownership };
  }
  it('returns counts/totals for all store records independent of page and search', async () => {
    const { service, tx, prisma } = createService();
    const result = await service.listPayouts(storeId, 'owner', dto({ page: 2, search: 'An', filter: MerchantPayoutFilter.PENDING }));
    expect(result).toMatchObject({ page: 2, limit: 10, total: 25, totalPages: 3,
      summary: { scope: 'STORE', pending: { count: 40, netAmount: '1234567.89' }, approvedToday: { count: 3, netAmount: '2700000.00' }, withheldTax: { count: 9, amount: '900000.10' }, kycPendingCount: 2 },
    });
    expect(tx.payoutRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10 }));
    const aggregateCalls = tx.payoutRequest.aggregate.mock.calls as unknown as Array<[{ where: Prisma.PayoutRequestWhereInput }]>;
    expect(aggregateCalls[0][0].where).toEqual({ storeId, status: PayoutStatus.PENDING });
    expect(aggregateCalls[0][0].where).not.toHaveProperty('AND');
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'RepeatableRead' });
  });
  it.each([[20, 3, 2, 10], [0, 3, 1, 0], [25, 3, 3, 20]])('clamps total %i requested page %i to %i', async (total, requested, expected, skip) => {
    const { service, tx } = createService(total);
    const result = await service.listPayouts(storeId, 'owner', dto({ page: requested }));
    expect(result.page).toBe(expected);
    expect(tx.payoutRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip }));
  });
  it('checks ownership before querying another store financial data', async () => {
    const { service, ownership, prisma } = createService();
    ownership.mockRejectedValueOnce(new Error('forbidden'));
    await expect(service.listPayouts(storeId, 'intruder', dto())).rejects.toThrow('forbidden');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
