import { LiveSessionsService } from './live-sessions.service';
import { LiveStreamGateway } from './live-stream.gateway';

describe('Live stop safety', () => {
  it('does not count new watchers or likes after a session has stopped', async () => {
    const prisma: any = { liveShoppingSession: { findUnique: jest.fn().mockResolvedValue({ status: 'ENDED', endsAt: new Date() }) }, liveSessionViewer: { upsert: jest.fn() } };
    const service: any = new LiveSessionsService(prisma, {} as any, {} as any);
    service.resolveSessionKey = jest.fn().mockResolvedValue('session');
    expect(await service.recordInteraction('session', { action: 'HEARTBEAT', clientId: 'viewer' })).toMatchObject({ viewers: 0, actionApplied: 'IGNORED' });
    expect(prisma.liveSessionViewer.upsert).not.toHaveBeenCalled();
  });
  it('never reprices or reverses commissions for a governed stop, including cron retries', async () => {
    const prisma: any = {
      liveShoppingSession: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            status: 'ENDED',
            governance: { preserveOrderTerms: true },
            coupon: { id: 'voucher' },
          }),
      },
      order: { findMany: jest.fn() },
    };
    const service: any = new LiveSessionsService(prisma, {} as any, {} as any);
    await service.repriceUnpaidOrders('session');
    expect(prisma.order.findMany).not.toHaveBeenCalled();
  });

  it('blocks new sessions while a sanction is active and permits them after expiration', async () => {
    const store = { liveCooperationBlocked: true, liveRestrictionUntil: null };
    const prisma: any = { store: { findFirst: jest.fn(async () => store) } };
    const service: any = new LiveSessionsService(prisma, {} as any, {} as any);
    await expect(service.create('shop', { storeId: 'store' })).rejects.toThrow(
      'khóa quyền',
    );
    store.liveCooperationBlocked = false;
    expect(() =>
      service.assertLiveAllowed({
        ...store,
        liveRestrictionUntil: new Date(Date.now() + 100000),
      }),
    ).toThrow('hạn chế');
    expect(() =>
      service.assertLiveAllowed({
        ...store,
        liveRestrictionUntil: new Date(Date.now() - 100000),
      }),
    ).not.toThrow();
  });

  it('does not expose private evidence or dispute data on any full public session response', async () => {
    const session = {
      id: 'session',
      governance: { dispute: { evidence: ['private-evidence'] } },
      coupon: { usageLimitTotal: 10, usageCount: 1 },
    };
    const prisma: any = {
      liveShoppingSession: {
        findUnique: jest.fn(async () => session),
        findFirst: jest.fn(async () => session),
        findMany: jest.fn(async () => [session]),
      },
    };
    const service: any = new LiveSessionsService(prisma, {} as any, {} as any);
    service.getSessionStats = jest.fn().mockResolvedValue({ viewers: 0 });
    expect(
      await service.getPublicSessionByIdentifier(
        '00000000-0000-4000-8000-000000000001',
      ),
    ).not.toHaveProperty('governance');
    expect(
      (await service.getPublicSessionForProduct('product')).session,
    ).not.toHaveProperty('governance');
    expect((await service.getPublicLiveList())[0]).not.toHaveProperty(
      'governance',
    );
  });

  it('notifies both host and viewers immediately and revokes signaling access on stop', async () => {
    const participant = {
      data: {
        streamActive: true,
        liveRoom: 'live:session',
        liveSessionId: 'session',
      },
      leave: jest.fn(),
    };
    const emit = jest.fn();
    const gateway: any = new LiveStreamGateway({} as any, {} as any);
    gateway.server = {
      to: jest.fn(() => ({ emit })),
      in: jest.fn(() => ({ fetchSockets: async () => [participant] })),
    };
    await gateway.endSession('session');
    expect(emit).toHaveBeenCalledWith('live_session_ended', {
      sessionId: 'session',
    });
    expect(participant.data.streamActive).toBe(false);
    expect(participant.data.liveRoom).toBeUndefined();
    expect(participant.leave).toHaveBeenCalledWith('live:session');
  });
});
