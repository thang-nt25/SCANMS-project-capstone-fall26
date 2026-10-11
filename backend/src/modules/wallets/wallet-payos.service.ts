import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { PayOS, type WebhookData, type PaymentLink } from '@payos/node';
import { Prisma, type WalletTopUp } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from './wallets.service';

const OPEN_STATUSES = ['CREATING', 'PENDING', 'UNDERPAID', 'PROCESSING'];

@Injectable()
export class WalletPayosService {
  private readonly logger = new Logger(WalletPayosService.name);
  private reconciling = false;

  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly wallets: WalletsService) {}

  private client() {
    const clientId = this.config.get<string>('PAYOS_CLIENT_ID')?.trim();
    const apiKey = this.config.get<string>('PAYOS_API_KEY')?.trim();
    const checksumKey = this.config.get<string>('PAYOS_CHECKSUM_KEY')?.trim();
    if (!clientId || !apiKey || !checksumKey) throw new ServiceUnavailableException('payOS chưa được cấu hình đầy đủ.');
    return new PayOS({ clientId, apiKey, checksumKey, timeout: 10000, maxRetries: 0 });
  }

  private storefront() {
    const configured = this.config.get<string>('PAYOS_STOREFRONT_URL');
    const production = this.config.get<string>('NODE_ENV') === 'production';
    if (production && !configured) throw new ServiceUnavailableException('Chưa cấu hình địa chỉ trả về của payOS.');
    let url: URL;
    try { url = new URL(configured || 'http://localhost:5173'); }
    catch { throw new ServiceUnavailableException('Địa chỉ trả về của payOS không hợp lệ.'); }
    const local = !production && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
      throw new ServiceUnavailableException('Địa chỉ trả về payOS phải dùng HTTPS.');
    }
    return url.origin;
  }

  availability() {
    try { this.client(); this.storefront(); return { available: true }; }
    catch { return { available: false }; }
  }

  private view(row: WalletTopUp) {
    return { id: row.id, orderCode: Number(row.orderCode), amount: Number(row.amount), status: row.status,
      paymentLinkId: row.paymentLinkId, checkoutUrl: row.checkoutUrl, qrCode: row.qrCode,
      bin: row.bin, accountNumber: row.accountNumber, accountName: row.accountName,
      description: row.description, expiresAt: row.expiresAt, paidAt: row.paidAt };
  }

  async create(userId: string, amount: number) {
    if (!Number.isSafeInteger(amount) || amount < 10000 || amount > 50000000) {
      throw new BadRequestException('Số tiền nạp phải từ 10.000 đến 50.000.000 ₫, không có phần thập phân.');
    }
    const client = this.client();
    const base = this.storefront();
    const existing = await this.prisma.walletTopUp.findFirst({ where: { userId, amount, status: 'PENDING', expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } });
    if (existing?.qrCode) return this.view(existing);
    const orderCode = Number.parseInt(randomBytes(6).toString('hex'), 16) + 1;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    // Persist ownership and amount BEFORE talking to the provider, including timeout recovery.
    const row = await this.prisma.walletTopUp.create({ data: { userId, orderCode: BigInt(orderCode), amount, expiresAt } });
    const resultUrl = `${base}/customer/wallet?topup=${encodeURIComponent(row.id)}`;
    try {
      const link = await client.paymentRequests.create({ orderCode, amount, description: 'NAP VI',
        returnUrl: resultUrl, cancelUrl: resultUrl, expiredAt: Math.floor(expiresAt.getTime() / 1000) });
      if (link.orderCode !== orderCode || link.amount !== amount || link.currency !== 'VND' || !link.paymentLinkId ||
        !link.qrCode || !link.accountNumber || !link.accountName || !link.checkoutUrl.startsWith('https://pay.payos.vn/')) {
        throw new Error('Invalid provider response');
      }
      // Do not overwrite PAID when a webhook arrives before the create response.
      await this.prisma.walletTopUp.updateMany({ where: { id: row.id, status: 'CREATING' }, data: { status: 'PENDING' } });
      const updated = await this.prisma.walletTopUp.update({ where: { id: row.id }, data: {
        paymentLinkId: link.paymentLinkId, qrCode: link.qrCode, checkoutUrl: link.checkoutUrl,
        bin: link.bin, accountNumber: link.accountNumber, accountName: link.accountName, description: link.description,
      } });
      return this.view(updated);
    } catch {
      // A timed-out request may still have been created/paid. Leave it for authenticated reconciliation.
      throw new ServiceUnavailableException('Chưa tạo được mã payOS. Vui lòng thử lại sau ít phút.');
    }
  }

  async latest(userId: string) {
    const row = await this.prisma.walletTopUp.findFirst({ where: { userId, status: { in: OPEN_STATUSES } }, orderBy: { createdAt: 'desc' } });
    return row ? this.view(row) : null;
  }

  async status(userId: string, id: string) {
    const row = await this.prisma.walletTopUp.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Không tìm thấy giao dịch nạp tiền.');
    if (OPEN_STATUSES.includes(row.status)) await this.reconcile(row);
    return this.view((await this.prisma.walletTopUp.findUniqueOrThrow({ where: { id } })));
  }

  async cancel(userId: string, id: string) {
    const row = await this.prisma.walletTopUp.findFirst({ where: { id, userId } });
    if (!row) throw new NotFoundException('Không tìm thấy giao dịch nạp tiền.');
    if (!OPEN_STATUSES.includes(row.status)) return this.view(row);
    const client = this.client();
    let current: PaymentLink;
    try { current = await client.paymentRequests.get(Number(row.orderCode)); }
    catch { throw new ServiceUnavailableException('Chưa kiểm tra được mã payOS. Vui lòng thử đổi số tiền lại sau.'); }
    await this.applyProviderStatus(row, current);
    const latest = await this.prisma.walletTopUp.findUniqueOrThrow({ where: { id } });
    if (!OPEN_STATUSES.includes(latest.status)) return this.view(latest);
    if (current.amountPaid > 0 || current.status === 'UNDERPAID') {
      throw new BadRequestException('Giao dịch đã nhận một phần tiền. Vui lòng hoàn tất khoản nạp này trước khi đổi số tiền.');
    }
    if (current.status !== 'PENDING') {
      throw new BadRequestException('Thanh toán đang được xử lý. Vui lòng kiểm tra lại trước khi đổi số tiền.');
    }
    let cancelled: PaymentLink;
    try { cancelled = await client.paymentRequests.cancel(Number(row.orderCode), 'Khach hang doi so tien nap vi'); }
    catch { throw new ServiceUnavailableException('Chưa hủy được mã payOS cũ. Vui lòng thử lại, mã hiện tại vẫn được giữ.'); }
    if (cancelled.amountPaid > 0 && cancelled.status !== 'PAID') {
      throw new BadRequestException('payOS vừa nhận tiền cho giao dịch này. Vui lòng kiểm tra thanh toán trước khi đổi số tiền.');
    }
    await this.applyProviderStatus(row, cancelled);
    const result = await this.prisma.walletTopUp.findUniqueOrThrow({ where: { id } });
    if (OPEN_STATUSES.includes(result.status)) throw new ServiceUnavailableException('payOS chưa xác nhận hủy mã. Vui lòng thử lại.');
    return this.view(result);
  }

  private async reconcile(row: WalletTopUp) {
    await this.prisma.walletTopUp.update({ where: { id: row.id }, data: { nextCheckAt: new Date(Date.now() + 60000) } });
    let link;
    try { link = await this.client().paymentRequests.get(Number(row.orderCode)); }
    catch { throw new ServiceUnavailableException('Chưa kiểm tra được thanh toán payOS. Ví chưa được cộng tiền.'); }
    await this.applyProviderStatus(row, link);
  }

  private async applyProviderStatus(row: WalletTopUp, link: PaymentLink) {
    if (link.orderCode !== Number(row.orderCode) || link.amount !== Number(row.amount) || (row.paymentLinkId && link.id !== row.paymentLinkId)) {
      throw new BadRequestException('Thông tin payOS không khớp giao dịch nạp tiền.');
    }
    if (link.status === 'PAID') {
      if (link.amountPaid !== Number(row.amount) || link.amountRemaining !== 0) throw new BadRequestException('Số tiền thực nhận không khớp yêu cầu nạp.');
      await this.credit(row.id, link.id);
    } else {
      await this.prisma.walletTopUp.updateMany({ where: { id: row.id, status: { in: OPEN_STATUSES } }, data: {
        status: link.status, paymentLinkId: link.id,
        checkoutUrl: row.checkoutUrl || `https://pay.payos.vn/web/${encodeURIComponent(link.id)}`,
      } });
    }
  }

  // Called ONLY after the existing payOS webhook endpoint verifies the SDK signature.
  async handleVerifiedWebhook(data: WebhookData): Promise<boolean> {
    const row = await this.prisma.walletTopUp.findUnique({ where: { orderCode: BigInt(data.orderCode) } });
    if (!row) return false;
    if (data.currency !== 'VND' || !Number.isSafeInteger(data.amount) || data.amount <= 0 || data.amount > Number(row.amount) || !data.reference || !data.paymentLinkId ||
      (row.paymentLinkId && data.paymentLinkId !== row.paymentLinkId)) throw new BadRequestException('Giao dịch payOS không khớp yêu cầu nạp.');
    // Verify full provider balance, including split/partial transfers, before crediting.
    await this.reconcile(row);
    return true;
  }

  private async credit(id: string, paymentLinkId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM wallet_top_ups WHERE id = ${id}::uuid FOR UPDATE`;
      const current = await tx.walletTopUp.findUniqueOrThrow({ where: { id } });
      if (current.status === 'PAID') return;
      if (current.paymentLinkId && current.paymentLinkId !== paymentLinkId) throw new BadRequestException('Mã thanh toán không khớp.');
      await this.wallets.creditAvailableBalance(tx, current.userId, new Prisma.Decimal(current.amount), { id: current.id, type: 'TOPUP_PAYOS' });
      await tx.walletTopUp.update({ where: { id }, data: { status: 'PAID', paymentLinkId, paidAt: new Date() } });
    });
  }

  @Interval(60000)
  async reconcilePending() {
    if (this.reconciling || !this.availability().available) return;
    this.reconciling = true;
    try {
      const rows = await this.prisma.walletTopUp.findMany({ where: { status: { in: OPEN_STATUSES }, nextCheckAt: { lte: new Date() } }, orderBy: { nextCheckAt: 'asc' }, take: 10 });
      for (const row of rows) {
        try { await this.reconcile(row); }
        catch { this.logger.warn(`Cannot reconcile wallet top-up ${row.id}; will retry.`); }
      }
    } finally { this.reconciling = false; }
  }
}
