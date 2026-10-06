import { PickupGateway } from './pickup.gateway';

const pickup = { name: 'Khách A', phone: '0912345678', address: '15 Đường Số 9, Phường Linh Trung, TP Hồ Chí Minh', wardName: 'Phường Linh Trung', provinceName: 'Hồ Chí Minh', weight: 500, length: 20, width: 15, height: 10 };
const warehouse = { name: 'Kho Shop', phone: '0901234567', address: '12 Đường Số 8, Phường Linh Trung, TP Hồ Chí Minh', wardName: 'Phường Linh Trung', provinceName: 'Hồ Chí Minh' };

describe('GHN pickup adapter', () => {
  const originalMode = process.env.RETURN_PICKUP_PROVIDER;
  const originalToken = process.env.GHN_STAGING_TOKEN;
  const originalShopId = process.env.GHN_STAGING_SHOP_ID;

  afterEach(() => {
    if (originalMode === undefined) delete process.env.RETURN_PICKUP_PROVIDER;
    else process.env.RETURN_PICKUP_PROVIDER = originalMode;
    if (originalToken === undefined) delete process.env.GHN_STAGING_TOKEN;
    else process.env.GHN_STAGING_TOKEN = originalToken;
    if (originalShopId === undefined) delete process.env.GHN_STAGING_SHOP_ID;
    else process.env.GHN_STAGING_SHOP_ID = originalShopId;
    jest.restoreAllMocks();
  });

  it('creates a deterministic local booking without a carrier request', async () => {
    process.env.RETURN_PICKUP_PROVIDER = 'mock';
    const result = await new PickupGateway().book({ clientOrderCode: 'SC-R-123456789', pickup, warehouse, content: 'Hàng trả' });
    expect(result.provider).toBe('MOCK');
    expect(result.trackingNumber).toMatch(/^SIM/);
  });

  it('sends customer as sender, shop as recipient, and a stable idempotency key to GHN staging', async () => {
    process.env.RETURN_PICKUP_PROVIDER = 'staging';
    process.env.GHN_STAGING_TOKEN = 'test-token';
    process.env.GHN_STAGING_SHOP_ID = '92837';
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, data: { order_code: 'GHN12345', total_fee: 20900 } }),
    } as Response);
    const result = await new PickupGateway().book({ clientOrderCode: 'SC-R-123456789', pickup, warehouse, content: 'Hàng trả' });
    expect(result).toMatchObject({ provider: 'GHN_STAGING', trackingNumber: 'GHN12345', feeAmount: 20900 });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('dev-online-gateway.ghn.vn');
    const body = JSON.parse(String(options?.body));
    expect(body).toMatchObject({ client_order_code: 'SC-R-123456789', from_phone: pickup.phone,
      from_address: pickup.address, to_address: warehouse.address, cod_amount: 0, pick_station_id: 0 });
  });

  it('reads status only for a tracking code owned by the configured GHN ShopId', async () => {
    process.env.RETURN_PICKUP_PROVIDER = 'staging';
    process.env.GHN_STAGING_TOKEN = 'test-token';
    process.env.GHN_STAGING_SHOP_ID = '92837';
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, data: { order_code: 'GHN12345', status: 'picked', shop_id: 92837 } }),
    } as Response);
    await expect(new PickupGateway().status('GHN12345')).resolves.toBe('picked');
  });
});
