import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { BidvSandboxClient } from './bidv-sandbox.client';
import { BidvSandboxService } from './bidv-sandbox.service';
import { BidvSandboxError } from './bidv-sandbox.protocol';
import { BidvSandboxController, StartBidvSandboxDto, InquireBidvSandboxDto } from './bidv-sandbox.controller';

describe('BIDV isolated payout runs', () => {
  let rows: any[], prisma: any, client: any, service: BidvSandboxService;
  const response = { httpStatus: 200, errorCode: '000', errorDesc: 'SUCCESS', transactions: [], listValid: false };
  beforeEach(() => {
    rows = [];
    prisma = { auditLog: {
      create: jest.fn(async ({ data }) => {
        if (data.eventId && rows.some(row => row.eventId === data.eventId)) throw { code: 'P2002' };
        const row = { id: randomUUID(), ...data, createdAt: new Date(Date.UTC(2026, 10, 2, 1, 0, rows.length)) };
        rows.push(row); return row;
      }),
      findUnique: jest.fn(async ({ where }) => rows.find(row => row.eventId === where.eventId) ?? null),
      findMany: jest.fn(async ({ where }) => rows.filter(row =>
        (typeof where.action === 'string' ? row.action === where.action : where.action.in.includes(row.action)) &&
        (!where.details || row.details.runId === where.details.equals) &&
        (!where.OR || where.OR.some(condition => row.details.runId === condition.details.equals)))),
    }, payoutRequest: { update: jest.fn() }, financialLedger: { create: jest.fn() }, notification: { create: jest.fn() } };
    client = { availability: jest.fn(() => ({ configured: true })), call: jest.fn().mockResolvedValue(response) };
    service = new BidvSandboxService(prisma, client);
  });

  it('uses fixture, persists correlation, never settles a real payout even on 000', async () => {
    const runId = randomUUID();
    const result = await service.transfer(runId, 'manager');
    expect(result).toMatchObject({ environment: 'SANDBOX', status: 'VERIFY_REQUIRED', settlementConfirmed: false });
    expect(client.call).toHaveBeenCalledWith('transfer', expect.objectContaining({ credit: '0129837294', amount: '1864800' }),
      expect.objectContaining({ idempotencyKey: runId }));
    expect(prisma.payoutRequest.update).not.toHaveBeenCalled();
    expect(prisma.financialLedger.create).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect((await service.history()).runs).toHaveLength(1);
  });

  it('deduplicates concurrent and restarted requests using durable eventId', async () => {
    const runId = randomUUID();
    await Promise.all([service.transfer(runId, 'manager'), service.transfer(runId, 'manager')]);
    await new BidvSandboxService(prisma, client).transfer(runId, 'manager');
    expect(client.call).toHaveBeenCalledTimes(1);
  });

  it('persists uncertain result, never retries transfer, and uses original date for explicit inquiry', async () => {
    const runId = randomUUID();
    client.call.mockRejectedValueOnce(new BidvSandboxError('BUSINESS'));
    expect((await service.transfer(runId, 'manager')).status).toBe('UNKNOWN');
    await service.transfer(runId, 'manager');
    expect(client.call).toHaveBeenCalledTimes(1);
    rows[0].details.request.transDate = '261101';
    const operationId = randomUUID();
    await service.inquire(runId, operationId, 'IDEMPOTENCY_KEY', 'manager');
    await service.inquire(runId, operationId, 'IDEMPOTENCY_KEY', 'manager');
    expect(client.call).toHaveBeenCalledTimes(2);
    expect(client.call).toHaveBeenLastCalledWith('inquiry', expect.objectContaining({ rootRequestId: runId, rootRequestDate: '261101' }),
      expect.objectContaining({ idempotencyKey: operationId }));
    await expect(service.inquire(runId, operationId, 'INTERACTION_ID', 'manager')).rejects.toThrow('đã được sử dụng');
  });

  it('does not resend when result persistence fails after BIDV was contacted', async () => {
    const runId = randomUUID();
    const create = prisma.auditLog.create.getMockImplementation();
    prisma.auditLog.create.mockImplementation(args => {
      if (args.data.action === 'BIDV_SANDBOX_RESULT') throw new Error('database offline');
      return create(args);
    });
    await expect(service.transfer(runId, 'manager')).rejects.toThrow('database offline');
    expect((await service.transfer(runId, 'manager')).status).toBe('SENDING');
    expect(client.call).toHaveBeenCalledTimes(1);
  });

  it('matches root ID AND amount; even a matched detailed 000 never approves', async () => {
    const runId = randomUUID();
    await service.transfer(runId, 'manager');
    const transaction = { rootRequestId: runId, amount: '1864800', detailCode: '000', accountingDate: '261102', bidvId: 'TEST-REF' };
    client.call.mockResolvedValue({ ...response, listValid: true, transactions: [transaction] });
    let result = await service.inquire(runId, randomUUID(), 'IDEMPOTENCY_KEY', 'manager');
    expect(result.events.at(-1)).toMatchObject({ correlationMatched: true, bankReference: 'TEST-REF' });
    expect(result.settlementConfirmed).toBe(false);
    client.call.mockResolvedValue({ ...response, listValid: true, transactions: [{ ...transaction, amount: '1' }] });
    result = await service.inquire(runId, randomUUID(), 'IDEMPOTENCY_KEY', 'manager');
    expect(result.events.at(-1)).toMatchObject({ correlationMatched: false, bankReference: null });
    client.call.mockResolvedValue({ ...response, listValid: true, transactions: [{ ...transaction, rootRequestId: 'other' }] });
    result = await service.inquire(runId, randomUUID(), 'IDEMPOTENCY_KEY', 'manager');
    expect(result.events.at(-1)).toMatchObject({ correlationMatched: false, bankReference: null });
  });

  it('OAuth failure is NOT_SENT and raw error text never enters audit', async () => {
    client.call.mockRejectedValueOnce(new BidvSandboxError('OAUTH', 401));
    expect((await service.transfer(randomUUID(), 'manager')).status).toBe('NOT_SENT');
    client.call.mockRejectedValueOnce(new Error('SECRET-PRIVATE-KEY'));
    await service.transfer(randomUUID(), 'manager');
    expect(JSON.stringify(rows)).not.toContain('SECRET-PRIVATE-KEY');
  });

  it('production and disabled configuration refuse business calls', async () => {
    for (const environment of [{ NODE_ENV: 'production', BIDV_SANDBOX_ENABLED: 'true' }, { NODE_ENV: 'development' }]) {
      const actual = new BidvSandboxClient(new ConfigService(environment));
      expect(actual.availability().configured).toBe(false);
      await expect(actual.call('transfer', {}, { idempotencyKey: randomUUID(), interactionId: randomUUID() })).rejects.toThrow('chưa hợp lệ');
    }
    client.availability.mockReturnValue({ configured: false });
    await expect(service.transfer(randomUUID(), 'manager')).rejects.toThrow('chưa sẵn sàng');
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('restricts roles and rejects real account/payout fields at the route boundary', async () => {
    expect(Reflect.getMetadata('roles', BidvSandboxController)).toEqual([UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN]);
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    await expect(pipe.transform({ runId: randomUUID(), credit: 'real-account', payoutId: randomUUID() }, { type: 'body', metatype: StartBidvSandboxDto })).rejects.toThrow();
    await expect(pipe.transform({ operationId: randomUUID(), rootSource: 'UNKNOWN' }, { type: 'body', metatype: InquireBidvSandboxDto })).rejects.toThrow();
  });
});
