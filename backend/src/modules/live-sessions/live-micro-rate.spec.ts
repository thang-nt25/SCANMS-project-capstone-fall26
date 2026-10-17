import { LiveSessionsService } from './live-sessions.service';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';

describe('Live micro rate service boundary', () => {
  it.each([0, 5, 13, 40])('rejects total or invalid bonus %s before any write', async commissionRate => {
    const service = Object.create(LiveSessionsService.prototype) as LiveSessionsService;
    await expect(service.create('owner', { commissionRate } as CreateLiveSessionDto)).rejects.toThrow('+2%');
  });
  it('queries voucher claims only for a currently LIVE, accepted session inside its interval', async () => {
    const prisma = { liveShoppingSession: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = Object.assign(Object.create(LiveSessionsService.prototype), { prisma }) as LiveSessionsService;
    await expect(service.claim('session', { claimKey: 'valid-claim-key-123' })).rejects.toThrow();
    expect(prisma.liveShoppingSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'LIVE', inviteStatus: 'ACCEPTED',
        startsAt: { lte: expect.any(Date) }, endsAt: { gt: expect.any(Date) } }),
    }));
  });
});
