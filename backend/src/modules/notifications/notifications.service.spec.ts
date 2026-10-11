import { NotificationsService } from './notifications.service';

describe('NotificationsService category filters', () => {
  const prisma: any = {
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
});
