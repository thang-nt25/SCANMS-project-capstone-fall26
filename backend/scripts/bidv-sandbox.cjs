// Standalone sandbox bank-list check. Does not load Nest, Prisma, or payout jobs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

const SANDBOX_BASE = 'https://openapi.bidv.com.vn/bidv/sandbox/open-banking/paygate/pobo';
const TOKEN_URL = 'https://openapi.bidv.com.vn/bidv/sandbox/openapi/oauth2/token';
// Demo data from BIDV Try It, confirmed for this sandbox bank-list endpoint only.
const DEMO_BODY = Object.freeze({
  serviceId: '000003', merchantId: '0000031', merchantName: 'MOMO', channelId: '211701',
  extraInfo1: '1', extraInfo2: '1', extraInfo3: '1', extraInfo4: '1', extraInfo5: '1',
});

class CheckError extends Error {}

function loadConfig(env) {
  const required = ['BIDV_API_BASE_URL', 'BIDV_CLIENT_ID', 'BIDV_CLIENT_SECRET', 'BIDV_CHANNEL', 'BIDV_SANDBOX_KEY_DIR'];
  for (const name of required) {
    if (!env[name]?.trim()) throw new CheckError(`Missing ${name}`);
  }
  let privateKey, certificate, keyHex;
  try {
    privateKey = crypto.createPrivateKey(fs.readFileSync(path.join(env.BIDV_SANDBOX_KEY_DIR, 'privateKey.key')));
    certificate = new crypto.X509Certificate(fs.readFileSync(path.join(env.BIDV_SANDBOX_KEY_DIR, 'certificate.crt')));
    keyHex = fs.readFileSync(path.join(env.BIDV_SANDBOX_KEY_DIR, 'application-symmetric-key.txt'), 'utf8').trim();
  } catch {
    throw new CheckError('Cannot read the BIDV key/certificate files. Check BIDV_SANDBOX_KEY_DIR.');
  }
  if (!/^[a-fA-F0-9]{64}$/.test(keyHex)) throw new CheckError('BIDV symmetric key must contain 64 hexadecimal characters.');
  return {
    baseUrl: env.BIDV_API_BASE_URL.replace(/\/$/, ''),
    clientId: env.BIDV_CLIENT_ID,
    clientSecret: env.BIDV_CLIENT_SECRET,
    channel: env.BIDV_CHANNEL,
    privateKey, certificate, symmetricKey: Buffer.from(keyHex, 'hex'),
  };
}

async function createSignedBody(config) {
  const { CompactEncrypt, CompactSign } = await import('jose');
  const compact = await new CompactEncrypt(Buffer.from(JSON.stringify(DEMO_BODY)))
    .setProtectedHeader({ enc: 'A128GCM', alg: 'A256KW', typ: 'JOSE', kid: 'test-bidv-private-key', iat: Date.now() / 1000 })
    .encrypt(config.symmetricKey);
  const [protectedHeader, encrypted_key, iv, ciphertext, tag] = compact.split('.');
  const body = JSON.stringify({ recipients: [{ header: {}, encrypted_key }], protected: protectedHeader, ciphertext, iv, tag });
  const signed = await new CompactSign(Buffer.from(body)).setProtectedHeader({ alg: 'RS256' }).sign(config.privateKey);
  const [header, payload, signature] = signed.split('.');
  if (!crypto.verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), config.certificate.publicKey, Buffer.from(signature, 'base64url'))) {
    throw new CheckError('BIDV private key does not match the client certificate.');
  }
  return { body, signature: `${header}..${signature}` };
}

async function post(url, headers, body, stage, fetchImpl) {
  try {
    const response = await fetchImpl(url, {
      method: 'POST', headers, body, redirect: 'error', signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new CheckError(`${stage} failed (HTTP ${response.status}).`);
    return { status: response.status, data: await response.json() };
  } catch (error) {
    if (error instanceof CheckError) throw error;
    // Never log raw network errors or response bodies that could reflect credentials.
    throw new CheckError(`${stage} failed: connection, redirect, timeout, or invalid JSON response.`);
  }
}

async function checkBankList(config, fetchImpl = fetch) {
  if (config.baseUrl !== SANDBOX_BASE) throw new CheckError('Only the official BIDV sandbox POBO base URL is allowed.');
  if (!config.channel || /[\r\n]/.test(config.channel)) throw new CheckError('Invalid BIDV_CHANNEL.');
  if (config.privateKey.asymmetricKeyType !== 'rsa' || config.privateKey.asymmetricKeyDetails.modulusLength < 2048) {
    throw new CheckError('BIDV signing key must be RSA with at least 2048 bits.');
  }
  const signed = await createSignedBody(config);
  const token = await post(TOKEN_URL, {
    Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }, new URLSearchParams({ grant_type: 'client_credentials', scope: 'ewallet' }), 'BIDV OAuth', fetchImpl);
  if (typeof token.data?.access_token !== 'string' || !token.data.access_token.trim() ||
      !/^Bearer$/i.test(token.data.token_type ?? 'Bearer')) {
    throw new CheckError('BIDV OAuth did not return a usable bearer token.');
  }
  const result = await post(`${SANDBOX_BASE}/get-list-bank/v1`, {
    Authorization: `Bearer ${token.data.access_token}`,
    'X-Idempotency-Key': crypto.randomUUID(),
    Channel: config.channel,
    'User-Agent': 'SCANMS-BIDV-Sandbox/1.0',
    'X-API-Interaction-ID': crypto.randomUUID(),
    Timestamp: new Date().toISOString(),
    'X-JWS-Signature': signed.signature,
    'X-Client-Certificate': config.certificate.raw.toString('base64'),
    'Content-Type': 'application/json', Accept: 'application/json',
  }, signed.body, 'BIDV bank list', fetchImpl);
  if (result.data?.errorCode !== '000' || !Array.isArray(result.data.listBank)) {
    throw new CheckError(`BIDV bank list did not report business success (HTTP ${result.status}).`);
  }
  return result;
}

async function main() {
  try {
    const root = path.resolve(__dirname, '..');
    const env = { ...dotenv.parse(fs.readFileSync(path.join(root, '.env'))), ...process.env };
    const result = await checkBankList(loadConfig(env));
    console.log(JSON.stringify({
      environment: 'BIDV sandbox', endpoint: 'get-list-bank/v1',
      httpStatus: result.status, errorCode: result.data.errorCode,
      bankCount: result.data.listBank.length,
    }, null, 2));
  } catch (error) {
    console.error(error instanceof CheckError ? error.message : 'BIDV check failed. Check local configuration and key files.');
    process.exitCode = 1;
  }
}

if (require.main === module) void main();
module.exports = { SANDBOX_BASE, DEMO_BODY, CheckError, loadConfig, checkBankList };
