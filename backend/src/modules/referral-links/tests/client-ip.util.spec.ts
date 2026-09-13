import {
  extractTrustedClientIp,
  cleanIpString,
  normalizeClientIp,
  hashIpForRateLimit,
} from '../utils/client-ip.util';

describe('ClientIpUtil (FR-14)', () => {
  describe('cleanIpString', () => {
    it('should strip ::ffff: from IPv4-mapped IPv6', () => {
      expect(cleanIpString('::ffff:192.168.1.50')).toBe('192.168.1.50');
      expect(cleanIpString('::ffff:127.0.0.1')).toBe('127.0.0.1');
    });

    it('should trim and lowercase IP strings', () => {
      expect(cleanIpString('  10.0.0.1  ')).toBe('10.0.0.1');
    });

    it('should remove accidental port suffix if attached', () => {
      expect(cleanIpString('1.2.3.4:8080')).toBe('1.2.3.4');
    });
  });

  describe('normalizeClientIp', () => {
    it('should return IPv4 addresses as is', () => {
      expect(normalizeClientIp('113.190.234.12')).toBe('113.190.234.12');
      expect(normalizeClientIp('::ffff:113.190.234.12')).toBe('113.190.234.12');
    });

    it('should normalize IPv6 addresses and group by /64 prefix (Item 25)', () => {
      const fullIpv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const normalized = normalizeClientIp(fullIpv6);
      expect(normalized).toBe('2001:0db8:85a3:0000::/64');

      const shortIpv6 = '2001:db8:abcd:12::1';
      const normalizedShort = normalizeClientIp(shortIpv6);
      expect(normalizedShort).toBe('2001:0db8:abcd:0012::/64');

      // Address within the same /64 subnet should normalize to identical /64 prefix!
      const siblingIpv6 = '2001:db8:abcd:12:9999:ffff:1234:5678';
      expect(normalizeClientIp(siblingIpv6)).toBe('2001:0db8:abcd:0012::/64');
    });

    it('should map localhost ::1 to 127.0.0.1', () => {
      expect(normalizeClientIp('::1')).toBe('127.0.0.1');
      expect(normalizeClientIp('localhost')).toBe('127.0.0.1');
    });
  });

  describe('hashIpForRateLimit', () => {
    it('should produce consistent HMAC-SHA256 hex digest for same IP and secret', () => {
      const hash1 = hashIpForRateLimit('113.190.234.12', 'my-secret');
      const hash2 = hashIpForRateLimit('113.190.234.12', 'my-secret');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('should produce different hashes for different IPs', () => {
      const hash1 = hashIpForRateLimit('113.190.234.12', 'my-secret');
      const hash2 = hashIpForRateLimit('113.190.234.13', 'my-secret');
      expect(hash1).not.toBe(hash2);
    });

    it('should throw fatal security error if secret is missing or empty (Point 11)', () => {
      const prevSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      try {
        expect(() => hashIpForRateLimit('113.190.234.12', '')).toThrow(
          'FATAL SECURITY ERROR',
        );
      } finally {
        process.env.JWT_SECRET = prevSecret;
      }
    });
  });

  describe('extractTrustedClientIp', () => {
    it('should default trustProxy to false when omitted (chống spoofing mặc định)', () => {
      const mockReq: any = {
        headers: {
          'x-forwarded-for': '203.113.152.1',
          'cf-connecting-ip': '203.113.152.2',
        },
        socket: { remoteAddress: '192.168.1.99' },
      };
      expect(extractTrustedClientIp(mockReq)).toBe('192.168.1.99');
    });

    it('should prioritize CF-Connecting-IP when trustProxy is true', () => {
      const mockReq: any = {
        headers: {
          'cf-connecting-ip': '103.21.244.2',
          'x-forwarded-for': '10.0.0.1',
        },
        socket: { remoteAddress: '127.0.0.1' },
      };
      expect(extractTrustedClientIp(mockReq, true)).toBe('103.21.244.2');
    });

    it('should use first hop of X-Forwarded-For if CF-Connecting-IP not present', () => {
      const mockReq: any = {
        headers: {
          'x-forwarded-for': '203.113.152.1, 10.0.0.1, 192.168.1.1',
        },
        socket: { remoteAddress: '127.0.0.1' },
      };
      expect(extractTrustedClientIp(mockReq, true)).toBe('203.113.152.1');
    });

    it('should ignore proxy headers when trustProxy is false (chống spoofing)', () => {
      const mockReq: any = {
        headers: {
          'x-forwarded-for': '203.113.152.1',
        },
        socket: { remoteAddress: '192.168.1.5' },
      };
      expect(extractTrustedClientIp(mockReq, false)).toBe('192.168.1.5');
    });

    it('should REJECT spoofed headers when trustProxy is true but socket is from public Internet (Issue 2)', () => {
      const mockReq: any = {
        headers: {
          'x-forwarded-for': '1.1.1.1',
          'cf-connecting-ip': '1.1.1.1',
        },
        // Attacker connects directly from public IP 203.0.113.55
        socket: { remoteAddress: '203.0.113.55' },
      };
      // Must ignore spoofed headers and return the direct attacker socket IP!
      expect(extractTrustedClientIp(mockReq, true)).toBe('203.0.113.55');
    });

    it('should NOT automatically trust private subnets without explicit TRUSTED_PROXIES configuration (Point 2)', () => {
      const mockReq1: any = {
        headers: { 'x-forwarded-for': '14.161.20.5' },
        socket: { remoteAddress: '10.0.1.20' },
      };
      // Không tự động tin mạng private -> từ chối header giả mạo, lấy chính socket IP
      expect(extractTrustedClientIp(mockReq1, true)).toBe('10.0.1.20');

      const mockReq2: any = {
        headers: { 'cf-connecting-ip': '14.161.20.6' },
        socket: { remoteAddress: '172.20.0.5' },
      };
      expect(extractTrustedClientIp(mockReq2, true)).toBe('172.20.0.5');
    });

    it('should trust headers when private IP or CIDR is explicitly declared in TRUSTED_PROXIES (Point 2)', () => {
      const mockReq1: any = {
        headers: { 'x-forwarded-for': '14.161.20.5' },
        socket: { remoteAddress: '10.0.1.20' },
      };
      // Khi đã khai báo 10.0.0.0/8 trong TRUSTED_PROXIES -> tin cậy header
      expect(extractTrustedClientIp(mockReq1, true, '10.0.0.0/8')).toBe('14.161.20.5');

      const mockReq2: any = {
        headers: { 'cf-connecting-ip': '14.161.20.6' },
        socket: { remoteAddress: '172.20.0.5' },
      };
      expect(extractTrustedClientIp(mockReq2, true, '172.20.0.5')).toBe('14.161.20.6');
    });

    it('should always automatically trust loopback (127.0.0.1, ::1) when trustProxy is true', () => {
      const mockReqLoopback: any = {
        headers: { 'x-forwarded-for': '14.161.20.8' },
        socket: { remoteAddress: '127.0.0.1' },
      };
      expect(extractTrustedClientIp(mockReqLoopback, true)).toBe('14.161.20.8');

      const mockReqIpv6Loopback: any = {
        headers: { 'cf-connecting-ip': '14.161.20.9' },
        socket: { remoteAddress: '::1' },
      };
      expect(extractTrustedClientIp(mockReqIpv6Loopback, true)).toBe('14.161.20.9');
    });

    it('should trust headers when socket matches custom CIDR or trustedProxies list', () => {
      const mockReq: any = {
        headers: { 'x-forwarded-for': '14.161.20.7' },
        socket: { remoteAddress: '198.51.100.44' },
      };
      // Without config: untrusted
      expect(extractTrustedClientIp(mockReq, true)).toBe('198.51.100.44');

      // With custom CIDR configured
      expect(
        extractTrustedClientIp(mockReq, true, '198.51.100.0/24'),
      ).toBe('14.161.20.7');
    });
  });
});
