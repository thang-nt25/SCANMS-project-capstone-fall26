import * as net from 'net';

/**
 * Validation schema và kiểm tra an toàn biến môi trường ứng dụng (FR-14 & Production Security)
 */
export function validateEnv(config: Record<string, any>): Record<string, any> {
  const errors: string[] = [];

  // 1. CLICK_RATE_LIMIT_SEC: phải là số nguyên dương
  const secRaw = config.CLICK_RATE_LIMIT_SEC ?? '10';
  const secLimit = Number(secRaw);
  if (isNaN(secLimit) || !Number.isInteger(secLimit) || secLimit <= 0) {
    errors.push(`CLICK_RATE_LIMIT_SEC phải là một số nguyên dương (> 0). Nhận được: "${secRaw}"`);
  }

  // 2. CLICK_RATE_LIMIT_MIN: phải là số nguyên dương
  const minRaw = config.CLICK_RATE_LIMIT_MIN ?? '60';
  const minLimit = Number(minRaw);
  if (isNaN(minLimit) || !Number.isInteger(minLimit) || minLimit <= 0) {
    errors.push(`CLICK_RATE_LIMIT_MIN phải là một số nguyên dương (> 0). Nhận được: "${minRaw}"`);
  }

  // 3. Giới hạn phút không nhỏ hơn giới hạn giây
  if (!isNaN(secLimit) && !isNaN(minLimit) && secLimit > 0 && minLimit > 0) {
    if (minLimit < secLimit) {
      errors.push(
        `CLICK_RATE_LIMIT_MIN (${minLimit}) không được nhỏ hơn CLICK_RATE_LIMIT_SEC (${secLimit}).`,
      );
    }
  }

  // 4. Kiểm tra cấu hình Redis trong môi trường Production
  const isProduction = config.NODE_ENV === 'production';
  if (isProduction) {
    const redisUrl = config.REDIS_URL;
    const redisHost = config.REDIS_HOST;

    if (!redisUrl && !redisHost) {
      errors.push('Trong môi trường production, bắt buộc phải cấu hình REDIS_URL hoặc REDIS_HOST.');
    }

    // Production không được dùng Redis không mật khẩu hoặc không TLS ngoài private network / localhost
    let isUrlLocalOrPrivate = false;
    if (redisUrl) {
      try {
        const parsed = new URL(redisUrl);
        const host = parsed.hostname;
        isUrlLocalOrPrivate =
          host === 'localhost' ||
          host === '127.0.0.1' ||
          /^10\./.test(host) ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
          /^192\.168\./.test(host);
      } catch {}
    }

    const isHostLocalOrPrivate =
      redisHost === 'localhost' ||
      redisHost === '127.0.0.1' ||
      (typeof redisHost === 'string' &&
        (/^10\./.test(redisHost) ||
          /^172\.(1[6-9]|2\d|3[0-1])\./.test(redisHost) ||
          /^192\.168\./.test(redisHost)));

    const isLocalOrPrivate = isHostLocalOrPrivate || isUrlLocalOrPrivate;

    const hasPassword = Boolean(config.REDIS_PASSWORD && String(config.REDIS_PASSWORD).trim());
    const urlHasPassword = Boolean(redisUrl && /:\S+@/.test(redisUrl));

    if (!isLocalOrPrivate && !hasPassword && !urlHasPassword) {
      errors.push(
        'Trong môi trường production, Redis ngoài mạng nội bộ (private network) bắt buộc phải cấu hình mật khẩu bảo vệ (REDIS_PASSWORD hoặc trong REDIS_URL).',
      );
    }

    // Kiểm tra bắt buộc TLS đối với Redis ngoài mạng nội bộ trong production
    const isTls =
      config.REDIS_TLS === 'true' ||
      config.REDIS_TLS === true ||
      Boolean(redisUrl && redisUrl.startsWith('rediss://'));

    if (!isLocalOrPrivate && !isTls) {
      errors.push(
        'Trong môi trường production, Redis ngoài mạng nội bộ bắt buộc phải sử dụng mã hóa đường truyền TLS (REDIS_TLS=true hoặc REDIS_URL=rediss://...). Không chấp nhận kết nối redis:// công khai không mã hóa.',
      );
    }
  }

  // 5. Kiểm tra định dạng TRUSTED_PROXIES nếu có cấu hình
  if (config.TRUSTED_PROXIES) {
    const proxies = String(config.TRUSTED_PROXIES)
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    for (const proxy of proxies) {
      if (proxy === 'loopback' || proxy === 'linklocal' || proxy === 'uniquelocal') {
        continue;
      }
      if (proxy.includes('/')) {
        const [ip, bits] = proxy.split('/');
        const bitNum = Number(bits);
        if (
          (!net.isIPv4(ip) && !net.isIPv6(ip)) ||
          isNaN(bitNum) ||
          bitNum < 0 ||
          (net.isIPv4(ip) && bitNum > 32) ||
          (net.isIPv6(ip) && bitNum > 128)
        ) {
          errors.push(`TRUSTED_PROXIES chứa dải CIDR không hợp lệ: "${proxy}".`);
        }
      } else if (!net.isIP(proxy) && proxy !== 'localhost') {
        errors.push(`TRUSTED_PROXIES chứa địa chỉ IP không hợp lệ: "${proxy}".`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`[CONFIG_VALIDATION_ERROR] Phát hiện lỗi cấu hình biến môi trường:\n- ${errors.join('\n- ')}`);
  }

  return {
    ...config,
    CLICK_RATE_LIMIT_SEC: isNaN(secLimit) ? 10 : secLimit,
    CLICK_RATE_LIMIT_MIN: isNaN(minLimit) ? 60 : minLimit,
  };
}
