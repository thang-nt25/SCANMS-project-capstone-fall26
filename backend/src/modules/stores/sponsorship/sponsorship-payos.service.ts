import { ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { PayOS, type PaymentLink, type WebhookData } from '@payos/node';
import type { SponsoredPlacement } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import { hasSponsorshipCapacity, occupiedSponsorshipSlots } from './sponsorship-capacity';
import { SPONSORSHIP_PAYOS_CODE_BASE } from './sponsorship-pricing';

function transactionTime(value: string): Date {
  // Bank timestamps without an offset are given in Vietnam local time.
  const iso = value.replace(' ', 'T');
  return new Date(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?$/.test(iso) ? iso + '+07:00' : iso);
}

@Injectable()
export class SponsorshipPayosService {
  private readonly logger = new Logger(SponsorshipPayosService.name);
  private reconciling = false;
  private readonly creating = new Map<string, Promise<string>>();

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private client() {
    const clientId = this.config.get<string>('PAYOS_CLIENT_ID')?.trim();
    const apiKey = this.config.get<string>('PAYOS_API_KEY')?.trim();
    const checksumKey = this.config.get<string>('PAYOS_CHECKSUM_KEY')?.trim();
    if (!clientId || !apiKey || !checksumKey) throw new ServiceUnavailableException('payOS chưa được cấu hình.');
    return new PayOS({ clientId, apiKey, checksumKey, timeout: 10000, maxRetries: 0 });
  }

  private returnUrl(id: string) {
    const dev = this.config.get<string>('NODE_ENV') !== 'production';
    const configured = this.config.get<string>('PAYOS_STOREFRONT_URL');
    let url: URL;
    try { url = new URL(configured || (dev ? 'http://localhost:5173' : '')); }
    catch { throw new ServiceUnavailableException('Địa chỉ trả về payOS chưa hợp lệ.'); }
    if (url.username || url.password || !(url.protocol === 'https:' || (
      dev && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    ))) throw new ServiceUnavailableException('Địa chỉ trả về payOS chưa hợp lệ.');
    return `${url.origin}/merchant/settings?sponsorship=${encodeURIComponent(id)}`;
  }

  private view(row: SponsoredPlacement) {
    return {
      status: row.status === 'AWAITING_PAYMENT' && row.paymentDeadline && row.paymentDeadline <= new Date()
        ? 'EXPIRED' : row.status,
      amount: Number(row.amount),
      receivedAmount: row.receivedAmount == null ? null : Number(row.receivedAmount),
      deadline: row.paymentDeadline,
      paidAt: row.paidAt,
      paymentIssue: row.paymentIssue,
    };
  }

  async status(id: string, ownerId: string) {
    const row = await this.prisma.sponsoredPlacement.findFirst({ where: { id, store: { ownerId } } });
    if (!row) throw new NotFoundException('Không tìm thấy đăng ký quảng bá.');
    if (row.status === 'AWAITING_PAYMENT' && row.paymentStartedAt &&
      (!row.paymentCheckedAt || Date.now() - row.paymentCheckedAt.getTime() >= 10_000)) {
      return this.view(await this.reconcile(row));
    }
    return this.view(row);
  }

  async createLink(id: string, ownerId: string) {
    const client = this.client();
    const resultUrl = this.returnUrl(id);
    const row = await this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1731091, 0)`;
      const current = await tx.sponsoredPlacement.findFirst({ where: { id, store: { ownerId } } });
      if (!current) throw new NotFoundException('Không tìm thấy đăng ký quảng bá.');
      if (current.status !== 'AWAITING_PAYMENT' || !current.payosOrderCode || !current.paymentDeadline ||
        current.paymentDeadline <= new Date()) throw new ConflictException('Gói quảng bá không còn chờ thanh toán.');
      if (!current.paymentStartedAt) {
        return tx.sponsoredPlacement.update({ where: { id }, data: { paymentStartedAt: new Date() } });
      }
      return current;
    });
    let creating = this.creating.get(id);
    if (!creating) {
      creating = this.openProviderLink(row, client, resultUrl).finally(() => this.creating.delete(id));
      this.creating.set(id, creating);
    }
    return { checkoutUrl: await creating };
  }

  private async openProviderLink(row: SponsoredPlacement, client: PayOS, resultUrl: string) {
    const orderCode = Number(row.payosOrderCode);
    const amount = Number(row.amount);
    let linkId = row.payosLinkId;
    if (!linkId) {
      try {
        const link = await client.paymentRequests.create({
          orderCode, amount, description: 'PHI QUANG BA',
          returnUrl: resultUrl, cancelUrl: resultUrl, expiredAt: Math.floor(row.paymentDeadline!.getTime() / 1000),
        });
        if (link.orderCode !== orderCode || link.amount !== amount || link.currency !== 'VND' ||
          link.status !== 'PENDING' || !link.paymentLinkId) throw new Error('Unexpected payOS link');
        linkId = link.paymentLinkId;
        await this.prisma.sponsoredPlacement.updateMany({
          where: { id: row.id, payosLinkId: null }, data: { payosLinkId: linkId },
        });
      } catch {
        // A timeout or duplicate orderCode can mean the original link already exists.
        const recovered = await this.reconcile(row);
        linkId = recovered.payosLinkId;
      }
    }
    const current = await this.prisma.sponsoredPlacement.findUniqueOrThrow({ where: { id: row.id } });
    if (current.status !== 'AWAITING_PAYMENT' || !current.paymentDeadline || current.paymentDeadline <= new Date())
      throw new ConflictException('Gói quảng bá không còn chờ thanh toán.');
    if (!linkId || current.payosLinkId !== linkId)
      throw new ServiceUnavailableException('Chưa tạo được mã payOS. Vui lòng thử lại.');
    return `https://pay.payos.vn/web/${encodeURIComponent(linkId)}`;
  }

  // The shared webhook verifies the SDK signature and currency before dispatch.
  async handleVerifiedWebhook(data: WebhookData): Promise<boolean> {
    if (data.orderCode <= SPONSORSHIP_PAYOS_CODE_BASE) return false;
    const row = await this.prisma.sponsoredPlacement.findUnique({ where: { payosOrderCode: String(data.orderCode) } });
    if (!row) return false;
    await this.reconcile(row, data);
    return true;
  }

  private async reconcile(row: SponsoredPlacement, receipt?: WebhookData) {
    await this.prisma.sponsoredPlacement.update({ where: { id: row.id }, data: { paymentCheckedAt: new Date() } });
    let link: PaymentLink;
    try { link = await this.client().paymentRequests.get(Number(row.payosOrderCode)); }
    catch { throw new ServiceUnavailableException('Chưa kiểm tra được giao dịch payOS. Vui lòng thử lại.'); }
    if (link.orderCode !== Number(row.payosOrderCode) || link.amount !== Number(row.amount) || !link.id ||
      (row.payosLinkId && row.payosLinkId !== link.id) ||
      !Number.isSafeInteger(link.amountPaid) || link.amountPaid < 0 ||
      (receipt && (receipt.paymentLinkId !== link.id || !link.transactions.some(tx =>
        tx.reference === receipt.reference && tx.amount === receipt.amount)))) {
      throw new ServiceUnavailableException('Dữ liệu đối soát payOS chưa khớp với đăng ký.');
    }
    return this.recordProviderPayment(row.id, link);
  }

  private async recordProviderPayment(id: string, link: PaymentLink) {
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1731091, 0)`;
      const row = await tx.sponsoredPlacement.findUniqueOrThrow({ where: { id } });
      if (row.payosLinkId && row.payosLinkId !== link.id) throw new ConflictException('Mã payOS không khớp.');
      if (link.amountPaid <= Number(row.receivedAmount))
        return row.payosLinkId ? row : tx.sponsoredPlacement.update({ where: { id }, data: { payosLinkId: link.id } });

      const payment = link.transactions.length === 1 ? link.transactions[0] : undefined;
      const paidAt = payment ? transactionTime(payment.transactionDateTime) : null;
      const now = new Date();
      let issue = row.paymentIssue;
      if (!issue) {
        if (link.amountPaid !== Number(row.amount) || link.status !== 'PAID' || link.amountRemaining !== 0 ||
          payment?.amount !== link.amountPaid || !payment.reference?.trim() || payment.reference.length > 94) {
          issue = 'Số tiền hoặc giao dịch nhận được không khớp phí đăng ký.';
        } else if (!paidAt || !Number.isFinite(paidAt.getTime()) ||
          !row.reviewedAt || paidAt.getTime() < Math.floor(row.reviewedAt.getTime() / 1000) * 1000 ||
          !row.paymentDeadline || paidAt > row.paymentDeadline ||
          row.endsAt <= now || row.status !== 'AWAITING_PAYMENT') {
          issue = 'Khoản tiền đến ngoài thời hạn hoặc gói đã đổi trạng thái.';
        }
      }
      if (!issue) {
        // A notification may arrive after the hold expired. Recheck under the same lock as approvals.
        const booked = await tx.sponsoredPlacement.findMany({
          where: { id: { not: id }, startsAt: { lt: row.endsAt }, endsAt: { gt: row.startsAt }, OR: occupiedSponsorshipSlots(now) },
          select: { storeId: true, startsAt: true, endsAt: true },
        });
        const eligible = await tx.sponsoredPlacement.findFirst({
          where: {
            id,
            store: { isActive: true, isDeleted: false, isVerified: true, onboardingStatus: 'VERIFIED', owner: { isActive: true } },
            ...(row.productId ? { product: { storeId: row.storeId, isActive: true, isDeleted: false, moderationStatus: 'APPROVED' } } : {}),
          },
          select: { id: true },
        });
        if (!eligible || booked.some(slot => slot.storeId === row.storeId) || !hasSponsorshipCapacity(booked, row))
          issue = 'Vị trí hoặc sản phẩm không còn đủ điều kiện hiển thị.';
      }
      const status = issue ? 'PAYMENT_REVIEW' : 'APPROVED';
      const updated = await tx.sponsoredPlacement.update({
        where: { id },
        data: {
          status, payosLinkId: link.id, receivedAmount: link.amountPaid, paymentIssue: issue,
          ...(issue ? {} : { paymentReference: `payos:${payment!.reference}`, paidAt }),
        },
      });
      if (status !== row.status) {
        await tx.auditLog.create({
          data: {
            userId: row.requestedById,
            action: issue ? 'SPONSORSHIP_PAYOS_REVIEW' : 'SPONSORSHIP_PAYOS_PAID',
            details: { placementId: id, providerLinkId: link.id, amount: link.amountPaid, issue },
          },
        });
        await tx.notification.create({
          data: {
            userId: row.requestedById, type: 'SPONSORSHIP_REVIEWED',
            title: issue ? 'Thanh toán quảng bá cần đối soát' : 'Đã thanh toán phí quảng bá',
            message: issue || 'Hệ thống đã nhận đủ phí. Banner sẽ hiển thị theo lịch đã duyệt.',
            data: { placementId: id, route: `/merchant/settings?sponsorship=${id}` },
          },
        });
      }
      return updated;
    });
  }

  @Interval(60_000)
  async reconcilePending() {
    if (this.reconciling || !this.config.get<string>('PAYOS_CLIENT_ID')) return;
    this.reconciling = true;
    try {
      const rows = await this.prisma.sponsoredPlacement.findMany({
        where: {
          status: 'AWAITING_PAYMENT', paymentStartedAt: { not: null },
          paymentDeadline: { gt: new Date(Date.now() - 24 * 60 * 60_000) },
        },
        orderBy: [{ paymentCheckedAt: { sort: 'asc', nulls: 'first' } }, { paymentStartedAt: 'asc' }],
        take: 10,
      });
      for (const row of rows) {
        try { await this.reconcile(row); }
        catch { this.logger.warn(`Chưa đối soát được đăng ký quảng bá ${row.id}.`); }
      }
    } catch {
      this.logger.warn('Chưa tải được danh sách quảng bá cần đối soát.');
    } finally {
      this.reconciling = false;
    }
  }
}
