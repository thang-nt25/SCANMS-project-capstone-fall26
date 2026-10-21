import { OrdersService } from './orders.service';

const code = 'DH-2026-TEST01';
function fixture(user: { email: string | null; phoneNumber: string | null } | null = { email: 'buyer@example.test', phoneNumber: '0912345678' }) {
  const order = {
    id: 'order', customerId: 'buyer', externalOrderSn: code, status: 'PENDING', rawPayload: {},
    customerName: 'Người nhận', customerPhone: '0988888888', shippingAddress: 'Địa chỉ nhận hàng',
    subtotalAmount: 100000, discountAmount: 0, finalAmount: 121000,
    store: { id: 'shop', name: 'Shop' }, orderItems: [], productReviews: [],
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
    order: { findMany: jest.fn(async (args) => args.select ? [] : [order]) },
  };
  const configService = { get: (key: string) => key === 'JWT_SECRET' ? 'test-only-secret' : undefined };
  const service = Object.assign(Object.create(OrdersService.prototype), { prisma, configService }) as OrdersService;
  return { service, prisma };
}

describe('authenticated customer order lookup by code or recipient phone', () => {
  it('finds an owned order without requiring the recipient phone to match the account phone', async () => {
    const { service, prisma } = fixture();
    const result = await service.trackCustomerOrder('buyer', `  # ${code.toLowerCase()}  `);
    expect(result.orders[0]).toMatchObject({ externalOrderSn: code, customerName: 'Người nhận', customerPhone: '0988888888', shippingAddress: 'Địa chỉ nhận hàng' });
    const where = {
      externalOrderSn: { equals: code.toLowerCase(), mode: 'insensitive' },
      OR: [
        { customerId: 'buyer' },
        { customerId: null, OR: [
          { customerEmail: { equals: 'buyer@example.test', mode: 'insensitive' } },
          { customerPhone: { in: ['0912345678', '+84912345678'] } },
        ] },
      ],
    };
    // Both reconciliation and the result query must be scoped to this identity.
    const scopes = prisma.order.findMany.mock.calls.map(([args]) => args.where);
    expect(scopes[0].AND[0]).toEqual(where);
    expect(scopes[1]).toEqual(where);
  });

  it.each([null, 'invalid-old-phone'])('retains account ownership when the profile contact is unavailable: %s', async (phoneNumber) => {
    const { service, prisma } = fixture({ email: null, phoneNumber });
    await service.trackCustomerOrder('buyer', code);
    expect(prisma.order.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { externalOrderSn: { equals: code, mode: 'insensitive' }, OR: [{ customerId: 'buyer' }] },
    }));
  });

  it.each(['0988888888', '+84988888888'])('supports recipient phone alone while retaining ownership: %s', async phone => {
    const { service, prisma } = fixture({ email: null, phoneNumber: null });
    const result = await service.trackCustomerOrder('buyer', '', phone);
    expect(result.orders[0].customerPhone).toBe('0988888888');
    const where = { OR: [{ customerId: 'buyer' }], customerPhone: { in: ['0988888888', '+84988888888'] } };
    expect(prisma.order.findMany.mock.calls[0][0].where.AND[0]).toEqual(where);
    expect(prisma.order.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where }));
  });

  it('combines both filters when both are supplied', async () => {
    const { service, prisma } = fixture({ email: null, phoneNumber: null });
    await service.trackCustomerOrder('buyer', code, '0988888888');
    expect(prisma.order.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: {
      OR: [{ customerId: 'buyer' }], externalOrderSn: { equals: code, mode: 'insensitive' },
      customerPhone: { in: ['0988888888', '+84988888888'] },
    } }));
  });

  it('rejects an incomplete phone instead of searching all owned orders', async () => {
    const { service, prisma } = fixture();
    await expect(service.trackCustomerOrder('buyer', '', '098')).rejects.toThrow('Số điện thoại');
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it('returns no details when the scoped database lookup does not find the code', async () => {
    const { service, prisma } = fixture();
    prisma.order.findMany.mockResolvedValue([]);
    expect(await service.trackCustomerOrder('buyer', code)).toEqual({ totalFound: 0, orders: [] });
  });

  it('rejects empty codes, absent identity and removed accounts before reading orders', async () => {
    const { service, prisma } = fixture(null);
    await expect(service.trackCustomerOrder('buyer', ' # ')).rejects.toThrow('nhập mã đơn');
    await expect(service.trackCustomerOrder('', code)).rejects.toThrow('đăng nhập');
    await expect(service.trackCustomerOrder('removed', code)).rejects.toThrow('không còn khả dụng');
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it('still requires both values for public lookups', async () => {
    const { service, prisma } = fixture();
    await expect(service.trackOrderByPhoneOrSn({ orderSn: code })).rejects.toThrow('số điện thoại');
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });
});
