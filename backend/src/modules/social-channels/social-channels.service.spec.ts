import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { SocialPlatform } from '@prisma/client';
import { SocialChannelsService } from './social-channels.service';
import { UpdateChannelDto } from './dto/update-channel.dto';

describe('SocialChannelsService ownership and channel consistency', () => {
  let service: SocialChannelsService;
  let tx: any;
  const channel = { id: 'channel-1', collaboratorId: 'owner', platformName: SocialPlatform.TIKTOK, channelUrl: 'https://tiktok.com/@creator', channelName: '@creator', followerCount: 100, isPrimary: true, createdAt: new Date('2026-11-01') };
  beforeEach(() => {
    tx = {
      collaboratorSocialChannel: {
        findUnique: jest.fn().mockResolvedValue({ ...channel }),
        findMany: jest.fn().mockResolvedValue([{ ...channel }]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'new', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...channel, ...data })),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn(), aggregate: jest.fn().mockResolvedValue({ _sum: { followerCount: 450 } }),
      },
      collaboratorProfile: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new SocialChannelsService({ ...tx, $transaction: (callback: any) => callback(tx) } as any);
  });
  it('rejects editing another collaborator channel before writing', async () => {
    await expect(service.updateChannel('other', channel.id, { followerCount: 200 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.collaboratorSocialChannel.update).not.toHaveBeenCalled();
  });
  it('prevents deleting the primary channel', async () => {
    await expect(service.deleteChannel('owner', channel.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.collaboratorSocialChannel.delete).not.toHaveBeenCalled();
  });
  it('rejects duplicate handles despite www, casing, tracking or trailing slash', async () => {
    await expect(service.addChannel('owner', { platformName: SocialPlatform.TIKTOK, channelUrl: 'https://www.tiktok.com/@CREATOR/?utm_source=test' })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.collaboratorSocialChannel.create).not.toHaveBeenCalled();
  });
  it('rejects a channel URL belonging to a different platform', async () => {
    await expect(service.addChannel('owner', { platformName: SocialPlatform.TIKTOK, channelUrl: 'https://youtube.com/@creator' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('updates followers, recalculates only the owner total, and records the true update time', async () => {
    await service.updateChannel('owner', channel.id, { followerCount: 450 });
    expect(tx.collaboratorSocialChannel.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: channel.id }, data: expect.objectContaining({ followerCount: 450 }) }));
    expect(tx.collaboratorProfile.updateMany).toHaveBeenCalledWith({ where: { userId: 'owner' }, data: { totalFollowers: 450 } });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: { userId: 'owner', action: 'SOCIAL_CHANNEL_UPDATED', details: { channelId: channel.id, platformName: SocialPlatform.TIKTOK } } });
  });
  it('does not reset followers or primary when PATCH omits these fields', async () => {
    const dto = Object.assign(new UpdateChannelDto(), { channelName: 'Updated' });
    await service.updateChannel('owner', channel.id, dto);
    const data = tx.collaboratorSocialChannel.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('isPrimary');
    expect(data).not.toHaveProperty('followerCount');
  });
  it('sets the first channel as primary atomically', async () => {
    tx.collaboratorSocialChannel.findMany.mockResolvedValue([]);
    const result = await service.addChannel('owner', { platformName: SocialPlatform.TIKTOK, channelUrl: 'https://tiktok.com/@new' });
    expect(result.channel.isPrimary).toBe(true);
  });
  it('switches primary only within the owner scope', async () => {
    await service.setPrimary('owner', channel.id);
    expect(tx.collaboratorSocialChannel.updateMany).toHaveBeenCalledWith({ where: { collaboratorId: 'owner', isPrimary: true }, data: { isPrimary: false } });
  });
  it('returns self-declared status independently of KYC and only uses an actual channel update record', async () => {
    const updatedAt = new Date('2026-11-14T09:00:00Z');
    tx.auditLog.findMany.mockResolvedValue([{ details: { channelId: channel.id }, createdAt: updatedAt }]);
    const result = await service.getMyChannels('owner');
    expect(result[0]).toMatchObject({ verificationStatus: 'SELF_DECLARED', updatedAt });
    expect(tx.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'owner', action: 'SOCIAL_CHANNEL_UPDATED' } }));
  });
});
