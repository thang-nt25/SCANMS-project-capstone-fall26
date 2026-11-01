import { ConflictException } from '@nestjs/common';
import { ReturnRequestStatus, UserRole } from '@prisma/client';
import { ReturnService } from './return.service';

const requestId = '6c73103a-2550-482b-9f18-e9f5c5ba1ad5';
const shopManagerId = '23acc500-c9d8-4732-8543-79f6267e8680';
const systemManagerId = '540fda3d-49df-41c9-8ffc-4bcfa13858ac';

function setup(status = ReturnRequestStatus.EXCHANGE_PENDING) {
  const detail: any = {
    id: requestId,
    orderId: '94e900ec-d6dd-4d97-9f55-792d816a5387',
    customerId: 'a9fa6bb8-f77e-4281-9fab-e24e971b07d1',
    status,
    events: [],
    order: { externalOrderSn: 'SCN-99120', store: { ownerId: 'owner-1' } },
    items: [{ quantity: 1, orderItem: { productId: 'product-1', variantId: 'variant-1' } }],
  };
  const tx = {
    returnRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    returnEvent: { create: jest.fn().mockResolvedValue({}) },
    returnShipment: { create: jest.fn().mockResolvedValue({}) },
    productVariant: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    notification: { create: jest.fn().mockResolvedValue({}) },
  };
  const prisma = {
    returnRequest: { findFirst: jest.fn().mockResolvedValue(detail) },
    $transaction: jest.fn().mockImplementation((work: (client: typeof tx) => unknown) => work(tx)),
  };
  const service = new ReturnService(prisma as never, {} as never);
  jest.spyOn(service, 'getOne').mockResolvedValue({ id: requestId } as never);
  return { detail, tx, prisma, service };
}

describe('Flow 4 replacement and liability', () => {
  it('uses stock for the replacement without reversing the original KOC income', async () => {
    const { tx, service } = setup();
    await service.submitExchangeShipment(shopManagerId, UserRole.SHOP_MANAGER, requestId,
      { carrierName: 'GHN', trackingNumber: 'GHN-REPLACEMENT-1' });
    expect(tx.productVariant.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'variant-1', stockQuantity: { gte: 1 } }),
      data: { stockQuantity: { decrement: 1 } },
    }));
    expect(tx.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'product-1', stockQuantity: { gte: 1 } }),
    }));
    expect(tx.returnShipment.create).toHaveBeenCalledTimes(1);
    expect(tx.returnEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'EXCHANGE_INCOME_PRESERVED' }),
    }));
  });

  it('does not record an exchange shipment when the variant is out of stock', async () => {
    const { tx, service } = setup();
    tx.productVariant.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.submitExchangeShipment(shopManagerId, UserRole.SHOP_MANAGER, requestId,
      { carrierName: 'GHN', trackingNumber: 'GHN-REPLACEMENT-1' }))
      .rejects.toThrow(ConflictException);
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.returnShipment.create).not.toHaveBeenCalled();
  });

  it('requires System Manager evidence before calling a return a GHN fault', async () => {
    const { tx, service } = setup(ReturnRequestStatus.INSPECTING);
    await expect(service.inspect(shopManagerId, UserRole.SHOP_MANAGER, requestId,
      { resolution: 'EXCHANGE', liability: 'LOGISTICS_FAULT', notes: 'Kiện hàng bị va đập trên đường giao.' }))
      .rejects.toThrow(ConflictException);
    expect(tx.returnRequest.updateMany).not.toHaveBeenCalled();
  });

  it('records a System Manager assessment for the Shop to follow', async () => {
    const { tx, service } = setup(ReturnRequestStatus.SHOP_APPROVED);
    await service.assessLiability(systemManagerId, UserRole.SYSTEM_MANAGER, requestId,
      { liability: 'LOGISTICS_FAULT', notes: 'Video cho thấy thùng móp, tem niêm phong còn nguyên.' });
    expect(tx.returnEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'LIABILITY_ASSESSED', data: expect.objectContaining({
        liability: 'LOGISTICS_FAULT', source: 'SYSTEM_MANAGER_REVIEW',
      }) }),
    }));
  });

  it('does not append another event when the same liability conclusion is saved again', async () => {
    const { detail, tx, service } = setup(ReturnRequestStatus.SHOP_APPROVED);
    const input = { liability: 'SHOP_FAULT' as const, notes: 'Shop gửi hàng bị vỡ.' };
    detail.events.push({ type: 'LIABILITY_ASSESSED', data: { ...input, source: 'SYSTEM_MANAGER_REVIEW' } });
    await service.assessLiability(systemManagerId, UserRole.SYSTEM_MANAGER, requestId, input);
    expect(tx.returnEvent.create).not.toHaveBeenCalled();
    expect(tx.returnRequest.updateMany).not.toHaveBeenCalled();
  });

  it('opens a GHN reimbursement case only for a confirmed carrier fault', async () => {
    const { detail, tx, service } = setup();
    detail.order.rawPayload = { ghnOrderCode: 'GHN-ORIGINAL-1' };
    detail.events.push({ type: 'LIABILITY_ASSESSED', data: {
      source: 'SYSTEM_MANAGER_REVIEW', liability: 'LOGISTICS_FAULT',
    } });
    await service.submitExchangeShipment(shopManagerId, UserRole.SHOP_MANAGER, requestId,
      { carrierName: 'GHN', trackingNumber: 'GHN-REPLACEMENT-1' });
    expect(tx.returnEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'GHN_COMPENSATION_CLAIM_OPENED', data: {
        originalTrackingNumber: 'GHN-ORIGINAL-1',
        replacementTrackingNumber: 'GHN-REPLACEMENT-1',
        status: 'PENDING_RECONCILIATION',
      } }),
    }));
  });
});
