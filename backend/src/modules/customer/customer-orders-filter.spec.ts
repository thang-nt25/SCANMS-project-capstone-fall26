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
});
