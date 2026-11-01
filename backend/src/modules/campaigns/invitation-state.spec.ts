import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

describe('Invitation state access', () => {
  const findUnique = jest.fn();
  const findFirst = jest.fn();
  const service = new CampaignsService({
    campaignParticipant: { findUnique },
    store: { findFirst },
  } as any);
  beforeEach(() => {
    findUnique.mockReset();
    findFirst.mockImplementation(async ({ where }: any) =>
      where.OR[0].owner.is.id === 'shop' ? { id: 'store' } : null,
    );
  });
  const invitation = {
    id: 'invitation',
    collaboratorId: 'creator',
    status: 'ACCEPTED',
    campaign: {
      storeId: 'store',
      isActive: true,
      endDate: new Date('2027-01-01'),
      store: { ownerId: 'shop' },
    },
  };
  it.each(['creator', 'shop'])(
    'allows the actual participant %s without exposing full records',
    async (user) => {
      findUnique.mockResolvedValue(invitation);
      expect(await service.getInvitationState(user, 'invitation')).toEqual({
        id: 'invitation',
        status: 'ACCEPTED',
        isActive: true,
        endDate: invitation.campaign.endDate,
      });
    },
  );
  it('rejects unrelated users', async () => {
    findUnique.mockResolvedValue(invitation);
    await expect(
      service.getInvitationState('stranger', 'invitation'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects missing invitations', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.getInvitationState('creator', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
