import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const utility = readFileSync(new URL('../src/utils/checkout-vouchers.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(utility, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const { collectCheckoutVouchers, checkoutVoucherDisabledReason } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('multi-product checkout merges vouchers by ID without repeating store-wide codes', () => {
  const storeWide = { id: 'all-products', code: 'SHOP10' };
  const specific = { id: 'one-product', code: 'SERUM20' };
  assert.deepEqual(collectCheckoutVouchers([[storeWide], [storeWide, specific]]), [storeWide, specific]);
});
test('no matching products produces no discoverable codes', () => {
  assert.deepEqual(collectCheckoutVouchers([[], []]), []);
});
test('minimum order conditions are visible before clicking', () => {
  assert.equal(checkoutVoucherDisabledReason({ minimumOrderAmount: 300000 }, 250000, 21000), 'Chưa đạt giá trị đơn tối thiểu');
  assert.equal(checkoutVoucherDisabledReason({ minimumOrderAmount: 250000 }, 250000, 21000), null);
});
test('shipping codes require a positive shipping fee; goods codes do not', () => {
  assert.equal(checkoutVoucherDisabledReason({ minimumOrderAmount: null, benefitType: 'SHIPPING' }, 250000, 0), 'Cần có phí vận chuyển để dùng mã này');
  assert.equal(checkoutVoucherDisabledReason({ minimumOrderAmount: null, benefitType: 'GOODS' }, 250000, 0), null);
});

const page = readFileSync(new URL('../src/components/checkout/GuestCheckoutModal.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('GuestCheckoutModal.tsx', page, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'chooseCheckoutVoucher') handler = node.initializer;
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(handler);
const compiledHandler = ts.transpileModule(`const handler = ${handler.getText(ast)};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
}).outputText + '\nreturn handler;';

for (const slot of ['SHOP', 'PLATFORM', 'SHIPPING']) {
  test(`checkout ${slot} selection passes the clicked code directly to the matching validator`, async () => {
    const actions = [];
    const record = (name) => (...args) => { actions.push([name, ...args]); };
    const choose = new Function('couponLoading', 'stackedCouponBusy', 'extraVoucherBusy', 'voucherSlot', 'setAutoCouponDismissed', 'setCouponCode', 'handleValidateCoupon', 'setExtraVoucherDismissed', 'setPlatformCouponCode', 'setShippingCouponCode', 'applyStackedCoupon', compiledHandler)(
      false, null, false, () => slot, record('dismiss-shop'), record('shop-code'), record('shop-validate'), record('dismiss-extra'), record('platform-code'), record('shipping-code'), record('stacked-validate'),
    );
    await choose({ code: 'CLICKED_CODE' });
    assert.ok(actions.some((action) => action[0] === (slot === 'SHOP' ? 'shop-validate' : 'stacked-validate')));
    const validation = actions.find((action) => action[0].endsWith('-validate'));
    assert.deepEqual(validation, slot === 'SHOP' ? ['shop-validate', 'CLICKED_CODE'] : ['stacked-validate', slot === 'PLATFORM' ? 'GOODS' : 'SHIPPING', 'CLICKED_CODE']);
  });
}
