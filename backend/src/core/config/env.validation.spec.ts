import { validateEnv } from './env.validation';

describe('EnvValidation (FR-14 & Production Security)', () => {
  it('should pass with valid default config', () => {
    const config = {
      CLICK_RATE_LIMIT_SEC: '10',
      CLICK_RATE_LIMIT_MIN: '60',
      TRUST_PROXY: 'false',
    };
    const res = validateEnv(config);
    expect(res.CLICK_RATE_LIMIT_SEC).toBe(10);
    expect(res.CLICK_RATE_LIMIT_MIN).toBe(60);
  });

  it('should throw error when CLICK_RATE_LIMIT_SEC is not a positive integer', () => {
    expect(() =>
      validateEnv({
        CLICK_RATE_LIMIT_SEC: '-5',
        CLICK_RATE_LIMIT_MIN: '60',
      }),
    ).toThrow('CLICK_RATE_LIMIT_SEC phải là một số nguyên dương');

    expect(() =>
      validateEnv({
        CLICK_RATE_LIMIT_SEC: 'abc',
        CLICK_RATE_LIMIT_MIN: '60',
      }),
    ).toThrow('CLICK_RATE_LIMIT_SEC phải là một số nguyên dương');
  });

  it('should throw error when CLICK_RATE_LIMIT_MIN < CLICK_RATE_LIMIT_SEC', () => {
    expect(() =>
      validateEnv({
        CLICK_RATE_LIMIT_SEC: '20',
        CLICK_RATE_LIMIT_MIN: '10',
      }),
    ).toThrow('không được nhỏ hơn CLICK_RATE_LIMIT_SEC');
  });

  it('should require REDIS_URL or REDIS_HOST in production', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        CLICK_RATE_LIMIT_SEC: '10',
        CLICK_RATE_LIMIT_MIN: '60',
      }),
    ).toThrow('bắt buộc phải cấu hình REDIS_URL hoặc REDIS_HOST');
  });

  it('should require password and TLS for remote Redis in production', () => {
    // Thiếu mật khẩu
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        REDIS_HOST: '103.21.244.5',
        CLICK_RATE_LIMIT_SEC: '10',
        CLICK_RATE_LIMIT_MIN: '60',
      }),
    ).toThrow('bắt buộc phải cấu hình mật khẩu bảo vệ');

    // Có mật khẩu nhưng thiếu TLS
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        REDIS_HOST: '103.21.244.5',
        REDIS_PASSWORD: 'secure_password',
        CLICK_RATE_LIMIT_SEC: '10',
        CLICK_RATE_LIMIT_MIN: '60',
      }),
    ).toThrow('bắt buộc phải sử dụng mã hóa đường truyền TLS');

    // Có mật khẩu và REDIS_TLS=true -> Hợp lệ
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        REDIS_HOST: '103.21.244.5',
        REDIS_PASSWORD: 'secure_password',
        REDIS_TLS: 'true',
        CLICK_RATE_LIMIT_SEC: '10',
        CLICK_RATE_LIMIT_MIN: '60',
      }),
    ).not.toThrow();

    // Dùng rediss:// URL -> Hợp lệ
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        REDIS_URL: 'rediss://:secure_password@103.21.244.5:6379',
        CLICK_RATE_LIMIT_SEC: '10',
        CLICK_RATE_LIMIT_MIN: '60',
      }),
    ).not.toThrow();

    // Dùng redis:// công khai không TLS -> Bị từ chối
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        REDIS_URL: 'redis://:secure_password@103.21.244.5:6379',
        CLICK_RATE_LIMIT_SEC: '10',
        CLICK_RATE_LIMIT_MIN: '60',
      }),
    ).toThrow('bắt buộc phải sử dụng mã hóa đường truyền TLS');
  });

  it('should validate TRUSTED_PROXIES CIDR format', () => {
    expect(() =>
      validateEnv({
        CLICK_RATE_LIMIT_SEC: '10',
        CLICK_RATE_LIMIT_MIN: '60',
        TRUSTED_PROXIES: '192.168.1.0/999',
      }),
    ).toThrow('TRUSTED_PROXIES chứa dải CIDR không hợp lệ');

    expect(() =>
      validateEnv({
        CLICK_RATE_LIMIT_SEC: '10',
        CLICK_RATE_LIMIT_MIN: '60',
        TRUSTED_PROXIES: 'not-an-ip',
      }),
    ).toThrow('TRUSTED_PROXIES chứa địa chỉ IP không hợp lệ');
  });
});
