import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MailService } from '../auth/mail.service';

@Injectable()
export class PayoutEmailScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}
  @Cron('*/5 * * * *', { waitForCompletion: true })
  async deliver() {
    if (process.env.DISABLE_SCHEDULED_JOBS === 'true') return;
    if (
      !(process.env.GMAIL_USER || process.env.SMTP_USER) ||
      !(process.env.GMAIL_PASS || process.env.SMTP_PASS)
    )
      return;
    // The completion notification is written in the payout transaction: durable outbox.
    const ids = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >`SELECT id FROM notifications WHERE type = 'PAYOUT_COMPLETED' AND data->>'emailSentAt' IS NULL AND (data->>'emailAttemptAt' IS NULL OR (data->>'emailAttemptAt')::timestamptz < NOW() - INTERVAL '1 hour') ORDER BY created_at ASC LIMIT 20`;
    for (const { id } of ids) {
      await this.prisma.$transaction(
        async (tx) => {
          const locked = await tx.$queryRaw<
            Array<{ id: string }>
          >`SELECT id FROM notifications WHERE id = ${id}::uuid FOR UPDATE SKIP LOCKED`;
          if (!locked.length) return;
          const notification = await tx.notification.findUniqueOrThrow({
            where: { id },
          });
          const data = (notification.data ?? {}) as Prisma.JsonObject;
          if (data.emailSentAt || typeof data.payoutId !== 'string') return;
          const payout = await tx.payoutRequest.findFirst({
            where: {
              id: data.payoutId,
              collaboratorId: notification.userId,
              status: 'APPROVED',
            },
            include: { collaborator: { select: { email: true } } },
          });
          if (!payout || !payout.bankRefCode) return;
          const attempt = new Date().toISOString();
          try {
            const accepted = await this.mail.sendPayoutStatement(payout.collaborator.email, {
              id: payout.id,
              gross: payout.amount.toFixed(2),
              tax: payout.taxAmount.toFixed(2),
              net: payout.netAmount.toFixed(2),
              bankRef: payout.bankRefCode,
            });
            if (accepted !== true) throw new Error('Payout statement was not accepted by the mail provider');
            await tx.notification.update({
              where: { id },
              data: {
                data: {
                  ...data,
                  emailSentAt: attempt,
                  emailAttemptAt: attempt,
                },
              },
            });
            await tx.auditLog.create({
              data: {
                action: 'PAYOUT_EMAIL_SENT',
                details: { payoutId: payout.id, notificationId: id },
              },
            });
          } catch {
            await tx.notification.update({
              where: { id },
              data: { data: { ...data, emailAttemptAt: attempt } },
            });
          }
        },
        { timeout: 30000 },
      );
    }
  }
}
