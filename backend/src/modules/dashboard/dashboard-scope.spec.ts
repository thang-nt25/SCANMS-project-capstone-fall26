import { ForbiddenException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

describe('Dashboard role consistency', () => {
  let prisma: any;
  let service: DashboardService;
  beforeEach(() => {
    prisma = {
      store: { findFirst: jest.fn().mockResolvedValue({ id: 'owned-store' }) },
      clickTrafficLog: { findMany: jest.fn().mockResolvedValue([]) },
      order: { findMany: jest.fn().mockResolvedValue([]) },
      commission: { findMany: jest.fn().mockResolvedValue([]) },
      campaign: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new DashboardService(prisma);
  });
  it.each(['SYSTEM_ADMIN', 'SYSTEM_MANAGER'])(
    'lets %s view platform-wide metrics without filtering to their own ID',
    async (role) => {
      await service.getTimeSeriesMetrics('admin', role, {
        range: 'today' as any,
      });
      expect(
        prisma.order.findMany.mock.calls[0][0].where.attributedCollaboratorId,
      ).toBeUndefined();
      expect(
        prisma.clickTrafficLog.findMany.mock.calls[0][0].where.referralLink,
      ).toBeUndefined();
    },
  );
  it('keeps creator metrics scoped to the creator', async () => {
    await service.getTimeSeriesMetrics('creator', 'COLLABORATOR', {});
    expect(
      prisma.order.findMany.mock.calls[0][0].where.attributedCollaboratorId,
    ).toBe('creator');
  });
  it('rejects a shop without a store rather than returning whole-platform data', async () => {
    prisma.store.findFirst.mockResolvedValue(null);
    await expect(
      service.getTopChannelsBreakdown('shop', 'SHOP_MANAGER', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects foreign store filters and unrecognized roles', async () => {
    await expect(
      service.getTimeSeriesMetrics('shop', 'SHOP_MANAGER', {
        storeId: 'foreign-store',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.getTimeSeriesMetrics('customer', 'CUSTOMER', {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('loads actual hourly approved commission in Vietnam time', async () => {
    prisma.commission.findMany.mockResolvedValue([
      { createdAt: new Date('2026-10-17T18:30:00Z'), commissionAmount: 25000 },
    ]);
    const result = await (service as any)._getHourlyTimeSeries(
      'creator',
      false,
      null,
      new Date('2026-10-17T17:00:00Z'),
      new Date('2026-10-18T16:59:59Z'),
    );
    expect(result[1].commission).toBe(25000);
    expect(prisma.commission.findMany.mock.calls[0][0].where.status.in).toEqual(
      ['APPROVED', 'PAID'],
    );
  });
  it('includes all campaigns for platform administrators', async () => {
    await service.getCampaignPerformanceMetrics('admin', 'SYSTEM_ADMIN', {});
    expect(prisma.campaign.findMany.mock.calls[0][0].where).toEqual({});
  });
});
