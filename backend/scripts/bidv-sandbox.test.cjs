const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { SANDBOX_BASE, DEMO_BODY, checkBankList } = require('./bidv-sandbox.cjs');

const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
// A public-key stub isolates HTTP/JOSE tests from real certificates and credentials.
const config = {
  baseUrl: SANDBOX_BASE, clientId: 'test-client', clientSecret: 'test-secret', channel: 'test-app',
  privateKey: keys.privateKey, certificate: { publicKey: keys.publicKey, raw: Buffer.from('test-certificate') },
  symmetricKey: crypto.randomBytes(32),
};
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const token = () => response({ access_token: 'test-token', token_type: 'Bearer', scope: 'ewallet' });

test('calls only OAuth and bank list; signs the exact encrypted body sent over HTTP', async () => {
  let calls = 0;
  const result = await checkBankList(config, async (url, request) => {
    calls++;
    assert.equal(request.redirect, 'error');
    assert.equal(request.method, 'POST');
    assert.ok(request.signal instanceof AbortSignal);
    if (calls === 1) {
      assert.equal(url, 'https://openapi.bidv.com.vn/bidv/sandbox/openapi/oauth2/token');
      assert.equal(request.body.get('grant_type'), 'client_credentials');
      assert.equal(request.body.get('scope'), 'ewallet');
      assert.equal(request.headers.Authorization, `Basic ${Buffer.from('test-client:test-secret').toString('base64')}`);
      return token();
    }
    assert.equal(url, `${SANDBOX_BASE}/get-list-bank/v1`);
    assert.equal(request.headers.Authorization, 'Bearer test-token');
    assert.equal(request.headers.Channel, 'test-app');
    assert.equal(request.headers['X-Client-Certificate'], config.certificate.raw.toString('base64'));
    const [header, detachedPayload, signature] = request.headers['X-JWS-Signature'].split('.');
    assert.equal(detachedPayload, '');
    const verify = body => crypto.verify('RSA-SHA256', Buffer.from(`${header}.${Buffer.from(body).toString('base64url')}`), keys.publicKey, Buffer.from(signature, 'base64url'));
    assert.equal(verify(request.body), true);
    assert.equal(verify(request.body + ' '), false);
    const envelope = JSON.parse(request.body);
    assert.deepEqual(envelope.recipients[0].header, {});
    const { generalDecrypt } = await import('jose');
    const decrypted = await generalDecrypt(envelope, config.symmetricKey);
    assert.deepEqual(JSON.parse(Buffer.from(decrypted.plaintext).toString()), DEMO_BODY);
    // The plaintext must be a JSON object, not a JSON string containing another JSON document.
    assert.equal(decrypted.protectedHeader.alg, 'A256KW');
    assert.equal(decrypted.protectedHeader.enc, 'A128GCM');
    return response({ errorCode: '000', listBank: [{ bankName: 'Sandbox bank' }] });
  });
  assert.equal(calls, 2);
  assert.equal(result.data.listBank.length, 1);
});

test('rejects an untrusted or production base URL before any network request', async () => {
  for (const baseUrl of ['https://example.org', SANDBOX_BASE + '?redirect=1', SANDBOX_BASE.replace('/sandbox/', '/production/')]) {
    await assert.rejects(checkBankList({ ...config, baseUrl }, () => assert.fail('Must not send credentials')), /Only the official BIDV sandbox/);
  }
});

test('rejects a signature/certificate mismatch before requesting a token', async () => {
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  await assert.rejects(checkBankList({ ...config, certificate: { ...config.certificate, publicKey: other.publicKey } }, () => assert.fail('Must not call HTTP')), /does not match/);
});

test('does not call business API or expose response contents after an OAuth error', async () => {
  let calls = 0;
  await assert.rejects(checkBankList(config, async () => {
    calls++;
    return response({ error: 'test-secret' }, 401);
  }), { message: 'BIDV OAuth failed (HTTP 401).' });
  assert.equal(calls, 1);
});

test('does not mistake an HTTP 200 business error for success', async () => {
  let calls = 0;
  await assert.rejects(checkBankList(config, async () => ++calls === 1 ? token() : response({ errorCode: '999', errorDesc: 'test-secret' })), /did not report business success/);
});

test('omits sensitive raw network error messages', async () => {
  await assert.rejects(checkBankList(config, async () => { throw new Error('test-secret test-token'); }), {
    message: 'BIDV OAuth failed: connection, redirect, timeout, or invalid JSON response.',
  });
});
