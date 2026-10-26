import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/api-cache.utils.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { apiCache } = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`);
test('financial amounts, payout state, batch history and expiring bill URLs are always fetched fresh', () => {
  for (const path of ['/wallets/me', '/wallets/withdrawals', '/payouts/id', '/stores/shop/payouts',
    '/stores/shop/payouts/id/bill', '/stores/shop/payouts/batches']) assert.equal(apiCache.isCacheable(path), false);
  assert.equal(apiCache.isCacheable('/products'), true);
});
test('authenticated simulation actions invalidate cached order lists, not only the tracking timeline', () => {
  assert.equal(apiCache.getAffectedDomain('/shipping/ghn/simulation/id/complete'), '/orders');
  assert.equal(apiCache.getAffectedDomain('/shipping/ghn/simulation/id/start'), '/orders');
  apiCache.set('/orders/my-store', {}, { status: 'SHIPPING' });
  apiCache.invalidate(apiCache.getAffectedDomain('/shipping/ghn/simulation/id/complete'));
  assert.equal(apiCache.get('/orders/my-store', {}), null);
});

test('switching accounts and signing out clears private payloads; same session preserves catalogue', () => {
  apiCache.setSession('account-a');
  apiCache.set('/kyc/profile', undefined, { owner: 'a' });
  apiCache.setSession('account-b');
  assert.equal(apiCache.get('/kyc/profile'), null);
  apiCache.set('/products', undefined, ['product']);
  apiCache.setSession('account-b');
  assert.deepEqual(apiCache.get('/products'), ['product']);
  apiCache.setSession(null);
  assert.equal(apiCache.get('/products'), null);
});

test('orders, messages and voucher availability are never reused from cache', () => {
  for (const path of ['/orders/me', '/chat/conversations', '/coupons/available', '/coupons/saved/details'])
    assert.equal(apiCache.isCacheable(path), false);
});

test('catalogue and has() expire at the exact TTL boundary', () => {
  const original = Date.now;
  let now = 1000;
  Date.now = () => now;
  try {
    apiCache.clear();
    apiCache.set('/products', undefined, ['old']);
    now += 29999;
    assert.equal(apiCache.has('/products'), true);
    now++;
    assert.equal(apiCache.has('/products'), false);
  } finally { Date.now = original; apiCache.clear(); }
});

test('order and return mutations invalidate stock, shops and reports with a new revision', () => {
  for (const action of ['/orders', '/returns/id/approve']) {
    const revision = apiCache.revision;
    for (const path of ['/products', '/stores/public/id/sora', '/analytics/me']) apiCache.set(path, undefined, {});
    apiCache.invalidateAffected(action);
    assert.ok(apiCache.revision > revision);
    for (const path of ['/products', '/stores/public/id/sora', '/analytics/me']) assert.equal(apiCache.get(path), null);
  }
});
