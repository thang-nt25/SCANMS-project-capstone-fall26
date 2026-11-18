import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/public-url.ts', import.meta.url), 'utf8')
  .replace('import.meta.env.VITE_PUBLIC_APP_URL', 'undefined');
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText, { module, exports: module.exports, URL });
const { publicOrigin, publicWebsiteUrl, publicShareUrl } = module.exports;
test('missing, invalid and local configuration use the purchased public domain', () => {
  for (const value of [undefined, '', 'invalid', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://[::1]:5173', 'javascript:alert(1)'])
    assert.equal(publicOrigin(value), 'https://scanms.io.vn');
  assert.equal(publicOrigin('https://www.scanms.io.vn/'), 'https://www.scanms.io.vn');
});
test('historical local links retain tracking query and hash on the public domain', () => {
  assert.equal(publicShareUrl('http://localhost:5173/r/abc?via=qr&utm_source=tiktok#details'), 'https://scanms.io.vn/r/abc?via=qr&utm_source=tiktok#details');
  assert.equal(publicWebsiteUrl('/shop/sora'), 'https://scanms.io.vn/shop/sora');
});
test('third party destinations stay unchanged', () => {
  assert.equal(publicShareUrl('https://www.youtube.com/watch?v=abc'), 'https://www.youtube.com/watch?v=abc');
});
