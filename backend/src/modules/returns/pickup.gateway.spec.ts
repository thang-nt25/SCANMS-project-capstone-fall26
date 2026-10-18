import { PickupGateway } from './pickup.gateway';

const pickup = {
  name: 'Khách A',
  phone: '0912345678',
  address: '15 Đường Số 9, Phường Linh Trung, TP Hồ Chí Minh',
  wardName: 'Phường Linh Trung',
  provinceName: 'Hồ Chí Minh',
  weight: 500,
  length: 20,
  width: 15,
  height: 10,
};
const warehouse = {
  name: 'Kho Shop',
  phone: '0901234567',
  address: '12 Đường Số 8, Phường Linh Trung, TP Hồ Chí Minh',
  wardName: 'Phường Linh Trung',
  provinceName: 'Hồ Chí Minh',
};

describe('GHN pickup adapter', () => {
  const originalMode = process.env.RETURN_PICKUP_PROVIDER;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalToken = process.env.GHN_STAGING_TOKEN;
  const originalShopId = process.env.GHN_STAGING_SHOP_ID;
  const originalTestToken = process.env.GHN_TEST_API_TOKEN;
  const originalTestShopId = process.env.GHN_TEST_SHOP_ID;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalMode === undefined) delete process.env.RETURN_PICKUP_PROVIDER;
    else process.env.RETURN_PICKUP_PROVIDER = originalMode;
    if (originalToken === undefined) delete process.env.GHN_STAGING_TOKEN;
    else process.env.GHN_STAGING_TOKEN = originalToken;
    if (originalShopId === undefined) delete process.env.GHN_STAGING_SHOP_ID;
    else process.env.GHN_STAGING_SHOP_ID = originalShopId;
    if (originalTestToken === undefined) delete process.env.GHN_TEST_API_TOKEN;
    else process.env.GHN_TEST_API_TOKEN = originalTestToken;
    if (originalTestShopId === undefined) delete process.env.GHN_TEST_SHOP_ID;
    else process.env.GHN_TEST_SHOP_ID = originalTestShopId;
    jest.restoreAllMocks();
  });

  it('creates a deterministic local booking without a carrier request', async () => {
    process.env.NODE_ENV = 'test';
    process.env.RETURN_PICKUP_PROVIDER = 'mock';
    const result = await new PickupGateway().book({
      clientOrderCode: 'SC-R-123456789',
      pickup,
      warehouse,
      content: 'Hàng trả',
    });
    expect(result.provider).toBe('MOCK');
    expect(result.trackingNumber).toMatch(/^SIM/);
  });

  it.each([undefined, '', 'disabled', 'invalid-provider'])(
    'never falls back to mock for provider %p in development',
    async (provider) => {
      process.env.NODE_ENV = 'development';
      if (provider === undefined) delete process.env.RETURN_PICKUP_PROVIDER;
      else process.env.RETURN_PICKUP_PROVIDER = provider;
      const fetchMock = jest.spyOn(globalThis, 'fetch');
      const gateway = new PickupGateway();
      expect(gateway.mode()).toBe('disabled');
      await expect(
        gateway.book({
          clientOrderCode: 'SC-R-1',
          pickup,
          warehouse,
          content: 'Hàng trả',
        }),
      ).rejects.toThrow('Chưa cấu hình dịch vụ lấy hàng trả');
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('rejects mock bookings in production even when explicitly configured', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RETURN_PICKUP_PROVIDER = 'mock';
    expect(new PickupGateway().mode()).toBe('disabled');
  });

  it('does not manufacture a tracking code when staging credentials are absent', async () => {
    process.env.RETURN_PICKUP_PROVIDER = 'staging';
    delete process.env.GHN_STAGING_TOKEN;
    delete process.env.GHN_STAGING_SHOP_ID;
    delete process.env.GHN_TEST_API_TOKEN;
    delete process.env.GHN_TEST_SHOP_ID;
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    await expect(
      new PickupGateway().book({
        clientOrderCode: 'SC-R-1',
        pickup,
        warehouse,
        content: 'Hàng trả',
      }),
    ).rejects.toThrow('Chưa cấu hình GHN Staging');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends customer as sender, shop as recipient, and a stable idempotency key to GHN staging', async () => {
    process.env.RETURN_PICKUP_PROVIDER = 'staging';
    process.env.GHN_STAGING_TOKEN = 'test-token';
    process.env.GHN_STAGING_SHOP_ID = '92837';
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        data: { order_code: 'GHN12345', total_fee: 20900 },
      }),
    } as Response);
    const result = await new PickupGateway().book({
      clientOrderCode: 'SC-R-123456789',
      pickup,
      warehouse,
      content: 'Hàng trả',
    });
    expect(result).toMatchObject({
      provider: 'GHN_STAGING',
      trackingNumber: 'GHN12345',
      feeAmount: 20900,
    });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('dev-online-gateway.ghn.vn');
    const rawBody = options?.body as string;
    const body = JSON.parse(rawBody);
    expect(body).toMatchObject({
      client_order_code: 'SC-R-123456789',
      from_phone: pickup.phone,
      from_address: pickup.address,
      to_address: warehouse.address,
      cod_amount: 0,
      pick_station_id: 0,
    });
    await expect(
      new PickupGateway().book({
        clientOrderCode: 'SC-R-TOO-HEAVY',
        pickup: { ...pickup, weight: 20000 },
        warehouse,
        content: 'Hàng trả',
      }),
    ).rejects.toThrow('dưới 20 kg');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shares GHN TEST credentials with return pickup without using LIVE keys', async () => {
    process.env.RETURN_PICKUP_PROVIDER = 'staging';
    delete process.env.GHN_STAGING_TOKEN;
    delete process.env.GHN_STAGING_SHOP_ID;
    process.env.GHN_TEST_API_TOKEN = 'sandbox-test-token';
    process.env.GHN_TEST_SHOP_ID = '230500';
    const carrier = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        data: { order_code: 'SANDBOX123', total_fee: 20000 },
      }),
    } as Response);
    const result = await new PickupGateway().book({
      clientOrderCode: 'SC-R-1',
      pickup,
      warehouse,
      content: 'Hàng trả',
    });
    expect(result).toMatchObject({
      provider: 'GHN_STAGING',
      trackingNumber: 'SANDBOX123',
    });
    expect(carrier).toHaveBeenCalledWith(
      'https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/create',
      expect.objectContaining({
        headers: expect.objectContaining({
          Token: 'sandbox-test-token',
          ShopId: '230500',
        }),
      }),
    );
  });

  it('reads status only for a tracking code owned by the configured GHN ShopId', async () => {
    process.env.RETURN_PICKUP_PROVIDER = 'staging';
    process.env.GHN_STAGING_TOKEN = 'test-token';
    process.env.GHN_STAGING_SHOP_ID = '92837';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        code: 200,
        data: { order_code: 'GHN12345', status: 'picked', shop_id: 92837 },
      }),
    } as Response);
    await expect(new PickupGateway().status('GHN12345')).resolves.toBe(
      'picked',
    );
  });
});
