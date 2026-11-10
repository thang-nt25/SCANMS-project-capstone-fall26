import { ConflictException } from '@nestjs/common';
import { OrderStatus, Prisma, ReturnRequestStatus, UserRole } from '@prisma/client';
import { ReturnService } from './return.service';

describe('GHN compensation after manager arbitration', () => {
  const detail = {
    id: 'return-1', orderId: 'order-1', customerId: 'customer-1',
    status: ReturnRequestStatus.DISPUTED, originalOrderStatus: OrderStatus.COMPLETED,
    imageUrls: ['https://example.test/customer-damage.jpg'],
    unboxingVideoUrl: 'https://example.test/unboxing.mp4',
    shipments: [], events: [],
    order: {
      status: OrderStatus.DISPUTED, rawPayload: { ghnOrderCode: 'GHN-ORIGINAL-1' },
      externalOrderSn: 'DH-1', store: { ownerId: 'shop-1' },
      finalAmount: new Prisma.Decimal(280000), refundedAmount: new Prisma.Decimal(0),
    },
  };
  function setup(rawPayload: unknown = detail.order.rawPayload) {
    const tx = {
      returnRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      dispute: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      returnEvent: { create: jest.fn().mockResolvedValue({}) },
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      refund: { upsert: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      dispute: { findUnique: jest.fn().mockResolvedValue({
        id: 'dispute-1', status: 'OPEN', returnRequest: {
          ...detail, order: { ...detail.order, rawPayload },
        },
      }) },
      $transaction: jest.fn((work: (client: typeof tx) => unknown) => work(tx)),
    };
    const service = new ReturnService(prisma as never, {} as never);
    jest.spyOn(service, 'getOne').mockResolvedValue({ id: detail.id } as never);
    return { tx, prisma, service };
  }

  it('opens a draft GHN claim when the manager orders an exchange for verified carrier fault', async () => {
    const { service, tx } = setup();
    await expect(service.resolveDispute('manager-1', UserRole.SYSTEM_MANAGER, 'dispute-1', {
      ruling: 'APPROVE_EXCHANGE', liability: 'LOGISTICS_FAULT',
      notes: 'Video mở hộp và ảnh đóng gói cho thấy kiện hàng vỡ khi giao vận.',
    })).resolves.toEqual({ id: detail.id });
    expect(tx.returnEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'GHN_COMPENSATION_CLAIM_OPENED',
      data: expect.objectContaining({
        status: 'DRAFT', originalTrackingNumber: 'GHN-ORIGINAL-1',
        evidenceUrls: detail.imageUrls.concat(detail.unboxingVideoUrl),
      }),
    }) });
  });

  it('opens the same independent claim for a refund even when wallet credit is pending', async () => {
    const { service, tx } = setup();
    await service.resolveDispute('manager-1', UserRole.SYSTEM_MANAGER, 'dispute-1', {
      ruling: 'APPROVE_REFUND', liability: 'LOGISTICS_FAULT',
      notes: 'Kiện hàng vỡ khi vận chuyển; cần hoàn khách trước khi đòi GHN.',
    });
    expect(tx.refund.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ status: 'PENDING' }),
    }));
    expect(tx.returnEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'GHN_COMPENSATION_CLAIM_OPENED',
    }) });
  });

  it('does not attribute an untracked order to GHN or create a claim', async () => {
    const { service, prisma, tx } = setup({});
    await expect(service.resolveDispute('manager-1', UserRole.SYSTEM_MANAGER, 'dispute-1', {
      ruling: 'APPROVE_EXCHANGE', liability: 'LOGISTICS_FAULT',
      notes: 'Cần vận đơn gốc trước khi xác định lỗi bên vận chuyển.',
    })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.returnEvent.create).not.toHaveBeenCalled();
  });
});
