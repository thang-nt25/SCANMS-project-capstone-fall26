import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import * as crypto from 'crypto';

export interface EnqueuedClickJob {
  clickLogId?: string;
  eventId?: string;
  linkId: string;
  storeId?: string;
  collaboratorId?: string;
  productId?: string;
  campaignId?: string | null;
  ip?: string;
  ipSubnet?: string;
  ipHash?: string;
  userAgent?: string | null;
  referer?: string | null;
  fingerprint?: string | null;
  fingerprintHash?: string | null;
  deviceType?: string | null;
  sessionId?: string | null;
  visitorIdHash?: string | null;
  isValid: boolean;
  riskReason?: string | null;
  requestId?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  accessMethod?: 'QR' | 'LINK' | null;
  receivedAt?: Date;
  retryCount?: number;
  workerId?: string;
  leasedAt?: number;
  leaseExpiresAt?: number;
}

@Injectable()
export class ClickQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClickQueueService.name);
  private queue: EnqueuedClickJob[] = [];
  private inFlightMemQueue: Map<string, { job: EnqueuedClickJob; leaseExpiresAt: number }> = new Map();
  private isProcessing = false;
  private isDestroyed = false;
  private readonly flushInterval: NodeJS.Timeout;
  private readonly reclaimInterval: NodeJS.Timeout;

  // Cấu hình định danh worker và thời hạn lease an toàn multi-instance (Issue 2)
  readonly workerId = `worker-${crypto.randomUUID()}`;
  readonly leaseDurationMs = 30000; // 30 giây lease visibility timeout

  // Khóa hàng đợi Redis
  private readonly redisQueueKey = 'scanms:click_queue:pending';
  private readonly redisProcessingKey = 'scanms:click_queue:processing_zset';
  private readonly redisLegacyProcessingKey = 'scanms:click_queue:processing';
  private readonly redisDlqKey = 'scanms:click_queue:dlq';

  // Lua script cấp phát job nguyên tử sang Sorted Set có lease expiration (Chống mất job & an toàn multi-instance)
  private readonly leaseScript = `
    local item = redis.call('RPOP', KEYS[1])
    if item then
      local leaseExpiresAt = tonumber(ARGV[1])
      redis.call('ZADD', KEYS[2], leaseExpiresAt, item)
      return item
    end
    return nil
  `;

  // Lua script khôi phục (reclaim) các job quá hạn lease nguyên tử sang pending queue (Issue 2)
  private readonly reclaimScript = `
    local expired = redis.call('zrangebyscore', KEYS[1], '-inf', ARGV[1])
    local count = 0
    for i, item in ipairs(expired) do
      if redis.call('zrem', KEYS[1], item) > 0 then
        redis.call('lpush', KEYS[2], item)
        count = count + 1
      end
    end
    return count
  `;

  // Lua script di chuyển nguyên tử: Xóa khỏi processing ZSET và đẩy sang danh sách đích (pending/DLQ) (Issue 2)
  private readonly zremAndPushScript = `
    local removed = redis.call('zrem', KEYS[1], ARGV[1])
    if removed > 0 then
      redis.call('lpush', KEYS[2], ARGV[2])
      return 1
    end
    return 0
  `;

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cacheService?: CacheService,
  ) {
    // Chu kỳ flush xử lý queue mỗi 1.5 giây
    this.flushInterval = setInterval(() => {
      this.processQueue();
    }, 1500);
    this.flushInterval.unref();

    // Chu kỳ quét và khôi phục các job bị quá hạn lease (Reclaim) mỗi 15 giây
    this.reclaimInterval = setInterval(() => {
      this.reclaimStuckJobs().catch(() => {});
    }, 15000);
    this.reclaimInterval.unref();
  }

  async onModuleInit() {
    const redis = this.cacheService?.getRedisClient();
    if (redis) {
      // Di chuyển các job cũ từ legacy list (nếu còn) sang pending queue
      try {
        while (true) {
          const legacy = await redis.rpoplpush(this.redisLegacyProcessingKey, this.redisQueueKey);
          if (!legacy) break;
        }
      } catch {}
    }

    // Khi worker khởi động, tự động quét và khôi phục các job đã quá hạn lease
    await this.reclaimStuckJobs();
  }

  async onModuleDestroy() {
    this.isDestroyed = true;
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.reclaimInterval) {
      clearInterval(this.reclaimInterval);
    }
  }

  /**
   * Đẩy click event vào hàng đợi bất đồng bộ bền vững (Redis List hoặc RAM buffer)
   */
  enqueue(job: EnqueuedClickJob) {
    job.retryCount = job.retryCount || 0;
    const redis = this.cacheService?.getRedisClient();
    if (redis) {
      redis.lpush(this.redisQueueKey, JSON.stringify(job)).catch((err) => {
        this.logger.warn(`Lỗi đẩy click vào Redis queue, chuyển sang memory buffer: ${err.message}`);
        this.queue.push(job);
      });
    } else {
      this.queue.push(job);
    }

    if (this.queue.length >= 20) {
      this.processQueue();
    }
  }

  /**
   * Quét và khôi phục (Reclaim) các job bị kẹt quá hạn lease (Crash Recovery & Multi-Instance Safe - Issue 2)
   * CHỈ reclaim các job có leaseExpiresAt <= now (đã quá hạn xử lý 30s).
   * Sử dụng Lua script để xóa khỏi ZSET và đưa về Pending List nguyên tử (tránh mất job khi backend crash).
   */
  async reclaimStuckJobs(): Promise<number> {
    const now = Date.now();
    let reclaimedCount = 0;

    const redis = this.cacheService?.getRedisClient();
    if (redis) {
      try {
        // Reclaim nguyên tử toàn bộ job quá hạn lease bằng Lua script (Issue 2)
        const result = await redis.eval(
          this.reclaimScript,
          2,
          this.redisProcessingKey,
          this.redisQueueKey,
          now.toString(),
        );
        reclaimedCount = Number(result) || 0;

        if (reclaimedCount > 0) {
          this.logger.warn(
            `[CLICK_QUEUE_RECLAIM] Đã khôi phục ${reclaimedCount} job quá hạn lease (>30s) về pending queue an toàn multi-instance bằng Lua script nguyên tử.`,
          );
        }
      } catch (err: any) {
        this.logger.warn(`[CLICK_QUEUE_RECLAIM] Lỗi khi khôi phục stuck jobs: ${err.message}`);
      }
    }

    // Quét memory in-flight queue cho môi trường không có Redis
    for (const [jobKey, entry] of this.inFlightMemQueue.entries()) {
      if (entry.leaseExpiresAt <= now) {
        this.inFlightMemQueue.delete(jobKey);
        this.queue.unshift(entry.job);
        reclaimedCount++;
      }
    }

    return reclaimedCount;
  }

  /**
   * Worker xử lý hàng đợi click traffic log chuẩn Reliable Queue với Visibility Timeout:
   * - Cấp phát nguyên tử sang ZSET kèm leaseExpiresAt (chống mất job và an toàn multi-instance)
   * - Ghi DB thành công -> ACK bằng ZREM khỏi ZSET
   * - Thất bại -> ZREM + Re-enqueue nguyên tử bằng Lua script (Issue 2)
   */
  async processQueue() {
    if (this.isProcessing || this.isDestroyed) return;
    this.isProcessing = true;

    const redis = this.cacheService?.getRedisClient();

    // 1. Xử lý Redis Reliable Queue
    if (redis) {
      try {
        let fetched = 0;
        // Kéo tối đa 50 items mỗi lượt xử lý
        while (fetched < 50) {
          const leaseExpiresAt = Date.now() + this.leaseDurationMs;
          const rawItem = (await redis.eval(
            this.leaseScript,
            2,
            this.redisQueueKey,
            this.redisProcessingKey,
            leaseExpiresAt.toString(),
          )) as string | null;

          if (!rawItem) break;
          fetched++;

          let job: EnqueuedClickJob;
          try {
            job = JSON.parse(rawItem);
          } catch (parseErr: any) {
            // Job bị hỏng cú pháp -> Di chuyển nguyên tử sang DLQ bằng Lua script (Issue 2)
            const dlqPayload = JSON.stringify({
              raw: rawItem,
              error: 'CORRUPTED_JSON',
              failedAt: new Date().toISOString(),
            });
            await redis.eval(
              this.zremAndPushScript,
              2,
              this.redisProcessingKey,
              this.redisDlqKey,
              rawItem,
              dlqPayload,
            ).catch(() => {});
            continue;
          }

          job.workerId = this.workerId;
          job.leasedAt = Date.now();
          job.leaseExpiresAt = leaseExpiresAt;

          try {
            await this.processSingleJob(job);
            // Ghi database thành công -> ACK: Xóa nguyên tử khỏi processing ZSET
            await redis.zrem(this.redisProcessingKey, rawItem);
          } catch (jobErr: any) {
            const currentRetry = (job.retryCount || 0) + 1;
            if (currentRetry <= 3) {
              job.retryCount = currentRetry;
              this.logger.warn(
                `[CLICK_QUEUE_RETRY] Click job cho linkId ${job.linkId} thất bại lần ${currentRetry}/3: ${jobErr.message}. Đưa lại pending queue.`,
              );
              // Di chuyển nguyên tử sang pending queue bằng Lua script (Issue 2)
              const retryPayload = JSON.stringify(job);
              const moved = await redis.eval(
                this.zremAndPushScript,
                2,
                this.redisProcessingKey,
                this.redisQueueKey,
                rawItem,
                retryPayload,
              ).catch(() => 0);

              if (moved === 0) {
                this.queue.push(job);
              }
            } else {
              // Vượt quá 3 lần retry -> Di chuyển nguyên tử sang DLQ bằng Lua script (Issue 2)
              this.logger.error(
                `[CLICK_QUEUE_DLQ] Click job cho linkId ${job.linkId} đã vượt quá 3 lần retry! Chuyển vào Dead-Letter Queue (DLQ). Lỗi: ${jobErr.message}`,
              );
              const dlqPayload = JSON.stringify({
                job,
                error: jobErr.message,
                failedAt: new Date().toISOString(),
                retryCount: currentRetry,
              });
              await redis.eval(
                this.zremAndPushScript,
                2,
                this.redisProcessingKey,
                this.redisDlqKey,
                rawItem,
                dlqPayload,
              ).catch(() => {});
            }
          }
        }
      } catch (redisErr: any) {
        this.logger.warn(`Lỗi khi xử lý Redis reliable queue: ${redisErr.message}`);
      }
    }

    // 2. Xử lý Memory Buffer Fallback (khi không có Redis hoặc Redis mất kết nối)
    if (this.queue.length > 0) {
      const memBatch = this.queue.splice(0, 50);
      for (const job of memBatch) {
        const jobKey = job.eventId || `mem-${crypto.randomUUID()}`;
        this.inFlightMemQueue.set(jobKey, {
          job,
          leaseExpiresAt: Date.now() + this.leaseDurationMs,
        });

        try {
          await this.processSingleJob(job);
          this.inFlightMemQueue.delete(jobKey); // ACK
        } catch (jobErr: any) {
          this.inFlightMemQueue.delete(jobKey);
          const currentRetry = (job.retryCount || 0) + 1;
          if (currentRetry <= 3) {
            job.retryCount = currentRetry;
            this.logger.warn(
              `[CLICK_QUEUE_RETRY_MEM] Click job cho linkId ${job.linkId} thất bại lần ${currentRetry}/3 trên memory. Retry lại.`,
            );
            this.queue.push(job);
          } else {
            this.logger.error(
              `[CLICK_QUEUE_DLQ_MEM] Click job cho linkId ${job.linkId} đã vượt quá 3 lần retry trên RAM! Lỗi: ${jobErr.message}`,
            );
          }
        }
      }
    }

    this.isProcessing = false;
    if (this.queue.length > 0) {
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Xử lý ghi một click job vào cơ sở dữ liệu với kiểm tra Idempotency, Privacy
   * và Prisma Transaction Atomic (Issue 1)
   */
  private async processSingleJob(job: EnqueuedClickJob): Promise<void> {
    if (this.isDestroyed) return;
    const eventId = job.eventId || `evt-${crypto.randomUUID()}`;

    // 1. Kiểm tra idempotency: Nếu eventId đã tồn tại thì bỏ qua (chống queue retry nhân đôi)
    const existingEvent = await this.prisma.clickTrafficLog.findUnique({
      where: { eventId },
      select: { id: true },
    });
    if (existingEvent) {
      return;
    }

    // 2. Bảo mật quyền riêng tư: Chuẩn hóa Subnet IP (/24 hoặc /48), không lưu IP thô
    const cleanIp = (job.ipSubnet || job.ip || '0.0.0.0').trim().replace(/^::ffff:/, '');
    let ipToStore = cleanIp;
    if (!ipToStore.includes('/')) {
      if (ipToStore.includes('.')) {
        const parts = ipToStore.split('.');
        ipToStore = parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : `${ipToStore}/24`;
      } else if (ipToStore.includes(':')) {
        const parts = ipToStore.split(':');
        ipToStore = `${parts.slice(0, 3).join(':')}::/48`;
      }
    }

    const sessionHashToStore = job.visitorIdHash || null;
    const dedupIdentifier =
      sessionHashToStore || job.fingerprintHash || job.ipHash || ipToStore;
    const dedupKey = `scanms:dedup:click:${job.linkId}:${dedupIdentifier}`;
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const redis = this.cacheService?.getRedisClient();
    let isUnique = false;
    let acquiredRedisDedup = false;

    // 3. Khóa chống trùng unique click: Atomic qua Redis SET NX 30 phút (Issue 3)
    if (job.isValid) {
      if (redis) {
        const setNxRes = await redis
          .set(dedupKey, '1', 'EX', 1800, 'NX')
          .catch(() => null);
        if (setNxRes === 'OK') {
          isUnique = true;
          acquiredRedisDedup = true;
        }
      }
    }

    try {
      // 4. Prisma Atomic Transaction: Cả hai thao tác cùng thành công hoặc cùng rollback (Issue 1 & 3)
      await this.prisma.$transaction(async (tx) => {
        // Fallback khi không có Redis: Sử dụng Advisory Lock trong Transaction để chống race condition
        if (job.isValid && !redis) {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dedupKey}))`;
          const duplicateRecentClick = await tx.clickTrafficLog.findFirst({
            where: {
              referralLinkId: job.linkId,
              createdAt: { gte: thirtyMinutesAgo },
              OR: [
                ...(sessionHashToStore ? [{ sessionId: sessionHashToStore }] : []),
                ...(job.fingerprintHash ? [{ fingerprintHash: job.fingerprintHash }] : []),
                { ipAddress: ipToStore },
              ],
            },
            select: { id: true },
          });
          isUnique = !duplicateRecentClick;
        }

        await tx.referralLink.updateMany({
          where: { id: job.linkId },
          data: {
            totalClicks: { increment: 1 },
            ...(isUnique ? { uniqueClicks: { increment: 1 } } : {}),
            lastAccessedAt: new Date(),
          },
        });

        await tx.clickTrafficLog.create({
          data: {
            ...(job.clickLogId ? { id: job.clickLogId } : {}),
            eventId,
            referralLinkId: job.linkId,
            storeId: job.storeId || null,
            collaboratorId: job.collaboratorId || null,
            productId: job.productId || null,
            campaignId: job.campaignId || null,
            ipAddress: ipToStore, // Chỉ lưu IP prefix /24 hoặc /48 ẩn danh
            ipHash: job.ipHash || null,
            userAgent: job.userAgent || null,
            referrer:
              job.referer || (job.accessMethod === 'QR' ? 'QR_SCAN' : null),
            accessMethod: job.accessMethod === 'QR' ? 'QR' : 'LINK',
            deviceFingerprint: null, // TUYỆT ĐỐI KHÔNG LƯU FINGERPRINT THÔ
            fingerprintHash: job.fingerprintHash || null,
            deviceType: job.deviceType || null,
            sessionId: sessionHashToStore, // Chỉ lưu băm nhận diện
            isValid: job.isValid,
            isUnique,
            riskReason: job.riskReason || null,
            requestId: job.requestId || null,
            utmSource: job.utmSource || null,
            utmMedium: job.utmMedium || null,
            utmCampaign: job.utmCampaign || null,
            receivedAt: job.receivedAt || new Date(),
          },
        });
      });
    } catch (dbErr: any) {
      // Nếu transaction DB thất bại và đã từng giữ lock Redis, xóa key để retry sau không bị mất trạng thái unique
      if (acquiredRedisDedup && redis) {
        await redis.del(dedupKey).catch(() => {});
      }
      // Nếu đụng unique constraint eventId (P2002) thì an toàn bỏ qua (idempotent)
      if (dbErr?.code === 'P2002') {
        return;
      }
      throw dbErr;
    }
  }
}
