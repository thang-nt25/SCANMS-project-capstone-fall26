import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/voucher-intent.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const { voucherSlot, voucherProductUrl } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('retired shipping discounts cannot select a checkout slot', () => {
  assert.equal(voucherSlot({ fundingSource: 'PLATFORM_FUNDED', benefitType: 'SHIPPING' }), null);
});
test('only Shop-funded KOL goods codes can select validation', () => {
  assert.equal(voucherSlot({ fundingSource: 'PLATFORM_FUNDED', benefitType: 'GOODS' }), null);
  assert.equal(voucherSlot({ fundingSource: 'SHOP_FUNDED', benefitType: 'GOODS' }), 'SHOP');
  assert.equal(voucherSlot({ fundingSource: 'CO_FUNDED', benefitType: 'GOODS' }), null);
});
test('legacy coupons without funding metadata retain shop validation', () => {
  assert.equal(voucherSlot({}), 'SHOP');
});
test('product deep link never preselects a coupon or saves it', () => {
  const url = new URL(voucherProductUrl('product-1', ' deal30 '), 'https://example.test');
  assert.equal(url.pathname, '/products/product-1');
  assert.equal(url.searchParams.get('voucher'), null);
  assert.equal(url.searchParams.has('saved'), false);
});
test('URL encoding prevents a voucher code from injecting other checkout parameters', () => {
  const url = new URL(voucherProductUrl('product-1', 'TEST&checkout=1'), 'https://example.test');
  assert.equal(url.searchParams.get('checkout'), null);
  assert.equal(url.searchParams.get('voucher'), null);
});
