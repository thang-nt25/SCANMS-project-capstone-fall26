import { BadRequestException } from '@nestjs/common';
import { GhnService } from './ghn.service';
import { createCustomerGhnSimulation } from './customer-ghn-simulation';
import { GhnEnvironment } from './dto/shipping.dto';

const startedAt = Date.parse('2026-10-18T00:00:00Z');

function fixture(environment = 'TEST', status = 'SHIPPING') {
  const order = {
    id: 'order',
    storeId: 'shop',
    customerId: 'customer',
    externalOrderSn: 'DH-TEST',
    status,
    rawPayload: {
      ghnEnvironment: environment,
      ghnOrderCode: 'TEST-ORDER',
      paymentStatus: 'UNPAID',
      ghnSimulation: createCustomerGhnSimulation('TEST-ORDER', startedAt),
    },
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: 'order' }]),
    order: {
      findUniqueOrThrow: jest.fn(async () => order),
      update: jest.fn(async ({ data }) => Object.assign(order, data)),
    },
    notification: { create: jest.fn().mockResolvedValue({}) },
  };
  const db = {
    $transaction: jest.fn(async (callback) => callback(tx)),
    order: {
      findFirst: jest.fn(async () => ({ rawPayload: order.rawPayload })),
    },
  };
  return { service: new GhnService(db as any, {} as any), order, db, tx };
}

describe('explicit GHN TEST delivery completion', () => {
  const previousFlag = process.env.SHIPPING_SIMULATION_ENABLED;
  const previousMode = process.env.NODE_ENV;
  beforeEach(() => {
    process.env.SHIPPING_SIMULATION_ENABLED = 'true';
    process.env.NODE_ENV = 'test';
    jest.spyOn(Date, 'now').mockReturnValue(startedAt + 240_000);
  });
  afterEach(() => {
    if (previousFlag === undefined)
      delete process.env.SHIPPING_SIMULATION_ENABLED;
    else process.env.SHIPPING_SIMULATION_ENABLED = previousFlag;
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    jest.restoreAllMocks();
  });

  it.each(['disabled', 'production'])(
    'rejects %s before accessing DB, with an actionable 400',
    async (mode) => {
      if (mode === 'disabled')
        process.env.SHIPPING_SIMULATION_ENABLED = 'false';
      else process.env.NODE_ENV = 'production';
      const { service, db } = fixture();
      await expect(
        service.completeCustomerSimulation('order', 'actor', 'shop'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects a LIVE shipment even with a completed simulated clock present', async () => {
    const { service, tx } = fixture('LIVE');
    await expect(
      service.completeCustomerSimulation('order', 'actor', 'shop'),
    ).rejects.toThrow('GHN TEST');
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it('rejects a different shop before changing or notifying anything', async () => {
    const { service, tx } = fixture();
    await expect(
      service.completeCustomerSimulation('order', 'actor', 'other-shop'),
    ).rejects.toThrow('không thuộc');
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.notification.create).not.toHaveBeenCalled();
  });

  it('rejects a missing order or simulation', async () => {
    const { service, tx, order } = fixture();
    tx.$queryRaw.mockResolvedValueOnce([]);
    await expect(
      service.completeCustomerSimulation('order', 'actor', 'shop'),
    ).rejects.toThrow('Không tìm thấy');
    delete (order.rawPayload as Record<string, unknown>).ghnSimulation;
    await expect(
      service.completeCustomerSimulation('order', 'actor', 'shop'),
    ).rejects.toThrow('đã bắt đầu mô phỏng');
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('requires all four minutes to elapse', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(startedAt + 239_999);
    const { service, tx } = fixture();
    await expect(
      service.completeCustomerSimulation('order', 'actor', 'shop'),
    ).rejects.toThrow('chờ đủ 4 phút');
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it.each([
    'PENDING',
    'COMPLETED',
    'RETURN_REQUESTED',
    'CANCELLED',
    'RETURNED',
  ])('never rewinds the order from %s', async (status) => {
    const { service, tx } = fixture('TEST', status);
    await expect(
      service.completeCustomerSimulation('order', 'actor', 'shop'),
    ).rejects.toThrow('đang giao');
    expect(tx.order.update).not.toHaveBeenCalled();
  });

  it('saves delivery and a clearly marked notification once, without confirming payment or releasing funds', async () => {
    const { service, tx, db, order } = fixture();
    await expect(
      service.completeCustomerSimulation('order', 'actor', 'shop'),
    ).resolves.toMatchObject({ status: 'DELIVERED', isSimulation: true });
    await expect(
      service.completeCustomerSimulation('order', 'actor', 'shop'),
    ).resolves.toMatchObject({ status: 'DELIVERED' });
    expect(db.$transaction).toHaveBeenCalledTimes(2);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.order.update).toHaveBeenCalledTimes(1);
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
          rawPayload: expect.objectContaining({
            paymentStatus: 'UNPAID',
            ghnSimulation: expect.objectContaining({
              completedBy: 'actor',
              completedAt: expect.any(String),
            }),
          }),
        },
      }),
    );
    expect(tx.notification.create).toHaveBeenCalledTimes(1);
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'customer',
        title: 'Đơn TEST đã hoàn tất giao thử',
        data: expect.objectContaining({ isSimulation: true }),
      }),
    });
    expect(order).not.toHaveProperty('completedAt');
  });

  it('does not publish a successful completion when the notification write fails', async () => {
    const { service, tx } = fixture();
    tx.notification.create.mockRejectedValueOnce(
      new Error('notification unavailable'),
    );
    await expect(
      service.completeCustomerSimulation('order', 'actor', 'shop'),
    ).rejects.toThrow('notification unavailable');
    // The real interactive transaction rolls both writes back; no error is swallowed.
  });

  it('advertises disabled/TEST/LIVE capabilities and never completes an order during public tracking', async () => {
    const { service, tx } = fixture();
    const provider = jest
      .spyOn(service as any, 'ghnFetch')
      .mockResolvedValue({ code: 200, data: { status: 'picked', log: [] } });
    await expect(
      service.trackOrder('TEST-ORDER', GhnEnvironment.TEST),
    ).resolves.toMatchObject({ isSimulation: true, simulationAvailable: true });
    process.env.SHIPPING_SIMULATION_ENABLED = 'false';
    await expect(
      service.trackOrder('TEST-ORDER', GhnEnvironment.TEST),
    ).resolves.toMatchObject({ simulationAvailable: false });
    process.env.SHIPPING_SIMULATION_ENABLED = 'true';
    await expect(
      service.trackOrder('LIVE-ORDER', GhnEnvironment.LIVE),
    ).resolves.toMatchObject({ simulationAvailable: false });
    expect(provider).toHaveBeenCalledTimes(2);
    expect(tx.order.update).not.toHaveBeenCalled();
  });
});
