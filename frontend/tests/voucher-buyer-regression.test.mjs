import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('a disabled voucher query never reports endless loading and buyer queries use their own key', async () => {
  let config;
  const paths = [];
  const source = readFileSync(new URL('../src/hooks/useCustomerVouchers.ts', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, Date, require: name => {
    if (name === 'react') return { useEffect() {}, useState: fn => [fn(), () => {}] };
    if (name === '@tanstack/react-query') return { useQuery: options => { config = options; return { isLoading: Boolean(options.enabled), isError: false }; }, useQueryClient: () => ({}) };
    if (name === '@/services/api') return { get: async path => { paths.push(path); return []; } };
    return { voucherExpiryState: () => 'active', VOUCHER_SOON_WINDOW_MS: 86400000 };
  } });
  const { useCustomerVouchers } = module.exports;
  assert.equal(useCustomerVouchers(undefined).loading, false);
  assert.equal(config.enabled, false);
  for (const buyer of ['customer', 'kol', 'shop', 'manager', 'admin']) {
    assert.equal(useCustomerVouchers(buyer).loading, true);
    assert.equal(config.enabled, true);
    assert.equal(config.queryKey[1], buyer);
    await config.queryFn({ signal: undefined });
  }
  assert.equal(paths.filter(path => path === '/coupons/available').length, 5);
});
