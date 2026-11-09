import { BadRequestException } from '@nestjs/common';
import { KycService } from '../kyc.service';

describe('KYC submission with legacy channel data', () => {
  const dto = {
    idCardNumber: '001201012345', taxCode: '1234567890',
    frontCardUrl: 'https://example.test/front.jpg', backCardUrl: 'https://example.test/back.jpg',
    platform: ' tiktok ', channelUrl: 'https://example.test/channel', followerCount: 25000,
  };
  let prisma: any;
  let tx: any;
  let service: KycService;
  beforeEach(() => {
    tx = {
      collaboratorProfile: {
        findUnique: jest.fn().mockResolvedValue({ socialLinksJson: { platform: 'tiktok' } }),
        update: jest.fn().mockResolvedValue({ id: 'profile-1', kycStatus: 'UNVERIFIED' }),
      },
      collaboratorSocialChannel: {
        findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'channel-1' }),
      },
    };
    prisma = { $transaction: jest.fn(async callback => callback(tx)) };
    service = new KycService(prisma);
  });
  it('normalizes lowercase legacy platform before profile and channel writes in one transaction', async () => {
    await service.submitKyc('user-1', dto);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.collaboratorProfile.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ kycStatus: 'UNVERIFIED', socialLinksJson: expect.objectContaining({ platform: 'TIKTOK' }) }),
    }));
    expect(tx.collaboratorSocialChannel.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ platformName: 'TIKTOK' }),
    }));
  });
  it('rejects invalid platforms before any writes', async () => {
    await expect(service.submitKyc('user-1', { ...dto, platform: 'INVALID' })).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it.each([-1, 1.5, NaN, 2147483648])('rejects invalid follower count %s before writes', async followerCount => {
    await expect(service.submitKyc('user-1', { ...dto, followerCount })).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('propagates channel failure through the profile transaction', async () => {
    tx.collaboratorSocialChannel.create.mockRejectedValue(new Error('channel write failed'));
    await expect(service.submitKyc('user-1', dto)).rejects.toThrow('channel write failed');
  });
});
