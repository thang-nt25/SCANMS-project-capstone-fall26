import * as crypto from 'crypto';
import * as net from 'net';
import type { Request } from 'express';

/**
 * FR-14 — Utility trích xuất, chuẩn hóa và bảo vệ địa chỉ IP Client
 * Đáp ứng các mục 8, 9, 10, 25 của đặc tả nghiệp vụ FR-14:
 * - Xác định IP thật từ kết nối hoặc trusted reverse proxy (CF-Connecting-IP, X-Forwarded-For).
 * - Chống giả mạo IP (không tin header tùy tiện khi trustProxy = false).
 * - Chuẩn hóa IPv4, IPv4-mapped IPv6 (::ffff:x.x.x.x -> x.x.x.x).
 * - Chuẩn hóa IPv6 và nhóm theo subnet prefix /64 chống bot xoay địa chỉ con.
 * - Mã hóa HMAC-SHA256 bảo vệ dữ liệu cá nhân (không lưu IP thô ra Redis key/log).
 */

/**
 * Kiểm tra địa chỉ IPv4 có nằm trong dải CIDR hay không
 */
function isIpInCidr(ip: string, cidr: string): boolean {
  if (!net.isIPv4(ip)) return false;
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  if (isNaN(bits) || bits < 0 || bits > 32 || !net.isIPv4(range)) return false;

  const ipToInt = (addr: string) =>
    addr.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;

  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(range) & mask);
}

/**
 * Kiểm tra xem địa chỉ IP socket kết nối trực tiếp có phải là reverse proxy tin cậy hoặc mạng nội bộ hay không.
 * Ngăn chặn kẻ tấn công trên Internet kết nối trực tiếp đến backend và gửi header giả mạo (CF-Connecting-IP, X-Forwarded-For).
 */
export function isTrustedProxySocket(
  socketIp?: string,
  trustedProxiesConfig?: string | string[],
): boolean {
  if (!socketIp) return false;
  const ip = cleanIpString(socketIp);

  // 1. Chỉ tự động tin cậy Loopback addresses (127.0.0.1, ::1, localhost) cho môi trường phát triển / reverse proxy trên cùng máy chủ
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return true;
  }

  // 2. Điểm bảo mật 2: Tuyệt đối KHÔNG tự động tin toàn bộ mạng private (10.x, 172.16-31.x, 192.168.x).
  // Trong môi trường Production, CHỈ tin cậy các IP / CIDR được cấu hình rõ ràng trong TRUSTED_PROXIES.
  const proxies = Array.isArray(trustedProxiesConfig)
    ? trustedProxiesConfig
    : (trustedProxiesConfig || process.env.TRUSTED_PROXIES || '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

  for (const proxy of proxies) {
    if (proxy === ip) return true;
    if (proxy.includes('/')) {
      if (isIpInCidr(ip, proxy)) return true;
    }
  }

  return false;
}

/**
 * Trích xuất địa chỉ IP tin cậy từ Request Express
 * MẶC ĐỊNH trustProxy = false để chống giả mạo IP khi truy cập trực tiếp (Mục 8, 9).
 * An toàn tuyệt đối: Chỉ đọc header X-Forwarded-For / CF-Connecting-IP khi CẢ HAI điều kiện thỏa mãn:
 * 1. trustProxy được bật rõ ràng
 * 2. Socket kết nối trực tiếp đến từ proxy nội bộ / trusted proxy hợp lệ.
 */
export function extractTrustedClientIp(
  req: Request,
  trustProxy: boolean = false,
  trustedProxies?: string | string[],
): string {
  if (!req) return '127.0.0.1';

  const socketIp = req.socket?.remoteAddress || '';
  const cleanedSocketIp = cleanIpString(socketIp);

  // Chỉ tin tưởng proxy headers nếu trustProxy = true VÀ socket là trusted reverse proxy
  if (trustProxy && isTrustedProxySocket(cleanedSocketIp, trustedProxies)) {
    // 1. Ưu tiên Cloudflare Connecting IP nếu có
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
      return cleanIpString(cfIp);
    }

    // 2. X-Forwarded-For: Client IP đầu tiên
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.trim()) {
      const firstHop = xff.split(',')[0]?.trim();
      if (firstHop) {
        return cleanIpString(firstHop);
      }
    }

    // 3. Fallback sang req.ip nếu Express đã được cấu hình trust proxy
    if (req.ip) {
      const cleanedReqIp = cleanIpString(req.ip);
      if (cleanedReqIp !== '127.0.0.1' && cleanedReqIp !== '::1' && cleanedReqIp !== cleanedSocketIp) {
        return cleanedReqIp;
      }
    }
  }

  // Khi trustProxy = false hoặc kết nối trực tiếp từ Internet không qua proxy:
  // Luôn dùng socket remote address để triệt tiêu nguy cơ giả mạo IP
  const rawIp = cleanedSocketIp || (req.ip ? cleanIpString(req.ip) : '127.0.0.1');
  return rawIp;
}

/**
 * Làm sạch chuỗi IP và bỏ tiền tố IPv4-mapped IPv6 (::ffff:)
 */
export function cleanIpString(ip: string): string {
  if (!ip) return '127.0.0.1';
  let cleaned = ip.trim().toLowerCase();

  // Bỏ IPv4-mapped IPv6 (ví dụ: ::ffff:192.168.1.1 -> 192.168.1.1)
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }

  // Bỏ port nếu có (ví dụ 192.168.1.1:8080 trong một số header lỗi)
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/.test(cleaned)) {
    cleaned = cleaned.split(':')[0];
  }

  return cleaned || '127.0.0.1';
}

/**
 * Chuẩn hóa địa chỉ IP:
 * - IPv4: giữ nguyên x.x.x.x
 * - IPv6: chuẩn hóa dạng phân tách và nhóm theo prefix /64 (4 nhóm 16-bit đầu tiên)
 */
export function normalizeClientIp(ip: string): string {
  const cleaned = cleanIpString(ip);

  // Localhost fallback
  if (cleaned === '::1' || cleaned === 'localhost') {
    return '127.0.0.1';
  }

  // Trường hợp IPv4 chuẩn
  if (net.isIPv4(cleaned)) {
    return cleaned;
  }

  // Trường hợp IPv6: chuẩn hóa prefix /64 (FR-14 Mục 25)
  if (net.isIPv6(cleaned)) {
    try {
      const expanded = expandIPv6(cleaned);
      const groups = expanded.split(':');
      if (groups.length === 8) {
        // Lấy 4 nhóm đầu (64 bits) + ::/64
        return `${groups[0]}:${groups[1]}:${groups[2]}:${groups[3]}::/64`;
      }
    } catch {
      // Fallback
    }
    return cleaned;
  }

  return cleaned;
}

/**
 * Mở rộng địa chỉ IPv6 viết tắt thành đầy đủ 8 nhóm 4 chữ số hex
 */
function expandIPv6(ip: string): string {
  let fullIp = ip;
  if (fullIp.includes('::')) {
    const parts = fullIp.split('::');
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    const missingCount = 8 - (left.length + right.length);
    const middle = new Array(missingCount).fill('0000');
    fullIp = [...left, ...middle, ...right].join(':');
  }

  return fullIp
    .split(':')
    .map((part) => part.padStart(4, '0'))
    .join(':');
}

/**
 * Tạo mã băm HMAC-SHA256 của IP đã chuẩn hóa (FR-14 Mục 10, 11)
 * Secret nằm ở server, không lộ ra ngoài. Tuyệt đối không dùng hard-coded fallback.
 */
export function hashIpForRateLimit(normalizedIp: string, secret: string): string {
  const effectiveSecret = secret || process.env.JWT_SECRET;
  if (!effectiveSecret || !effectiveSecret.trim()) {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET hoặc server secret chưa được cấu hình cho IP HMAC rate limiting!');
  }
  return crypto.createHmac('sha256', effectiveSecret).update(normalizedIp).digest('hex');
}
