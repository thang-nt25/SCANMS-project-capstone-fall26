import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { MailService } from '../auth/mail.service';
import { orderConfirmationEmailInput } from './order-confirmation-email';

// The outbox flag is committed with the order. SMTP never holds up checkout,
// and queued work survives an application restart without a schema migration.
@Injectable()
export class OrderConfirmationDeliveryService {
  private readonly logger = new Logger(OrderConfirmationDeliveryService.name);
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  @Interval(5000)
  async deliverQueued() {
    if (this.running) return;
    this.running = true;
    const claimToken = randomUUID();
    const now = new Date();
    try {
      // Atomic claims also prevent two backend instances sending the same job.
      // A lease recovers work interrupted by a restart; delivery is at least once.
      const jobs = await this.prisma.$queryRaw<Array<{ id: string; attempts: number }>>`
        UPDATE orders SET raw_payload = COALESCE(raw_payload, '{}'::jsonb) ||
          jsonb_build_object('confirmationEmailStatus', 'SENDING',
            'confirmationEmailDelivery', jsonb_build_object(
              'claimToken', ${claimToken}::text, 'claimedAt', ${now.toISOString()}::text,
              'attempts', COALESCE((raw_payload->'confirmationEmailDelivery'->>'attempts')::int, 0) + 1))
        WHERE id IN (
          SELECT id FROM orders WHERE customer_email IS NOT NULL AND (
            (raw_payload->>'confirmationEmailStatus' = 'QUEUED'
              AND COALESCE(raw_payload->'confirmationEmailDelivery'->>'nextAttemptAt', '') <= ${now.toISOString()})
            OR (raw_payload->>'confirmationEmailStatus' = 'SENDING'
              AND raw_payload->'confirmationEmailDelivery'->>'claimedAt' < ${new Date(now.getTime() - 120000).toISOString()})
          ) ORDER BY created_at ASC LIMIT 3 FOR UPDATE SKIP LOCKED
        ) RETURNING id, (raw_payload->'confirmationEmailDelivery'->>'attempts')::int AS attempts
      `;
      await Promise.all(jobs.map(async job => {
        try {
          const order = await this.prisma.order.findUnique({
            where: { id: job.id }, include: { store: { select: { name: true } }, orderItems: { include: {
              product: { select: { title: true, sku: true } }, variant: { select: { name: true, sku: true } },
            } } },
          });
          if (!order?.customerEmail) return;
          let sent = false;
          try {
            sent = await this.mail.sendOrderConfirmation(orderConfirmationEmailInput(order, {
              email: order.customerEmail, customerName: order.customerName || '',
              customerPhone: order.customerPhone || '', shippingAddress: order.shippingAddress || '',
            })) === true;
          } catch { /* Retry transport failures without touching the order or wallet. */ }
          const status = sent ? 'SENT' : job.attempts >= 3 ? 'FAILED' : 'QUEUED';
          const delivery = {
            attempts: job.attempts, finishedAt: new Date().toISOString(),
            ...(status === 'QUEUED' ? { nextAttemptAt: new Date(Date.now() + job.attempts * 60000).toISOString() } : {}),
          };
          // Merge only email fields so a concurrent payment update is preserved.
          await this.prisma.$executeRaw`
            UPDATE orders SET raw_payload = raw_payload || jsonb_build_object(
              'confirmationEmailStatus', ${status}::text,
              'confirmationEmailDelivery', ${JSON.stringify(delivery)}::jsonb)
            WHERE id = ${job.id}::uuid
              AND raw_payload->'confirmationEmailDelivery'->>'claimToken' = ${claimToken}
          `;
          if (!sent) this.logger.warn(`Email xác nhận đơn ${order.externalOrderSn}: ${status}`);
        } catch {
          // Leave the lease in place for recovery after a temporary DB outage.
          this.logger.error(`Chưa xử lý được email xác nhận của đơn ${job.id}. Sẽ khôi phục sau thời hạn xử lý.`);
        }
      }));
    } catch {
      this.logger.error('Chưa đọc được hàng đợi email xác nhận. Sẽ thử lại ở lượt tiếp theo.');
    } finally {
      this.running = false;
    }
  }
}
