import { BadRequestException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

describe('HTTP mutation audit interceptor', () => {
  const recordAuditLog = jest.fn().mockResolvedValue({});
  const interceptor = new AuditInterceptor({ recordAuditLog } as any);
  const context = (method = 'POST') => ({ getType: () => 'http', getClass: () => class SamplesController {}, getHandler: () => function create() {}, switchToHttp: () => ({ getRequest: () => ({ method, user: { id: 'user' }, route: { path: '/samples/:id' }, params: { id: 'sample' }, body: { password: 'secret', title: 'Review' }, ip: '127.0.0.1', headers: { cookie: 'secret' } }), getResponse: () => ({ statusCode: 201 }) }) }) as any;
  beforeEach(() => recordAuditLog.mockClear());
  it('records success without credentials or response body', async () => {
    const response = { token: 'do-not-log' };
    expect(await lastValueFrom(interceptor.intercept(context(), { handle: () => of(response) }))).toBe(response);
    expect(recordAuditLog).toHaveBeenCalledTimes(1);
    const [user, action, details, ip, eventId] = recordAuditLog.mock.calls[0];
    expect(user).toBe('user'); expect(action).toContain('HTTP_POST'); expect(ip).toBe('127.0.0.1'); expect(eventId).toMatch(/^[a-f0-9-]{36}$/);
    expect(details).toMatchObject({ outcome: 'SUCCESS', statusCode: 201, input: { password: '[REDACTED]', title: 'Review' } });
    expect(JSON.stringify(details)).not.toContain('do-not-log');
  });
  it('records failed mutations and preserves the original exception', async () => {
    const cause = new BadRequestException('invalid');
    await expect(lastValueFrom(interceptor.intercept(context(), { handle: () => throwError(() => cause) }))).rejects.toBe(cause);
    expect(recordAuditLog.mock.calls[0][2]).toMatchObject({ outcome: 'FAILED', statusCode: 400 });
  });
  it('does not log ordinary reads or websocket messages', async () => {
    await lastValueFrom(interceptor.intercept(context('GET'), { handle: () => of([]) }));
    await lastValueFrom(interceptor.intercept({ getType: () => 'ws' } as any, { handle: () => of([]) }));
    expect(recordAuditLog).not.toHaveBeenCalled();
  });
});
