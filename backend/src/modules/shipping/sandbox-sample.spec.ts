import { GhnService } from './ghn.service';

describe('sandbox sample receipt isolation', () => {
  const originalFlag = process.env.SHIPPING_SIMULATION_ENABLED;
  const originalNodeEnv = process.env.NODE_ENV;
  beforeEach(() => {
    process.env.SHIPPING_SIMULATION_ENABLED = 'true';
    process.env.NODE_ENV = 'test';
  });
  afterEach(() => {
    if (originalFlag === undefined)
      delete process.env.SHIPPING_SIMULATION_ENABLED;
    else process.env.SHIPPING_SIMULATION_ENABLED = originalFlag;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });
  function fixture() {
    let details: any = null;
    const charge = {
      id: 'charge-1',
      amount: 49000 as number | null,
      sampleRequestId: 'sample',
      sampleRequest: {
        collaboratorId: 'kol',
        product: { store: { ownerId: 'shop' } },
      },
    };
    const tx = {
      $executeRaw: jest.fn(),
      sampleRequestEvent: {
        findFirst: jest.fn(async () => (details ? { details } : null)),
        create: jest.fn(async (args) => {
          details = args.data.details;
        }),
      },
    };
    const db = {
      sampleShippingCharge: { findFirst: jest.fn().mockResolvedValue(charge) },
      sampleProductRequest: { update: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)),
    };
    return { service: new GhnService(db as any, {} as any), db, tx, charge };
  }
  it('records simulated freight payment once, shares it with KOL and preserves it across delivery actions', async () => {
    const { service, db, tx } = fixture();
    const carrier = jest.spyOn(service as any, 'ghnFetch');
    const paid = await service.sandboxSampleState(
      'TEST123',
      'shop',
      'pay-shipping',
    );
    expect(paid.shippingPayment).toMatchObject({
      status: 'PAID_SIMULATED',
      amount: 49000,
      payer: 'SHOP',
      codAmount: 0,
      reference: 'SBX-SHIP-charge-1',
      paidBy: 'shop',
    });
    expect(paid.receivedAt).toBeNull();
    expect(paid.simulationStartedAt).toBeNull();
    expect(
      (await service.sandboxSampleState('TEST123', 'shop', 'pay-shipping'))
        .shippingPayment,
    ).toEqual(paid.shippingPayment);
    expect(tx.sampleRequestEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(
      (await service.sandboxSampleState('TEST123', 'kol')).shippingPayment,
    ).toEqual(paid.shippingPayment);
    await service.sandboxSampleState('TEST123', 'shop', 'start');
    await service.sandboxSampleState('TEST123', 'shop', 'receive');
    expect(
      (await service.sandboxSampleState('TEST123', 'kol')).shippingPayment,
    ).toEqual(paid.shippingPayment);
    expect(carrier).not.toHaveBeenCalled();
    expect(db.sampleProductRequest.update).not.toHaveBeenCalled();
    expect(db.sampleProductRequest.updateMany).not.toHaveBeenCalled();
  });
  it('restricts payment to the sample owner and refuses unknown or invalid freight', async () => {
    const { service, db, tx, charge } = fixture();
    await expect(
      service.sandboxSampleState('TEST123', 'kol', 'pay-shipping'),
    ).rejects.toThrow('quyền');
    await expect(
      service.sandboxSampleState('TEST123', 'other-shop', 'pay-shipping'),
    ).rejects.toThrow('quyền');
    for (const amount of [null, -1, NaN, Infinity]) {
      charge.amount = amount;
      await expect(
        service.sandboxSampleState('TEST123', 'shop', 'pay-shipping'),
      ).rejects.toThrow('cước GHN hợp lệ');
    }
    expect(tx.sampleRequestEvent.create).not.toHaveBeenCalled();
    charge.amount = 0;
    expect(
      (await service.sandboxSampleState('TEST123', 'shop', 'pay-shipping'))
        .shippingPayment.amount,
    ).toBe(0);
    db.sampleShippingCharge.findFirst.mockResolvedValue(null);
    await expect(
      service.sandboxSampleState('LIVE123', 'shop', 'pay-shipping'),
    ).rejects.toThrow('Không tìm thấy');
  });
  it('persists simulated receipt and video while leaving the real sample untouched', async () => {
    const { service, db, tx } = fixture();
    await expect(
      service.sandboxSampleState(
        'TEST123',
        'kol',
        'video',
        'https://example.test/a',
      ),
    ).rejects.toThrow('chưa xác nhận');
    const first = await service.sandboxSampleState(
      'TEST123',
      'shop',
      'receive',
    );
    expect(Date.parse(first.deadlineAt!) - Date.parse(first.receivedAt!)).toBe(
      14 * 86400000,
    );
    const repeat = await service.sandboxSampleState(
      'TEST123',
      'shop',
      'receive',
    );
    expect(repeat.receivedAt).toBe(first.receivedAt);
    expect(tx.sampleRequestEvent.create).toHaveBeenCalledTimes(1);
    await service.sandboxSampleState(
      'TEST123',
      'kol',
      'video',
      'https://example.test/review',
    );
    expect((await service.sandboxSampleState('TEST123', 'shop')).videoUrl).toBe(
      'https://example.test/review',
    );
    expect(db.sampleProductRequest.update).not.toHaveBeenCalled();
    expect(db.sampleProductRequest.updateMany).not.toHaveBeenCalled();
    expect(db.sampleShippingCharge.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          trackingNumber: 'TEST123',
          environment: 'TEST',
          carrier: 'GHN',
        },
      }),
    );
  });
  it('rejects unrelated accounts, receipt by KOL, video by Shop and real waybills', async () => {
    const { service, db } = fixture();
    await expect(
      service.sandboxSampleState('TEST123', 'stranger'),
    ).rejects.toThrow('quyền');
    await expect(
      service.sandboxSampleState('TEST123', 'kol', 'receive'),
    ).rejects.toThrow('quyền');
    await expect(
      service.sandboxSampleState('TEST123', 'kol', 'expire'),
    ).rejects.toThrow('quyền');
    await expect(
      service.sandboxSampleState(
        'TEST123',
        'shop',
        'video',
        'https://example.test/a',
      ),
    ).rejects.toThrow('quyền');
    await expect(
      service.sandboxSampleState(
        'TEST123',
        'kol',
        'video',
        'javascript:alert(1)',
      ),
    ).rejects.toThrow('không hợp lệ');
    db.sampleShippingCharge.findFirst.mockResolvedValue(null);
    await expect(
      service.sandboxSampleState('LIVE123', 'shop', 'receive'),
    ).rejects.toThrow('Không tìm thấy');
  });
  it('advances sandbox delivery from pickup to transit to delivered after one minute per step', async () => {
    const { service, db, tx } = fixture();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T12:00:00.000Z'));
    try {
      const started = await service.sandboxSampleState(
        'TEST123',
        'shop',
        'start',
      );
      expect(started.deliveryStatus).toBe('WAITING_PICKUP');
      expect(started.receivedAt).toBeNull();
      jest.advanceTimersByTime(20_000);
      const resumed = await service.sandboxSampleState('TEST123', 'kol');
      expect(resumed.simulationStartedAt).toBe(started.simulationStartedAt);
      const repeatedStart = await service.sandboxSampleState(
        'TEST123',
        'shop',
        'start',
      );
      expect(repeatedStart.simulationStartedAt).toBe(
        started.simulationStartedAt,
      );
      expect(repeatedStart.deliveryStatus).toBe('WAITING_PICKUP');
      jest.advanceTimersByTime(40_000);
      const transit = await service.sandboxSampleState('TEST123', 'kol');
      expect(transit.deliveryStatus).toBe('IN_TRANSIT');
      expect(transit.receivedAt).toBeNull();
      jest.advanceTimersByTime(60_000);
      const delivered = await service.sandboxSampleState('TEST123', 'kol');
      expect(delivered.deliveryStatus).toBe('DELIVERED');
      expect(delivered.status).toBe('RECEIVED');
      expect(
        Date.parse(delivered.receivedAt!) -
          Date.parse(started.simulationStartedAt!),
      ).toBe(120_000);
      expect(
        Date.parse(delivered.deadlineAt!) - Date.parse(delivered.receivedAt!),
      ).toBe(14 * 86400000);
      expect(tx.sampleRequestEvent.create).toHaveBeenCalledTimes(4);
      expect(db.sampleProductRequest.update).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
  it('only the Shop can start a simulated shipment and can restart a legacy received-only sample', async () => {
    const { service } = fixture();
    await expect(
      service.sandboxSampleState('TEST123', 'kol', 'start'),
    ).rejects.toThrow('quyền');
    await service.sandboxSampleState('TEST123', 'shop', 'receive');
    const restarted = await service.sandboxSampleState(
      'TEST123',
      'shop',
      'start',
    );
    expect(restarted.deliveryStatus).toBe('WAITING_PICKUP');
    expect(restarted.receivedAt).toBeNull();
    expect(restarted.videoUrl).toBeNull();
  });
  it('simulates overdue without moving the receipt/deadline or blocking late video submission', async () => {
    const { service, db } = fixture();
    await expect(
      service.sandboxSampleState('TEST123', 'shop', 'expire'),
    ).rejects.toThrow('Chỉ thử quá hạn');
    const received = await service.sandboxSampleState(
      'TEST123',
      'shop',
      'receive',
    );
    const expired = await service.sandboxSampleState(
      'TEST123',
      'shop',
      'expire',
    );
    expect(expired.status).toBe('OVERDUE');
    expect(expired.deadlineAt).toBe(received.deadlineAt);
    expect(expired.receivedAt).toBe(received.receivedAt);
    expect(Date.parse(expired.simulatedNow!)).toBeGreaterThan(
      Date.parse(expired.deadlineAt!),
    );
    expect((await service.sandboxSampleState('TEST123', 'kol')).status).toBe(
      'OVERDUE',
    );
    expect(
      (
        await service.sandboxSampleState(
          'TEST123',
          'kol',
          'video',
          'https://youtube.com/watch?v=late',
        )
      ).status,
    ).toBe('VIDEO_SUBMITTED');
    await expect(
      service.sandboxSampleState('TEST123', 'shop', 'expire'),
    ).rejects.toThrow('Chỉ thử quá hạn');
    expect(db.sampleProductRequest.updateMany).not.toHaveBeenCalled();
  });
});
