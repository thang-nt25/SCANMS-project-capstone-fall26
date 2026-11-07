/**
 * In-Memory & Session Client Cache for Axios
 * Giúp lưu tạm dữ liệu API để khi người dùng chuyển trang qua lại,
 * nội dung xuất hiện ngay lập tức (0ms) mà không phải reload hay hiện spinner chớp tắt.
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttlMs: number;
}

const MAX_CACHE_ENTRIES = 120;
const memoryCache = new Map<string, CacheEntry>();
let session: string | null = null;
let revision = 0;
const DEFAULT_CACHE_TTL_MS = 30_000;

// Danh sách các tiền tố URL an toàn được phép lưu tạm (Cache-friendly GET requests)
const CACHEABLE_URL_PREFIXES = [
  '/stores',
  '/products',
  '/orders',
  '/chat/conversations',
  '/wallets',
  '/payouts',
  '/dashboard',
  '/analytics',
  '/audit',
  '/kyc',
  '/social-channels',
  '/sample-requests',
  '/media',
  '/tiers',
  '/campaigns',
  '/coupons',
  '/referral-links',
  '/returns',
  '/leaderboard',
  '/live-sessions',
  '/affiliate-deals',
  '/store-collaborators',
  '/customer',
  '/ai',
  '/shipping',
  '/notifications',
];

function generateKey(url: string, params?: any): string {
  const paramStr = params ? JSON.stringify(params) : '';
  return `${url}::${paramStr}`;
}

export const apiCache = {
  /** An account switch must never reuse another account's private API payload. */
  setSession(nextSession: string | null): void {
    if (session === nextSession) return;
    session = nextSession;
    this.clear();
  },

  get revision(): number { return revision; },
  /**
   * Kiểm tra xem URL này có đủ điều kiện lưu tạm không
   */
  isCacheable(url?: string): boolean {
    if (!url) return false;
    // Balances, delivery state, conversations and voucher quotas change outside this tab.
    // Also covers nested endpoints such as /stores/:id/payouts and signed bill URLs.
    // Safe client caching for tabs: balances, orders, chat list, coupons have TTL + mutation invalidation
    // Không cache các endpoint auth hoặc nhạy cảm payment execution
    if (
      url.includes('/auth/') ||
      url.includes('/refresh') ||
      url.includes('/otp') ||
      url.includes('/wallets/top-up-demo') ||
      url.includes('/wallets/top-up-payos') ||
      url.includes('/payos/') ||
      url.includes('/checkout')
    ) {
      return false;
    }
    return CACHEABLE_URL_PREFIXES.some((prefix) => url.includes(prefix));
  },

  /**
   * Xác định domain dữ liệu bị ảnh hưởng khi có POST/PUT/PATCH/DELETE
   * để chỉ xóa cache liên quan, tránh xóa nhầm dữ liệu của các trang khác.
   */
  getAffectedDomain(url?: string): string | null {
    if (!url) return null;
    // Đọc tin nhắn chat không cần xóa danh sách tin nhắn hoặc cuộc trò chuyện
    if (url.includes('/chat/conversations/') && url.includes('/read')) {
      return null;
    }
    // Heartbeat presence không được xóa cache /stores hay tăng revision bộ nhớ đệm
    if (url.includes('/presence')) {
      return null;
    }
    // Shipping creates the waybill and changes the purchase order's fulfillment state.
    if (url.includes('/shipping/ghn/create-order/')) return '/orders';
    if (url.includes('/shipping/ghn/simulation/')) return '/orders';
    if (url.includes('/orders')) return '/orders';
    if (url.includes('/products')) return '/products';
    if (url.includes('/chat')) return '/chat';
    if (url.includes('/wallets') || url.includes('/payouts')) return '/wallets';
    if (url.includes('/coupons')) return '/coupons';
    if (url.includes('/stores')) return '/stores';
    if (url.includes('/sample-requests')) return '/sample-requests';
    if (url.includes('/kyc')) return '/kyc';
    if (url.includes('/returns')) return '/returns';
    if (url.includes('/campaigns')) return '/campaigns';
    if (url.includes('/live-sessions')) return '/live-sessions';
    if (url.includes('/affiliate-deals')) return '/affiliate-deals';
    if (url.includes('/customer')) return '/customer';
    return null;
  },

  /**
   * Lấy dữ liệu đã lưu tạm (sống suốt phiên tab cho tới khi F5 hoặc mutate)
   * Sử dụng cơ chế LRU: truy cập vào entry nào thì đưa entry đó lên đầu
   */
  get<T = any>(url: string, params?: any): T | null {
    const key = generateKey(url, params);
    const entry = memoryCache.get(key);
    if (!entry) return null;

    // Kiểm tra nếu có thiết lập TTL hữu hạn riêng biệt
    if (entry.ttlMs && entry.ttlMs !== Infinity) {
      const now = Date.now();
      if (now - entry.timestamp >= entry.ttlMs) {
        memoryCache.delete(key);
        return null;
      }
    }

    // Đẩy entry lên vị trí mới nhất (LRU hit)
    memoryCache.delete(key);
    memoryCache.set(key, entry);

    return entry.data as T;
  },

  /**
   * Kiểm tra xem dữ liệu đã có trong cache chưa
   */
  has(url: string, params?: any): boolean {
    return this.get(url, params) !== null;
  },

  /**
   * Lưu tạm dữ liệu vào bộ nhớ RAM
   * Catalogue data expires after 30 seconds even without a local mutation.
   * Có cơ chế giới hạn MAX_CACHE_ENTRIES = 120 để chống rò rỉ RAM (Zero Memory Leak)
   */
  getTTL(url: string): number {
    if (url.includes('/chat/')) return 20_000;
    if (url.includes('/payouts')) return 30_000;
    if (url.includes('/orders')) return 30_000;
    if (url.includes('/wallets')) return 30_000;
    if (url.includes('/coupons')) return 60_000;
    if (url.includes('/sample-requests')) return 30_000;
    if (url.includes('/products')) return 120_000; // 2 minutes for products
    if (url.includes('/stores')) return 180_000; // 3 minutes for store details
    if (url.includes('/dashboard') || url.includes('/analytics')) return 60_000;
    return DEFAULT_CACHE_TTL_MS;
  },

  set(url: string, params: any, data: any, ttlMs?: number): void {
    const effectiveTtl = typeof ttlMs === 'number' ? ttlMs : this.getTTL(url);
    const key = generateKey(url, params);

    // Nếu đã chạm trần 120 mục, xóa mục cũ nhất (mục đầu tiên trong Map)
    if (memoryCache.size >= MAX_CACHE_ENTRIES && !memoryCache.has(key)) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) {
        memoryCache.delete(oldestKey);
      }
    }

    memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs: effectiveTtl,
    });
  },

  /**
   * Xóa cache của một domain hoặc xóa toàn bộ cache khi có thao tác thêm/sửa/xóa
   */
  invalidate(urlPattern?: string | null): void {
    if (urlPattern === null) return; // Bỏ qua nếu là thao tác vô hại (như đánh dấu đã đọc)
    revision++;
    if (!urlPattern) {
      memoryCache.clear();
      return;
    }
    for (const key of memoryCache.keys()) {
      if (key.includes(urlPattern)) {
        memoryCache.delete(key);
      }
    }
  },

  /**
   * Xóa toàn bộ bộ nhớ tạm
   */
  clear(): void {
    revision++;
    memoryCache.clear();
  },

  /** Order and return mutations also change stock, reports and voucher quotas. */
  invalidateAffected(url?: string): void {
    const domain = this.getAffectedDomain(url);
    this.invalidate(domain);
    if (domain === '/orders' || domain === '/returns') {
      this.invalidate('/analytics');
      this.invalidate('/dashboard');
    }
  },
};
