import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const output = ts.transpileModule(readFileSync(new URL('../src/utils/chat-voucher.ts', import.meta.url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const { chatVoucherDiscount, chatVoucherHint, isRetiredChatVoucher } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
test('historical shipping vouchers are disabled rather than routed to checkout', () => {
  const coupon = { discountType: 'FIXED_AMOUNT', discountValue: 15000, benefitType: 'SHIPPING', fundingSource: 'PLATFORM_FUNDED' };
  assert.equal(chatVoucherDiscount(coupon), 'Giảm phí vận chuyển 15.000₫');
  assert.equal(isRetiredChatVoucher(coupon), true);
  assert.match(chatVoucherHint(coupon), /ngừng hỗ trợ/);
});
test('only KOL goods codes support copying and manual input without inventory', () => {
  assert.equal(chatVoucherDiscount({ discountType: 'PERCENTAGE', discountValue: 5 }), 'Giảm 5%');
  for (const fundingSource of ['PLATFORM_FUNDED', 'CO_FUNDED']) {
    assert.equal(isRetiredChatVoucher({ fundingSource }), true);
    assert.match(chatVoucherHint({ fundingSource }), /ngừng hỗ trợ/);
  }
  assert.equal(isRetiredChatVoucher({ benefitType: 'GOODS', fundingSource: 'SHOP_FUNDED' }), false);
  assert.match(chatVoucherHint({ fundingSource: 'SHOP_FUNDED' }), /tự nhập/);
  assert.match(chatVoucherHint({ fundingSource: 'SHOP_FUNDED' }), /không được lưu/);
});
