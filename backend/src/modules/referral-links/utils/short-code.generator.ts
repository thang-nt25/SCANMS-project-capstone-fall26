import * as crypto from 'crypto';

// Bảng ký tự Base36: 8 ký tự, gồm chữ thường [a-z] và số [0-9] (không phân biệt hoa/thường)
const CHARSET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SHORT_CODE_LENGTH = 8;

/**
 * Sinh mã rút gọn 8 ký tự an toàn bằng crypto ngẫu nhiên [a-z0-9]
 */
export function generateShortCode(length: number = SHORT_CODE_LENGTH): string {
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARSET[bytes[i] % CHARSET.length];
  }
  return result;
}
/**
 * Kiểm tra mã rút gọn hợp lệ (đúng 8 ký tự Base36, chỉ gồm chữ thường a-z và số 0-9)
 */
export function isValidShortCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  return /^[a-z0-9]{8}$/.test(code.trim().toLowerCase());
}

/**
 * Mã hóa HTML escape chống tấn công XSS (Cross-Site Scripting)
 */
export function escapeHtml(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Chuẩn hóa và làm sạch chuỗi UTM / Label chống injection
 */
export function sanitizeUtmString(
  text: string,
  maxLength: number = 100,
): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/[<>'"`;(){}[\]\\]/g, '') // Loại bỏ ký tự nguy hiểm cho script/HTML
    .replace(/\s+/g, '_')
    .slice(0, maxLength);
}

/**
 * Ký token attribution bằng HMAC-SHA256 chống làm giả dữ liệu cookie
 * Bổ sung iat (thời điểm phát hành) và exp (thời điểm hết hạn 30 ngày)
 */
export function signAttributionToken(
  payload: Record<string, any>,
  secret: string,
  expiresInDays: number = 30,
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInDays * 24 * 60 * 60,
  };
  const dataStr = Buffer.from(JSON.stringify(fullPayload)).toString(
    'base64url',
  );
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataStr);
  const signature = hmac.digest('base64url');
  return `${dataStr}.${signature}`;
}

/**
 * Xác thực và giải mã token attribution từ cookie
 * Kiểm tra chữ ký HMAC-SHA256 và thời hạn hiệu lực (exp) trên server
 */
export function verifyAttributionToken(
  token: string,
  secret: string,
): Record<string, any> | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataStr, signature] = parts;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataStr);
  const expectedSig = hmac.digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(dataStr, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);
    const now = Math.floor(Date.now() / 1000);
    // Bắt buộc token attribution phải có iat và exp, và chưa hết hạn phía server
    if (
      typeof parsed.iat !== 'number' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp <= now
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
/**
 * Nhận diện Bot công cụ tìm kiếm / crawler qua User-Agent
 */
export function isSearchEngineBot(userAgent?: string): boolean {
  if (!userAgent) return false;
  const lower = userAgent.toLowerCase();
  const botKeywords = [
    'googlebot',
    'bingbot',
    'yandexbot',
    'baiduspider',
    'duckduckbot',
    'facebookexternalhit',
    'twitterbot',
    'linkedinbot',
    'embedly',
    'quora link preview',
    'showyoubot',
    'outbrain',
    'pinterest',
    'slackbot',
    'vkshare',
    'w3c_validator',
    'curl',
    'wget',
    'python-requests',
    'scrapy',
    'postmanruntime',
    'axios',
  ];
  return botKeywords.some((bot) => lower.includes(bot));
}

/**
 * Chuẩn hóa chuỗi slug từ tiêu đề sản phẩm tiếng Việt
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Cấu trúc dữ liệu Attribution từng Shop trong Cookie scanms_attr (FR-13)
 */
export interface ShopAttributionEntry {
  sessionId: string;
  collaboratorId: string;
  referralLinkId: string;
  shortCode: string;
  productId?: string;
  channel?: string | null;
  utmSource?: string | null;
  clickedAt: string;
  expiresAt: string;
  via?: 'LINK' | 'QR';
}

export interface MultiShopAttributionPayload {
  v: number;
  vid: string;
  shops: Record<string, ShopAttributionEntry>;
  iat?: number;
  exp?: number;
}

/**
 * Chuẩn hóa địa chỉ IP thành subnet prefix (IPv4 /24, IPv6 /48) và băm HMAC
 * Bảo vệ quyền riêng tư người dùng theo quy định FR-13
 */
export function hashIpAddress(
  ip: string,
  secret: string,
): { prefix: string; hash: string } {
  if (!ip || typeof ip !== 'string') {
    return {
      prefix: '0.0.0.0/24',
      hash: crypto
        .createHmac('sha256', secret)
        .update('0.0.0.0/24')
        .digest('hex'),
    };
  }
  const cleanIp = ip.trim().replace(/^::ffff:/, '');
  let prefix = cleanIp;

  if (cleanIp.includes('.')) {
    // IPv4: Lấy 3 octet đầu
    const parts = cleanIp.split('.');
    if (parts.length === 4) {
      prefix = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  } else if (cleanIp.includes(':')) {
    // IPv6: Lấy 3 nhóm đầu
    const parts = cleanIp.split(':');
    prefix = `${parts.slice(0, 3).join(':')}::/48`;
  }

  const hash = crypto.createHmac('sha256', secret).update(prefix).digest('hex');
  return { prefix, hash };
}

/**
 * Chuẩn hóa User-Agent: giới hạn tối đa 512 ký tự, loại bỏ khoảng trắng dư thừa
 */
export function normalizeUserAgent(
  userAgent?: string,
  maxLength: number = 512,
): string {
  if (!userAgent || typeof userAgent !== 'string') return 'Unknown';
  return userAgent.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

/**
 * Tạo Server-Side HMAC Device Fingerprint (FR-13 Mục 9)
 * HMAC(secret, normalized IP prefix + normalized User-Agent)
 * Không bao giờ lưu fingerprint thô
 */
export function generateDeviceFingerprint(
  ip: string,
  userAgent: string,
  secret: string,
): string {
  const { prefix } = hashIpAddress(ip, secret);
  const normalizedUa = normalizeUserAgent(userAgent);
  const signal = `${prefix}|${normalizedUa}`;
  return crypto.createHmac('sha256', secret).update(signal).digest('hex');
}

/**
 * Ký token Attribution Đa Gian Hàng (Multi-Shop) bằng HMAC-SHA256
 */
export function signMultiShopAttributionToken(
  payload: MultiShopAttributionPayload,
  secret: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  // Tìm thời điểm hết hạn xa nhất trong các shop, tối thiểu 30 ngày
  let maxExp = now + 30 * 24 * 60 * 60;
  for (const shop of Object.values(payload.shops || {})) {
    if (shop.expiresAt) {
      const shopExp = Math.floor(new Date(shop.expiresAt).getTime() / 1000);
      if (shopExp > maxExp) maxExp = shopExp;
    }
  }

  const fullPayload: MultiShopAttributionPayload = {
    v: payload.v || 1,
    vid: payload.vid,
    shops: payload.shops || {},
    iat: now,
    exp: maxExp,
  };

  const dataStr = Buffer.from(JSON.stringify(fullPayload)).toString(
    'base64url',
  );
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataStr);
  const signature = hmac.digest('base64url');
  return `${dataStr}.${signature}`;
}

/**
 * Giải mã và kiểm tra tính toàn vẹn của Token Attribution Đa Gian Hàng
 * Hỗ trợ tương thích ngược với token cũ
 */
export function verifyMultiShopAttributionToken(
  token: string,
  secret: string,
): MultiShopAttributionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataStr, signature] = parts;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataStr);
  const expectedSig = hmac.digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(dataStr, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);
    const now = Math.floor(Date.now() / 1000);

    // Kiểm tra exp tổng quát
    if (typeof parsed.exp === 'number' && parsed.exp <= now) {
      return null;
    }

    // Nếu là định dạng Multi-Shop v1
    if (parsed.shops && typeof parsed.shops === 'object') {
      // Lọc bỏ các shop đã hết hạn
      const activeShops: Record<string, ShopAttributionEntry> = {};
      const nowDate = new Date();
      for (const [storeId, entry] of Object.entries(
        parsed.shops as Record<string, ShopAttributionEntry>,
      )) {
        if (entry.expiresAt && new Date(entry.expiresAt) > nowDate) {
          activeShops[storeId] = entry;
        }
      }
      return {
        v: parsed.v || 1,
        vid: parsed.vid || crypto.randomUUID(),
        shops: activeShops,
        iat: parsed.iat,
        exp: parsed.exp,
      };
    }

    // Tương thích ngược với định dạng token đơn cũ (single shop token)
    if (parsed.storeId && parsed.collaboratorId) {
      const singleShopEntry: ShopAttributionEntry = {
        sessionId: crypto.randomUUID(),
        collaboratorId: parsed.collaboratorId,
        referralLinkId: parsed.referralLinkId || '',
        shortCode: parsed.shortCode || '',
        productId: parsed.productId,
        channel: parsed.channel,
        utmSource: parsed.utmSource,
        clickedAt: parsed.clickedAt || new Date().toISOString(),
        expiresAt: parsed.exp
          ? new Date(parsed.exp * 1000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString(),
      };
      return {
        v: 1,
        vid: crypto.randomUUID(),
        shops: {
          [parsed.storeId]: singleShopEntry,
        },
        iat: parsed.iat,
        exp: parsed.exp,
      };
    }

    return null;
  } catch {
    return null;
  }
}
/**
 * Ký token visitor ngẫu nhiên (Opaque Visitor Token) theo FR-13 Mục 10.
 * Cookie chỉ chứa visitorId được ký bằng HMAC-SHA256, không chứa PII, IP, User-Agent,
 * collaboratorId, referralLinkId hay thông tin gian hàng.
 */
export function signOpaqueVisitorToken(
  visitorId: string,
  secret: string,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = { v: 1, vid: visitorId, iat: now };
  const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataStr);
  const signature = hmac.digest('base64url');
  return `${dataStr}.${signature}`;
}

/**
 * Giải mã và kiểm tra tính toàn vẹn của Opaque Visitor Token.
 * Trả về visitorId nếu hợp lệ, ngược lại trả về null.
 */
export function verifyOpaqueVisitorToken(
  token: string,
  secret: string,
): string | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataStr, signature] = parts;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(dataStr);
  const expectedSig = hmac.digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expBuf)
  ) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(dataStr, 'base64url').toString('utf8');
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.vid === 'string' && parsed.vid.trim()) {
      return parsed.vid.trim();
    }
    return null;
  } catch {
    return null;
  }
}
