import { PickupGateway } from './pickup.gateway';

describe('return shipment freight preview', () => {
  const originalEnv = { ...process.env };
  const input = {
    clientOrderCode: 'SC-X-case1', content: 'Replacement product x1',
    pickup: { name: 'Shop', phone: '0901234567', address: '12 Street', provinceName: 'Ha Noi', districtName: 'Ba Dinh', wardName: 'Phuc Xa', weight: 250, length: 15, width: 10, height: 5 },
    warehouse: { name: 'Customer', phone: '0903000001', address: '15 Street', provinceName: 'Ho Chi Minh', wardName: 'Sai Gon' },
  };
  beforeEach(() => {
    process.env.RETURN_PICKUP_PROVIDER = 'mock';
    process.env.GHN_TEST_API_TOKEN = 'test-only-token';
    process.env.GHN_TEST_SHOP_ID = '123';
    delete process.env.GHN_STAGING_TOKEN;
    delete process.env.GHN_STAGING_SHOP_ID;
  });
  afterEach(() => { process.env = { ...originalEnv }; jest.restoreAllMocks(); });
  const respond = (amount: unknown) => ({ ok: true, json: async () => ({ code: 200, data: { total_fee: amount } }) }) as Response;

  it('prices the exact route/parcel without creating an order or claiming a real charge', async () => {
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(respond(32500));
    const gateway = new PickupGateway();
    const quote = await gateway.quote(input);
    expect(quote).toMatchObject({ amount: 32500, currency: 'VND', source: 'GHN_TEST', estimated: true, charged: false });
    expect(fetcher.mock.calls[0][0]).toBe('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/preview');
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toMatchObject({ from_name: 'Shop', to_name: 'Customer', weight: 250, length: 15, width: 10, height: 5, payment_type_id: 1, cod_amount: 0, is_new_from_address: false, is_new_to_address: true });
    await gateway.quote(input);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await gateway.quote({ ...input, pickup: { ...input.pickup, weight: 750 } });
    await gateway.quote({ ...input, warehouse: { ...input.warehouse, address: '25 Street' } });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('accepts an explicit zero fee from GHN', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(respond(0));
    expect((await new PickupGateway().quote(input)).amount).toBe(0);
  });
  it.each([null, undefined, '32500', -1, 2.5, 2147483648])('rejects malformed fees instead of showing zero: %p', async amount => {
    jest.spyOn(global, 'fetch').mockResolvedValue(respond(amount));
    await expect(new PickupGateway().quote(input)).rejects.toThrow();
  });
  it('expires quotes after five minutes', async () => {
    const now = Date.now();
    const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
    const fetcher = jest.spyOn(global, 'fetch').mockResolvedValue(respond(32500));
    const gateway = new PickupGateway();
    await gateway.quote(input);
    clock.mockReturnValue(now + 301000);
    await gateway.quote(input);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('never falls back to live credentials or fabricates a quote on failure', async () => {
    delete process.env.GHN_TEST_API_TOKEN;
    process.env.GHN_API_TOKEN = 'live-must-not-be-used';
    const fetcher = jest.spyOn(global, 'fetch');
    await expect(new PickupGateway().quote(input)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('leaves mock booking offline and does not attach an estimated fee to the shipment', async () => {
    const fetcher = jest.spyOn(global, 'fetch');
    expect(await new PickupGateway().book(input)).toMatchObject({ provider: 'MOCK', feeAmount: null });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
