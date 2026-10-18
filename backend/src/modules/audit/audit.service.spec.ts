import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuditService } from './audit.service';

describe('Audit filters, export and complete statistics', () => {
  let prisma: any;
  let service: AuditService;
  beforeEach(() => {
    prisma = { auditLog: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), groupBy: jest.fn().mockResolvedValue([]) }, user: { findMany: jest.fn().mockResolvedValue([]) } };
    service = new AuditService(prisma);
  });
  it('combines exact action, inferred category and severity instead of overriding them', async () => {
    prisma.auditLog.findMany.mockResolvedValueOnce([{ action: 'FRAUD_MITIGATION_RESOLVE' }]);
    await service.getAuditLogs({ action: 'FRAUD_MITIGATION_RESOLVE', category: 'AI_SECURITY', severity: 'CRITICAL' });
    const where = prisma.auditLog.count.mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ action: 'FRAUD_MITIGATION_RESOLVE' });
    expect(where.AND.some((condition: any) => condition.action?.in?.includes('FRAUD_MITIGATION_RESOLVE'))).toBe(true);
    expect(prisma.auditLog.findMany.mock.calls[1][0].where).toEqual(where);
  });
  it('exports the same category, severity and period filters as the list', async () => {
    const filters = { category: 'AI_SECURITY' as const, severity: 'CRITICAL' as const, startDate: '2026-10-01T00:00:00Z' };
    await service.getAuditLogs(filters);
    const where = prisma.auditLog.count.mock.calls[0][0].where;
    await service.exportAuditLogsCsv(filters);
    expect(prisma.auditLog.findMany.mock.calls.at(-1)[0].where).toEqual(where);
  });
  it('searches Log/Event UUIDs without sending malformed UUIDs to postgres', async () => {
    const id = '12345678-1234-1234-1234-123456789012';
    await service.getAuditLogs({ keyword: id });
    expect(prisma.auditLog.count.mock.calls[0][0].where.AND[0].OR).toContainEqual({ eventId: id });
  });
  it('rejects shop access to platform audit data', async () => {
    await expect(service.getAuditLogs({}, { role: 'SHOP_MANAGER' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('rejects inverted date ranges', async () => {
    await expect(service.getAuditLogs({ startDate: '2026-10-20', endDate: '2026-10-18' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it('redacts legacy secrets and neutralizes formula cells in CSV exports', async () => {
    prisma.auditLog.findMany.mockResolvedValue([{ id: 'id', action: 'USER_LOGIN', createdAt: new Date(), details: { password: 'legacy-secret' }, user: { fullName: '=HYPERLINK("x")' } }]);
    const result = await service.exportAuditLogsCsv({});
    expect(result.csvContent).not.toContain('legacy-secret'); expect(result.csvContent).toContain('[REDACTED]'); expect(result.csvContent).toContain('\'=HYPERLINK');
  });
  it('aggregates beyond the old 1000-record sample limit', async () => {
    prisma.auditLog.count.mockResolvedValue(2500);
    prisma.auditLog.groupBy.mockResolvedValue([{ action: 'AI_FRAUD_FLAG', userId: null, _count: { _all: 2500 } }]);
    const result = await service.getAuditStats('all');
    expect(result.data.securityEventsCount).toBe(2500); expect(result.data.recentSeverityCounts.critical).toBe(2500);
    expect(result.data.categoryBreakdown[0].percentage).toBe(100);
  });
});
