import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma, ReturnRequestStatus, ReturnResolution, ReturnRefundStatus, UserRole } from '@prisma/client';
import { ReturnService } from './return.service';

const id = '94196d7d-1196-4eac-89dd-50b2118040d9';
const managerId = '4d47e8a2-5b17-4fc8-b6c4-f6b839c62273';

function fixture() {
  const current: any = {
    id, orderId: 'order-1', customerId: 'customer-1',
    status: ReturnRequestStatus.REFUND_PENDING, resolution: ReturnResolution.REFUND,
    refund: { amount: new Prisma.Decimal(427500), status: ReturnRefundStatus.PENDING },
    order: { id: 'order-1', externalOrderSn: 'SCN-99120', finalAmount: new Prisma.Decimal(427500),
      refundedAmount: new Prisma.Decimal(0), store: { ownerId: 'shop-1' } },
  };
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'refund-1' }]),
    returnRequest: { findUnique: jest.fn().mockResolvedValue(current) },
    order: { update: jest.fn() }, refund: { update: jest.fn() },
    returnEvent: { create: jest.fn() },
  };
  const prisma: any = { $transaction: jest.fn((work: (tx: any) => Promise<unknown>) => work(tx)) };
  const walletsService: any = { refundToWallet: jest.fn() };
  const service: any = Object.assign(Object.create(ReturnService.prototype), { prisma, walletsService });
  service.reverseIncomeAfterRefund = jest.fn();
  service.move = jest.fn();
  service.notify = jest.fn();
  jest.spyOn(service, 'getOne').mockResolvedValue({ id });
  return { current, tx, walletsService, service };
}

describe('Flow 4 pending refund recovery', () => {
  it('credits the customer, reverses income and advances the case in one locked transaction', async () => {
    const { tx, walletsService, service } = fixture();
    await service.retryPendingRefund(managerId, UserRole.SYSTEM_MANAGER, id);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(walletsService.refundToWallet).toHaveBeenCalledWith(tx, 'customer-1',
      new Prisma.Decimal(427500), 'order-1');
    expect(service.reverseIncomeAfterRefund).toHaveBeenCalledWith(tx, 'order-1');
    expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { refundedAmount: { increment: new Prisma.Decimal(427500) } },
    }));
    expect(tx.refund.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: ReturnRefundStatus.SUCCEEDED, method: 'WALLET' }),
    }));
    expect(service.move).toHaveBeenCalledTimes(2);
    expect(tx.returnEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'REFUND_RETRY_SUCCEEDED' }),
    }));
  });

  it('never credits a refund already marked successful', async () => {
    const { current, walletsService, service } = fixture();
    current.refund.status = ReturnRefundStatus.SUCCEEDED;
    current.status = ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION;
    await service.retryPendingRefund(managerId, UserRole.SYSTEM_MANAGER, id);
    expect(walletsService.refundToWallet).not.toHaveBeenCalled();
    expect(service.reverseIncomeAfterRefund).not.toHaveBeenCalled();
  });

  it('rejects a changed amount before writing a wallet or income entry', async () => {
    const { current, walletsService, service } = fixture();
    current.refund.amount = new Prisma.Decimal(400000);
    await expect(service.retryPendingRefund(managerId, UserRole.SYSTEM_MANAGER, id))
      .rejects.toThrow(ConflictException);
    expect(walletsService.refundToWallet).not.toHaveBeenCalled();
    expect(service.reverseIncomeAfterRefund).not.toHaveBeenCalled();
  });

  it('does not claw back KOL income if the wallet refund fails', async () => {
    const { tx, walletsService, service } = fixture();
    walletsService.refundToWallet.mockRejectedValue(new Error('Wallet unavailable'));
    await expect(service.retryPendingRefund(managerId, UserRole.SYSTEM_MANAGER, id))
      .rejects.toThrow('Wallet unavailable');
    expect(service.reverseIncomeAfterRefund).not.toHaveBeenCalled();
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.refund.update).not.toHaveBeenCalled();
  });

  it('does not allow Shop staff to retry customer money movement', async () => {
    const { tx, service } = fixture();
    await expect(service.retryPendingRefund('shop-1', UserRole.SHOP_MANAGER, id))
      .rejects.toThrow(ForbiddenException);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});
