import {
  BadRequestException,
  ConflictException,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/database/prisma.service';
import { postPayoutCompletion } from './finance-posting';
import { assertPayoutFunding } from './payout-funding';
import { assertPayoutBeneficiary } from './payout-beneficiary';
import { randomUUID } from 'crypto';
import { BidvPayoutAdapter, type BidvPayoutSnapshot } from './bidv-payout.adapter';

/** Server-to-server gateway contract is documented in docs/MAIN_FLOW_5_IMPLEMENTATION.md. */
@Injectable()
export class PayoutTransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Optional() private readonly bidv?: BidvPayoutAdapter,
  ) {}

  availability() {
    const provider = this.config.get<string>('PAYOUT_PROVIDER') || 'GATEWAY';
    if (provider === 'BIDV_SANDBOX') {
      const enabled = this.config.get('NODE_ENV') !== 'production';
      const sandbox = enabled ? this.bidv?.availability() : undefined;
      return { provider, environment: 'SANDBOX', configured: Boolean(sandbox?.configured), connectionVerified: false,
        reason: !enabled ? 'SANDBOX_FORBIDDEN_IN_PRODUCTION' : sandbox?.configured ? null : 'MISSING_CONFIGURATION',
        message: sandbox?.configured
          ? 'BIDV Sandbox: duyệt yêu cầu rút tiền và cập nhật ví KOL trong SCANMS. Không chuyển tiền ngoài đời.'
          : !enabled ? 'Không được dùng BIDV Sandbox trong production.' : sandbox?.message || 'Chưa cấu hình BIDV Sandbox.' };
    }
    const base = this.config.get<string>('PAYOUT_GATEWAY_URL');
    const token = this.config.get<string>('PAYOUT_GATEWAY_TOKEN');
    let validUrl = false;
    try {
      const url = new URL(base ?? '');
      validUrl = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
    } catch {}
    const configured = provider === 'GATEWAY' && Boolean(validUrl && token?.trim());
    const bidvCredentialsPresent = Boolean(
      this.config.get<string>('BIDV_CLIENT_ID')?.trim() &&
      this.config.get<string>('BIDV_CLIENT_SECRET')?.trim(),
    );
    return {
      provider, environment: 'LIVE',
      configured,
      connectionVerified: false,
      reason: !base || !token?.trim() ? 'MISSING_CONFIGURATION' : !validUrl ? 'INVALID_HTTPS_URL' : null,
      message: configured
        ? 'Đã có cấu hình gateway; cần nghiệm thu với nhà cung cấp trước khi coi là giải ngân ngân hàng thật.'
        : bidvCredentialsPresent
          ? 'Chưa kết nối chi trả thật. Cấu hình BIDV hiện chỉ dùng thử Sandbox, không duyệt yêu cầu chi trả. Cần kết nối dịch vụ chi hộ Production để chuyển tiền qua API.'
          : 'Chưa kết nối API chi trả ngân hàng. Nếu đã chuyển tiền bên ngoài, chọn xác nhận chuyển khoản thủ công và đính kèm chứng từ.',
    };
  }

  @Cron('*/2 * * * *', { waitForCompletion: true })
  async reconcilePendingTransfers() {
    if (
      process.env.DISABLE_SCHEDULED_JOBS === 'true' ||
      !this.availability().configured
    )
      return;
    const pending = await this.prisma.payoutRequest.findMany({
      where: {
        status: 'PROCESSING',
        batchId: null,
        approvedById: { not: null },
      },
      select: { id: true, approvedById: true },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });
    for (const request of pending) {
      try {
        await this.transfer(request.id, request.approvedById!, true);
      } catch {
        /* Leave the reserved amount untouched; the next run reconciles again. */
      }
    }
  }

  async transfer(id: string, actorId: string, reconcile = false) {
    const availability = this.availability();
    const provider = availability.provider;
    const sandbox = provider === 'BIDV_SANDBOX';
    const base = this.config.get<string>('PAYOUT_GATEWAY_URL');
    const token = this.config.get<string>('PAYOUT_GATEWAY_TOKEN');
    if (!sandbox && (!base || !token))
      throw new ServiceUnavailableException(
        'Chưa cấu hình cổng chi trả ngân hàng. Có thể đối soát chuyển khoản thực tế bằng chứng từ.',
      );
    if (!availability.configured) throw new ServiceUnavailableException(sandbox ? availability.message : 'Cấu hình cổng chi trả HTTPS không hợp lệ');
    const leaseId = randomUUID();
    let snapshot: BidvPayoutSnapshot | undefined;
    const request = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM payout_requests WHERE id = ${id}::uuid FOR UPDATE`;
      const row = await tx.payoutRequest.findUnique({
        where: { id },
        include: {
          collaborator: {
            select: {
              isActive: true,
              isDeleted: true,
              collaboratorProfile: { select: { kycStatus: true } },
            },
          },
        },
      });
      if (!row) throw new BadRequestException('Yêu cầu chi trả không tồn tại');
      if (row.status === 'APPROVED') return row;
      if ((row.transferProvider && row.transferProvider !== provider) ||
          (row.status === 'PROCESSING' && !row.transferProvider && sandbox)) {
        throw new ConflictException('Cần đối soát bằng đúng dịch vụ đã gửi lệnh; không đổi giữa Sandbox và chi trả thật.');
      }
      if (row.transferLeaseUntil && row.transferLeaseUntil > new Date())
        throw new ConflictException(
          'Ngân hàng đang được đối soát cho lệnh này; vui lòng chờ',
        );
      if (row.batchId)
        throw new ConflictException(
          'Lệnh đã đưa vào lô, cần đối soát qua quy trình lô',
        );
      if (
        (!reconcile && row.status !== 'PENDING') ||
        (reconcile && row.status !== 'PROCESSING')
      )
        throw new ConflictException('Trạng thái chi trả không phù hợp');
      if (
        !reconcile &&
        (!row.collaborator.isActive ||
          row.collaborator.isDeleted ||
          row.collaborator.collaboratorProfile?.kycStatus !== 'VERIFIED')
      )
        throw new BadRequestException(
          'Tài khoản đối tác chưa đủ điều kiện giải ngân',
        );
      if (
        !row.bankName ||
        !row.bankAccountNumber ||
        !row.bankAccountName ||
        row.netAmount.lte(0) ||
        !row.netAmount.plus(row.taxAmount).equals(row.amount)
      )
        throw new BadRequestException(
          'Thiếu tài khoản nhận hoặc số tiền đối soát không hợp lệ',
        );
      await assertPayoutFunding(tx, row);
      if (!reconcile) await assertPayoutBeneficiary(tx, row);
      if (sandbox && !reconcile) snapshot = this.bidv!.prepare(row);
      await tx.payoutRequest.update({
        where: { id },
        data: {
          status: 'PROCESSING',
          approvedById: actorId,
          transferProvider: provider,
          transferLeaseId: leaseId,
          transferLeaseUntil: new Date(Date.now() + 60000),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: reconcile ? 'RECONCILE_BANK_PAYOUT' : 'START_BANK_PAYOUT',
          details: { payoutId: id, provider, environment: sandbox ? 'SANDBOX' : 'LIVE',
            ...(snapshot ? { sandbox: { request: snapshot.request, correlation: snapshot.correlation } } : {}) },
        },
      });
      return row;
    });
    if (request.status === 'APPROVED')
      return { status: 'APPROVED', bankRefCode: request.bankRefCode, provider: request.transferProvider ?? 'GATEWAY' };

    let result: {
      status: string;
      bankRefCode?: string;
      payoutId?: string;
      amount?: string;
      currency?: string;
    };
    try {
      if (sandbox) result = await this.bidv!.execute(request, actorId, reconcile, snapshot);
      else {
      const response = await fetch(
        `${base!.replace(/\/$/, '')}/transfers${reconcile ? `/${id}` : ''}`,
        {
          method: reconcile ? 'GET' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': id,
          },
          signal: AbortSignal.timeout(15000),
          ...(reconcile
            ? {}
            : {
                body: JSON.stringify({
                  payoutId: id,
                  amount: request.netAmount.toFixed(2),
                  currency: 'VND',
                  bankName: request.bankName,
                  accountNumber: request.bankAccountNumber,
                  accountName: request.bankAccountName,
                  description: `SCANMS ${id}`,
                }),
              }),
        },
      );
      if (!response.ok) throw new Error('Gateway error');
      result = (await response.json()) as typeof result;
      }
      // Never trust a receipt for a different payment or amount.
      if (
        result.payoutId !== id ||
        result.amount !== request.netAmount.toFixed(2) ||
        result.currency !== 'VND'
      )
        throw new Error('Mismatched receipt');
    } catch {
      await this.prisma.payoutRequest.updateMany({
        where: { id, status: 'PROCESSING', transferLeaseId: leaseId },
        data: { transferLeaseId: null, transferLeaseUntil: null },
      });
      throw new ServiceUnavailableException(
        'Chưa xác định kết quả ngân hàng. Tiền vẫn được giữ; hãy đối soát, không gửi lại lệnh chuyển tiền.',
      );
    }
    if (result.status === 'FAILED') {
      await this.prisma.payoutRequest.updateMany({
        where: { id, status: 'PROCESSING', transferLeaseId: leaseId },
        data: {
          status: 'PENDING',
          transferLeaseId: null,
          transferLeaseUntil: null,
        },
      });
      throw new BadRequestException(
        'Ngân hàng xác nhận giao dịch thất bại; yêu cầu giữ trạng thái chờ duyệt.',
      );
    }
    if (
      result.status !== 'SUCCEEDED' ||
      !result.bankRefCode ||
      !/^[A-Za-z0-9._/ -]{1,100}$/.test(result.bankRefCode)
    ) {
      await this.prisma.payoutRequest.updateMany({
        where: { id, status: 'PROCESSING', transferLeaseId: leaseId },
        data: { transferLeaseId: null, transferLeaseUntil: null },
      });
      return { status: 'PROCESSING', provider };
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM payout_requests WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.payoutRequest.findUniqueOrThrow({
        where: { id },
      });
      if (current.status === 'APPROVED')
        return { status: current.status, bankRefCode: current.bankRefCode, provider: current.transferProvider ?? 'GATEWAY' };
      if (current.status !== 'PROCESSING')
        throw new ConflictException('Yêu cầu đã đổi trạng thái, cần đối soát');
      if (current.transferLeaseId !== leaseId)
        throw new ConflictException(
          'Đã có phiên đối soát mới; cần đọc lại kết quả ngân hàng',
        );
      await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`bank-reference:${result.bankRefCode}`}, 0))`;
      const duplicate = await tx.payoutRequest.findFirst({
        where: { bankRefCode: result.bankRefCode, id: { not: id } },
      });
      if (duplicate)
        throw new ConflictException(
          'Mã giao dịch ngân hàng đã được ghi nhận cho yêu cầu khác',
        );
      await tx.payoutRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          bankRefCode: result.bankRefCode,
          processedAt: new Date(),
          transferLeaseId: null,
          transferLeaseUntil: null,
          approvedById: actorId,
        },
      });
      await postPayoutCompletion(tx, current, sandbox);
      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'BANK_PAYOUT_COMPLETED',
          details: {
            payoutId: id,
            provider, environment: sandbox ? 'SANDBOX' : 'LIVE', settlementConfirmed: !sandbox,
            gross: current.amount.toFixed(2),
            tax: current.taxAmount.toFixed(2),
            net: current.netAmount.toFixed(2),
            bankRefCode: result.bankRefCode!,
          },
        },
      });
      await tx.notification.create({
        data: {
          userId: current.collaboratorId,
          type: 'PAYOUT_COMPLETED',
          title: sandbox ? 'Đã duyệt rút tiền qua BIDV Sandbox' : 'Đã chi trả thu nhập đối tác',
          message: sandbox
            ? `Đã hoàn tất yêu cầu ${current.netAmount.toFixed(2)} VND trong SCANMS (BIDV Sandbox). Không chuyển tiền ngoài đời.`
            : `Đã chuyển ${current.netAmount.toFixed(2)} VND. Thuế khấu trừ ${current.taxAmount.toFixed(2)} VND.`,
          data: { payoutId: id, actionUrl: '/collaborator/wallet', environment: sandbox ? 'SANDBOX' : 'LIVE' },
        },
      });
      return { status: 'APPROVED', bankRefCode: result.bankRefCode, provider, environment: sandbox ? 'SANDBOX' : 'LIVE' };
    });
  }
}
