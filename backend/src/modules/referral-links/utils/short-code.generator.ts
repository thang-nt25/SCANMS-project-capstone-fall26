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
