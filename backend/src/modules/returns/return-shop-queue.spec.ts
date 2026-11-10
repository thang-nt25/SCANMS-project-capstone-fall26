import { ForbiddenException } from '@nestjs/common';
import { ReturnRequestStatus, UserRole } from '@prisma/client';
import { ReturnService } from './return.service';

describe('Shop return queue freshness and access', () => {
  function setup() {
    const records: Array<{ id: string; status: ReturnRequestStatus }> = [
      { id: 'return-1', status: ReturnRequestStatus.REQUESTED },
    ];
    const prisma = {
      returnRequest: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockImplementation(async () => records.map((record) => ({ ...record }))),
      },
      $transaction: jest.fn(async (queries: Array<Promise<unknown>>) => Promise.all(queries)),
    };
    const service = new ReturnService(prisma as never, {} as never);
    jest.spyOn(service as never, 'present').mockImplementation((record: never) => record);
    return { service, prisma, records };
  }

  it('rejects a non-Shop account before reading any queue data', async () => {
    const { service, prisma } = setup();
    await expect(service.listShop('customer-1', UserRole.CUSTOMER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.returnRequest.count).not.toHaveBeenCalled();
    expect(prisma.returnRequest.findMany).not.toHaveBeenCalled();
  });

  it('reads current return status on each request after Shop or Manager acts', async () => {
    const { service, prisma, records } = setup();
    const first = await service.listShop('shop-1', UserRole.SHOP_MANAGER);
    expect(first.items[0].status).toBe(ReturnRequestStatus.REQUESTED);

    records[0].status = ReturnRequestStatus.SHOP_APPROVED;
    const second = await service.listShop('shop-1', UserRole.SHOP_MANAGER);
    expect(second.items[0].status).toBe(ReturnRequestStatus.SHOP_APPROVED);
    expect(prisma.returnRequest.findMany).toHaveBeenCalledTimes(2);
  });

  it('keeps the status filter and pagination scoped to the owning Shop', async () => {
    const { service, prisma } = setup();
    await service.listShop('shop-1', UserRole.SHOP_MANAGER, ReturnRequestStatus.SHOP_APPROVED, 2);
    expect(prisma.returnRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: ReturnRequestStatus.SHOP_APPROVED }),
      skip: 20,
      take: 20,
    }));
  });
});
