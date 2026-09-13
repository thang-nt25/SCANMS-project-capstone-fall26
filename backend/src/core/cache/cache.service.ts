import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface CacheEntry {
  value: any;
  expiresAt: number;
}
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: Redis | null = null;
  private isConnectedToRedis = false;

  // In-memory fallback
  private readonly memoryCache = new Map<string, CacheEntry>();
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();
  private readonly cleanupInterval: NodeJS.Timeout;
  private readonly metricsSyncInterval: NodeJS.Timeout;
  private degradedSince: Date | null = null;
  private degradationAlertCount = 0;

  constructor(private readonly configService: ConfigService) {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
    this.cleanupInterval.unref();

    this.metricsSyncInterval = setInterval(() => {
      this.syncMultiInstanceMetricsFromRedis().catch(() => {});
    }, 3000);
    this.metricsSyncInterval.unref();
  }

  async onModuleInit() {
    await this.initRedis();
  }

  private async initRedis() {
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || process.env.REDIS_URL;
    const host =
      this.configService.get<string>('REDIS_HOST') ||
      process.env.REDIS_HOST ||
      '127.0.0.1';
    const port = Number(
      this.configService.get<number>('REDIS_PORT') ||
        process.env.REDIS_PORT ||
        6379,
    );
    const password =
      this.configService.get<string>('REDIS_PASSWORD') ||
      process.env.REDIS_PASSWORD ||
      undefined;
    const isTls =
      this.configService.get<string>('REDIS_TLS') === 'true' ||
      process.env.REDIS_TLS === 'true' ||
      Boolean(redisUrl && redisUrl.startsWith('rediss://'));

    // Điểm bảo mật 1: Mặc định xác minh chứng chỉ SSL/TLS nghiêm ngặt (rejectUnauthorized: true) chống tấn công MITM.
    // Chỉ cho phép bỏ qua (false) khi biến REDIS_TLS_REJECT_UNAUTHORIZED được gán rõ ràng là 'false' trong môi trường dev/staging.
    const rejectUnauthorizedSetting =
      this.configService.get<string>('REDIS_TLS_REJECT_UNAUTHORIZED') ||
      process.env.REDIS_TLS_REJECT_UNAUTHORIZED;
    const rejectUnauthorized = rejectUnauthorizedSetting !== 'false';

    try {
      const commonOpts = {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        tls: isTls ? { rejectUnauthorized } : undefined,
        retryStrategy: (times: number) => {
          // FR-14 Mục 22: Tự động reconnect có backoff tối đa 3s, tuyệt đối không trả về null làm ngắt kết nối vĩnh viễn
          return Math.min(times * 300, 3000);
        },
        lazyConnect: true,
      };

      if (redisUrl && redisUrl.trim()) {
        this.redisClient = new Redis(redisUrl, commonOpts);
      } else {
        this.redisClient = new Redis({
          host,
          port,
          password: password && password.trim() ? password : undefined,
          ...commonOpts,
        });
      }

      this.redisClient.on('ready', () => {
        this.isConnectedToRedis = true;
        this.logger.log(
          `✔ Kết nối thành công Redis server tại ${redisUrl ? 'REDIS_URL' : `${host}:${port}`}${isTls ? ' (TLS/SSL)' : ''}`,
        );
        if (this.degradedSince) {
          this.logger.log(
            '✔ [OPERATIONAL RECOVERY] Kết nối Redis rate limiting đã được khôi phục thành công! Hệ thống tự động chuyển lại sang Redis phân tán (Mục 22).',
          );
          this.degradedSince = null;
          this.degradationAlertCount = 0;
          this.cleanupExpiredRateLimits();
        }
      });

      this.redisClient.on('connect', () => {
        this.isConnectedToRedis = true;
      });

      this.redisClient.on('close', () => {
        this.isConnectedToRedis = false;
      });

      this.redisClient.on('error', (err) => {
        this.isConnectedToRedis = false;
        this.clickRateLimitMetrics.redisErrorCount += 1;
      });

      await this.redisClient.connect().catch((err) => {
        this.isConnectedToRedis = false;
        this.clickRateLimitMetrics.redisErrorCount += 1;
        this.logger.warn(
          `Không thể kết nối trực tiếp Redis (${host}:${port}): ${err.message}. Hệ thống chuyển sang cơ chế In-Memory Cache & Rate Limiting an toàn.`,
        );
      });
    } catch (error: any) {
      this.isConnectedToRedis = false;
      this.logger.warn(
        `Khởi tạo Redis client thất bại: ${error.message}. Chạy chế độ fallback in-memory.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.metricsSyncInterval) {
      clearInterval(this.metricsSyncInterval);
    }
    if (this.redisClient) {
      try {
        this.redisClient.disconnect(false);
      } catch {
        // ignore
      }
      this.redisClient = null;
      this.isConnectedToRedis = false;
    }
  }

  isRedisActive(): boolean {
    return (
      this.isConnectedToRedis &&
      this.redisClient !== null &&
      this.redisClient.status === 'ready'
    );
  }

  getRedis(): Redis | null {
    return this.redisClient;
  }

  cleanupExpiredRateLimits() {
    const now = Date.now();
    for (const [key, entry] of this.fallbackSlidingWindowMap.entries()) {
      if (entry.lastSeen < now - 70000) {
        this.fallbackSlidingWindowMap.delete(key);
      }
    }
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (entry.resetAt <= now) {
        this.rateLimitMap.delete(key);
      }
    }
    this.cleanupExpiredRateLimits();
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (this.isRedisActive() && this.redisClient) {
      try {
        const data = await this.redisClient.get(key);
        return data ? (JSON.parse(data) as T) : null;
      } catch (err) {
        this.logger.warn(
          `Lỗi Redis get(${key}), fallback sang in-memory: ${err}`,
        );
      }
    }

    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (this.isRedisActive() && this.redisClient) {
      try {
        await this.redisClient.set(
          key,
          JSON.stringify(value),
          'EX',
          ttlSeconds,
        );
        return;
      } catch (err) {
        this.logger.warn(
          `Lỗi Redis set(${key}), fallback sang in-memory: ${err}`,
        );
      }
    }

    if (this.memoryCache.size >= 10000) {
      this.cleanupExpired();
      if (this.memoryCache.size >= 10000) {
        const firstKey = this.memoryCache.keys().next().value;
        if (firstKey) this.memoryCache.delete(firstKey);
      }
    }
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isRedisActive() && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {
        this.logger.warn(`Lỗi Redis del(${key}): ${err}`);
      }
    }
    this.memoryCache.delete(key);
  }

  async delPrefix(prefix: string): Promise<void> {
    if (this.isRedisActive() && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`${prefix}*`);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (err) {
        this.logger.warn(`Lỗi Redis delPrefix(${prefix}): ${err}`);
      }
    }

    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }
  }

  // Metrics theo dõi vận hành FR-14
  private clickRateLimitMetrics = {
    allowedCount: 0,
    blockedSecCount: 0,
    blockedMinCount: 0,
    degradedCount: 0,
    redisLatencyMs: 0,
    redisErrorCount: 0,
    redisTimeoutCount: 0,
  };

  // Tập hợp các IP (hoặc ipHash) duy nhất đã vượt ngưỡng bị chặn rate limit (Số IP vượt hạn - FR-14 Mục 29)
  private readonly blockedIpsSet = new Set<string>();

  // Thống kê đột biến (Spike) theo Link, Shop, KOL phục vụ cảnh báo gian lận (FR-14 Mục 29)
  private readonly spikeByLink = new Map<string, number>();
  private readonly spikeByStore = new Map<string, number>();
  private readonly spikeByCollaborator = new Map<string, number>();

  // Cache dữ liệu thống kê tổng hợp từ Redis phân tán (Cửa sổ trượt 5 phút - Multi-Instance Safe)
  private cachedTopLinks: Array<{ linkId: string; count: number }> = [];
  private cachedTopStores: Array<{ storeId: string; count: number }> = [];
  private cachedTopCollaborators: Array<{ collaboratorId: string; count: number }> = [];
  private cachedUniqueBlockedIpsCount = 0;
  private lastMetricsSyncAt = 0;

  /**
   * Ghi nhận IP/Hash vượt hạn mức một cách an toàn bộ nhớ và phân tán multi-instance (FR-14 Mục 29, 30)
   */
  private recordBlockedIp(ipHash: string) {
    this.blockedIpsSet.add(ipHash);
    if (this.blockedIpsSet.size > 20000) {
      const iter = this.blockedIpsSet.values();
      for (let i = 0; i < 5000; i++) {
        const next = iter.next();
        if (next.done) break;
        this.blockedIpsSet.delete(next.value);
      }
    }

    if (this.isRedisActive() && this.redisClient) {
      const now = Date.now();
      const pipeline = this.redisClient.pipeline();
      pipeline.zadd('rl:v1:metrics:blocked_ips', now, ipHash);
      pipeline.expire('rl:v1:metrics:blocked_ips', 86400); // 24 giờ
      pipeline.zremrangebyscore('rl:v1:metrics:blocked_ips', '-inf', (now - 86400000).toString());
      pipeline.exec().catch(() => {});
    }
  }

  /**
   * Ghi nhận lưu lượng và phát hiện spike theo Link, Store, Collaborator qua Redis Sliding Window 5 phút (FR-14 Mục 29)
   */
  recordClickSpike(metadata: {
    linkId?: string;
    storeId?: string;
    collaboratorId?: string;
    isBlocked?: boolean;
  }) {
    // Luôn ghi nhận vào Map cục bộ làm fallback RAM
    if (metadata.linkId) {
      this.spikeByLink.set(
        metadata.linkId,
        (this.spikeByLink.get(metadata.linkId) || 0) + 1,
      );
    }
    if (metadata.storeId) {
      this.spikeByStore.set(
        metadata.storeId,
        (this.spikeByStore.get(metadata.storeId) || 0) + 1,
      );
    }
    if (metadata.collaboratorId) {
      this.spikeByCollaborator.set(
        metadata.collaboratorId,
        (this.spikeByCollaborator.get(metadata.collaboratorId) || 0) + 1,
      );
    }
    if (this.spikeByLink.size > 5000) this.spikeByLink.clear();
    if (this.spikeByStore.size > 2000) this.spikeByStore.clear();
    if (this.spikeByCollaborator.size > 5000) this.spikeByCollaborator.clear();

    // Ghi nhận phân tán vào Redis ZSET theo từng block phút (cửa sổ trượt 5 phút - TTL 10 phút)
    if (this.isRedisActive() && this.redisClient) {
      const currentMinute = Math.floor(Date.now() / 60000);
      const pipeline = this.redisClient.pipeline();
      if (metadata.linkId) {
        const k = `rl:v1:spikes:links:${currentMinute}`;
        pipeline.zincrby(k, 1, metadata.linkId);
        pipeline.expire(k, 600);
      }
      if (metadata.storeId) {
        const k = `rl:v1:spikes:stores:${currentMinute}`;
        pipeline.zincrby(k, 1, metadata.storeId);
        pipeline.expire(k, 600);
      }
      if (metadata.collaboratorId) {
        const k = `rl:v1:spikes:collabs:${currentMinute}`;
        pipeline.zincrby(k, 1, metadata.collaboratorId);
        pipeline.expire(k, 600);
      }
      pipeline.exec().catch(() => {});
    }
  }

  /**
   * Đồng bộ số liệu thống kê đột biến (Spike) và IP bị chặn từ Redis đa instance theo cửa sổ trượt 5 phút
   */
  async syncMultiInstanceMetricsFromRedis(): Promise<void> {
    if (!this.isRedisActive() || !this.redisClient) return;
    try {
      const now = Date.now();
      const currentMinute = Math.floor(now / 60000);
      const buckets = [0, 1, 2, 3, 4].map((i) => currentMinute - i);

      const pipeline = this.redisClient.pipeline();
      pipeline.zcard('rl:v1:metrics:blocked_ips');

      for (const b of buckets) {
        pipeline.zrevrange(`rl:v1:spikes:links:${b}`, 0, 9, 'WITHSCORES');
        pipeline.zrevrange(`rl:v1:spikes:stores:${b}`, 0, 9, 'WITHSCORES');
        pipeline.zrevrange(`rl:v1:spikes:collabs:${b}`, 0, 9, 'WITHSCORES');
      }

      const results = await pipeline.exec();
      if (!results) return;

      const blockedCount = Number(results[0]?.[1]) || 0;
      this.cachedUniqueBlockedIpsCount = blockedCount;

      const linkMap = new Map<string, number>();
      const storeMap = new Map<string, number>();
      const collabMap = new Map<string, number>();

      let resIdx = 1;
      for (let i = 0; i < buckets.length; i++) {
        const linkRes = (results[resIdx++]?.[1] as string[]) || [];
        const storeRes = (results[resIdx++]?.[1] as string[]) || [];
        const collabRes = (results[resIdx++]?.[1] as string[]) || [];

        for (let j = 0; j < linkRes.length; j += 2) {
          const id = linkRes[j];
          const score = Number(linkRes[j + 1]) || 0;
          linkMap.set(id, (linkMap.get(id) || 0) + score);
        }
        for (let j = 0; j < storeRes.length; j += 2) {
          const id = storeRes[j];
          const score = Number(storeRes[j + 1]) || 0;
          storeMap.set(id, (storeMap.get(id) || 0) + score);
        }
        for (let j = 0; j < collabRes.length; j += 2) {
          const id = collabRes[j];
          const score = Number(collabRes[j + 1]) || 0;
          collabMap.set(id, (collabMap.get(id) || 0) + score);
        }
      }

      this.cachedTopLinks = Array.from(linkMap.entries())
        .map(([linkId, count]) => ({ linkId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      this.cachedTopStores = Array.from(storeMap.entries())
        .map(([storeId, count]) => ({ storeId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      this.cachedTopCollaborators = Array.from(collabMap.entries())
        .map(([collaboratorId, count]) => ({ collaboratorId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      this.lastMetricsSyncAt = now;
    } catch (err: any) {
      this.logger.debug(`[REDIS_METRICS_SYNC] Lỗi đồng bộ metrics: ${err.message}`);
    }
  }

  // Giới hạn số lượng entry tối đa của fallback map trong RAM chống tấn công DoS tràn bộ nhớ (FR-14 Mục 30 & Lỗi 12)
  private static readonly MAX_FALLBACK_RATELIMIT_ENTRIES = 10000;
  private readonly fallbackSlidingWindowMap = new Map<string, { timestamps: number[]; lastSeen: number }>();

  // Lua script kiểm tra và tăng nguyên tử THUẬT TOÁN SLIDING WINDOW (ZSET) trên Redis (FR-14 Mục 5, 6, 7, 11 & Lỗi 2)
  private readonly clickRateLimitLuaScript = `
    local now = tonumber(ARGV[1])
    local secWindowMs = tonumber(ARGV[2])
    local minWindowMs = tonumber(ARGV[3])
    local secLimit = tonumber(ARGV[4])
    local minLimit = tonumber(ARGV[5])
    local secTtl = tonumber(ARGV[6])
    local minTtl = tonumber(ARGV[7])
    local member = ARGV[8]

    local secOldest = now - secWindowMs
    local minOldest = now - minWindowMs

    -- 1. Xóa bỏ các phần tử nằm ngoài cửa sổ trượt (Sliding Window Log)
    redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', secOldest)
    redis.call('ZREMRANGEBYSCORE', KEYS[2], '-inf', minOldest)

    -- 2. Đếm số lượng request thực tế trong từng cửa sổ trượt
    local currentSec = tonumber(redis.call('ZCARD', KEYS[1]))
    local currentMin = tonumber(redis.call('ZCARD', KEYS[2]))

    -- 3. Kiểm tra ngưỡng giây (Cốt lõi 10 req/s) và phút (Bổ sung 60 req/min)
    if currentSec >= secLimit then
      local ttlSec = redis.call('TTL', KEYS[1])
      local ttlMin = redis.call('TTL', KEYS[2])
      return { 0, 'SEC', currentSec, currentMin, ttlSec, ttlMin }
    end

    if currentMin >= minLimit then
      local ttlSec = redis.call('TTL', KEYS[1])
      local ttlMin = redis.call('TTL', KEYS[2])
      return { 0, 'MIN', currentSec, currentMin, ttlSec, ttlMin }
    end

    -- 4. Thêm timestamp của click hiện tại vào cả 2 Sorted Set
    redis.call('ZADD', KEYS[1], now, member)
    redis.call('EXPIRE', KEYS[1], secTtl)

    redis.call('ZADD', KEYS[2], now, member)
    redis.call('EXPIRE', KEYS[2], minTtl)

    local ttlSec = redis.call('TTL', KEYS[1])
    local ttlMin = redis.call('TTL', KEYS[2])

    return { 1, 'OK', currentSec + 1, currentMin + 1, ttlSec, ttlMin }
  `;

  /**
   * FR-14 — Kiểm tra Rate Limit Click nguyên tử kép (10 clicks/giây & 60 clicks/phút)
   * Sử dụng Thuật Toán Sliding Window ZSET Atomic trên Redis hoặc fallback Sliding Window an toàn có giới hạn dung lượng trong RAM
   */
  async checkClickRateLimitAtomic(params: {
    ipHash: string;
    secLimit?: number;
    minLimit?: number;
    timeoutMs?: number;
  }): Promise<{
    allowed: boolean;
    limitedBy: 'SEC' | 'MIN' | null;
    currentSec: number;
    currentMin: number;
    remainingSec: number;
    remainingMin: number;
    resetTimeSec: number;
    resetTimeMin: number;
    isDegraded: boolean;
  }> {
    const { ipHash, secLimit = 10, minLimit = 60, timeoutMs = 20 } = params;
    const secKey = `rl:v1:click:sec:${ipHash}`;
    const minKey = `rl:v1:click:min:${ipHash}`;
    const now = Date.now();

    // 1. Thực thi qua Redis Production (nguyên tử bằng Lua script Sliding Window ZSET - Mục 7 & 20)
    if (this.isRedisActive() && this.redisClient) {
      let timerHandle: NodeJS.Timeout | undefined;
      try {
        const member = `${now}-${crypto.randomUUID()}`;
        const redisOp = this.redisClient.eval(
          this.clickRateLimitLuaScript,
          2,
          secKey,
          minKey,
          now,
          1000,   // Cửa sổ trượt 1s (1000ms)
          60000,  // Cửa sổ trượt 60s (60000ms)
          secLimit,
          minLimit,
          3,      // 3 giây TTL cho secKey ZSET
          70,     // 70 giây TTL cho minKey ZSET
          member,
        ) as Promise<[number, string, number, number, number, number]>;

        const startRedis = Date.now();
        const timeoutOp = new Promise<never>((_, reject) => {
          timerHandle = setTimeout(
            () => reject(new Error('Redis check timeout > ' + timeoutMs + 'ms')),
            timeoutMs,
          );
        });

        const [allowedNum, limitedCode, curSec, curMin, ttlSec, ttlMin] = await Promise.race([
          redisOp,
          timeoutOp,
        ]);
        const latencyMs = Date.now() - startRedis;
        this.clickRateLimitMetrics.redisLatencyMs = latencyMs;

        // Dọn dẹp timer ngay khi Redis phản hồi thành công (Lỗi 13)
        if (timerHandle) clearTimeout(timerHandle);

        const allowed = allowedNum === 1;
        const limitedBy = allowed ? null : (limitedCode as 'SEC' | 'MIN');

        if (this.degradedSince) {
          this.logger.log('✔ [OPERATIONAL RECOVERY] Kết nối Redis rate limiting đã được khôi phục.');
          this.degradedSince = null;
          this.degradationAlertCount = 0;
          this.cleanupExpiredRateLimits();
        }

        if (allowed) {
          this.clickRateLimitMetrics.allowedCount += 1;
        } else {
          this.recordBlockedIp(ipHash);
          if (limitedBy === 'SEC') {
            this.clickRateLimitMetrics.blockedSecCount += 1;
          } else {
            this.clickRateLimitMetrics.blockedMinCount += 1;
          }
        }

        return {
          allowed,
          limitedBy,
          currentSec: curSec,
          currentMin: curMin,
          remainingSec: Math.max(0, secLimit - curSec),
          remainingMin: Math.max(0, minLimit - curMin),
          resetTimeSec: now + Math.max(1, ttlSec) * 1000,
          resetTimeMin: now + Math.max(1, ttlMin) * 1000,
          isDegraded: false,
        };
      } catch (err: any) {
        if (timerHandle) clearTimeout(timerHandle);
        const errMsg = err?.message || String(err);
        if (errMsg.includes('timeout')) {
          this.clickRateLimitMetrics.redisTimeoutCount += 1;
        } else {
          this.clickRateLimitMetrics.redisErrorCount += 1;
        }
        this.logger.warn(`Redis checkClickRateLimitAtomic lỗi/timeout, fallback in-memory: ${errMsg}`);
      }
    }

    // 2. Fallback In-Memory khi Redis suy thoái (Mục 21)
    // Thực hiện Thuật toán Sliding Window trong RAM với dung lượng giới hạn LRU (Lỗi 12)
    if (!this.degradedSince) {
      this.degradedSince = new Date();
    }
    this.degradationAlertCount += 1;
    this.clickRateLimitMetrics.degradedCount += 1;

    if (this.degradationAlertCount === 1 || this.degradationAlertCount % 100 === 0) {
      this.logger.error(
        `[OPERATIONAL ALERT - REDIS DEGRADED] FR-14 Rate Limiting đang chạy ở chế độ fallback RAM (${this.degradationAlertCount} lần)! ` +
          `Cảnh báo: Tính năng rate-limit phân tán giữa nhiều instance đang bị suy giảm.`,
      );
    }

    let entry = this.fallbackSlidingWindowMap.get(ipHash);
    if (!entry) {
      // Giới hạn dung lượng fallback map (Lỗi 12)
      if (this.fallbackSlidingWindowMap.size >= CacheService.MAX_FALLBACK_RATELIMIT_ENTRIES) {
        this.cleanupExpiredRateLimits();
        if (this.fallbackSlidingWindowMap.size >= CacheService.MAX_FALLBACK_RATELIMIT_ENTRIES) {
          const oldestKey = this.fallbackSlidingWindowMap.keys().next().value;
          if (oldestKey) this.fallbackSlidingWindowMap.delete(oldestKey);
        }
      }
      entry = { timestamps: [], lastSeen: now };
      this.fallbackSlidingWindowMap.set(ipHash, entry);
    }

    // Lọc bỏ timestamps cũ hơn 60s
    entry.timestamps = entry.timestamps.filter((ts) => ts > now - 60000);
    entry.lastSeen = now;

    // Đếm số lượng trong 1s gần nhất và 60s gần nhất (Sliding Window Log)
    const curSec = entry.timestamps.filter((ts) => ts > now - 1000).length;
    const curMin = entry.timestamps.length;

    if (curSec >= secLimit) {
      this.recordBlockedIp(ipHash);
      this.clickRateLimitMetrics.blockedSecCount += 1;
      return {
        allowed: false,
        limitedBy: 'SEC',
        currentSec: curSec,
        currentMin: curMin,
        remainingSec: 0,
        remainingMin: Math.max(0, minLimit - curMin),
        resetTimeSec: now + 1000,
        resetTimeMin: now + 60000,
        isDegraded: true,
      };
    }

    if (curMin >= minLimit) {
      this.recordBlockedIp(ipHash);
      this.clickRateLimitMetrics.blockedMinCount += 1;
      return {
        allowed: false,
        limitedBy: 'MIN',
        currentSec: curSec,
        currentMin: curMin,
        remainingSec: Math.max(0, secLimit - curSec),
        remainingMin: 0,
        resetTimeSec: now + 1000,
        resetTimeMin: now + 60000,
        isDegraded: true,
      };
    }

    // Ghi nhận timestamp mới vào cửa sổ trượt
    entry.timestamps.push(now);
    this.clickRateLimitMetrics.allowedCount += 1;

    return {
      allowed: true,
      limitedBy: null,
      currentSec: curSec + 1,
      currentMin: curMin + 1,
      remainingSec: Math.max(0, secLimit - (curSec + 1)),
      remainingMin: Math.max(0, minLimit - (curMin + 1)),
      resetTimeSec: now + 1000,
      resetTimeMin: now + 60000,
      isDegraded: true,
    };
  }

  /**
   * Kiểm tra Rate Limit phân tán chung qua Redis hoặc fallback Memory
   */
  async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const rateLimitKey = `ratelimit:${key}`;

    if (this.isRedisActive() && this.redisClient) {
      try {
        const current = await this.redisClient.incr(rateLimitKey);
        if (current === 1) {
          await this.redisClient.expire(rateLimitKey, windowSeconds);
        }
        const ttl = await this.redisClient.ttl(rateLimitKey);
        const resetTime = Date.now() + Math.max(1, ttl) * 1000;
        const allowed = current <= maxRequests;
        const remaining = Math.max(0, maxRequests - current);

        if (this.degradedSince) {
          this.logger.log(
            '✔ [OPERATIONAL RECOVERY] Kết nối Redis rate limiting đã được khôi phục.',
          );
          this.degradedSince = null;
          this.degradationAlertCount = 0;
        }

        return { allowed, remaining, resetTime };
      } catch (err) {
        this.clickRateLimitMetrics.redisErrorCount += 1;
        this.logger.warn(
          `Lỗi Redis checkRateLimit, fallback sang in-memory: ${err}`,
        );
      }
    }

    // Cảnh báo vận hành khi rơi vào trạng thái suy thoái (Degraded State - Lỗi 4)
    if (!this.degradedSince) {
      this.degradedSince = new Date();
    }
    this.degradationAlertCount += 1;
    if (
      this.degradationAlertCount === 1 ||
      this.degradationAlertCount % 100 === 0
    ) {
      this.logger.error(
        `[OPERATIONAL ALERT - REDIS DEGRADED] Rate limiting đang hoạt động ở chế độ fallback memory RAM cục bộ (${this.degradationAlertCount} lần)! ` +
          `Cảnh báo: Tính năng rate-limit phân tán giữa nhiều instance (multi-instance) đang bị suy giảm.`,
      );
    }

    const now = Date.now();
    const entry = this.rateLimitMap.get(key);

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowSeconds * 1000;
      this.rateLimitMap.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: maxRequests - 1, resetTime: resetAt };
    }

    entry.count += 1;
    const allowed = entry.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - entry.count);

    return { allowed, remaining, resetTime: entry.resetAt };
  }

  /**
   * Cung cấp chỉ số sức khỏe và trạng thái vận hành của hệ thống Cache & Rate Limit (FR-14 Mục 23, 29)
   */
  getHealthStatus() {
    const isRedisLive = this.isRedisActive();
    const totalRequests =
      this.clickRateLimitMetrics.allowedCount +
      this.clickRateLimitMetrics.blockedSecCount +
      this.clickRateLimitMetrics.blockedMinCount;
    const totalBlocked =
      this.clickRateLimitMetrics.blockedSecCount +
      this.clickRateLimitMetrics.blockedMinCount;
    const blockedRatio =
      totalRequests > 0 ? totalBlocked / totalRequests : 0;
    const isBlockedRateHigh = totalRequests >= 20 && blockedRatio > 0.2;

    // Lấy top spike: Ưu tiên dữ liệu đa instance từ Redis (cửa sổ trượt 5 phút)
    let topLinks = this.cachedTopLinks;
    let topStores = this.cachedTopStores;
    let topCollaborators = this.cachedTopCollaborators;

    if (!isRedisLive || (topLinks.length === 0 && this.spikeByLink.size > 0)) {
      topLinks = Array.from(this.spikeByLink.entries())
        .map(([linkId, count]) => ({ linkId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    if (!isRedisLive || (topStores.length === 0 && this.spikeByStore.size > 0)) {
      topStores = Array.from(this.spikeByStore.entries())
        .map(([storeId, count]) => ({ storeId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    if (!isRedisLive || (topCollaborators.length === 0 && this.spikeByCollaborator.size > 0)) {
      topCollaborators = Array.from(this.spikeByCollaborator.entries())
        .map(([collaboratorId, count]) => ({ collaboratorId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }

    const uniqueBlockedIpsCount =
      isRedisLive && this.cachedUniqueBlockedIpsCount > 0
        ? this.cachedUniqueBlockedIpsCount
        : this.blockedIpsSet.size;

    return {
      status: isRedisLive ? 'ok' : 'degraded',
      backend: isRedisLive ? 'redis' : 'in_memory_fallback',
      rateLimiter: isRedisLive
        ? 'redis_lua_sliding_window_zset'
        : 'in_memory_sliding_window',
      thresholds: {
        maxClicksPerSec: Number(
          this.configService.get<number>('CLICK_RATE_LIMIT_SEC') ||
            process.env.CLICK_RATE_LIMIT_SEC ||
            10,
        ),
        maxClicksPerMin: Number(
          this.configService.get<number>('CLICK_RATE_LIMIT_MIN') ||
            process.env.CLICK_RATE_LIMIT_MIN ||
            60,
        ),
      },
      isRedisActive: isRedisLive,
      isDistributedEnforced: isRedisLive,
      isDegraded: !isRedisLive,
      degradedSince: this.degradedSince,
      degradationAlertCount: this.degradationAlertCount,
      memoryEntriesCount: this.memoryCache.size,
      rateLimitEntriesCount: this.rateLimitMap.size,
      redisMetrics: {
        redisLatencyMs: this.clickRateLimitMetrics.redisLatencyMs,
        redisErrorCount: this.clickRateLimitMetrics.redisErrorCount,
        redisTimeoutCount: this.clickRateLimitMetrics.redisTimeoutCount,
      },
      metrics: {
        allowed: this.clickRateLimitMetrics.allowedCount,
        blockedSec: this.clickRateLimitMetrics.blockedSecCount,
        blockedMin: this.clickRateLimitMetrics.blockedMinCount,
        totalBlocked,
        totalRequests,
        degraded: this.clickRateLimitMetrics.degradedCount,
        redisLatencyMs: this.clickRateLimitMetrics.redisLatencyMs,
        redisErrorCount: this.clickRateLimitMetrics.redisErrorCount,
        redisTimeoutCount: this.clickRateLimitMetrics.redisTimeoutCount,
        uniqueBlockedIpsCount,
        blockedRatioPercent: `${(blockedRatio * 100).toFixed(1)}%`,
        isBlockedRateHigh,
        anomalyWarning: isBlockedRateHigh
          ? 'CẢNH BÁO: Tỷ lệ chặn click vượt quá 20% - Phát hiện nguy cơ tấn công Click Spam / DDoS!'
          : null,
      },
      spikes: {
        topLinks,
        topStores,
        topCollaborators,
      },
      runbook: {
        documentationUrl: 'docs/RUNBOOK_REDIS_RATE_LIMIT.md',
        guide: 'Xem runbook chi tiết xử lý sự cố Redis down và DDoS cày click tại docs/RUNBOOK_REDIS_RATE_LIMIT.md',
      },
    };
  }

  /**
   * Lấy Redis Client phục vụ cho các subsystem khác (như Click Queue Redis List)
   */
  getRedisClient(): Redis | null {
    return this.isRedisActive() ? this.redisClient : null;
  }
}
