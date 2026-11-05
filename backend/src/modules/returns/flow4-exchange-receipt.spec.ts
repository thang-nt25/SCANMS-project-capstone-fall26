import { ConflictException } from '@nestjs/common';
import { ReturnRequestStatus, ReturnResolution, ReturnShipmentDirection, UserRole } from '@prisma/client';
import { ReturnService } from './return.service';

describe('Flow 4 exchange receipt', () => {
  const customerId = 'customer-1';
  const requestId = 'request-1';
  const detail: any = {
    id: requestId, customerId, status: ReturnRequestStatus.EXCHANGE_SHIPPED,
    resolution: ReturnResolution.EXCHANGE, order: { externalOrderSn: 'DH-1', store: { ownerId: 'shop-1' } },
    shipments: [{ direction: ReturnShipmentDirection.SHOP_TO_CUSTOMER, receivedAt: null }],
  };
  const tx: any = {
    returnShipment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const service: any = Object.assign(Object.create(ReturnService.prototype), {
    prisma: { $transaction: jest.fn((work: (client: any) => Promise<unknown>) => work(tx)) },
  });
  service.scopedDetail = jest.fn().mockResolvedValue(detail);
  service.move = jest.fn();
  service.notify = jest.fn();
  service.getOne = jest.fn().mockResolvedValue({ id: requestId });

  it('does not close an exchange merely because Shop entered a tracking number', async () => {
    await expect(service.confirmCompletion(customerId, UserRole.CUSTOMER, requestId))
      .rejects.toThrow(ConflictException);
    expect(service.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('records the customer receiving the replacement before allowing completion', async () => {
    await service.confirmExchangeReceipt(customerId, UserRole.CUSTOMER, requestId);
    expect(service.move).toHaveBeenCalledWith(tx, requestId,
      ReturnRequestStatus.EXCHANGE_SHIPPED, ReturnRequestStatus.AWAITING_CUSTOMER_CONFIRMATION, customerId);
    expect(tx.returnShipment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ direction: ReturnShipmentDirection.SHOP_TO_CUSTOMER, receivedAt: null }),
    }));
  });
});
