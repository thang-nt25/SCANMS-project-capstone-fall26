import { BadRequestException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

describe('Campaign micro bonus service guards', () => {
  const valid = { name: 'Test', bonusCommissionRate: 2, bonusBudgetTotal: 100000,
    startDate: '2026-10-01T00:00:00Z', endDate: '2026-11-01T00:00:00Z' };
  let prisma: any;
  let service: CampaignsService;
  beforeEach(() => {
    prisma = { store: { findFirst: jest.fn().mockResolvedValue({ id: 'shop' }) },
      campaign: { create: jest.fn().mockResolvedValue({ id: 'campaign' }) },
      auditLog: { create: jest.fn() } };
    service = new CampaignsService(prisma);
  });
  it.each([0, 7, 14, NaN])('rejects invalid rate %s even without a validation pipe', async rate => {
    await expect(service.createCampaign('shop-owner', { ...valid, bonusCommissionRate: rate })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.campaign.create).not.toHaveBeenCalled();
  });
  it.each([0, -1, NaN, undefined])('requires a positive explicit budget %s', async budget => {
    await expect(service.createCampaign('shop-owner', { ...valid, bonusBudgetTotal: budget as number })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.campaign.create).not.toHaveBeenCalled();
  });
  it('rejects reversed dates before writing a campaign', async () => {
    await expect(service.createCampaign('owner', { ...valid, endDate: valid.startDate })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.campaign.create).not.toHaveBeenCalled();
  });
  it.each([1, 2, 4, 6])('persists a valid explicit bonus %s and budget', async rate => {
    await service.createCampaign('owner', { ...valid, bonusCommissionRate: rate });
    expect(prisma.campaign.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      bonusCommissionRate: rate, bonusBudgetTotal: 100000,
      startDate: new Date(valid.startDate), endDate: new Date(valid.endDate), isActive: true,
    }) }));
  });
});
