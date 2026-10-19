import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@prisma/client';
import { GhnService } from './ghn.service';
import { GhnEnvironment } from './dto/shipping.dto';

describe('GHN customer order notifications', () => {
  it('keeps staging API credentials and host separate from production', async () => {
    const values: Record<string, string> = {
      GHN_TEST_API_URL: 'https://dev-online-gateway.ghn.vn/shiip/public-api',
      GHN_TEST_API_TOKEN: 'staging-token',
      GHN_TEST_SHOP_ID: '123456',
      GHN_API_URL: 'https://online-gateway.ghn.vn/shiip/public-api',
      GHN_API_TOKEN: 'production-token',
      GHN_SHOP_ID: '654321',
    };
    const config = { get: jest.fn((key: string) => values[key]) } as unknown as ConfigService;
    const service = new GhnService({} as any, config);
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: async () => ({ code: 200 }),
    } as Response);

    await (service as any).ghnFetch('/v2/shipping-order/detail', {
      method: 'POST',
      body: { order_code: 'STAGING-ORDER' },
      environment: GhnEnvironment.TEST,
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/detail',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        headers: expect.objectContaining({ Token: 'staging-token', ShopId: '123456' }),
      }),
    );
    fetch.mockRestore();
  });

  it('looks up test waybills in staging and never links them to live GHN tracking', async () => {
    const prisma = {
      order: {
        findFirst: jest.fn().mockResolvedValue({
          rawPayload: { ghnEnvironment: GhnEnvironment.TEST },
        }),
      },
    };
    const service = new GhnService(prisma as any, {} as ConfigService);
    const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({
      code: 200,
      data: { status: 'delivering', log: [] },
    });

    const tracking = await service.trackOrder('STAGING-ORDER');

    expect(fetch).toHaveBeenCalledWith('/v2/shipping-order/detail', expect.objectContaining({
      environment: GhnEnvironment.TEST,
    }));
    expect(tracking).toEqual(expect.objectContaining({
      environment: GhnEnvironment.TEST,
      trackingUrl: null,
    }));
  });

  it('distinguishes a nonexistent tracking number from a temporary GHN error', async () => {
    const service = new GhnService({} as any, {} as ConfigService);
    const fetch = jest.spyOn(service as any, 'ghnFetch');
    fetch.mockResolvedValueOnce({ code: 400, message: 'Lỗi gọi API: corev2_tenant_order_detail - Đơn hàng không tồn tại' });
    expect(await service.trackOrder('GHN-73154257')).toEqual(expect.objectContaining({ status: 'unavailable', trackingError: 'ORDER_NOT_FOUND' }));
    fetch.mockResolvedValueOnce({ code: 503, message: 'Service unavailable' });
    expect(await service.trackOrder('GHN-73154257')).toEqual(expect.objectContaining({ status: 'unavailable', trackingError: null }));
  });

  function sampleShippingFixture() {
    const sample = {
      id: 'sample-1', status: 'APPROVED', collaboratorId: 'kol-1',
      recipientName: 'KOL', recipientPhone: '0912345678', shippingAddress: 'Address',
      ghnDistrictId: 1, ghnWardCode: '001',
      product: { title: 'Sample', price: 100000, packageWeight: 500, packageLength: 15, packageWidth: 10, packageHeight: 5, store: { id: 'store-1', ownerId: 'shop-1', name: 'Shop', onboardingData: { warehouseAddress: 'Actual warehouse', contactPhone: '0987654321' }, returnWarehouse: {} } },
    };
    const tx = {
      sampleProductRequest: { updateMany: jest.fn().mockResolvedValue({ count: 1 }), findUnique: jest.fn().mockResolvedValue(sample) },
      sampleRequestEvent: { create: jest.fn() }, notification: { create: jest.fn() },
      sampleShippingCharge: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
      $executeRaw: jest.fn(),
    };
    const prisma = {
      sampleProductRequest: { findUnique: jest.fn().mockResolvedValue(sample) },
      $transaction: jest.fn((callback: any) => callback(tx)),
    };
    const service = new GhnService(prisma as any, {} as ConfigService);
    jest.spyOn(service as any, 'resolveGhnLocation').mockResolvedValue({ districtId: 1, wardCode: '001' });
    return { service, prisma, tx, sample };
  }

  it.each([
    { message: 'Không thể tạo đơn vì vượt quá số lượng cho phép, giới hạn tạo đơn' },
    { code_message_value: 'Order quota limit exceeded' },
    { code_message: 'ORDER_LIMIT_EXCEEDED' },
  ])('explains GHN account quota and does not ship a sample when GHN returns %j', async reason => {
    const { service, prisma, tx, sample } = sampleShippingFixture();
    const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 400, ...reason });
    let response: any;
    try { await service.createSampleShippingOrder('sample-1', 'shop-1'); } catch (error: any) { response = error.getResponse(); }
    expect(response).toMatchObject({ code: 'GHN_ORDER_LIMIT_REACHED' });
    expect(response.message).toContain('không phải số suất mẫu Shop đã cấp');
    expect(response.message).toContain('chưa bắt đầu hạn nộp video');
    expect(sample.status).toBe('APPROVED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(tx.sampleShippingCharge.create).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith('/v2/shipping-order/create', expect.objectContaining({ environment: GhnEnvironment.LIVE }));
  });

  it('creates sandbox sample waybills with TEST credentials and remapped locations without touching the real sample', async () => {
    const { service, tx, sample } = sampleShippingFixture();
    const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { order_code: 'TEST-SAMPLE', total_fee: 49000 } });
    await expect(service.createSampleShippingOrder('sample-1', 'shop-1', GhnEnvironment.TEST)).resolves.toMatchObject({ environment: 'TEST', testOnly: true });
    expect(fetch).toHaveBeenCalledWith('/v2/shipping-order/create', expect.objectContaining({ environment: 'TEST', body: expect.objectContaining({ cod_amount: 0, payment_type_id: 1 }) }));
    expect((service as any).resolveGhnLocation).toHaveBeenCalledWith(sample.shippingAddress, GhnEnvironment.TEST);
    expect((service as any).resolveGhnLocation).toHaveBeenCalledWith('Actual warehouse', GhnEnvironment.TEST);
    expect(tx.sampleProductRequest.updateMany).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
    expect(tx.sampleShippingCharge.create).toHaveBeenCalledWith({ data: expect.objectContaining({ environment: 'TEST', status: 'GHN_REPORTED', amount: 49000 }) });
  });

  it('allows a separate sandbox test for an already shipped sample but refuses a duplicate live shipment', async () => {
    const { service, tx, sample } = sampleShippingFixture();
    sample.status = 'SHIPPED';
    const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { order_code: 'TEST-NEW', total_fee: 25000 } });
    await expect(service.createSampleShippingOrder('sample-1', 'shop-1')).rejects.toThrow('Chỉ tạo vận đơn');
    expect(fetch).not.toHaveBeenCalled();
    await service.createSampleShippingOrder('sample-1', 'shop-1', GhnEnvironment.TEST);
    expect(tx.sampleProductRequest.updateMany).not.toHaveBeenCalled();
  });

  it('tracks a persisted sample sandbox number in TEST without falling back to production', async () => {
    const service = new GhnService({ sampleShippingCharge: { findFirst: jest.fn().mockResolvedValue({ environment: 'TEST' }) } } as any, {} as ConfigService);
    const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { status: 'ready_to_pick', log: [] } });
    await service.trackOrder('TEST-SAMPLE');
    expect(fetch).toHaveBeenCalledWith('/v2/shipping-order/detail', expect.objectContaining({ environment: 'TEST' }));
  });

  it('reuses the current active sandbox waybill without creating another GHN order', async () => {
    const { service, tx } = sampleShippingFixture();
    tx.sampleShippingCharge.findFirst.mockResolvedValue({ trackingNumber: 'TEST-EXISTING', amount: 49000 } as any);
    const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { status: 'ready_to_pick' } });
    await expect(service.createSampleShippingOrder('sample-1', 'shop-1', GhnEnvironment.TEST)).resolves.toMatchObject({ trackingNumber: 'TEST-EXISTING', reused: true });
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/v2/shipping-order/detail', expect.objectContaining({ environment: 'TEST' }));
    expect(tx.sampleShippingCharge.create).not.toHaveBeenCalled();
  });

  it('does not create a duplicate when the existing sandbox waybill cannot be verified', async () => {
    const { service, tx } = sampleShippingFixture();
    tx.sampleShippingCharge.findFirst.mockResolvedValue({ trackingNumber: 'TEST-EXISTING', amount: 49000 } as any);
    const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 503 });
    await expect(service.createSampleShippingOrder('sample-1', 'shop-1', GhnEnvironment.TEST)).rejects.toThrow('không tạo thêm mã');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(tx.sampleShippingCharge.create).not.toHaveBeenCalled();
  });

  it('can create a replacement after GHN confirms the previous sandbox waybill was cancelled', async () => {
    const { service, tx } = sampleShippingFixture();
    tx.sampleShippingCharge.findFirst.mockResolvedValue({ trackingNumber: 'TEST-OLD', amount: 49000 } as any);
    const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValueOnce({ code: 200, data: { status: 'cancel' } }).mockResolvedValueOnce({ code: 200, data: { order_code: 'TEST-REPLACEMENT', total_fee: 25000 } });
    await expect(service.createSampleShippingOrder('sample-1', 'shop-1', GhnEnvironment.TEST)).resolves.toMatchObject({ trackingNumber: 'TEST-REPLACEMENT' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not invent a sample tracking number when GHN rejects creation', async () => {
    const { service, prisma } = sampleShippingFixture();
    jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 400, code_message: 'CREATE_ORDER_FAIL_BY_EXCEED_LIMIT', message: 'GHN limit' });
    await expect(service.createSampleShippingOrder('sample-1', 'shop-1')).rejects.toThrow('Tài khoản GHN thật đang bị giới hạn');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('starts shipping with the GHN-issued number and no video deadline', async () => {
    const { service, tx } = sampleShippingFixture();
    jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { order_code: 'GHN-REAL', total_fee: 25000 } });
    await service.createSampleShippingOrder('sample-1', 'shop-1');
    expect(tx.sampleProductRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SHIPPED', trackingNumber: 'GHN-REAL', receivedAt: null, deadlineAt: null, expectedVideoAt: null }),
    }));
    expect(tx.sampleShippingCharge.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      sampleRequestId: 'sample-1', storeId: 'store-1', trackingNumber: 'GHN-REAL', amount: 25000,
      payer: 'SHOP', codAmount: 0, status: 'GHN_REPORTED',
    }) });
  });

  it.each([undefined, null, -100, NaN, '25000'])('preserves the waybill with an unconfirmed sample fee for %p', async (total_fee) => {
    const { service, tx } = sampleShippingFixture();
    const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { order_code: 'GHN-REAL', total_fee } });
    await expect(service.createSampleShippingOrder('sample-1', 'shop-1')).resolves.toMatchObject({ totalFee: null, codAmount: 0, shippingPayer: 'SHOP' });
    expect(fetch).toHaveBeenCalledWith('/v2/shipping-order/create', expect.objectContaining({ body: expect.objectContaining({ payment_type_id: 1, cod_amount: 0 }) }));
    expect(tx.sampleShippingCharge.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: null, status: 'PENDING_CONFIRMATION' }) });
  });

  it.each(['warehouseAddress', 'contactPhone'])('rejects sample shipping with missing %s before contacting GHN', async (field) => {
    const { service, sample, prisma } = sampleShippingFixture();
    (sample.product.store.onboardingData as any)[field] = ' ';
    const fetch = jest.spyOn(service as any, 'ghnFetch');
    await expect(service.createSampleShippingOrder('sample-1', 'shop-1')).rejects.toThrow('Shop cần cập nhật');
    expect(fetch).not.toHaveBeenCalled(); expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('appends a separate Shop freight charge when a failed sample shipment is resent', async () => {
    const { service, sample, tx } = sampleShippingFixture();
    jest.spyOn(service as any, 'ghnFetch')
      .mockResolvedValueOnce({ code: 200, data: { order_code: 'GHN-FIRST', total_fee: 25000 } })
      .mockResolvedValueOnce({ code: 200, data: { order_code: 'GHN-RESENT', total_fee: 30000 } });
    await service.createSampleShippingOrder('sample-1', 'shop-1');
    sample.status = 'DELIVERY_ISSUE';
    await service.createSampleShippingOrder('sample-1', 'shop-1');
    expect(tx.sampleShippingCharge.create.mock.calls.map(([args]) => args.data)).toEqual([
      expect.objectContaining({ trackingNumber: 'GHN-FIRST', amount: 25000, payer: 'SHOP', codAmount: 0 }),
      expect.objectContaining({ trackingNumber: 'GHN-RESENT', amount: 30000, payer: 'SHOP', codAmount: 0 }),
    ]);
  });

  it('does not let another Shop create or charge a sample shipment', async () => {
    const { service, tx } = sampleShippingFixture();
    const fetch = jest.spyOn(service as any, 'ghnFetch');
    await expect(service.createSampleShippingOrder('sample-1', 'another-owner')).rejects.toThrow('không quản lý');
    expect(fetch).not.toHaveBeenCalled(); expect(tx.sampleShippingCharge.create).not.toHaveBeenCalled();
  });

  it.each([undefined, null, -1, NaN, Infinity, '25000', false])('rejects an invalid GHN checkout quote %p', async (total) => {
    const service = new GhnService({} as any, {} as ConfigService);
    jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { total } });
    await expect(service.calculateShippingFee({ toDistrictId: 1, toWardCode: '001' })).rejects.toThrow('GHN chưa trả');
  });

  it.each([0, 29001])('accepts a confirmed numeric GHN quote %p', async (total) => {
    const service = new GhnService({} as any, {} as ConfigService);
    jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { total } });
    await expect(service.calculateShippingFee({ toDistrictId: 1, toWardCode: '001' })).resolves.toMatchObject({ totalFee: total });
  });

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

  it('uses the saved return warehouse as the pickup address when no separate GHN pickup address exists', async () => {
    const store = {
      onboardingData: {},
      returnWarehouse: { address: 'Kho hàng SCANMS, 123 Nguyễn Huệ, P. Bến Nghé, Q.1, TP. Hồ Chí Minh' },
      isActive: true,
      isDeleted: false,
    };
    const prisma = { store: { findUnique: jest.fn().mockResolvedValue(store) } };
    const service = new GhnService(prisma as any, {} as ConfigService);
    const resolve = jest.spyOn(service as any, 'resolveGhnLocation').mockResolvedValue({ districtId: 1, wardCode: '001' });
    const calculate = jest.spyOn(service, 'calculateShippingFee').mockResolvedValue({ totalFee: 25000, serviceFee: 20000, insuranceFee: 5000, isRealGhn: true });

    await expect(service.quoteAddress('12 Đường A, Phường B, Quận C, TP. Hồ Chí Minh', 500, 200000, 'store-1'))
      .resolves.toEqual({ totalFee: 25000, serviceFee: 20000, insuranceFee: 5000, isRealGhn: true, districtId: 1, wardCode: '001' });
    expect(prisma.store.findUnique).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ returnWarehouse: true }) }));
    expect(resolve).toHaveBeenNthCalledWith(1, store.returnWarehouse.address);
    expect(calculate).toHaveBeenCalledWith({ fromDistrictId: 1, fromWardCode: '001', toDistrictId: 1, toWardCode: '001', weight: 500, insuranceValue: 200000 });
  });

  it('starts the sample deadline only after GHN confirms delivery, even if the webhook was missed', async () => {
    let status = 'SHIPPED';
    const tx = {
      sampleProductRequest: {
        updateMany: jest.fn(async ({ where, data }: any) => {
          if (typeof where.status === 'string' ? where.status !== status : !where.status.in.includes(status)) return { count: 0 };
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
    expect(await service.syncSampleDelivery('sample-1', 'creator-1')).toEqual({ status: 'RECEIVED', synchronized: false });
    expect(tx.sampleProductRequest.updateMany).toHaveBeenCalledTimes(1);
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

  it('rechecks GHN on the scheduled fallback without treating elapsed shipping time as delivery', async () => {
    const tx = {
      sampleProductRequest: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ collaboratorId: 'kol-1' }),
      },
      sampleRequestEvent: { create: jest.fn() }, notification: { create: jest.fn() },
    };
    const prisma = {
      sampleProductRequest: { findMany: jest.fn().mockResolvedValue([{ id: 'sample-1', trackingNumber: 'GHN123' }]) },
      $transaction: jest.fn((callback: any) => callback(tx)),
    };
    const service = new GhnService(prisma as any, {} as ConfigService);
    const track = jest.spyOn(service, 'trackOrder').mockResolvedValue({ ghnRawDetail: { status: 'delivering' } } as any);
    await service.reconcileShippedSamples();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    track.mockResolvedValue({ ghnRawDetail: { status: 'delivered', finish_date: '2026-01-01T10:00:00Z' } } as any);
    await service.reconcileShippedSamples();
    const saved = tx.sampleProductRequest.updateMany.mock.calls[0][0].data;
    expect(saved.status).toBe('RECEIVED');
    expect(saved.receivedAt.toISOString()).toBe('2026-01-01T10:00:00.000Z');
    expect(saved.deadlineAt.getTime() - saved.receivedAt.getTime()).toBe(14 * 86400000);
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

  it('creates a staging order and persists its environment for later tracking', async () => {
    const order = {
      id: 'order-staging', storeId: 'store-1', status: OrderStatus.PENDING,
      externalOrderSn: 'DH-STAGING-1', customerName: 'Khách', customerPhone: '0912345678',
      shippingAddress: '12 Đường A, Phường B, Quận C, Thành phố D', customerId: null,
      rawPayload: { paymentMethod: 'WALLET' }, subtotalAmount: 200000, finalAmount: 200000,
      store: { id: 'store-1', name: 'Shop A', onboardingData: { warehouseAddress: '12 Đường B', contactPhone: '0987654321' } },
      orderItems: [{ quantity: 1, unitPrice: 200000, product: { title: 'Sản phẩm A' } }],
    };
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...order, status: OrderStatus.SHIPPING }),
      },
    };
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const config = {
      get: jest.fn((key: string) => key === 'SHIPPING_SIMULATION_ENABLED' ? 'false' : undefined),
    } as unknown as ConfigService;
    const service = new GhnService(prisma as any, config);
    jest.spyOn(service as any, 'resolveGhnLocation').mockResolvedValue({ districtId: 1, wardCode: '001' });
    const send = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({
      code: 200, data: { order_code: 'STAGING-ORDER-1', total_fee: 25000 },
    });

    const result = await service.createShippingOrder(order.id, { environment: GhnEnvironment.TEST });

    expect(send).toHaveBeenCalledWith('/v2/shipping-order/create', expect.objectContaining({
      environment: GhnEnvironment.TEST,
      body: expect.objectContaining({ cod_amount: 0, payment_type_id: 1 }),
    }));
    expect(result).toEqual(expect.objectContaining({
      environment: GhnEnvironment.TEST,
      isRealGhn: false,
      orderCode: 'STAGING-ORDER-1',
    }));
    expect(tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        rawPayload: expect.objectContaining({ ghnEnvironment: GhnEnvironment.TEST,
        }),
      }),
    }));
    // Creating a TEST waybill uses the real sandbox response, not an automatic fake clock.
    expect(tx.order.updateMany.mock.calls[0][0].data.rawPayload).not.toHaveProperty('ghnSimulation');
  });

  it('explains GHN order-limit rejections without changing the order to shipping', async () => {
    const order = {
      id: 'order-limit', storeId: 'store-1', status: OrderStatus.PENDING,
      externalOrderSn: 'DH-LIMIT-1', customerName: 'Khách', customerPhone: '0912345678',
      shippingAddress: '12 Đường A, Phường B, Quận C, Thành phố D', customerId: null,
      rawPayload: { paymentMethod: 'COD' }, subtotalAmount: 200000, finalAmount: 225000,
      store: { id: 'store-1', name: 'Shop A', onboardingData: { warehouseAddress: '12 Đường B', contactPhone: '0987654321' } },
      orderItems: [{ quantity: 1, unitPrice: 200000, product: { title: 'Sản phẩm A' } }],
    };
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      $transaction: jest.fn(),
    };
    const service = new GhnService(prisma as any, {} as ConfigService);
    jest.spyOn(service as any, 'resolveGhnLocation').mockResolvedValue({ districtId: 1, wardCode: '001' });
    jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({
      code: 400,
      message: 'Không thể tạo đơn vì vượt quá số lượng cho phép',
      code_message: 'CREATE_ORDER_FAIL_BY_EXCEED_LIMIT',
    });

    await expect(service.createShippingOrder(order.id)).rejects.toThrow(
      'GHN từ chối tạo vận đơn vì tài khoản đã đạt giới hạn tạo đơn.',
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('identifies a disabled sender ward without changing the order to shipping', async () => {
    const order = {
      id: 'order-limit', storeId: 'store-1', status: OrderStatus.PENDING,
      externalOrderSn: 'DH-LIMIT-1', customerName: 'Khách', customerPhone: '0912345678',
      shippingAddress: '12 Đường A, Phường B, Quận C, Thành phố D', customerId: null,
      rawPayload: { paymentMethod: 'COD' }, subtotalAmount: 200000, finalAmount: 225000,
      store: { id: 'store-1', name: 'Shop A', onboardingData: { warehouseAddress: '12 Đường B', contactPhone: '0987654321' } },
      orderItems: [{ quantity: 1, unitPrice: 200000, product: { title: 'Sản phẩm A' } }],
    };
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      $transaction: jest.fn(),
    };
    const service = new GhnService(prisma as any, {} as ConfigService);
    jest.spyOn(service as any, 'resolveGhnLocation').mockResolvedValue({ districtId: 1, wardCode: '001' });
    jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({
      code: 400,
      message: 'Không thể tạo đơn vì vượt quá số lượng cho phép',
      code_message: 'SEND_WARD_IS_DISABLED',
    });

    await expect(service.createShippingOrder(order.id, { environment: GhnEnvironment.TEST })).rejects.toThrow('SEND_WARD_IS_DISABLED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('allows replacing an existing internal test code with a real GHN waybill', async () => {
    const order = {
      id: 'order-1', storeId: 'store-1', status: OrderStatus.SHIPPING, externalOrderSn: 'DH-TEST-1',
      customerName: 'Khách', customerPhone: '0912345678', shippingAddress: '12 Đường A',
      customerId: null, rawPayload: { paymentMethod: 'WALLET', trackingNumber: 'GHN-0ABFBVQ3K', carrierName: 'GHN Express' },
      subtotalAmount: 200000, finalAmount: 225000,
      store: { id: 'store-1', name: 'Shop A', onboardingData: { warehouseAddress: '12 Đường B', contactPhone: '0987654321' } },
      orderItems: [{ quantity: 1, unitPrice: 200000, product: { title: 'Sản phẩm A' } }],
    };
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ ...order, rawPayload: { ...order.rawPayload, ghnOrderCode: 'GHN123' } }),
      },
    };
    const prisma = {
      order: { findUnique: jest.fn().mockResolvedValue(order) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new GhnService(prisma as any, {} as ConfigService);
    jest.spyOn(service as any, 'resolveGhnLocation').mockResolvedValue({ districtId: 1, wardCode: '001' });
    jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { order_code: 'GHN123', total_fee: 25000 } });

    await expect(service.createShippingOrder(order.id)).resolves.toEqual(expect.objectContaining({
      trackingNumber: 'GHN123',
      isRealGhn: true,
      orderStatus: OrderStatus.SHIPPING,
    }));
    expect(tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'order-1', status: OrderStatus.SHIPPING },
      data: expect.objectContaining({
        status: OrderStatus.SHIPPING,
        rawPayload: expect.objectContaining({ trackingNumber: 'GHN123', ghnOrderCode: 'GHN123', ghnIsReal: true }),
      }),
    }));
  });
});
