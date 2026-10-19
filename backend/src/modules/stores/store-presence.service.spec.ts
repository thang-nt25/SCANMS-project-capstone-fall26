import { StorePresenceService } from './store-presence.service';
import { NotFoundException } from '@nestjs/common';

describe('Public shop activity', () => {
  let prisma: any, cache: any, service: StorePresenceService;
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-18T08:00:00Z'));
    prisma = { store: { findFirst: jest.fn().mockResolvedValue({ id: 'shop-a', ownerId: 'owner-a' }) } };
    const values = new Map();
    cache = { get: jest.fn(async key => values.get(key) ?? null), set: jest.fn(async (key, value) => { values.set(key, value); }) };
    service = new StorePresenceService(prisma, cache);
  });
  afterEach(() => jest.useRealTimers());

  it('reports unknown before a real owner heartbeat and goes offline after inactivity', async () => {
    expect(await service.getPublicPresence('shop-a')).toMatchObject({ isOnline: false, lastActiveAt: null });
    await service.heartbeat('owner-a');
    expect(await service.getPublicPresence('shop-a')).toMatchObject({ isOnline: true, lastActiveAt: '2026-10-18T08:00:00.000Z' });
    jest.advanceTimersByTime(76_000);
    expect(await service.getPublicPresence('shop-a')).toMatchObject({ isOnline: false, lastActiveAt: '2026-10-18T08:00:00.000Z' });
  });

  it('keeps different shops separate and exposes no owner identity', async () => {
    await service.heartbeat('owner-a');
    prisma.store.findFirst.mockResolvedValue({ ownerId: 'owner-b' });
    const result = await service.getPublicPresence('shop-b');
    expect(result).toMatchObject({ isOnline: false, lastActiveAt: null });
    expect(Object.keys(result).sort()).toEqual(['checkedAt', 'isOnline', 'lastActiveAt']);
  });

  it('ignores non-owners and refuses hidden or inactive shops', async () => {
    prisma.store.findFirst.mockResolvedValue(null);
    expect(await service.heartbeat('customer-a')).toEqual({ recorded: false });
    expect(cache.set).not.toHaveBeenCalled();
    await expect(service.getPublicPresence('hidden-shop')).rejects.toThrow(NotFoundException);
    expect(prisma.store.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ isActive: true, isVerified: true, onboardingStatus: 'VERIFIED', isDeleted: false }),
    }));
  });

  it('does not invent activity from corrupt or future timestamps', async () => {
    for (const value of ['not-a-date', '2099-01-01T00:00:00Z']) {
      cache.get.mockResolvedValue(value);
      expect(await service.getPublicPresence('shop-a')).toMatchObject({ isOnline: false, lastActiveAt: null });
    }
  });
});
