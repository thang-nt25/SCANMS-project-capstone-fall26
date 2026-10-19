import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AiFraudService } from '../ai-fraud.service';

describe('Fraud scan evidence and tenant isolation', () => {
  const actor = {
    id: 'admin',
    role: 'SYSTEM_ADMIN',
    email: 'admin@test.local',
  };
  let prisma: any;
  let service: AiFraudService;
  const link = {
    id: 'link-1',
    collaboratorId: 'creator',
    storeId: 'store-1',
    shortCode: 'abc',
    status: 'ACTIVE',
    createdAt: new Date(),
    collaborator: {
      id: 'creator',
      fullName: 'KOL',
      email: 'creator@test.local',
    },
    store: { name: 'Shop' },
    product: { title: 'Product', price: 100 },
    orders: [],
    clickTrafficLogs: [],
    _count: { orders: 0, clickTrafficLogs: 5001 },
  };
  beforeEach(() => {
    prisma = {
      referralLink: {
        findMany: jest.fn().mockResolvedValue([link]),
        findUnique: jest.fn().mockResolvedValue(link),
      },
      store: { findFirst: jest.fn().mockResolvedValue({ id: 'store-1' }) },
      commission: { groupBy: jest.fn().mockResolvedValue([]) },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
      },
    };
    service = new AiFraudService(prisma);
  });
  it('counts the complete selected window, not the limited evidence sample', async () => {
    const summary = await service.scanTraffic({ timeframe: '7d' }, actor);
    expect(summary.totalScannedClicks).toBe(5001);
    expect(summary.incidents[0]).toMatchObject({
      totalOrders: 0,
      riskLevel: 'FRAUD_CRITICAL',
    });
    const query = prisma.referralLink.findMany.mock.calls[0][0];
    expect(
      query.include._count.select.clickTrafficLogs.where.createdAt.gte,
    ).toBeInstanceOf(Date);
    expect(query.include.orders.where.createdAt).toEqual(
      query.include.clickTrafficLogs.where.createdAt,
    );
    expect(prisma.auditLog.upsert.mock.calls[0][0].create.action).toBe(
      'AI_FRAUD_FLAG',
    );
  });
  it('uses stable flag identity to prevent duplicate daily flags', async () => {
    await service.scanTraffic({}, actor);
    await service.scanTraffic({}, actor);
    expect(prisma.auditLog.upsert.mock.calls[0][0].where).toEqual(
      prisma.auditLog.upsert.mock.calls[1][0].where,
    );
  });
  it('zero traffic stays zero and never produces NaN conversion', async () => {
    prisma.referralLink.findMany.mockResolvedValue([
      { ...link, _count: { orders: 0, clickTrafficLogs: 0 } },
    ]);
    const summary = await service.scanTraffic({}, actor);
    expect(summary.totalScannedClicks).toBe(0);
    expect(summary.incidents[0].conversionRate).toBe(0);
    expect(prisma.auditLog.upsert).not.toHaveBeenCalled();
  });
  it('restores mitigation state after creating a new service instance', async () => {
    prisma.auditLog.findMany.mockResolvedValue([
      {
        action: 'FRAUD_MITIGATION_DISMISS',
        details: { linkId: link.id, note: 'Đã đối soát', actorName: 'Admin' },
        createdAt: new Date(),
        userId: actor.id,
      },
    ]);
    const summary = await new AiFraudService(prisma).scanTraffic({}, actor);
    expect(summary.incidents[0].status).toBe('DISMISSED');
    expect(summary.incidents[0].actionHistory).toHaveLength(1);
  });
  it('does not double-count a creator pending balance across several links', async () => {
    prisma.referralLink.findMany.mockResolvedValue([
      link,
      { ...link, id: 'link-2' },
    ]);
    prisma.commission.groupBy.mockResolvedValue([
      { collaboratorId: 'creator', _sum: { commissionAmount: 1000 } },
    ]);
    expect((await service.scanTraffic({}, actor)).potentialSavedAmount).toBe(
      1000,
    );
  });
  it('restricts creator reads to their own links', async () => {
    await service.scanTraffic(
      {},
      { ...actor, id: 'creator', role: 'COLLABORATOR' },
    );
    expect(
      prisma.referralLink.findMany.mock.calls[0][0].where.collaboratorId,
    ).toBe('creator');
    await expect(
      service.scanTraffic(
        { collaboratorId: 'someone-else' },
        { ...actor, role: 'COLLABORATOR' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects shop scans outside their owned store', async () => {
    prisma.store.findFirst.mockResolvedValue(null);
    await expect(
      service.scanTraffic(
        { storeId: 'foreign-store' },
        { ...actor, role: 'SHOP_MANAGER' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.referralLink.findMany).not.toHaveBeenCalled();
  });
  it('requires a meaningful reason before enforcement', async () => {
    await expect(
      service.takeActionOnIncident(
        'incident-link-1',
        { action: 'PAUSE_LINK', note: 'short' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('freezes only the incident store and persists audit in the same transaction', async () => {
    const tx = {
      referralLink: { update: jest.fn() },
      commission: { updateMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    prisma.$transaction = jest.fn((callback) => callback(tx));
    jest
      .spyOn(service, 'getIncidentById')
      .mockResolvedValue({ id: 'incident-link-1' } as any);
    await service.takeActionOnIncident(
      'incident-link-1',
      { action: 'FREEZE_COMMISSION', note: 'Đối soát traffic bất thường' },
      actor,
    );
    expect(tx.commission.updateMany.mock.calls[0][0].where.order).toEqual({
      storeId: 'store-1',
    });
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
    tx.auditLog.create.mockRejectedValue(
      new Error('audit unavailable') as never,
    );
    await expect(
      service.takeActionOnIncident(
        'incident-link-1',
        { action: 'PAUSE_LINK', note: 'Đối soát traffic bất thường' },
        actor,
      ),
    ).rejects.toThrow('audit unavailable');
  });
});
