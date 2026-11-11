import { CustomerService } from './customer.service';

describe('Customer order ownership', () => {
  function fixture(customerId: string | null) {
    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({
          email: 'same@example.test',
          phoneNumber: '0900000000',
        })),
      },
      order: {
        findMany: jest.fn(async () => []),
        findUnique: jest.fn(async () => ({
          id: 'order',
          customerId,
          customerEmail: 'same@example.test',
          customerPhone: '0900000000',
          returnRequests: [],
        })),
      },
    };
    return {
      prisma,
      service: Object.assign(Object.create(CustomerService.prototype), {
        prisma,
      }) as CustomerService,
    };
  }
  it.each(['another-buyer', null])(
    'does not grant contact-based access to order owner %s',
    async (owner) => {
      const { service } = fixture(owner);
      await expect(
        service.getOrderDetails('buyer', 'order'),
      ).rejects.toMatchObject({ status: 403 });
    },
  );
  it('allows the assigned buyer regardless of recipient contact', async () => {
    const { service } = fixture('buyer');
    await expect(
      service.getOrderDetails('buyer', 'order'),
    ).resolves.toMatchObject({ customerId: 'buyer' });
  });
  it('scopes the order list to customerId', async () => {
    const { service, prisma } = fixture('buyer');
    await service.getOrders('buyer', {});
    expect(prisma.order.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { OR: [{ customerId: 'buyer' }] } }),
    );
  });
});
