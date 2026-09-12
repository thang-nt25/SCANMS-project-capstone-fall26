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
  private degradedSince: Date | null = null;
  private degradationAlertCount = 0;

  constructor(private readonly configService: ConfigService) {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
    this.cleanupInterval.unref();
  }

  async onModuleInit() {
    await this.initRedis();
  }

  private async initRedis() {
    const host =
      this.configService.get<string>('REDIS_HOST') ||
      process.env.REDIS_HOST ||
      'localhost';
    const port = Number(
      this.configService.get<number>('REDIS_PORT') ||
        process.env.REDIS_PORT ||
        6379,
    );
    const password =
      this.configService.get<string>('REDIS_PASSWORD') ||
      process.env.REDIS_PASSWORD ||
      undefined;

    try {
      this.redisClient = new Redis({
        host,
        port,
        password: password && password.trim() ? password : undefined,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 2) {
            return null; // Ngưng retry để không spam log nếu Redis offline
          }
          return Math.min(times * 500, 2000);
        },
        lazyConnect: true,
      });

      this.redisClient.on('connect', () => {
        this.isConnectedToRedis = true;
        this.logger.log(
          `✔ Kết nối thành công Redis server tại ${host}:${port}`,
        );
      });

      this.redisClient.on('error', (err) => {
        this.isConnectedToRedis = false;
        // Không crash app nếu Redis tạm thời không sẵn sàng, fallback in-memory
      });

      await this.redisClient.connect().catch((err) => {
        this.isConnectedToRedis = false;
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
    if (this.redisClient) {
      try {
        this.redisClient.disconnect(false);
      } catch {}
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

  /**
   * Kiểm tra Rate Limit phân tán qua Redis hoặc fallback Memory
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
   * Cung cấp chỉ số sức khỏe và trạng thái vận hành của hệ thống Cache & Rate Limit (Lỗi 4)
   */
  getHealthStatus() {
    const isRedisLive = this.isRedisActive();
    return {
      isRedisActive: isRedisLive,
      isDistributedEnforced: isRedisLive,
      isDegraded: !isRedisLive,
      degradedSince: this.degradedSince,
      degradationAlertCount: this.degradationAlertCount,
      memoryEntriesCount: this.memoryCache.size,
      rateLimitEntriesCount: this.rateLimitMap.size,
    };
  }

  /**
   * Lấy Redis Client phục vụ cho các subsystem khác (như Click Queue Redis List)
   */
  getRedisClient(): Redis | null {
    return this.isRedisActive() ? this.redisClient : null;
  }
}
