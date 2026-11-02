import { ConflictException, ForbiddenException } from '@nestjs/common';
import { OrderStatus, ReturnRequestStatus, UserRole } from '@prisma/client';
import { ReturnService } from './return.service';
import { shopEscalationSchema } from './return.schemas';

describe('Shop evidence escalation', () => {
  const detail = {
    id: 'return-1', orderId: 'order-1', customerId: 'customer-1',
    status: ReturnRequestStatus.SHOP_REJECTED, dispute: null,
    order: { status: OrderStatus.COMPLETED, externalOrderSn: 'DH-1', store: { ownerId: 'shop-1' } },
  };
  const input = { details: 'Kiện hàng còn nguyên khi bàn giao cho GHN, có ảnh niêm phong.', evidenceUrls: ['https://example.test/packing.jpg'] };

  function setup(overrides = {}) {
    const tx = {
      returnRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      returnEvent: { create: jest.fn().mockResolvedValue({}) },
      dispute: { create: jest.fn().mockResolvedValue({}) },
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'manager-1' }]) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      returnRequest: { findFirst: jest.fn().mockResolvedValue({ ...detail, ...overrides }) },
      $transaction: jest.fn((work: (client: typeof tx) => unknown) => work(tx)),
    };
    const service = new ReturnService(prisma as never, {} as never);
    jest.spyOn(service, 'getOne').mockResolvedValue({ id: detail.id } as never);
    return { tx, prisma, service };
  }

  it('requires an HTTPS evidence file and a meaningful explanation', () => {
    expect(shopEscalationSchema.safeParse(input).success).toBe(true);
    expect(shopEscalationSchema.safeParse({ ...input, evidenceUrls: [] }).success).toBe(false);
    expect(shopEscalationSchema.safeParse({ ...input, evidenceUrls: ['http://example.test/file'] }).success).toBe(false);
  });

  it('opens one manager case with Shop evidence and notifies both sides', async () => {
    const { service, tx } = setup();
    await expect(service.escalateShopRejection('shop-1', UserRole.SHOP_MANAGER, detail.id, input))
      .resolves.toEqual({ id: detail.id });
    expect(tx.returnRequest.updateMany).toHaveBeenCalledWith({
      where: { id: detail.id, status: ReturnRequestStatus.SHOP_REJECTED },
      data: { status: ReturnRequestStatus.DISPUTED },
    });
    expect(tx.dispute.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: 'SHOP_REQUESTED_REVIEW' }) });
    expect(tx.returnEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      type: 'SHOP_EVIDENCE_SUBMITTED', data: input,
    }) });
    expect(tx.notification.create).toHaveBeenCalledTimes(2);
  });

  it('rejects repeated escalation and non-Shop actors', async () => {
    const repeated = setup({ dispute: { id: 'existing' } });
    await expect(repeated.service.escalateShopRejection('shop-1', UserRole.SHOP_MANAGER, detail.id, input))
      .rejects.toBeInstanceOf(ConflictException);
    expect(repeated.prisma.$transaction).not.toHaveBeenCalled();
    const customer = setup();
    await expect(customer.service.escalateShopRejection('customer-1', UserRole.CUSTOMER, detail.id, input))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
