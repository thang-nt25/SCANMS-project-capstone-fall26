import { ForbiddenException, ConflictException } from '@nestjs/common';
import { OrderStatus, ReturnRequestStatus, UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { ReturnDecision } from './dto/respond-return-request.dto';

describe('Shop return request workflow', () => {
  const orderId = 'order-1';
  const request = {
    id: 'request-1',
    customerId: 'customer-1',
    status: ReturnRequestStatus.REQUESTED,
    originalOrderStatus: OrderStatus.COMPLETED,
  };
  const order = {
    id: orderId,
    externalOrderSn: 'S-001',
    status: OrderStatus.RETURN_REQUESTED,
    store: { ownerId: 'owner-1' },
    returnRequest: request,
  };

  function setup(updatedCount = 1) {
    const tx = {
      returnRequest: {
        updateMany: jest.fn().mockResolvedValue({ count: updatedCount }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(request),
      },
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      returnEvent: { create: jest.fn() },
      notification: { create: jest.fn() },
    };
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = Object.assign(Object.create(OrdersService.prototype), {
      prisma,
    }) as OrdersService;
    return { service, prisma, tx };
  }

  it('prevents another Shop from reading or deciding this return', async () => {
    const { service, tx } = setup();
    await expect(
      service.respondReturnRequest(orderId, 'owner-2', UserRole.SHOP_MANAGER, {
        decision: ReturnDecision.APPROVE,
        response: 'Tôi đồng ý xử lý yêu cầu này',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.returnRequest.updateMany).not.toHaveBeenCalled();
  });

  it('approves without falsely marking the order as refunded', async () => {
    const { service, tx } = setup();
    await service.respondReturnRequest(
      orderId,
      'owner-1',
      UserRole.SHOP_MANAGER,
      {
        decision: ReturnDecision.APPROVE,
        response: 'Tôi đồng ý xử lý yêu cầu này',
      },
    );
    expect(tx.returnRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: request.id, status: ReturnRequestStatus.REQUESTED },
        data: expect.objectContaining({
          status: ReturnRequestStatus.SHOP_APPROVED,
        }),
      }),
    );
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(tx.returnEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        returnRequestId: request.id,
        type: 'REQUESTED_TO_SHOP_APPROVED',
      }),
    });
  });

  it('restores the original order status on rejection', async () => {
    const { service, tx } = setup();
    await service.respondReturnRequest(
      orderId,
      'owner-1',
      UserRole.SHOP_MANAGER,
      {
        decision: ReturnDecision.REJECT,
        response: 'Bằng chứng không khớp sản phẩm',
      },
    );
    expect(tx.order.updateMany).toHaveBeenCalledWith({
      where: { id: orderId, status: OrderStatus.RETURN_REQUESTED },
      data: { status: OrderStatus.COMPLETED },
    });
  });

  it('does not accept a repeated decision', async () => {
    const { service, tx } = setup(0);
    await expect(
      service.respondReturnRequest(orderId, 'owner-1', UserRole.SHOP_MANAGER, {
        decision: ReturnDecision.REJECT,
        response: 'Bằng chứng không khớp sản phẩm',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.order.updateMany).not.toHaveBeenCalled();
  });
});
