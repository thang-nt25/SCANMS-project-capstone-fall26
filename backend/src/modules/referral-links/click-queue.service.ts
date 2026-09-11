import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export interface EnqueuedClickJob {
  linkId: string;
  ip: string;
  userAgent?: string | null;
  referer?: string | null;
  fingerprint?: string | null;
  deviceType?: string | null;
  sessionId?: string | null;
  isValid: boolean;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  accessMethod?: 'QR' | 'LINK' | null;
}

@Injectable()
export class ClickQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(ClickQueueService.name);
  private queue: EnqueuedClickJob[] = [];
  private isProcessing = false;
  private readonly flushInterval: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {
    // Tự động xử lý flush queue theo chu kỳ mỗi 1.5 giây hoặc khi đạt 20 items
    this.flushInterval = setInterval(() => {
      this.processQueue();
    }, 1500);
    this.flushInterval.unref();
  }

  async onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.processQueue(); // Đảm bảo ghi hết các log đang chờ trước khi dừng
  }

  /**
   * Đẩy click event vào hàng đợi bất đồng bộ (Non-blocking redirect)
   */
  enqueue(job: EnqueuedClickJob) {
    this.queue.push(job);
    if (this.queue.length >= 20) {
      this.processQueue();
    }
  }

  /**
   * Worker xử lý hàng đợi click traffic log
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const batch = this.queue.splice(0, 50); // Lấy tối đa 50 jobs mỗi đợt

    try {
      for (const job of batch) {
        try {
          // Kiểm tra chống spam: click trùng từ cùng IP + link trong 30 giây
          const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
          const duplicateRecentClick = await this.prisma.clickTrafficLog.findFirst({
            where: {
              referralLinkId: job.linkId,
              ipAddress: job.ip,
              createdAt: { gte: thirtySecondsAgo },
            },
          });

          const isUnique = !duplicateRecentClick;

          await Promise.all([
            this.prisma.referralLink.updateMany({
              where: { id: job.linkId },
              data: {
                totalClicks: { increment: 1 },
                ...(isUnique ? { uniqueClicks: { increment: 1 } } : {}),
                lastAccessedAt: new Date(),
              },
            }),
            this.prisma.clickTrafficLog.create({
              data: {
                referralLinkId: job.linkId,
                ipAddress: job.ip,
                userAgent: job.userAgent || null,
                referrer: job.accessMethod === 'QR' ? (job.referer ? `${job.referer} [QR]` : 'QR_SCAN') : (job.referer || null),
                deviceFingerprint: job.accessMethod === 'QR'
                  ? (job.fingerprint ? `${job.fingerprint}|accessMethod:QR` : 'accessMethod:QR')
                  : (job.fingerprint || null),
                deviceType: job.deviceType || null,
                sessionId: job.sessionId || null,
                isValid: job.isValid,
                utmSource: job.utmSource || null,
                utmMedium: job.utmMedium || null,
                utmCampaign: job.utmCampaign || null,
              },
            }),
          ]);
        } catch (jobErr) {
          this.logger.warn(`Bỏ qua click job lỗi cho linkId ${job.linkId}: ${jobErr.message}`);
        }
      }
    } catch (error: any) {
      this.logger.error(`Lỗi khi xử lý batch click queue: ${error.message}`);
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }
}
