import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrivateKey, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BIDV_SANDBOX_BASE, callBidvSandbox, type BidvSandboxConfig } from './bidv-sandbox.protocol';

@Injectable()
export class BidvSandboxClient {
  constructor(private readonly config: ConfigService) {}

  availability() {
    const enabled = this.config.get('NODE_ENV') !== 'production' && this.config.get('BIDV_SANDBOX_ENABLED') === 'true';
    if (!enabled) return { enabled: false, configured: false, message: 'BIDV Sandbox chưa được bật trên máy chủ thử nghiệm.' };
    try {
      this.load();
      return { enabled: true, configured: true, message: 'Sẵn sàng gửi lệnh tới BIDV Sandbox. Đây là giao dịch thử nghiệm, không chuyển tiền thật.' };
    } catch {
      return { enabled: true, configured: false, message: 'Kiểm tra cấu hình BIDV Sandbox, khóa ký và chứng thư trên máy chủ.' };
    }
  }

  private load(): BidvSandboxConfig {
    if (this.config.get('NODE_ENV') === 'production' || this.config.get('BIDV_SANDBOX_ENABLED') !== 'true')
      throw new ServiceUnavailableException('BIDV Sandbox chỉ dùng trên môi trường thử nghiệm.');
    const value = (key: string) => this.config.get<string>(key)?.trim() ?? '';
    const baseUrl = value('BIDV_API_BASE_URL').replace(/\/$/, '');
    const clientId = value('BIDV_CLIENT_ID');
    const clientSecret = value('BIDV_CLIENT_SECRET');
    const channel = value('BIDV_CHANNEL');
    const directory = value('BIDV_SANDBOX_KEY_DIR');
    if (baseUrl !== BIDV_SANDBOX_BASE || !clientId || !clientSecret || !directory || !channel || /[\r\n]/.test(channel)) throw new Error('configuration');
    const privateKey = createPrivateKey(readFileSync(join(directory, 'privateKey.key')));
    const certificate = new X509Certificate(readFileSync(join(directory, 'certificate.crt')));
    const hex = readFileSync(join(directory, 'application-symmetric-key.txt'), 'utf8').trim();
    if (!/^[a-f0-9]{64}$/i.test(hex) || !certificate.checkPrivateKey(privateKey) || privateKey.asymmetricKeyType !== 'rsa' ||
        (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048 ||
        Date.now() < Date.parse(certificate.validFrom) || Date.now() > Date.parse(certificate.validTo)) throw new Error('keys');
    return { baseUrl, clientId, clientSecret, channel, privateKey, certificate, symmetricKey: Buffer.from(hex, 'hex') };
  }

  async call(operation: 'transfer' | 'inquiry', payload: Record<string, string>, correlation: { idempotencyKey: string; interactionId: string }) {
    let config: BidvSandboxConfig;
    try { config = this.load(); }
    catch { throw new ServiceUnavailableException('Cấu hình BIDV Sandbox chưa hợp lệ.'); }
    return callBidvSandbox(config, operation, payload, correlation);
  }
}
