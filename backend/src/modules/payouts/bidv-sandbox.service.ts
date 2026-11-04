import { ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { BidvSandboxClient } from './bidv-sandbox.client';
import { BidvSandboxError, bidvRequestDate, newBidvCorrelation } from './bidv-sandbox.protocol';

const START = 'BIDV_SANDBOX_TRANSFER_STARTED';
const INQUIRY = 'BIDV_SANDBOX_INQUIRY_STARTED';
const RESULT = 'BIDV_SANDBOX_RESULT';
const ACTIONS = [START, INQUIRY, RESULT];
const extra = { extraInfo1: '', extraInfo2: '', extraInfo3: '', extraInfo4: '', extraInfo5: '' };

// User-provided BIDV Try It fixture. Never copy a real payout's beneficiary into it.
export const BIDV_TRANSFER_FIXTURE = Object.freeze({
  serviceId: '000003', merchantId: '0000031', merchantName: 'OPENAPI', payerId: '211701', channelId: '211701',
  credit: '0129837294', creditType: '1', bankCode: '970406', amount: '1864800', transDesc: 'SCANMS sandbox Flow 5',
  beneficiaryName: 'momo', ...extra,
});

@Injectable()
export class BidvSandboxService {
  constructor(private readonly prisma: PrismaService, private readonly client: BidvSandboxClient) {}

  availability() {
    return { ...this.client.availability(), environment: 'SANDBOX', fixture: BIDV_TRANSFER_FIXTURE,
      grossAmount: '2072000', taxAmount: '207200', settlementMappingVerified: false,
      inquiryType: '19980710', inquiryTerminalId: '19980710' };
  }

  private assertEnabled() {
    if (!this.client.availability().configured) throw new ServiceUnavailableException('BIDV Sandbox chưa sẵn sàng. Kiểm tra cấu hình máy chủ.');
  }

  private async start(runId: string) {
    const row = await this.prisma.auditLog.findUnique({ where: { eventId: runId } });
    if (!row || row.action !== START) throw new NotFoundException('Không tìm thấy lượt thử BIDV Sandbox.');
    return row;
  }

  async history() {
    this.assertEnabled();
    const runs = await this.prisma.auditLog.findMany({ where: { action: START }, orderBy: { createdAt: 'desc' }, take: 20 });
    if (!runs.length) return { runs: [] };
    const events = await this.prisma.auditLog.findMany({
      where: { action: { in: ACTIONS }, OR: runs.map(run => ({ details: { path: ['runId'], equals: run.eventId! } })) },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return { runs: runs.map(run => this.serialize(run.eventId!, events.filter(event => (event.details as any)?.runId === run.eventId))) };
  }

  async get(runId: string) {
    this.assertEnabled();
    await this.start(runId);
    const events = await this.prisma.auditLog.findMany({
      where: { action: { in: ACTIONS }, details: { path: ['runId'], equals: runId } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return this.serialize(runId, events);
  }

  private serialize(runId: string, events: { id: string; action: string; details: Prisma.JsonValue; createdAt: Date }[]) {
    const first = events.find(event => event.action === START);
    const details = first?.details as any;
    const results = events.filter(event => event.action === RESULT);
    const last = results.at(-1)?.details as any;
    return { runId, environment: 'SANDBOX', status: last?.status ?? 'SENDING',
      settlementConfirmed: false, createdAt: first?.createdAt.toISOString(),
      request: details?.request, correlation: details?.correlation,
      events: events.map(event => ({ id: event.id, action: event.action, createdAt: event.createdAt.toISOString(), ...event.details as object })) };
  }

  private async claim(eventId: string, action: string, actorId: string, details: Prisma.InputJsonObject) {
    try {
      await this.prisma.auditLog.create({ data: { eventId, userId: actorId, action, details } });
      return true;
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const existing = await this.prisma.auditLog.findUnique({ where: { eventId } });
      const old = existing?.details as any;
      if (existing?.action !== action || old?.runId !== details.runId ||
          (action === INQUIRY && old?.rootSource !== details.rootSource)) throw new ConflictException('Mã thao tác đã được sử dụng cho yêu cầu khác.');
      return false;
    }
  }

  async transfer(runId: string, actorId: string) {
    this.assertEnabled();
    const request = { ...BIDV_TRANSFER_FIXTURE, transDate: bidvRequestDate() };
    const correlation = { ...newBidvCorrelation(), idempotencyKey: runId };
    // The unique AuditLog.eventId commits BEFORE the network call. A timeout or
    // process restart cannot cause a second transfer for the same runId.
    const claimed = await this.claim(runId, START, actorId, { runId, environment: 'SANDBOX', request, correlation });
    if (claimed) await this.execute(runId, actorId, 'transfer', request, correlation, runId);
    return this.get(runId);
  }

  async inquire(runId: string, operationId: string, rootSource: 'IDEMPOTENCY_KEY' | 'INTERACTION_ID', actorId: string) {
    this.assertEnabled();
    const row = await this.start(runId);
    const saved = row.details as any;
    // This is an explicitly selected sandbox experiment, not an asserted BIDV
    // mapping. No response is ever allowed to approve a real payout.
    const rootRequestId = rootSource === 'IDEMPOTENCY_KEY' ? saved.correlation.idempotencyKey : saved.correlation.interactionId;
    const request = {
      serviceId: saved.request.serviceId, merchantId: saved.request.merchantId, merchantName: saved.request.merchantName,
      channelId: saved.request.channelId, rootRequestId, rootRequestDate: saved.request.transDate,
      type: '19980710', terminalId: '19980710', ...extra,
    };
    const correlation = { ...newBidvCorrelation(), idempotencyKey: operationId };
    const claimed = await this.claim(operationId, INQUIRY, actorId, { runId, environment: 'SANDBOX', operationId, rootSource, request, correlation });
    if (claimed) await this.execute(runId, actorId, 'inquiry', request, correlation, operationId, saved.request.amount);
    return this.get(runId);
  }

  private async execute(runId: string, actorId: string, operation: 'transfer' | 'inquiry', request: Record<string, string>,
    correlation: { idempotencyKey: string; interactionId: string }, operationId: string, amount?: string) {
    let details: Prisma.InputJsonObject;
    try {
      const response = await this.client.call(operation, request, correlation);
      const match = operation === 'inquiry' && response.listValid && response.transactions.length === 1 &&
        response.transactions[0].rootRequestId === request.rootRequestId &&
        new Prisma.Decimal(response.transactions[0].amount).equals(amount!);
      details = { status: 'VERIFY_REQUIRED', response: { ...response }, correlationMatched: Boolean(match),
        bankReference: match ? response.transactions[0].bidvId || null : null,
        message: 'Đã nhận phản hồi BIDV Sandbox. Chưa xác nhận trạng thái hạch toán; cần đối chiếu bảng mã BIDV.' };
    } catch (error) {
      const beforeSend = error instanceof BidvSandboxError && error.stage !== 'BUSINESS' || error instanceof ServiceUnavailableException;
      details = { status: beforeSend ? 'NOT_SENT' : 'UNKNOWN',
        httpStatus: error instanceof BidvSandboxError ? error.httpStatus : null,
        message: beforeSend ? 'Chưa gửi lệnh nghiệp vụ: kiểm tra cấu hình hoặc xác thực BIDV.' : 'Chưa xác định kết quả. Giữ mã theo dõi và vấn tin; không tự gửi lại lệnh chi hộ.' };
    }
    // Never store raw response/headers, credentials, ciphertext or network errors.
    // An audit write failure propagates; the durable START still prevents resends.
    await this.prisma.auditLog.create({ data: { userId: actorId, action: RESULT,
      details: { runId, operationId, operation, environment: 'SANDBOX', ...details } } });
  }
}
