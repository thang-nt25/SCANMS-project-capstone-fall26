import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../../../core/cache/cache.service';

describe('FR-14 — Click Rate Limiter (Atomic Redis True Sliding Window & Degraded Fallback)', () => {
  let cacheService: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'REDIS_HOST') return '127.0.0.1';
              if (key === 'REDIS_PORT') return 6379;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
    // Point 5: Gọi onModuleInit() để khởi tạo kết nối Redis thật
    await cacheService.onModuleInit();

    const redis = cacheService.getRedisClient();
    if (redis) {
      const testKeys = await redis.keys('*test-ip*');
      if (testKeys.length > 0) {
        await redis.del(...testKeys);
      }
    }
  });

  afterEach(async () => {
    await cacheService.onModuleDestroy();
  });

  describe('Real Redis Connection Verification (Point 1 & 5)', () => {
    it('should be connected to real Redis server and active', () => {
      expect(cacheService.isRedisActive()).toBe(true);
      const health = cacheService.getHealthStatus();
      expect(health.status).toBe('ok');
      expect(health.backend).toBe('redis');
      expect(health.rateLimiter).toBe('redis_lua_sliding_window_zset');
    });
  });

  describe('True Sliding Window Boundary Check (Point 2: Item 5, 7)', () => {
    it('should block the 11th request within a rolling 1-second window even across sub-second boundaries', async () => {
      const ipHash = 'hash-test-ip-sliding-boundary';

      // 10 requests gửi tại t=0
      for (let i = 1; i <= 10; i++) {
        const res = await cacheService.checkClickRateLimitAtomic({
          ipHash,
          secLimit: 10,
          minLimit: 60,
        });
        expect(res.allowed).toBe(true);
      }

      // Đợi 400ms (vẫn nằm trong rolling 1s window)
      await new Promise((r) => setTimeout(r, 400));

      // Request thứ 11 tại t=400ms phải BỊ CHẶN vì 10 request trước vẫn nằm trong [t-1000ms, t]
      const eleventh = await cacheService.checkClickRateLimitAtomic({
        ipHash,
        secLimit: 10,
        minLimit: 60,
      });
      expect(eleventh.allowed).toBe(false);
      expect(eleventh.limitedBy).toBe('SEC');

      // Đợi thêm 700ms (tổng > 1100ms kể từ đợt click đầu tiên)
      await new Promise((r) => setTimeout(r, 700));

      // Lúc này các click cũ đã trượt ra ngoài cửa sổ 1s, request mới được phép
      const afterWindow = await cacheService.checkClickRateLimitAtomic({
        ipHash,
        secLimit: 10,
        minLimit: 60,
      });
      expect(afterWindow.allowed).toBe(true);
    });
  });

  describe('Minute Threshold: 60 clicks/min/IP (Item 6)', () => {
    it('should block when exceeding 60 requests within a sliding minute', async () => {
      const ipHash = 'hash-test-ip-minute';

      for (let i = 1; i <= 60; i++) {
        const res = await cacheService.checkClickRateLimitAtomic({
          ipHash,
          secLimit: 100, // Đặt secLimit cao để kiểm tra riêng ngưỡng phút
          minLimit: 60,
        });
        expect(res.allowed).toBe(true);
      }

      // Request thứ 61 phải bị chặn do ngưỡng phút
      const sixtyFirst = await cacheService.checkClickRateLimitAtomic({
        ipHash,
        secLimit: 100,
        minLimit: 60,
      });
      expect(sixtyFirst.allowed).toBe(false);
      expect(sixtyFirst.limitedBy).toBe('MIN');
    });
  });

  describe('Concurrency & Race Condition Safety via Lua Script (Item 7)', () => {
    it('should atomically allow exactly 10 and block 10 when 20 requests burst concurrently in Redis', async () => {
      const ipHash = 'hash-test-burst-ip';

      const promises = Array.from({ length: 20 }, () =>
        cacheService.checkClickRateLimitAtomic({
          ipHash,
          secLimit: 10,
          minLimit: 60,
        }),
      );

      const results = await Promise.all(promises);
      const allowedCount = results.filter((r) => r.allowed).length;
      const blockedCount = results.filter((r) => !r.allowed).length;

      expect(allowedCount).toBe(10);
      expect(blockedCount).toBe(10);
    });
  });

  describe('Independent IP Isolation (Item 4)', () => {
    it('should maintain completely independent counters for different IP hashes', async () => {
      const ipA = 'hash-test-ip-vietnam-a';
      const ipB = 'hash-test-ip-vietnam-b';

      for (let i = 0; i < 10; i++) {
        await cacheService.checkClickRateLimitAtomic({ ipHash: ipA, secLimit: 10, minLimit: 60 });
      }
      const resA = await cacheService.checkClickRateLimitAtomic({ ipHash: ipA, secLimit: 10, minLimit: 60 });
      expect(resA.allowed).toBe(false);

      const resB = await cacheService.checkClickRateLimitAtomic({ ipHash: ipB, secLimit: 10, minLimit: 60 });
      expect(resB.allowed).toBe(true);
    });
  });

  describe('Multi-Instance Distributed Rate Limiting (Item 20, 37 & Point 8)', () => {
    let instanceA: CacheService;
    let instanceB: CacheService;

    beforeEach(async () => {
      const configA = new ConfigService({ REDIS_HOST: '127.0.0.1', REDIS_PORT: 6379 });
      const configB = new ConfigService({ REDIS_HOST: '127.0.0.1', REDIS_PORT: 6379 });
      instanceA = new CacheService(configA);
      instanceB = new CacheService(configB);
      await instanceA.onModuleInit();
      await instanceB.onModuleInit();

      const redis = instanceA.getRedisClient();
      if (redis) {
        const keys = await redis.keys('*multi-instance*');
        if (keys.length > 0) await redis.del(...keys);
      }
    });

    afterEach(async () => {
      await instanceA.onModuleDestroy();
      await instanceB.onModuleDestroy();
    });

    it('should enforce shared 10 clicks/sec quota across multiple backend instances on same Redis', async () => {
      const ipHash = 'test-multi-instance-ip';

      // Instance A nhận 6 requests đầu tiên
      for (let i = 1; i <= 6; i++) {
        const res = await instanceA.checkClickRateLimitAtomic({ ipHash, secLimit: 10, minLimit: 60 });
        expect(res.allowed).toBe(true);
        expect(res.isDegraded).toBe(false);
      }

      // Instance B nhận 4 requests tiếp theo (tổng là 10 clicks)
      for (let i = 7; i <= 10; i++) {
        const res = await instanceB.checkClickRateLimitAtomic({ ipHash, secLimit: 10, minLimit: 60 });
        expect(res.allowed).toBe(true);
        expect(res.isDegraded).toBe(false);
      }

      // Request thứ 11 gọi vào Instance B phải BỊ CHẶN!
      const eleventhOnB = await instanceB.checkClickRateLimitAtomic({ ipHash, secLimit: 10, minLimit: 60 });
      expect(eleventhOnB.allowed).toBe(false);
      expect(eleventhOnB.limitedBy).toBe('SEC');

      // Request thứ 12 gọi vào Instance A cũng phải BỊ CHẶN (chia sẻ chung state Redis)!
      const twelfthOnA = await instanceA.checkClickRateLimitAtomic({ ipHash, secLimit: 10, minLimit: 60 });
      expect(twelfthOnA.allowed).toBe(false);
      expect(twelfthOnA.limitedBy).toBe('SEC');
    });
  });

  describe('Degraded State & Auto Recovery (Items 21, 22, 23 & Point 4)', () => {
    it('should fall back to in-memory sliding window when Redis is degraded', async () => {
      const offlineConfig = new ConfigService({ REDIS_HOST: '127.0.0.1', REDIS_PORT: 54321 }); // Cổng không tồn tại
      const degradedService = new CacheService(offlineConfig);
      await degradedService.onModuleInit();

      expect(degradedService.isRedisActive()).toBe(false);

      const ipHash = 'degraded-test-ip';
      // 10 click đầu cho phép
      for (let i = 1; i <= 10; i++) {
        const res = await degradedService.checkClickRateLimitAtomic({ ipHash, secLimit: 10, minLimit: 60 });
        expect(res.allowed).toBe(true);
        expect(res.isDegraded).toBe(true);
      }

      // Click thứ 11 bị chặn ngay trong memory fallback
      const eleventh = await degradedService.checkClickRateLimitAtomic({ ipHash, secLimit: 10, minLimit: 60 });
      expect(eleventh.allowed).toBe(false);
      expect(eleventh.limitedBy).toBe('SEC');
      expect(eleventh.isDegraded).toBe(true);

      await degradedService.onModuleDestroy();
    });
  });
});
