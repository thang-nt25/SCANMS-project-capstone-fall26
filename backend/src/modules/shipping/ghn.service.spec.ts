import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { GhnService } from './ghn.service';

describe('GHN customer order notifications', () => {
  it('notifies once when repeated delivery webhooks arrive', async () => {
    let status = OrderStatus.SHIPPING;
    const order = {
      id: 'order-1',
      externalOrderSn: 'DH-2026-ABC123',
      customerId: 'customer-1',
    };
    const notificationCreate = jest.fn();
    const tx = {
      order: {
        updateMany: jest.fn(async ({ where, data }: any) => {
          if (where.status !== status) return { count: 0 };
          status = data.status;
          return { count: 1 };
        }),
      },
      notification: { create: notificationCreate },
    };
    const prisma = {
      order: { findFirst: jest.fn(async () => ({ ...order, status })) },
      sampleProductRequest: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new GhnService(prisma as any, {} as ConfigService);
    jest.spyOn(service, 'trackOrder').mockResolvedValue({ ghnRawDetail: { status: 'delivered' } } as any);

    await service.handleGhnWebhook({ OrderCode: 'GHN123', Status: 'delivered' });
    await service.handleGhnWebhook({ OrderCode: 'GHN123', Status: 'delivered' });

    expect(notificationCreate).toHaveBeenCalledTimes(1);
    expect(notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'customer-1',
        type: 'ORDER_DELIVERED',
      }),
    });
  });

  it('ignores a forged delivery webhook when GHN reports a different status', async () => {
    const prisma = { order: { findFirst: jest.fn() }, sampleProductRequest: { findFirst: jest.fn() } };
    const service = new GhnService(prisma as any, {} as ConfigService);
    jest.spyOn(service, 'trackOrder').mockResolvedValue({ ghnRawDetail: { status: 'delivering' } } as any);
    const result = await service.handleGhnWebhook({ OrderCode: 'GHN123', Status: 'delivered' });
    expect(result.success).toBe(false);
    expect(prisma.order.findFirst).not.toHaveBeenCalled();
    expect(prisma.sampleProductRequest.findFirst).not.toHaveBeenCalled();
  });

  it('starts the sample deadline only after GHN confirms delivery, even if the webhook was missed', async () => {
    let status = 'SHIPPED';
    const tx = {
      sampleProductRequest: {
        updateMany: jest.fn(async ({ where, data }: any) => {
          if (where.status !== status) return { count: 0 };
          status = data.status;
          return { count: 1 };
        }),
        findUnique: jest.fn().mockResolvedValue({ collaboratorId: 'creator-1' }),
      },
      sampleRequestEvent: { create: jest.fn() },
      notification: { create: jest.fn() },
    };
    const prisma = {
      sampleProductRequest: { findUnique: jest.fn(async () => ({ id: 'sample-1', collaboratorId: 'creator-1', status, carrier: 'GHN', trackingNumber: 'GHN123' })) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new GhnService(prisma as any, {} as ConfigService);
    const track = jest.spyOn(service, 'trackOrder').mockResolvedValue({ ghnRawDetail: { status: 'delivering' } } as any);

    expect(await service.syncSampleDelivery('sample-1', 'creator-1')).toEqual({ status: 'SHIPPED', synchronized: false });
    expect(tx.sampleProductRequest.updateMany).not.toHaveBeenCalled();

    const deliveredAt = '2026-10-01T10:00:00.000Z';
    track.mockResolvedValue({ ghnRawDetail: { status: 'delivered', updated_date: '2026-09-29T10:00:00Z', finish_date: '2026-09-30T10:00:00Z', log: [{ status: 'delivered', created_date: '2026-10-01 17:00:00' }] } } as any);
    expect(await service.syncSampleDelivery('sample-1', 'creator-1')).toEqual({ status: 'RECEIVED', synchronized: true });
    expect(tx.sampleProductRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'RECEIVED', receivedAt: expect.any(Date), deadlineAt: expect.any(Date), expectedVideoAt: expect.any(Date) }),
    }));
    const saved = tx.sampleProductRequest.updateMany.mock.calls[0][0].data;
    expect(saved.receivedAt.toISOString()).toBe(deliveredAt);
    expect(saved.deadlineAt.getTime() - saved.receivedAt.getTime()).toBe(14 * 86400000);
    expect(saved.expectedVideoAt).toEqual(saved.deadlineAt);
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
  });

  it('keeps a sample shipped when GHN has no trustworthy delivery timestamp', async () => {
    const prisma = { sampleProductRequest: { findUnique: jest.fn().mockResolvedValue({
      id: 'sample-1', collaboratorId: 'creator-1', status: 'SHIPPED', carrier: 'GHN', trackingNumber: 'GHN123',
    }) }, $transaction: jest.fn() };
    const service = new GhnService(prisma as any, {} as ConfigService);
    jest.spyOn(service, 'trackOrder').mockResolvedValue({ ghnRawDetail: { status: 'delivered', updated_date: '2026-10-02T10:00:00Z', log: [] } } as any);
    expect(await service.syncSampleDelivery('sample-1', 'creator-1')).toEqual({ status: 'SHIPPED', synchronized: false });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('matches the trailing GHN address levels exactly instead of a street-name substring', async () => {
    const service = new GhnService({} as any, {} as ConfigService);
    jest.spyOn(service, 'getProvinces').mockResolvedValue([{ ProvinceID: 1, ProvinceName: 'Thành phố Hà Nội', Code: 'HN' }]);
    jest.spyOn(service, 'getDistricts').mockResolvedValue([{ DistrictID: 2, ProvinceID: 1, DistrictName: 'Quận Ba Đình', Code: 'BD' }]);
    jest.spyOn(service, 'getWards').mockResolvedValue([
      { WardCode: 'A', DistrictID: 2, WardName: 'Phường An' },
      { WardCode: 'B', DistrictID: 2, WardName: 'Phường Phúc Xá' },
    ]);
    expect(await (service as any).resolveGhnLocation('12 đường An, Phường Phúc Xá, Quận Ba Đình, Hà Nội'))
      .toEqual({ districtId: 2, wardCode: 'B' });
    await expect((service as any).resolveGhnLocation('12 đường An, Phường Không Có, Quận Ba Đình, Hà Nội'))
      .rejects.toThrow('Phường/xã');
  });

  it('sends GHN the same weight and insured goods value used at checkout', async () => {
    const order = {
      id: 'order-1', storeId: 'store-1', status: OrderStatus.PENDING, externalOrderSn: 'SCANMS-1',
      customerName: 'Khách', customerPhone: '0912345678', shippingAddress: '12 Đường A',
      customerId: null, rawPayload: { paymentMethod: 'COD' },
      subtotalAmount: 200000, finalAmount: 225000,
      store: { id: 'store-1', name: 'Shop A', onboardingData: { warehouseAddress: '12 Đường B', contactPhone: '0987654321' } },
      orderItems: [{ quantity: 2, unitPrice: 100000, product: { title: 'Sản phẩm A' } }],
    };
    const tx = { order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUniqueOrThrow: jest.fn().mockResolvedValue({ ...order, status: OrderStatus.SHIPPING }) } };
    const prisma = { order: { findUnique: jest.fn().mockResolvedValue(order) }, $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new GhnService(prisma as any, {} as ConfigService);
    jest.spyOn(service as any, 'resolveGhnLocation').mockResolvedValue({ districtId: 1, wardCode: '001' });
    const send = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { order_code: 'GHN123', total_fee: 25000 } });
    await service.createShippingOrder(order.id);
    expect(send).toHaveBeenCalledWith('/v2/shipping-order/create', expect.objectContaining({ body: expect.objectContaining({ weight: 1000, insurance_value: 200000, cod_amount: 225000, payment_type_id: 1 }) }));
  });
});
