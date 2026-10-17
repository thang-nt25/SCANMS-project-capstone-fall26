import { GhnService } from './ghn.service';
import { GhnEnvironment } from './dto/shipping.dto';

const secret = 'sample-sla-test-only-webhook-secret-at-least-32';
const deliveredAt = '2026-01-02T03:00:00.000Z';
function fixture(status = 'SHIPPED') {
  const sample: any = { id: 'sample-1', collaboratorId: 'kol-1', status, carrier: 'GHN', trackingNumber: 'GHN-CURRENT',
    rejectedReason: 'Sự cố cũ', receivedAt: null, deadlineAt: null, expectedVideoAt: null };
  const records = new Map<string, any>();
  const key = (where: any) => `${where.environment_orderCode.environment}:${where.environment_orderCode.orderCode}`;
  const model = {
    findUnique: jest.fn(async ({ where }: any) => records.get(key(where)) || null),
    upsert: jest.fn(async ({ where, create }: any) => {
      if (!records.has(key(where))) records.set(key(where), { ...create, observedAt: new Date() });
      return records.get(key(where));
    }),
    update: jest.fn(async ({ where, data }: any) => { const row = { ...records.get(key(where)), ...data }; records.set(key(where), row); return row; }),
  };
  const prisma: any = {
    ghnTrackingRecord: model,
    sampleProductRequest: {
      findUnique: jest.fn(async () => ({ ...sample })),
      findFirst: jest.fn(async ({ where }: any) => where.trackingNumber === sample.trackingNumber ? { ...sample } : null),
      findMany: jest.fn(async ({ where }: any) => (where.status.in || [where.status]).includes(sample.status) ? [{ id: sample.id, trackingNumber: sample.trackingNumber }] : []),
      updateMany: jest.fn(async ({ where, data }: any) => {
        if (!(where.status.in || [where.status]).includes(sample.status) || where.trackingNumber !== sample.trackingNumber ||
          (where.carrier && !sample.carrier.toUpperCase().includes('GHN')) || (where.receivedAt === null && sample.receivedAt !== null)) return { count: 0 };
        Object.assign(sample, data); return { count: 1 };
      }),
    },
    order: { findFirst: jest.fn(async () => null) },
    sampleRequestEvent: { create: jest.fn() }, notification: { create: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
  const config = { get: (name: string) => ({ GHN_WEBHOOK_SECRET: secret, GHN_SHOP_ID: '101', GHN_TEST_SHOP_ID: '202' })[name] };
  const service = new GhnService(prisma, config as any);
  const track = jest.spyOn(service, 'trackOrder').mockResolvedValue({ environment: GhnEnvironment.LIVE,
    ghnRawDetail: { status: 'delivered', log: [{ status: 'delivered', created_date: deliveredAt }] } } as any);
  const payload = { ShopID: 101, OrderCode: 'GHN-CURRENT', Status: 'delivered', Time: deliveredAt };
  return { service, prisma, sample, records, track, payload };
}

describe('Word section 2 sample receipt and 14-day SLA', () => {
  it.each(['SHIPPED', 'DELIVERY_ISSUE'])('synchronizes verified delivery from %s exactly once', async status => {
    const { service, sample, prisma, track } = fixture(status);
    expect(await service.syncSampleDelivery(sample.id, 'kol-1')).toEqual({ status: 'RECEIVED', synchronized: true });
    expect(track).toHaveBeenCalledWith('GHN-CURRENT', GhnEnvironment.LIVE);
    expect(sample.receivedAt.toISOString()).toBe(deliveredAt);
    expect(sample.deadlineAt.getTime() - sample.receivedAt.getTime()).toBe(14 * 86400000);
    expect(sample.rejectedReason).toBeNull();
    expect(await service.syncSampleDelivery(sample.id, 'kol-1')).toEqual({ status: 'RECEIVED', synchronized: false });
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('includes unresolved delivery issues in the safe scheduled reconciliation', async () => {
    const { service, sample, prisma } = fixture('DELIVERY_ISSUE');
    await service.reconcileShippedSamples();
    expect(prisma.sampleProductRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: ['SHIPPED', 'DELIVERY_ISSUE'] } }),
    }));
    expect(sample.status).toBe('RECEIVED');
  });

  it.each(['SHIPPED', 'DELIVERY_ISSUE'])('uses an authenticated callback timestamp when detail omits delivery times: %s', async status => {
    const { service, sample, track, payload, prisma } = fixture(status);
    track.mockResolvedValue({ environment: GhnEnvironment.LIVE, ghnRawDetail: { status: 'delivered', log: [] } } as any);
    expect(await service.handleGhnWebhook(payload, secret)).toMatchObject({ success: true, synchronized: true });
    expect(sample.receivedAt.toISOString()).toBe(deliveredAt);
    const firstDeadline = sample.deadlineAt.getTime();
    expect(await service.handleGhnWebhook({ ...payload, Time: '2026-01-03T03:00:00Z' }, secret)).toMatchObject({ success: true, synchronized: false });
    expect(sample.deadlineAt.getTime()).toBe(firstDeadline);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'incorrect'])('does not trust an unsigned timestamp when GHN has no delivery time (%s)', async supplied => {
    const { service, sample, track, payload } = fixture();
    track.mockResolvedValue({ environment: GhnEnvironment.LIVE, ghnRawDetail: { status: 'delivered', log: [] } } as any);
    await service.handleGhnWebhook(payload, supplied);
    expect(sample.status).toBe('SHIPPED'); expect(sample.deadlineAt).toBeNull();
  });

  it('does not accept callback timing for another GHN Shop ID', async () => {
    const { service, sample, track, payload } = fixture();
    track.mockResolvedValue({ environment: GhnEnvironment.LIVE, ghnRawDetail: { status: 'delivered', log: [] } } as any);
    await service.handleGhnWebhook({ ...payload, ShopID: 999 }, secret);
    expect(sample.deadlineAt).toBeNull();
  });

  it('can use previously persisted LIVE delivery evidence without extending its original date', async () => {
    const { service, sample, records, track } = fixture();
    records.set('LIVE:GHN-CURRENT', { events: [{ status: 'delivered', time: deliveredAt }] });
    track.mockResolvedValue({ ghnRawDetail: { status: 'delivered', log: [] } } as any);
    await service.syncSampleDelivery(sample.id, 'kol-1');
    expect(sample.receivedAt.toISOString()).toBe(deliveredAt);
  });

  it('never borrows a timestamp from TEST records with the same waybill code', async () => {
    const { service, sample, records, track } = fixture();
    records.set('TEST:GHN-CURRENT', { events: [{ status: 'delivered', time: deliveredAt }] });
    track.mockResolvedValue({ ghnRawDetail: { status: 'delivered', log: [] } } as any);
    await service.syncSampleDelivery(sample.id, 'kol-1');
    expect(sample.deadlineAt).toBeNull();
  });

  it('requires current GHN delivery confirmation even when stored history says delivered', async () => {
    const { service, sample, records, track } = fixture('DELIVERY_ISSUE');
    records.set('LIVE:GHN-CURRENT', { events: [{ status: 'delivered', time: deliveredAt }] });
    track.mockResolvedValue({ ghnRawDetail: { status: 'delivering' } } as any);
    await service.syncSampleDelivery(sample.id, 'kol-1');
    expect(sample.status).toBe('DELIVERY_ISSUE'); expect(sample.deadlineAt).toBeNull();
  });

  it.each(['new-waybill', 'cancel'])('does not update a changed request while carrier lookup is in flight: %s', async change => {
    const { service, sample, track, prisma } = fixture();
    track.mockImplementation(async () => {
      if (change === 'new-waybill') sample.trackingNumber = 'GHN-RESENT'; else sample.status = 'CANCELLED';
      return { ghnRawDetail: { status: 'delivered', finish_date: deliveredAt } } as any;
    });
    await service.syncSampleDelivery(sample.id, 'kol-1');
    expect(sample.deadlineAt).toBeNull(); expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('never starts SLA from a future callback timestamp or a general updated_date', async () => {
    const { service, sample, track, payload } = fixture();
    const future = new Date(Date.now() + 86400000).toISOString();
    track.mockResolvedValue({ environment: GhnEnvironment.LIVE, ghnRawDetail: { status: 'delivered', updated_date: deliveredAt } } as any);
    await service.handleGhnWebhook({ ...payload, Time: future }, secret);
    expect(sample.deadlineAt).toBeNull();
  });

  it('never applies a staging delivery callback to a LIVE sample with a matching code', async () => {
    const { service, sample, track, payload, prisma } = fixture();
    track.mockResolvedValue({ environment: GhnEnvironment.TEST,
      ghnRawDetail: { status: 'delivered', log: [{ status: 'delivered', created_date: deliveredAt }] } } as any);
    await service.handleGhnWebhook({ ...payload, ShopID: 202 }, secret);
    expect(sample.status).toBe('SHIPPED'); expect(prisma.sampleProductRequest.updateMany).not.toHaveBeenCalled();
  });

  it('does not treat stale cached delivery during an outage as fresh confirmation', async () => {
    const { service, sample, records, track } = fixture();
    records.set('LIVE:GHN-CURRENT', { events: [{ status: 'delivered', time: deliveredAt }] });
    track.mockResolvedValue({ status: 'delivered', isStale: true, ghnRawDetail: null } as any);
    await service.syncSampleDelivery(sample.id, 'kol-1');
    expect(sample.deadlineAt).toBeNull();
  });

  it('does not let another KOL trigger receipt synchronization', async () => {
    const { service, sample, track } = fixture();
    await expect(service.syncSampleDelivery(sample.id, 'another-kol')).rejects.toThrow('Không tìm thấy yêu cầu mẫu');
    expect(track).not.toHaveBeenCalled(); expect(sample.deadlineAt).toBeNull();
  });

  it('does not confirm a request switched to another carrier during GHN lookup', async () => {
    const { service, sample, track } = fixture('DELIVERY_ISSUE');
    track.mockImplementation(async () => {
      sample.carrier = 'GHTK'; sample.status = 'SHIPPED';
      return { ghnRawDetail: { status: 'delivered', finish_date: deliveredAt } } as any;
    });
    await service.syncSampleDelivery(sample.id, 'kol-1');
    expect(sample.status).toBe('SHIPPED'); expect(sample.deadlineAt).toBeNull();
  });
});
