import { LiveSessionsService } from './live-sessions.service';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';

describe('Shop Live creation and invitation', () => {
  function setup() {
    let session: any;
    const store = { id: 'store', name: 'QA Shop', ownerId: 'owner' };
    const prisma: any = {
      store: { findFirst: jest.fn().mockResolvedValue(store), findUniqueOrThrow: jest.fn().mockResolvedValue(store) },
      storeCollaborator: { findFirst: jest.fn().mockResolvedValue({ collaborator: { fullName: 'QA KOL' } }) },
      product: { findMany: jest.fn().mockResolvedValue([{ id: 'product' }]) },
      productVariant: { findMany: jest.fn().mockResolvedValue([{ id: 'variant', productId: 'product' }]) },
      liveShoppingSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(async ({ data }) => session = data),
        findUnique: jest.fn(async () => session),
      },
      coupon: { create: jest.fn() },
      notification: { create: jest.fn(), createMany: jest.fn() },
      user: { findMany: jest.fn() },
      conversation: { findFirst: jest.fn().mockResolvedValue({ id: 'conversation' }), update: jest.fn() },
      chatMessage: { create: jest.fn() },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $transaction: jest.fn(callback => callback(prisma)),
    };
    const dto = { storeId: 'store', creatorId: 'kol', title: '  Phiên thử  ', platform: 'SCANMS',
      liveUrl: 'http://localhost:5173/live/abcdEFGH1234', startsAt: new Date(Date.now() + 3600000).toISOString(),
      endsAt: new Date(Date.now() + 7200000).toISOString(), productIds: ['product'], variantIds: ['variant'],
      discountType: 'PERCENTAGE', discountValue: 15, usageLimitTotal: 100, usageLimitPerCustomer: 1,
      minimumOrderAmount: 200000, maximumDiscountAmount: 50000, commissionRate: 3,
      customMessage: 'Lời mời kiểm thử',
    } as CreateLiveSessionDto;
    const service = new LiveSessionsService(prisma, {} as any, {} as any);
    return { prisma, dto, run: () => service.create('owner', dto) };
  }

  it('persists selected products and variants with voucher limits, keeping the session pending the KOL', async () => {
    const { prisma, dto, run } = setup();
    const session = await run();
    expect(session).toMatchObject({ title: 'Phiên thử', creatorId: 'kol', status: 'PENDING_CREATOR', inviteStatus: 'PENDING', products: { create: [{ productId: 'product', variantId: 'variant' }] } });
    expect(Number(session.commissionRate)).toBe(3);
    const coupon = prisma.coupon.create.mock.calls[0][0].data;
    expect(Number(coupon.minimumOrderAmount)).toBe(200000);
    expect(Number(coupon.maximumDiscountAmount)).toBe(50000);
    expect(coupon).toMatchObject({ liveSessionId: session.id, usageLimitPerCustomer: 1, usageLimitTotal: 100,
      couponProducts: { create: [{ productId: 'product' }] }, expiresAt: new Date(dto.endsAt) });
  });

  it('invites only the chosen KOL and labels 3% as an additional bonus, without broadcasting a pending session', async () => {
    const { prisma, run } = setup(); await run();
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'kol', type: 'LIVE_SESSION_INVITATION' }) }));
    const text = prisma.chatMessage.create.mock.calls[0][0].data.messageText;
    expect(text).toContain('Thưởng thêm phiên Live: +3%');
    expect(text).toContain('Lời mời kiểm thử');
    expect(text).not.toContain('Hoa hồng phiên Live: 3%');
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('rejects a non-partner, foreign products, and variants outside the selected products before writing', async () => {
    for (const model of ['storeCollaborator', 'product', 'productVariant']) {
      const { prisma, run } = setup();
      prisma[model].findFirst?.mockResolvedValue(null);
      prisma[model].findMany?.mockResolvedValue([]);
      await expect(run()).rejects.toThrow();
      expect(prisma.liveShoppingSession.create).not.toHaveBeenCalled();
    }
  });

  it('rejects a blank trimmed title without creating a session', async () => {
    const { prisma, dto, run } = setup(); dto.title = '   ';
    await expect(run()).rejects.toThrow('Tên phiên');
    expect(prisma.liveShoppingSession.create).not.toHaveBeenCalled();
  });
});
