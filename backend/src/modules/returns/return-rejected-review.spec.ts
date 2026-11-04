import { ConflictException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, ReturnRequestStatus, UserRole } from '@prisma/client';
import { ReturnService } from './return.service';

describe('Manager review of historical Shop rejections', () => {
  const detail = {
    id: 'return-1', orderId: 'order-1', customerId: 'customer-1',
    status: ReturnRequestStatus.SHOP_REJECTED, dispute: null,
    shopResponse: 'Shop từ chối vì nghi kiện hàng bị vỡ khi vận chuyển.',
    order: { status: OrderStatus.COMPLETED, externalOrderSn: 'DH-1', store: { ownerId: 'shop-1' } },
  };

  function setup(status = ReturnRequestStatus.SHOP_REJECTED, updatedCount = 1) {
    const tx = {
      returnRequest: { updateMany: jest.fn().mockResolvedValue({ count: updatedCount }) },
      returnEvent: { create: jest.fn().mockResolvedValue({}) },
      dispute: { create: jest.fn().mockResolvedValue({}) },
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      returnRequest: {
        findFirst: jest.fn().mockResolvedValue({ ...detail, status }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((work: (client: typeof tx) => unknown) => work(tx)),
    };
    const service = new ReturnService(prisma as never, {} as never);
    jest.spyOn(service, 'getOne').mockResolvedValue({ id: detail.id } as never);
    return { tx, prisma, service };
  }

  it('shows rejected returns to Manager and opens a dispute without deciding fault', async () => {
    const { service, tx, prisma } = setup();
    await service.listRejectedForReview(UserRole.SYSTEM_MANAGER);
    expect(prisma.returnRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: ReturnRequestStatus.SHOP_REJECTED, dispute: { is: null } },
    }));
    await expect(service.openRejectedReview('manager-1', UserRole.SYSTEM_MANAGER, detail.id))
      .resolves.toEqual({ id: detail.id });
    expect(tx.dispute.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      reason: 'MANAGER_REVIEW_SHOP_REJECTION', returnRequestId: detail.id,
    }) });
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: detail.orderId, status: OrderStatus.COMPLETED },
      data: { status: OrderStatus.DISPUTED },
    });
    expect(tx.notification.create).toHaveBeenCalledTimes(2);
  });

  it('rejects non-Managers and a competing review', async () => {
    const other = setup();
    await expect(other.service.listRejectedForReview(UserRole.SHOP_MANAGER))
      .rejects.toBeInstanceOf(ForbiddenException);
    await expect(other.service.openRejectedReview('shop-1', UserRole.SHOP_MANAGER, detail.id))
      .rejects.toBeInstanceOf(ForbiddenException);
    const competed = setup(ReturnRequestStatus.SHOP_REJECTED, 0);
    await expect(competed.service.openRejectedReview('manager-1', UserRole.SYSTEM_MANAGER, detail.id))
      .rejects.toBeInstanceOf(ConflictException);
    expect(competed.tx.dispute.create).not.toHaveBeenCalled();
  });
});
