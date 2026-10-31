import { NotificationsService } from './notifications.service';

describe('NotificationsService category filters', () => {
  const prisma: any = {
    order: { findMany: jest.fn() },
    notification: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      count: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.notification.deleteMany.mockResolvedValue({ count: 0 });
    prisma.notification.count.mockResolvedValue(1);
    prisma.notification.createMany.mockResolvedValue({ count: 0 });
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.order.findMany.mockResolvedValue([]);
    service = new NotificationsService(prisma);
  });

  it('includes order, dispute, and return notifications in the order list', async () => {
    await service.getUserNotifications('customer-1', { category: 'ORDER', limit: 40 });

    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: 'customer-1',
        OR: expect.arrayContaining([
          { type: { startsWith: 'ORDER_' } },
          { type: { startsWith: 'DISPUTE_' } },
          { type: { startsWith: 'RETURN_' } },
          { type: { startsWith: 'LIVE_ORDER_' } },
        ]),
      },
      take: 40,
    }));
  });

  it('includes campaign, voucher, coupon, and live-session updates in promotions', async () => {
    await service.getUserNotifications('customer-1', { category: 'PROMOTION' });

    const query = prisma.notification.findMany.mock.calls[0][0];
    expect(query.where.OR).toEqual(expect.arrayContaining([
      { type: { startsWith: 'CAMPAIGN_' } },
      { type: { startsWith: 'VOUCHER_' } },
      { type: { startsWith: 'LIVE_SESSION_' } },
      { type: { contains: 'COUPON' } },
      { type: 'FLASH_SALE' },
    ]));
  });

  it('keeps system notifications complete by excluding known order and promotion groups', async () => {
    await service.getUserNotifications('customer-1', { category: 'SYSTEM' });

    const query = prisma.notification.findMany.mock.calls[0][0];
    expect(query.where.NOT).toEqual(expect.arrayContaining([
      { type: { startsWith: 'RETURN_' } },
      { type: { startsWith: 'CAMPAIGN_' } },
      { type: { startsWith: 'LIVE_SESSION_' } },
    ]));
    expect(query.where.type).toBeUndefined();
  });

  it('restores product images for legacy order notices with null data using the public code in the title', async () => {
    prisma.notification.findMany.mockResolvedValue([
      { id: 'notice-1', type: 'ORDER_PLACED', title: 'Đặt hàng thành công đơn #DH-SCN-95882', message: 'Đang chờ xác nhận.', data: null },
    ]);
    prisma.order.findMany.mockResolvedValue([
      { id: 'order-1', externalOrderSn: 'DH-SCN-95882', orderItems: [{ product: { title: 'Hydro Boost', imageUrl: '/products/hydro.jpg' }, variant: null }] },
    ]);

    const result = await service.getUserNotifications('customer-1');

    expect(result.items[0].data).toEqual({ productImageUrl: '/products/hydro.jpg', productTitle: 'Hydro Boost' });
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { AND: [
        { OR: [{ externalOrderSn: { in: ['DH-SCN-95882'] } }] },
        { OR: [{ customerId: 'customer-1' }, { attributedCollaboratorId: 'customer-1' }, { store: { is: { ownerId: 'customer-1' } } }] },
      ] },
    }));
  });

  it('resolves an old order code in the message and prefers the purchased variant image', async () => {
    prisma.notification.findMany.mockResolvedValue([
      { id: 'notice-2', type: 'ORDER_DELIVERED', title: 'Đã giao hàng', message: 'Đơn #DH-2026-ABCDEF12 đã giao.', data: null },
    ]);
    prisma.order.findMany.mockResolvedValue([
      { id: 'order-2', externalOrderSn: 'DH-2026-ABCDEF12', orderItems: [{ product: { title: 'Áo', imageUrl: '/products/shirt.jpg' }, variant: { imageUrl: '/products/shirt-blue.jpg' } }] },
    ]);

    const result = await service.getUserNotifications('customer-1');
    expect(result.items[0].data).toEqual({ productImageUrl: '/products/shirt-blue.jpg', productTitle: 'Áo' });
  });

  it('does not attach an image when the order is missing or outside the permitted scope', async () => {
    const notice = { id: 'notice-3', type: 'ORDER_PLACED', title: 'Đơn #DH-SCN-00000', message: '', data: null };
    prisma.notification.findMany.mockResolvedValue([notice]);
    prisma.order.findMany.mockResolvedValue([]);
    const result = await service.getUserNotifications('customer-1');
    expect(result.items[0]).toEqual(notice);
  });
});
