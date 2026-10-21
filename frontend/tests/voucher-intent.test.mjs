import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/voucher-intent.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const { voucherSlot, voucherProductUrl } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('platform-funded shipping must use the shipping slot, not platform goods', () => {
  assert.equal(voucherSlot({ fundingSource: 'PLATFORM_FUNDED', benefitType: 'SHIPPING' }), 'SHIPPING');
});
test('platform goods and shop goods are routed to separate validation APIs', () => {
  assert.equal(voucherSlot({ fundingSource: 'PLATFORM_FUNDED', benefitType: 'GOODS' }), 'PLATFORM');
  assert.equal(voucherSlot({ fundingSource: 'SHOP_FUNDED', benefitType: 'GOODS' }), 'SHOP');
  assert.equal(voucherSlot({ fundingSource: 'CO_FUNDED', benefitType: 'GOODS' }), 'SHOP');
});
test('legacy coupons without funding metadata retain shop validation', () => {
  assert.equal(voucherSlot({}), 'SHOP');
});
test('product deep link carries normalized voucher without requiring a saved id', () => {
  const url = new URL(voucherProductUrl('product-1', ' deal30 '), 'https://example.test');
  assert.equal(url.pathname, '/products/product-1');
  assert.equal(url.searchParams.get('voucher'), 'DEAL30');
  assert.equal(url.searchParams.has('saved'), false);
});
test('URL encoding prevents a voucher code from injecting other checkout parameters', () => {
  const url = new URL(voucherProductUrl('product-1', 'TEST&checkout=1'), 'https://example.test');
  assert.equal(url.searchParams.get('checkout'), null);
  assert.equal(url.searchParams.get('voucher'), 'TEST&CHECKOUT=1');
});
