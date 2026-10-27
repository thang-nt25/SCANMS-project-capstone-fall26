import { OrderStatus, UserRole } from '@prisma/client';
import { validateSync } from 'class-validator';
import { QueryStoreOrdersDto } from './dto/fulfillment-order.dto';
import { OrdersService } from './orders.service';

describe('merchant order filters preserve shop, customer and return scope', () => {
  const storeId = '2f67001b-09a5-5958-85fd-5f401831c871';
  const customerId = '066a89f6-36c2-53da-b63b-bd7ce1afb2cb';
  const makeService = () => {
    const prisma = { store: { findFirst: jest.fn().mockResolvedValue({ id: storeId }) },
      order: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) } };
    const service = Object.assign(Object.create(OrdersService.prototype), { prisma }) as OrdersService;
    return { service, prisma };
  };
  it('accepts the RETURNS pseudo-status and v5 customer while rejecting invalid values', () => {
    expect(validateSync(Object.assign(new QueryStoreOrdersDto(), { status: 'RETURNS', customerId }))).toEqual([]);
    expect(validateSync(Object.assign(new QueryStoreOrdersDto(), { status: 'BOGUS', customerId: 'wrong' }))).toHaveLength(2);
  });
  it('combines the return union, keyword, payment and exact customer instead of overwriting them', async () => {
    const { service, prisma } = makeService();
    await service.getMyStoreOrders('owner', UserRole.SHOP_MANAGER, { storeId, customerId, status: 'RETURNS', search: 'An', paymentStatus: 'PAID' });
    const where = prisma.order.count.mock.calls[0][0].where;
    expect(where).toMatchObject({ storeId, customerId, rawPayload: { path: ['paymentStatus'], equals: 'PAID' },
      AND: [{ OR: [{ status: OrderStatus.RETURNED }, { status: OrderStatus.RETURN_REQUESTED }, { status: OrderStatus.DISPUTED }, { returnRequest: { isNot: null } }] }],
      OR: expect.arrayContaining([{ customerName: { contains: 'An', mode: 'insensitive' } }]),
    });
    expect(prisma.order.findMany.mock.calls.at(-1)?.[0].where).toEqual(where);
  });
  it('filters a chat customer by ID even when names collide', async () => {
    const { service, prisma } = makeService();
    await service.getMyStoreOrders('owner', UserRole.SHOP_MANAGER, { storeId, customerId });
    expect(prisma.order.count).toHaveBeenCalledWith({ where: { storeId, customerId } });
    expect(prisma.store.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ownerId: 'owner', id: storeId }) }));
  });
  it('still refuses another merchant store even when a customer ID is supplied', async () => {
    const { service, prisma } = makeService();
    prisma.store.findFirst.mockResolvedValueOnce(null as never);
    await expect(service.getMyStoreOrders('intruder', UserRole.SHOP_MANAGER, { storeId, customerId })).rejects.toThrow('Bạn không quản lý gian hàng này');
    expect(prisma.order.count).not.toHaveBeenCalled();
  });
});
