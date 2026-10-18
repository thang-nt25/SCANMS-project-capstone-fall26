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
});
