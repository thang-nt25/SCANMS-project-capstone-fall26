import { OrderStatus } from '@prisma/client';
import { CustomerService } from './customer.service';

describe('Customer order status filters', () => {
  const prisma: any = {
    user: { findUnique: jest.fn() },
    order: { findMany: jest.fn() },
  };
  let service: CustomerService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue({ email: null, phoneNumber: null });
    prisma.order.findMany.mockResolvedValue([]);
    service = Object.assign(Object.create(CustomerService.prototype), { prisma });
  });

  it('keeps delivered and completed orders in separate filters', async () => {
    await service.getOrders('customer-1', { status: OrderStatus.DELIVERED });
    expect(prisma.order.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { OR: [{ customerId: 'customer-1' }], status: 'DELIVERED' },
    }));

    await service.getOrders('customer-1', { status: OrderStatus.COMPLETED });
    expect(prisma.order.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { OR: [{ customerId: 'customer-1' }], status: 'COMPLETED' },
    }));
  });

  it('groups requested, disputed, and returned orders in the return filter', async () => {
    await service.getOrders('customer-1', { status: OrderStatus.RETURNED });

    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [{ customerId: 'customer-1' }],
        status: { in: ['RETURN_REQUESTED', 'DISPUTED', 'RETURNED'] },
      },
    }));
  });

  it.each(['0912345678', '0912 345 678', '+84 912 345 678'])('searches recipient phone %s within the customer account', async (search) => {
    await service.getOrders('customer-1', { search });
    const where = prisma.order.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([{ customerId: 'customer-1' }]);
    expect(where.AND[0].OR).toContainEqual({ customerPhone: { contains: '0912345678' } });
    expect(where.AND[0].OR).toContainEqual({ customerPhone: { contains: '+84912345678' } });
  });

  it('combines phone search with the selected order status and retains product search', async () => {
    await service.getOrders('customer-1', { search: '0912345678', status: OrderStatus.COMPLETED });
    const where = prisma.order.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('COMPLETED');
    expect(where.AND[0].OR).toContainEqual({ externalOrderSn: { contains: '0912345678', mode: 'insensitive' } });
    expect(where.AND[0].OR).toContainEqual({ orderItems: { some: { product: { title: { contains: '0912345678', mode: 'insensitive' } } } } });
  });
});
