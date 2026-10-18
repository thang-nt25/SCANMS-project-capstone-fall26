import {
  createCustomerGhnSimulation,
  customerGhnSimulationDetail,
} from './customer-ghn-simulation';
import { GhnService } from './ghn.service';
import { GhnEnvironment } from './dto/shipping.dto';

const start = Date.parse('2026-01-02T00:00:00Z');
function raw() {
  return {
    ghnEnvironment: 'TEST',
    ghnOrderCode: 'TEST-ORDER',
    ghnSimulation: createCustomerGhnSimulation('TEST-ORDER', start),
  };
}
describe('customer purchase GHN simulation', () => {
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
    jest.restoreAllMocks();
  });

  it.each([undefined, 'false', '', 'TRUE'])(
    'blocks simulation without explicit opt-in (%p) before any DB access',
    async (flag) => {
      if (flag === undefined) delete process.env.SHIPPING_SIMULATION_ENABLED;
      else process.env.SHIPPING_SIMULATION_ENABLED = flag;
      const db = {
        $transaction: jest.fn(),
        sampleShippingCharge: { findFirst: jest.fn() },
      };
      const service = new GhnService(db as any, {} as any);
      await expect(service.startCustomerSimulation('order')).rejects.toThrow(
        'Mô phỏng vận chuyển đang tắt',
      );
      await expect(
        service.sandboxSampleState('TEST-ORDER', 'shop', 'pay-shipping'),
      ).rejects.toThrow('Mô phỏng vận chuyển đang tắt');
      expect(db.$transaction).not.toHaveBeenCalled();
      expect(db.sampleShippingCharge.findFirst).not.toHaveBeenCalled();
    },
  );

  it('never simulates shipping in production even with explicit opt-in', async () => {
    process.env.NODE_ENV = 'production';
    const service = new GhnService({} as any, {} as any);
    await expect(service.startCustomerSimulation('order')).rejects.toThrow(
      'Mô phỏng vận chuyển đang tắt',
    );
  });

  it('reads carrier evidence instead of the saved simulated clock when simulation is off', async () => {
    process.env.SHIPPING_SIMULATION_ENABLED = 'false';
    const prisma: any = {
      order: { findFirst: jest.fn().mockResolvedValue({ rawPayload: raw() }) },
    };
    const service = new GhnService(prisma, {} as any);
    const carrier = jest
      .spyOn(service as any, 'ghnFetch')
      .mockResolvedValue({ code: 200, data: { status: 'picked', log: [] } });
    const detail = await service.trackOrder('TEST-ORDER', GhnEnvironment.TEST);
    expect(detail).toMatchObject({ status: 'picked', environment: 'TEST' });
    expect(detail).not.toHaveProperty('isSimulation');
    expect(carrier).toHaveBeenCalledWith(
      '/v2/shipping-order/detail',
      expect.objectContaining({ environment: GhnEnvironment.TEST }),
    );
  });
  it('advances through five milestones on the saved clock, without inventing future events', () => {
    const saved = raw();
    const states = [
      'ready_to_pick',
      'picked',
      'storing',
      'delivering',
      'delivered',
    ];
    for (let index = 0; index < states.length; index++) {
      const detail = customerGhnSimulationDetail(
        saved,
        'TEST-ORDER',
        start + index * 60000,
      )!;
      expect(detail.status).toBe(states[index]);
      expect(detail.timeline.map((event) => event.status)).toEqual(
        states.slice(0, index + 1),
      );
      expect(detail.shipperName).toBe(
        index >= 3 ? saved.ghnSimulation.shipperName : null,
      );
      expect(detail.shipperPhone).toBeNull();
      expect(detail.shipperCanCall).toBe(false);
    }
    expect(
      customerGhnSimulationDetail(saved, 'TEST-ORDER', start + 59999)?.status,
    ).toBe('ready_to_pick');
    expect(
      customerGhnSimulationDetail(saved, 'TEST-ORDER', start + 239999)?.status,
    ).toBe('delivering');
    expect(
      customerGhnSimulationDetail(saved, 'TEST-ORDER', start + 240000)
        ?.nextEventAt,
    ).toBeNull();
  });
  it('keeps shipper and times identical across repeated reads, reloads and server instances', () => {
    const saved = raw();
    const detail = customerGhnSimulationDetail(
      saved,
      'TEST-ORDER',
      start + 180000,
    );
    expect(
      customerGhnSimulationDetail(
        JSON.parse(JSON.stringify(saved)),
        'TEST-ORDER',
        start + 180000,
      ),
    ).toEqual(detail);
    expect(detail?.shipperPhoneDisplay).toBe('09xx xxx xxx');
  });
  it('never treats LIVE, another code, samples or malformed snapshots as customer simulations', () => {
    const saved = raw();
    expect(
      customerGhnSimulationDetail(
        { ...saved, ghnEnvironment: 'LIVE' },
        'TEST-ORDER',
        start,
      ),
    ).toBeNull();
    expect(customerGhnSimulationDetail(saved, 'OTHER-CODE', start)).toBeNull();
    expect(customerGhnSimulationDetail({}, 'TEST-ORDER', start)).toBeNull();
    expect(
      customerGhnSimulationDetail(
        {
          ...saved,
          ghnSimulation: { ...saved.ghnSimulation, startedAt: 'bad' },
        },
        'TEST-ORDER',
        start,
      ),
    ).toBeNull();
  });
  it('serves saved simulation through the existing tracking API without contacting GHN or changing order finances', async () => {
    const prisma: any = {
      order: { findFirst: jest.fn().mockResolvedValue({ rawPayload: raw() }) },
    };
    const service = new GhnService(prisma, {} as any);
    const fetch = jest.spyOn(service as any, 'ghnFetch');
    const detail = await service.trackOrder('TEST-ORDER', GhnEnvironment.TEST);
    expect(detail).toMatchObject({
      isSimulation: true,
      environment: 'TEST',
      status: 'delivered',
      ghnRawDetail: null,
    });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects starting a simulation on LIVE or another shop before writing anything', async () => {
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'order' }]),
      order: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({
            id: 'order',
            storeId: 'owner-store',
            status: 'SHIPPING',
            rawPayload: { ghnEnvironment: 'LIVE', ghnOrderCode: 'LIVE-ORDER' },
          }),
        update: jest.fn(),
      },
    };
    const service = new GhnService(
      { $transaction: (callback: any) => callback(tx) } as any,
      {} as any,
    );
    await expect(
      service.startCustomerSimulation('order', 'other-store'),
    ).rejects.toThrow('không thuộc');
    await expect(
      service.startCustomerSimulation('order', 'owner-store'),
    ).rejects.toThrow('GHN TEST');
    expect(tx.order.update).not.toHaveBeenCalled();
  });
  it('starting an already-running simulation preserves its start and assigned shipper', async () => {
    const saved = raw();
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'order' }]),
      order: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({
            id: 'order',
            storeId: 'store',
            status: 'SHIPPING',
            rawPayload: saved,
          }),
        update: jest.fn(),
      },
    };
    const service = new GhnService(
      {
        $transaction: (callback: any) => callback(tx),
        order: {
          findFirst: jest.fn().mockResolvedValue({ rawPayload: saved }),
        },
      } as any,
      {} as any,
    );
    const result = await service.startCustomerSimulation('order', 'store');
    expect(result).toMatchObject({
      simulationStartedAt: saved.ghnSimulation.startedAt,
      shipperName: saved.ghnSimulation.shipperName,
    });
    expect(tx.order.update).not.toHaveBeenCalled();
  });
  it('persists an initial snapshot for an older TEST purchase and reuses it on retry', async () => {
    let saved: Record<string, any> = {
      ghnEnvironment: 'TEST',
      ghnOrderCode: 'TEST-ORDER',
      paymentMethod: 'COD',
    };
    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'order' }]),
      order: {
        findUniqueOrThrow: jest.fn(async () => ({
          id: 'order',
          storeId: 'store',
          status: 'SHIPPING',
          rawPayload: saved,
        })),
        update: jest.fn(async ({ data }: any) => {
          saved = data.rawPayload;
        }),
      },
    };
    const service = new GhnService(
      {
        $transaction: (callback: any) => callback(tx),
        order: { findFirst: jest.fn(async () => ({ rawPayload: saved })) },
      } as any,
      {} as any,
    );
    const first = await service.startCustomerSimulation('order', 'store');
    const second = await service.startCustomerSimulation('order', 'store');
    // Narrow the tracking union by its actual simulation payload, not an unsafe cast.
    expect(first).toMatchObject({ isSimulation: true });
    if (!('simulationStartedAt' in first))
      throw new Error('Expected a saved customer simulation');
    expect(tx.order.update).toHaveBeenCalledTimes(1);
    expect(saved.paymentMethod).toBe('COD');
    expect(second).toMatchObject({
      simulationStartedAt: first.simulationStartedAt,
      status: 'ready_to_pick',
    });
  });
  it('does not process carrier callbacks against simulated purchases', async () => {
    const prisma: any = {
      order: { findFirst: jest.fn().mockResolvedValue({ rawPayload: raw() }) },
    };
    const service = new GhnService(prisma, {} as any);
    expect(
      await service.handleGhnWebhook({
        OrderCode: 'TEST-ORDER',
        Status: 'delivered',
      }),
    ).toMatchObject({ ignored: true });
  });
});
