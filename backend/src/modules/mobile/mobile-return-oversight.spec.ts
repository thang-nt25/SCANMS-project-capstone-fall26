import { ForbiddenException } from '@nestjs/common';
import { ReturnRequestStatus, UserRole } from '@prisma/client';
import { ReturnService } from '../returns/return.service';

describe('Mobile return oversight queue', () => {
  it.each([UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN])(
    'keeps a failed refund reachable for %s without requiring a customer dispute',
    async (role) => {
      const findMany = jest.fn().mockResolvedValue([]);
      const service = new ReturnService({ returnRequest: { findMany } } as never, {} as never);
      await service.listForOversight(role);
      const statuses = findMany.mock.calls[0][0].where.status.in;
      expect(statuses).toEqual(expect.arrayContaining([
        ReturnRequestStatus.REFUND_PENDING,
        ReturnRequestStatus.REFUND_FAILED,
      ]));
      expect(statuses).not.toContain(ReturnRequestStatus.COMPLETED);
    },
  );

  it('rejects a merchant before querying cross-shop return data', async () => {
    const findMany = jest.fn();
    const service = new ReturnService({ returnRequest: { findMany } } as never, {} as never);
    await expect(service.listForOversight(UserRole.SHOP_MANAGER)).rejects.toThrow(ForbiddenException);
    expect(findMany).not.toHaveBeenCalled();
  });
});
