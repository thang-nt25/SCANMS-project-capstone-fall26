const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
require('ts-node').register({ transpileOnly: true, project: require('node:path').join(__dirname, '../tsconfig.json') });
const { BIDV_SANDBOX_BASE, callBidvSandbox, bidvRequestDate, summarizeBidvResponse } = require('../src/modules/payouts/bidv-sandbox.protocol.ts');
const keys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const config = { baseUrl: BIDV_SANDBOX_BASE, clientId: 'test-client', clientSecret: 'test-secret', channel: 'test-channel',
  privateKey: keys.privateKey, certificate: { publicKey: keys.publicKey, raw: Buffer.from('test-cert') }, symmetricKey: crypto.randomBytes(32) };
const correlation = { idempotencyKey: crypto.randomUUID(), interactionId: crypto.randomUUID() };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const token = () => json({ access_token: 'test-token', token_type: 'Bearer' });

test('transfer uses official endpoint, fresh OAuth, detached JWS over exact JWE and caller correlation', async () => {
  let calls = 0;
  const payload = { serviceId: '000003', amount: '1864800', transDate: '261102' };
  const result = await callBidvSandbox(config, 'transfer', payload, correlation, async (url, options) => {
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    if (++calls === 1) { assert.match(url, /sandbox\/openapi\/oauth2\/token$/); return token(); }
    assert.equal(url, `${BIDV_SANDBOX_BASE}/transfer-247/v1`);
    assert.equal(options.headers['X-Idempotency-Key'], correlation.idempotencyKey);
    assert.equal(options.headers['X-API-Interaction-ID'], correlation.interactionId);
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    const [header, detached, signature] = options.headers['X-JWS-Signature'].split('.');
    assert.equal(detached, '');
    assert.ok(crypto.verify('RSA-SHA256', Buffer.from(`${header}.${Buffer.from(options.body).toString('base64url')}`), keys.publicKey, Buffer.from(signature, 'base64url')));
    const { generalDecrypt } = await import('jose');
    const decoded = await generalDecrypt(JSON.parse(options.body), config.symmetricKey);
    assert.deepEqual(JSON.parse(Buffer.from(decoded.plaintext).toString()), payload);
    return json({ errorCode: '000', errorDesc: 'SUCCESS', access_token: 'do-not-return', extraInfo1: 'do-not-return' });
  });
  assert.equal(calls, 2);
  assert.equal(result.errorCode, '000');
  assert.equal('status' in result, false);
  assert.equal(JSON.stringify(result).includes('do-not-return'), false);
});

test('inquiry uses common/inquiry, preserves original date and decrypts an authenticated JWE response', async () => {
  let calls = 0;
  const payload = { rootRequestId: correlation.idempotencyKey, rootRequestDate: '261101' };
  const result = await callBidvSandbox(config, 'inquiry', payload, correlation, async (url, options) => {
    if (++calls === 1) return token();
    assert.equal(url, 'https://openapi.bidv.com.vn/bidv/sandbox/open-banking/paygate/common/inquiry/v1');
    const { generalDecrypt, GeneralEncrypt } = await import('jose');
    const decoded = await generalDecrypt(JSON.parse(options.body), config.symmetricKey);
    assert.deepEqual(JSON.parse(Buffer.from(decoded.plaintext).toString()), payload);
    const encrypted = await new GeneralEncrypt(Buffer.from(JSON.stringify({ errorCode: '000', errorDesc: 'SUCCESS',
      list: `[${correlation.idempotencyKey}|1864800|000|261102|TEST-BIDVID]` })))
      .setProtectedHeader({ alg: 'A256KW', enc: 'A128GCM' }).addRecipient(config.symmetricKey).encrypt();
    return json(encrypted);
  });
  assert.equal(result.listValid, true);
  assert.equal(result.transactions[0].bidvId, 'TEST-BIDVID');
});

test('untrusted and production URLs and mismatched certificate fail before network access', async () => {
  for (const baseUrl of ['https://example.com', BIDV_SANDBOX_BASE.replace('/sandbox/', '/production/')]) {
    await assert.rejects(callBidvSandbox({ ...config, baseUrl }, 'transfer', {}, correlation, () => assert.fail('network')), /CONFIG/);
  }
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  await assert.rejects(callBidvSandbox({ ...config, certificate: { ...config.certificate, publicKey: other.publicKey } }, 'transfer', {}, correlation, () => assert.fail('network')), /CONFIG/);
});

test('OAuth errors and network uncertainty never retry or leak reflected secrets', async () => {
  let calls = 0;
  await assert.rejects(callBidvSandbox(config, 'transfer', {}, correlation, async () => { calls++; return json({ error: 'test-secret' }, 401); }), /OAUTH HTTP 401/);
  assert.equal(calls, 1);
  calls = 0;
  await assert.rejects(callBidvSandbox(config, 'transfer', {}, correlation, async () => {
    if (++calls === 1) return token();
    throw new Error('test-token test-secret');
  }), error => error.stage === 'BUSINESS' && !/test-token|test-secret/.test(error.message));
  assert.equal(calls, 2);
});

test('unknown schemas, invalid rows and credential reflections are not trusted', () => {
  for (const list of ['x|10|000', '[x|10|000|date|ref]', '[x|NaN|000|261102|ref]', '[x|10|000|261102|ref|extra]']) {
    assert.equal(summarizeBidvResponse({ list }, 200).listValid, false);
  }
  const result = summarizeBidvResponse({ errorCode: 'test-secret', errorDesc: 'test-secret', list: '[x|10|000|261102|test-secret]' }, 200, ['test-secret']);
  assert.equal(result.errorCode, null);
  assert.equal(result.errorDesc, null);
  assert.equal(result.listValid, false);
});

test('transaction dates use Vietnam time including midnight boundary', () => {
  assert.equal(bidvRequestDate(new Date('2026-11-01T16:59:59Z')), '261101');
  assert.equal(bidvRequestDate(new Date('2026-11-01T17:00:00Z')), '261102');
});
