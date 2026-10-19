import { createCustomerGhnSimulation } from './customer-ghn-simulation';
import { syncCustomerGhnSimulations } from './sync-customer-ghn-simulation';
import { CustomerService } from '../customer/customer.service';

const start = Date.parse('2026-10-18T12:02:58Z');
const raw = () => ({ ghnEnvironment: 'TEST', ghnOrderCode: 'L8RWXM', ghnSimulation: createCustomerGhnSimulation('L8RWXM', start) });

describe('Sandbox order delivery reconciliation', () => {
  it('persists delivery once at the saved milestone without completing the order or touching money', async () => {
    const snapshot = raw();
    const prisma: any = { order: {
      findMany: jest.fn().mockResolvedValue([{ id: 'order', rawPayload: snapshot }]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    } };
    expect(await syncCustomerGhnSimulations(prisma, { customerId: 'customer' }, start + 239999)).toBe(0);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(await syncCustomerGhnSimulations(prisma, { customerId: 'customer' }, start + 240000)).toBe(1);
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order', status: 'SHIPPING', rawPayload: { equals: snapshot } },
      data: { status: 'DELIVERED', deliveredAt: new Date(start + 240000) },
    });
    prisma.order.updateMany.mockResolvedValue({ count: 0 });
    expect(await syncCustomerGhnSimulations(prisma, {}, start + 300000)).toBe(0);
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { AND: [
      {}, { status: 'SHIPPING' }, { rawPayload: { path: ['ghnEnvironment'], equals: 'TEST' } },
      { rawPayload: { path: ['ghnSimulation', 'version'], equals: 1 } },
    ] } }));
  });

  it('ignores LIVE, mismatched codes and invalid snapshots even if returned by the database', async () => {
    const snapshot = raw();
    const prisma: any = { order: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'live', rawPayload: { ...snapshot, ghnEnvironment: 'LIVE' } },
        { id: 'other', rawPayload: { ...snapshot, ghnOrderCode: 'OTHER' } },
        { id: 'bad', rawPayload: { ...snapshot, ghnSimulation: { ...snapshot.ghnSimulation, startedAt: 'invalid' } } },
      ]), updateMany: jest.fn(),
    } };
    expect(await syncCustomerGhnSimulations(prisma, {}, start + 300000)).toBe(0);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('reconciles before customer status filtering, so delivered orders leave SHIPPING and enter DELIVERED', async () => {
    let status = 'SHIPPING';
    const snapshot = raw();
    const prisma: any = {
      user: { findUnique: jest.fn().mockResolvedValue({ email: null, phoneNumber: null }) },
      order: {
        findMany: jest.fn(async (query: any) => query.select
          ? status === 'SHIPPING' ? [{ id: 'order', rawPayload: snapshot }] : []
          : query.where.status === status ? [{ id: 'order', status }] : []),
        updateMany: jest.fn(async () => { status = 'DELIVERED'; return { count: 1 }; }),
      },
    };
    const service = Object.assign(Object.create(CustomerService.prototype), { prisma }) as CustomerService;
    expect((await service.getOrders('customer', { status: 'SHIPPING' })).orders).toEqual([]);
    expect((await service.getOrders('customer', { status: 'DELIVERED' })).orders).toEqual([{ id: 'order', status: 'DELIVERED' }]);
    expect(prisma.order.updateMany).toHaveBeenCalledTimes(1);
  });
});
