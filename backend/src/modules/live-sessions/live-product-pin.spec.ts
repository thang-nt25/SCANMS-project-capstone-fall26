import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';

describe('shared live product pin', () => {
  const setup = (overrides: Record<string, unknown> = {}) => {
    const session = { id: 'session', creatorId: 'creator', createdBy: 'owner',
      status: 'LIVE', endsAt: new Date(Date.now() + 60_000),
      governance: { preserveOrderTerms: true }, products: [{ productId: 'product' }], ...overrides };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      liveShoppingSession: {
        findUnique: jest.fn().mockResolvedValue(session),
        update: jest.fn().mockResolvedValue(session),
      },
    };
    const prisma = { $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)) };
    const service = new LiveSessionsService(prisma as never, {} as never, {} as never);
    return { service, tx };
  };
  it('rejects a caller who does not own or host the session', async () => {
    const { service, tx } = setup();
    await expect(service.pinProduct('stranger', 'session', 'product')).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.liveShoppingSession.update).not.toHaveBeenCalled();
  });
  it('rejects ended sessions and products outside the session', async () => {
    await expect(setup({ status: 'ENDED' }).service.pinProduct('creator', 'session', 'product')).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup().service.pinProduct('creator', 'session', 'other-product')).rejects.toBeInstanceOf(BadRequestException);
  });
  it('preserves existing governance when publishing a host pin', async () => {
    const { service, tx } = setup();
    await expect(service.pinProduct('creator', 'session', 'product')).resolves.toEqual({ productId: 'product' });
    expect(tx.liveShoppingSession.update).toHaveBeenCalledWith({
      where: { id: 'session' }, data: { governance: { preserveOrderTerms: true, pinnedProductId: 'product' } },
    });
  });
  it('allows the host and owner to clear a pin while preserving order protections', async () => {
    for (const user of ['creator', 'owner']) {
      const { service, tx } = setup({ governance: { preserveOrderTerms: true, pinnedProductId: 'product' } });
      await expect(service.pinProduct(user, 'session', null)).resolves.toEqual({ productId: null });
      expect(tx.liveShoppingSession.update).toHaveBeenCalledWith({
        where: { id: 'session' }, data: { governance: { preserveOrderTerms: true, pinnedProductId: null } },
      });
    }
  });
  it('replaces the old pin with another product from the session', async () => {
    const { service, tx } = setup({
      governance: { pinnedProductId: 'product' },
      products: [{ productId: 'product' }, { productId: 'next' }],
    });
    await service.pinProduct('creator', 'session', 'next');
    expect(tx.liveShoppingSession.update.mock.calls[0][0].data.governance.pinnedProductId).toBe('next');
  });
  it('rejects unauthorized and ended-session unpin attempts', async () => {
    const { service, tx } = setup();
    await expect(service.pinProduct('stranger', 'session', null)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.liveShoppingSession.update).not.toHaveBeenCalled();
    await expect(setup({ status: 'ENDED' }).service.pinProduct('creator', 'session', null)).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each(['product', null])('publishes only the selected product ID in viewer stats (%s)', async (pinnedProductId) => {
    const prisma = { liveShoppingSession: { findUnique: jest.fn().mockResolvedValue({
      governance: { pinnedProductId, dispute: { privateEvidence: 'secret' } },
    }) } };
    const service = new LiveSessionsService(prisma as never, {} as never, {} as never);
    (service as any).resolveSessionKey = jest.fn().mockResolvedValue('session');
    (service as any).getViewerStats = jest.fn().mockResolvedValue({ currentViewers: 2 });
    const stats = await service.getSessionStats('session');
    expect(stats).toMatchObject({ pinnedProductId, viewers: 2 });
    expect(JSON.stringify(stats)).not.toContain('privateEvidence');
  });
});
