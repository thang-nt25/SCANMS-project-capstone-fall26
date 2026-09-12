import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from '../cache.service';

describe('CacheService Redis & Rate Limit Integration Test', () => {
  let cacheService: CacheService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [CacheService],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
    await cacheService.onModuleInit();
  });

  afterAll(async () => {
    cacheService.onModuleDestroy();
  });

  it('1. Đặt và lấy giá trị từ cache (SET / GET) có TTL', async () => {
    const key = 'test:ref_link:abc12345';
    const payload = { id: 'link-1', shortCode: 'abc12345', storeId: 'store-1' };

    await cacheService.set(key, payload, 10);
    const cached = await cacheService.get<typeof payload>(key);

    expect(cached).toBeDefined();
    expect(cached?.shortCode).toBe('abc12345');
    expect(cached?.storeId).toBe('store-1');
  });

  it('2. Xóa cache key đơn lẻ (DEL) và tiền tố (DELPREFIX)', async () => {
    const key1 = 'test:prefix:item1';
    const key2 = 'test:prefix:item2';

    await cacheService.set(key1, { val: 1 }, 10);
    await cacheService.set(key2, { val: 2 }, 10);

    await cacheService.del(key1);
    expect(await cacheService.get(key1)).toBeNull();
    expect(await cacheService.get(key2)).not.toBeNull();

    await cacheService.delPrefix('test:prefix:');
    expect(await cacheService.get(key2)).toBeNull();
  });

  it('3. Kiểm tra Rate Limiting trượt (checkRateLimit)', async () => {
    const clientKey = 'test_ip_192_168_1_100:session_abc';
    const maxRequests = 5;
    const windowSeconds = 10;

    // 5 lần đầu cho phép
    for (let i = 1; i <= maxRequests; i++) {
      const res = await cacheService.checkRateLimit(
        clientKey,
        maxRequests,
        windowSeconds,
      );
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(maxRequests - i);
    }

    // Lần thứ 6 phải bị chặn
    const blockedRes = await cacheService.checkRateLimit(
      clientKey,
      maxRequests,
      windowSeconds,
    );
    expect(blockedRes.allowed).toBe(false);
    expect(blockedRes.remaining).toBe(0);
  });

  it('4. Kiểm tra trạng thái Redis hoặc chế độ Graceful Degradation', async () => {
    // Nếu có Redis thật thì isRedisActive là true, nếu không thì fallback memory an toàn
    const isRedis = cacheService.isRedisActive();
    expect(typeof isRedis).toBe('boolean');
  });
});
