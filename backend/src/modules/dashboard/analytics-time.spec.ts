import { BadRequestException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AnalyticsQuickRange } from './dto/dashboard-analytics.dto';
import { vietnamDayKey, vietnamHour } from './analytics-time';

describe('Analytics Vietnam time boundaries', () => {
  const service = new DashboardService({} as any);
  afterEach(() => jest.useRealTimers());
  it('assigns UTC-evening events to the next Vietnam day', () => {
    expect(vietnamDayKey('2026-10-17T18:30:00Z')).toBe('2026-10-18');
    expect(vietnamHour('2026-10-17T18:30:00Z')).toBe(1);
  });
  it('today is independent of server timezone', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-17T18:30:00Z'));
    const result = service.resolveDateRange({ range: AnalyticsQuickRange.TODAY });
    expect(result.startDate.toISOString()).toBe('2026-10-17T17:00:00.000Z');
    expect(result.endDate.toISOString()).toBe('2026-10-18T16:59:59.999Z');
    expect(result.prevEndDate.getTime()).toBe(result.startDate.getTime() - 1);
  });
  it('month starts at Vietnam midnight, not server midnight', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T01:00:00Z'));
    expect(service.resolveDateRange({ range: AnalyticsQuickRange.THIS_MONTH }).startDate.toISOString()).toBe('2026-09-30T17:00:00.000Z');
  });
  it.each([
    { startDate: 'invalid', endDate: '2026-10-18' },
    { startDate: '2026-10-19', endDate: '2026-10-18' },
    { startDate: '2026-10-18' },
    { startDate: '2020-01-01', endDate: '2026-10-18' },
  ])('rejects invalid, inverted, incomplete or excessive custom ranges', dates => {
    expect(() => service.resolveDateRange({ range: AnalyticsQuickRange.CUSTOM, ...dates })).toThrow(BadRequestException);
  });
});
