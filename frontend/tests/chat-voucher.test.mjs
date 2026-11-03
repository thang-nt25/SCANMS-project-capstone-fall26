import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const output = ts.transpileModule(readFileSync(new URL('../src/utils/chat-voucher.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const { chatVoucherDiscount, chatVoucherHint } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
test('chat clearly identifies shipping vouchers and their checkout slot', () => {
  const coupon = { discountType: 'FIXED_AMOUNT', discountValue: 15000, benefitType: 'SHIPPING', fundingSource: 'PLATFORM_FUNDED' };
  assert.equal(chatVoucherDiscount(coupon), 'Giảm phí vận chuyển 15.000₫');
  assert.match(chatVoucherHint(coupon), /voucher vận chuyển/);
});
test('goods vouchers show the actual value and the matching Shop/platform slot', () => {
  assert.equal(chatVoucherDiscount({ discountType: 'PERCENTAGE', discountValue: 5 }), 'Giảm 5%');
  assert.match(chatVoucherHint({ fundingSource: 'PLATFORM_FUNDED' }), /voucher Sàn/);
  assert.match(chatVoucherHint({ fundingSource: 'SHOP_FUNDED' }), /voucher Shop/);
});
