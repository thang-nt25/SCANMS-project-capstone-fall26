import { randomUUID, verify, type KeyObject } from 'node:crypto';

export const BIDV_SANDBOX_BASE = 'https://openapi.bidv.com.vn/bidv/sandbox/open-banking/paygate/pobo';
const TOKEN_URL = 'https://openapi.bidv.com.vn/bidv/sandbox/openapi/oauth2/token';
const ENDPOINTS = {
  transfer: `${BIDV_SANDBOX_BASE}/transfer-247/v1`,
  inquiry: 'https://openapi.bidv.com.vn/bidv/sandbox/open-banking/paygate/common/inquiry/v1',
} as const;

export interface BidvSandboxConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  channel: string;
  privateKey: KeyObject;
  certificate: { publicKey: KeyObject; raw: Buffer };
  symmetricKey: Buffer;
}

export class BidvSandboxError extends Error {
  constructor(public readonly stage: 'CONFIG' | 'OAUTH' | 'BUSINESS', public readonly httpStatus: number | null = null) {
    super(`BIDV Sandbox: ${stage}${httpStatus ? ` HTTP ${httpStatus}` : ' không nhận được kết quả hợp lệ'}`);
  }
}

// Only these small, non-credential fields may leave this transport or enter AuditLog.
export interface BidvResponse {
  httpStatus: number;
  errorCode: string | null;
  errorDesc: string | null;
  transactions: { rootRequestId: string; amount: string; detailCode: string; accountingDate: string; bidvId: string }[];
  listValid: boolean;
}

export function summarizeBidvResponse(data: unknown, httpStatus: number, secrets: string[] = []): BidvResponse {
  const obj = data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
  const safe = (value: unknown, pattern: RegExp, max = 100): string | null => {
    if (typeof value !== 'string' || value.length > max || !pattern.test(value) || secrets.some(secret => secret && value.includes(secret))) return null;
    return value;
  };
  const errorCode = safe(obj.errorCode, /^[A-Za-z0-9_.-]{1,30}$/);
  const errorDesc = safe(obj.errorDesc, /^[\p{L}\p{N} .,;:()/_-]*$/u, 250);
  const transactions: BidvResponse['transactions'] = [];
  let listValid = false;
  if (typeof obj.list === 'string' && obj.list.length <= 10000) {
    const list = obj.list.trim();
    // The documentation only specifies [id|amount|code|date|BIDVID]. Fail closed
    // on other delimiters/field counts instead of guessing a batch format.
    const row = list.startsWith('[') && list.endsWith(']') ? list.slice(1, -1) : list;
    const fields = row.split('|');
    if (fields.length === 5) {
      const [rootRequestId, amount, detailCode, accountingDate, bidvId] = fields;
      if (safe(rootRequestId, /^[A-Za-z0-9_-]+$/) && safe(amount, /^\d+(?:\.\d{1,2})?$/) &&
          safe(detailCode, /^[A-Za-z0-9_.-]+$/) && safe(accountingDate, /^[0-9/-]*$/) !== null &&
          safe(bidvId, /^[A-Za-z0-9_.-]*$/) !== null) {
        transactions.push({ rootRequestId, amount, detailCode, accountingDate, bidvId });
        listValid = true;
      }
    }
  }
  return { httpStatus, errorCode, errorDesc, transactions, listValid };
}

export async function callBidvSandbox(
  config: BidvSandboxConfig,
  operation: keyof typeof ENDPOINTS,
  payload: Record<string, string>,
  correlation: { idempotencyKey: string; interactionId: string },
  fetchImpl: typeof fetch = fetch,
): Promise<BidvResponse> {
  if (config.baseUrl !== BIDV_SANDBOX_BASE || !ENDPOINTS[operation] ||
      !config.channel || /[\r\n]/.test(config.channel) || config.symmetricKey.length !== 32 ||
      config.privateKey.asymmetricKeyType !== 'rsa' || (config.privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
    throw new BidvSandboxError('CONFIG');
  }
  const { CompactEncrypt, CompactSign, generalDecrypt } = await import('jose');
  const compact = await new CompactEncrypt(Buffer.from(JSON.stringify(payload)))
    .setProtectedHeader({ enc: 'A128GCM', alg: 'A256KW', typ: 'JOSE', kid: 'test-bidv-private-key', iat: Date.now() / 1000 })
    .encrypt(config.symmetricKey);
  const [protectedHeader, encrypted_key, iv, ciphertext, tag] = compact.split('.');
  const body = JSON.stringify({ recipients: [{ header: {}, encrypted_key }], protected: protectedHeader, ciphertext, iv, tag });
  const signed = await new CompactSign(Buffer.from(body)).setProtectedHeader({ alg: 'RS256' }).sign(config.privateKey);
  const [header, encodedBody, signature] = signed.split('.');
  if (!verify('RSA-SHA256', Buffer.from(`${header}.${encodedBody}`), config.certificate.publicKey, Buffer.from(signature, 'base64url'))) {
    throw new BidvSandboxError('CONFIG');
  }
  async function post(url: string, headers: Record<string, string>, content: string | URLSearchParams, stage: 'OAUTH' | 'BUSINESS') {
    let status: number | null = null;
    try {
      const response = await fetchImpl(url, { method: 'POST', headers, body: content, redirect: 'error', signal: AbortSignal.timeout(20000) });
      status = response.status;
      if (!response.ok) throw new BidvSandboxError(stage, status);
      const text = await response.text();
      if (text.length > 65536) throw new BidvSandboxError(stage, status);
      return { status, data: JSON.parse(text) };
    } catch { throw new BidvSandboxError(stage, status); }
  }
  const token = await post(TOKEN_URL, {
    Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }, new URLSearchParams({ grant_type: 'client_credentials', scope: 'ewallet' }), 'OAUTH');
  if (typeof token.data?.access_token !== 'string' || !token.data.access_token.trim() ||
      !/^Bearer$/i.test(token.data.token_type ?? 'Bearer')) throw new BidvSandboxError('OAUTH', token.status);
  const result = await post(ENDPOINTS[operation], {
    Authorization: `Bearer ${token.data.access_token}`,
    'X-Idempotency-Key': correlation.idempotencyKey,
    'X-API-Interaction-ID': correlation.interactionId,
    Timestamp: new Date().toISOString(), Channel: config.channel,
    'User-Agent': 'SCANMS-BIDV-Sandbox/1.0',
    'X-JWS-Signature': `${header}..${signature}`,
    'X-Client-Certificate': config.certificate.raw.toString('base64'),
    'Content-Type': 'application/json', Accept: 'application/json',
  }, body, 'BUSINESS');
  try {
    if (result.data?.ciphertext) {
      const decrypted = await generalDecrypt(result.data, config.symmetricKey, {
        keyManagementAlgorithms: ['A256KW'], contentEncryptionAlgorithms: ['A128GCM'],
      });
      result.data = JSON.parse(Buffer.from(decrypted.plaintext).toString('utf8'));
    }
    return summarizeBidvResponse(result.data, result.status, [config.clientId, config.clientSecret,
      token.data.access_token, config.symmetricKey.toString('hex'), config.symmetricKey.toString('base64')]);
  } catch { throw new BidvSandboxError('BUSINESS', result.status); }
}

export function bidvRequestDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('');
}

export const newBidvCorrelation = () => ({ idempotencyKey: randomUUID(), interactionId: randomUUID() });
