import { ForbiddenException } from '@nestjs/common';
import { ReturnRequestStatus, UserRole } from '@prisma/client';
import { ReturnService } from './return.service';
import { returnHistoryQuerySchema } from './return.schemas';

describe('Manager return history', () => {
  function setup() {
    const prisma = {
      returnRequest: {
        count: jest.fn().mockResolvedValue(21),
        findMany: jest.fn().mockResolvedValue([{ id: 'closed-1', status: ReturnRequestStatus.REFUNDED }]),
      },
      $transaction: jest.fn(async (queries: Array<Promise<unknown>>) => Promise.all(queries)),
    };
    const service = new ReturnService(prisma as never, {} as never);
    jest.spyOn(service as never, 'present').mockImplementation((record: never) => record);
    return { service, prisma };
  }

  it('validates page and limits search length at the HTTP boundary', () => {
    expect(returnHistoryQuerySchema.parse({ page: '2', query: '  DH-001  ' })).toEqual({ page: 2, query: 'DH-001' });
    expect(returnHistoryQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(returnHistoryQuerySchema.safeParse({ page: '1', query: 'x'.repeat(81) }).success).toBe(false);
  });

  it('rejects customers and Shop accounts before querying history', async () => {
    const { service, prisma } = setup();
    for (const role of [UserRole.CUSTOMER, UserRole.SHOP_MANAGER, UserRole.COLLABORATOR]) {
      await expect(service.listHistory(role)).rejects.toBeInstanceOf(ForbiddenException);
    }
    expect(prisma.returnRequest.findMany).not.toHaveBeenCalled();
  });

  it('paginates terminal cases and searches order details for Manager', async () => {
    const { service, prisma } = setup();
    const result = await service.listHistory(UserRole.SYSTEM_MANAGER, 2, '  DH-001  ');
    expect(result).toMatchObject({ total: 21, page: 2, pageSize: 20, items: [{ id: 'closed-1' }] });
    expect(prisma.returnRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: { in: [ReturnRequestStatus.COMPLETED, ReturnRequestStatus.REFUNDED, ReturnRequestStatus.CLOSED, ReturnRequestStatus.EXPIRED] },
        order: expect.objectContaining({ OR: expect.arrayContaining([
          { externalOrderSn: { contains: 'DH-001', mode: 'insensitive' } },
        ]) }),
      }),
      skip: 20,
      take: 20,
    }));
  });
});
