import { GhnService } from './ghn.service';
import { GhnEnvironment } from './dto/shipping.dto';
import { ghnTime, normalizeGhnEvents } from './ghn-tracking';

const secret = 'tracking-test-only-secret-with-at-least-32-characters';
const date = '2026-01-02T03:00:00Z';
function fixture() {
  const records = new Map<string, any>();
  const key = (where: any) => `${where.environment_orderCode.environment}:${where.environment_orderCode.orderCode}`;
  const model = {
    findUnique: jest.fn(async ({ where }: any) => records.get(key(where)) || null),
    upsert: jest.fn(async ({ where, create }: any) => {
      if (!records.has(key(where))) records.set(key(where), { ...create, observedAt: new Date(), contactUpdatedAt: null, statusUpdatedAt: null });
      return structuredClone(records.get(key(where)));
    }),
    update: jest.fn(async ({ where, data }: any) => {
      records.set(key(where), { ...records.get(key(where)), ...data }); return records.get(key(where));
    }),
  };
  const tx: any = { ghnTrackingRecord: model };
  const prisma: any = { ghnTrackingRecord: model, order: { findFirst: jest.fn().mockResolvedValue({ id: 'order', status: 'SHIPPING', rawPayload: {} }) },
    $transaction: jest.fn(async (callback: any) => callback(tx)) };
  const values: Record<string, string> = { GHN_WEBHOOK_SECRET: secret, GHN_SHOP_ID: '123', GHN_TEST_SHOP_ID: '456' };
  const service = new GhnService(prisma, { get: (name: string) => values[name] } as any);
  const fetch = jest.spyOn(service as any, 'ghnFetch').mockResolvedValue({ code: 200, data: { status: 'delivering', updated_date: date, log: [] } });
  return { service, fetch, records, model, prisma };
}

describe('Word section 3 live GHN tracking', () => {
  it('normalizes every requested milestone, sorts, deduplicates and ignores malformed entries', () => {
    const statuses = ['picked', 'storing', 'delivering', 'delivered'];
    const log = statuses.map((status, i) => ({ status, created_date: `2026-01-02T0${i + 1}:00:00Z` }));
    const events = normalizeGhnEvents([null, {}, ...log.slice().reverse(), log[0], { status: 'injected' }]);
    expect(events.map(e => e.status)).toEqual(statuses);
    expect(events.map(e => e.title)).toEqual(['Bưu tá đã lấy hàng tại kho Shop', 'Nhập kho trung chuyển', 'Shipper đang đi giao', 'Giao hàng thành công']);
    expect(ghnTime('2026-01-02 10:00:00')).toBe(date.replace('Z', '.000Z'));
    expect(ghnTime('not-a-time')).toBeNull();
  });

  it('retains verified API history and contact when later responses omit them; labels an outage as stale', async () => {
    const { service, fetch } = fixture();
    fetch.mockResolvedValueOnce({ code: 200, data: { status: 'delivering', updated_date: date,
      shipper_name: 'Bưu tá kiểm thử', shipper_phone: '0900000000', log: [{ status: 'picked', created_date: '2026-01-02T01:00:00Z' }] } });
    await service.trackOrder('REAL-ORDER', GhnEnvironment.LIVE);
    const second = await service.trackOrder('REAL-ORDER', GhnEnvironment.LIVE);
    expect(second.timeline).toHaveLength(1);
    expect(second.shipperName).toBe('Bưu tá kiểm thử'); expect(second.shipperPhone).toBe('0900000000');
    fetch.mockResolvedValueOnce({ code: 503 });
    const stale = await service.trackOrder('REAL-ORDER', GhnEnvironment.LIVE);
    expect(stale).toMatchObject({ isStale: true, status: 'delivering', shipperPhone: '0900000000' });
    expect(stale.timeline).toHaveLength(1);
  });

  it.each([undefined, 'wrong-secret'])('ignores forged shipper metadata without a valid callback secret: %s', async supplied => {
    const { service, records } = fixture();
    await service.handleGhnWebhook({ ShopID: 123, OrderCode: 'REAL-ORDER', Status: 'delivering', Time: date,
      ShipperName: 'Forged', ShipperPhone: '0900000000' }, supplied);
    const record = records.get('LIVE:REAL-ORDER');
    expect(record.shipperName).toBeUndefined(); expect(record.events).toEqual([]);
  });

  it('persists authenticated shipper/warehouse callbacks and deduplicates replay', async () => {
    const { service } = fixture();
    const payload = { ShopID: 123, OrderCode: 'REAL-ORDER', Status: 'delivering', Time: date,
      ShipperName: 'Bưu tá kiểm thử', ShipperPhone: '0900000000', Warehouse: 'Kho kiểm thử' };
    await service.handleGhnWebhook(payload, secret);
    await service.handleGhnWebhook(payload, secret);
    const result = await service.trackOrder('REAL-ORDER', GhnEnvironment.LIVE);
    expect(result).toMatchObject({ shipperName: payload.ShipperName, shipperPhone: payload.ShipperPhone, isStale: false });
    expect(result.timeline).toHaveLength(1);
    expect(result.timeline[0]).toMatchObject({ warehouse: payload.Warehouse, shipperPhone: payload.ShipperPhone });
  });

  it('rejects metadata for a different GHN shop even with a correct shared secret', async () => {
    const { service, records } = fixture();
    await service.handleGhnWebhook({ ShopID: 999, OrderCode: 'REAL-ORDER', Status: 'delivering', Time: date,
      ShipperPhone: '0900000000' }, secret);
    expect(records.get('LIVE:REAL-ORDER').shipperPhone).toBeUndefined();
  });

  it('keeps an authenticated late historical event without regressing the latest status', async () => {
    const { service, fetch, records } = fixture();
    fetch.mockResolvedValue({ code: 200, data: { status: 'delivered', updated_date: '2026-01-02T04:00:00Z' } });
    await service.handleGhnWebhook({ ShopID: 123, OrderCode: 'REAL-ORDER', Status: 'delivering', Time: date,
      ShipperPhone: '0900000000' }, secret);
    expect(records.get('LIVE:REAL-ORDER').status).toBe('delivered');
    expect(records.get('LIVE:REAL-ORDER').events[0].status).toBe('delivering');
  });

  it('isolates staging evidence from production even if order codes collide', async () => {
    const { service, fetch } = fixture();
    fetch.mockResolvedValueOnce({ code: 200, data: { status: 'delivering', updated_date: date, shipper_name: 'Live driver' } });
    await service.trackOrder('REAL-ORDER', GhnEnvironment.LIVE);
    const staging = await service.trackOrder('REAL-ORDER', GhnEnvironment.TEST);
    expect(staging.shipperName).toBeNull(); expect(staging.timeline).toEqual([]);
  });

  it('does not invent past milestones, contact or timestamps for a fresh staging order', async () => {
    const { service, fetch } = fixture(); fetch.mockResolvedValueOnce({ code: 200, data: { status: 'ready_to_pick', log: [null] } });
    expect(await service.trackOrder('REAL-ORDER', GhnEnvironment.TEST)).toMatchObject({ status: 'ready_to_pick', timeline: [], shipperName: null, shipperPhone: null });
  });

  it('keeps a driver on the historical delivery attempt without reusing that phone for a newer attempt', async () => {
    const { service, fetch } = fixture();
    fetch.mockResolvedValueOnce({ code: 200, data: { status: 'delivering', updated_date: date, shipper_name: 'First driver', shipper_phone: '0900000000',
      log: [{ status: 'delivering', created_date: date }] } });
    await service.trackOrder('REAL-ORDER', GhnEnvironment.LIVE);
    fetch.mockResolvedValueOnce({ code: 200, data: { status: 'delivering', updated_date: '2026-01-03T03:00:00Z',
      log: [{ status: 'delivering', created_date: '2026-01-03T03:00:00Z' }] } });
    const next = await service.trackOrder('REAL-ORDER', GhnEnvironment.LIVE);
    expect(next.shipperPhone).toBeNull(); expect(next.timeline[0].shipperPhone).toBe('0900000000');
    expect(next.timeline[1].shipperPhone).toBeNull();
  });

  it('keeps a real GHN not-found response distinct from a cached successful lookup', async () => {
    const { service, fetch } = fixture();
    await service.trackOrder('REAL-ORDER', GhnEnvironment.LIVE);
    fetch.mockResolvedValueOnce({ code: 400, message: 'Đơn hàng không tồn tại' });
    expect(await service.trackOrder('REAL-ORDER', GhnEnvironment.LIVE)).toMatchObject({ status: 'unavailable', trackingError: 'ORDER_NOT_FOUND', isStale: true });
  });
});
