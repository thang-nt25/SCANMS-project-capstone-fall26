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

const validationSource = readFileSync(new URL('../src/utils/checkout-voucher-validation.ts', import.meta.url), 'utf8');
const validationCode = ts.transpileModule(validationSource, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const { validateCheckoutVoucher } = await import(`data:text/javascript;base64,${Buffer.from(validationCode).toString('base64')}`);
const groups = [
  { store: { id: 'shop-a', name: 'Shop A' }, subtotal: 100000, items: [{ productId: 'a', quantity: 1, price: 100000 }] },
  { store: { id: 'shop-b', name: 'Shop B' }, subtotal: 200000, items: [{ productId: 'b', variantId: 'variant-b', quantity: 2, price: 100000 }] },
];
const options = { code: ' click10 ', groups, shippingFees: { 'shop-a': 20000, 'shop-b': 30000 }, shopDiscounts: { 'shop-b': { code: 'SHOP20', discountAmount: 20000 } } };

for (const slot of ['SHOP', 'PLATFORM', 'SHIPPING']) {
  test(`clicked ${slot} code is validated for its own store, without client price estimates`, async () => {
    const calls = [];
    const result = await validateCheckoutVoucher(async (path, body) => {
      calls.push({ path, body }); return { data: { valid: true, code: body.code, discountAmount: 10000 } };
    }, { ...options, slot, storeId: 'shop-b' });
    assert.equal(result.storeId, 'shop-b');
    assert.equal(result.discountAmount, 10000);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.code, 'CLICK10');
    assert.equal(calls[0].body.storeId, 'shop-b');
    if (slot === 'SHOP') {
      assert.equal(calls[0].path, '/coupons/validate');
      assert.deepEqual(calls[0].body.items, [{ productId: 'b', variantId: 'variant-b', quantity: 2 }]);
    } else {
      assert.equal(calls[0].path, '/coupons/preview-stacked');
      assert.equal(calls[0].body.goodsSubtotal, 200000);
      assert.equal(calls[0].body.shippingFee, 30000);
      assert.equal(calls[0].body.shopDiscount, 20000);
      assert.equal(calls[0].body.shopCouponCode, 'SHOP20');
      assert.equal(calls[0].body.benefitType, slot === 'SHIPPING' ? 'SHIPPING' : 'GOODS');
    }
  });
}

test('manual code searches matching stores but does not save or claim it', async () => {
  const calls = [];
  const result = await validateCheckoutVoucher(async (path, body) => {
    calls.push(path);
    if (body.storeId === 'shop-a') throw Object.assign(new Error('Sai Shop'), { status: 400 });
    return { valid: true, discountAmount: 10000 };
  }, options);
  assert.equal(result.storeId, 'shop-b');
  assert.deepEqual(calls, ['/coupons/validate', '/coupons/validate']);
});

for (const error of [
  Object.assign(new Error('Hết phiên'), { status: 401 }),
  Object.assign(new Error('Quá nhiều yêu cầu'), { status: 429 }),
  Object.assign(new Error('Máy chủ lỗi'), { status: 503 }),
  Object.assign(new Error('Mất mạng'), { code: 'ERR_NETWORK' }),
  Object.assign(new Error('Quá thời gian'), { code: 'ECONNABORTED' }),
]) {
  test(`does not retry every shop/slot after ${error.message}`, async () => {
    let calls = 0;
    await assert.rejects(validateCheckoutVoucher(async () => { calls++; throw error; }, options), error);
    assert.equal(calls, 1);
  });
}

for (const amount of [0, -1, NaN, Infinity, 300001]) {
  test(`rejects unusable backend discount ${amount}`, async () => {
    await assert.rejects(validateCheckoutVoucher(async () => ({ valid: true, discountAmount: amount }), { ...options, slot: 'SHOP', storeId: 'shop-b' }));
  });
}

test('empty checkout and stale shop selection never call the API', async () => {
  let calls = 0;
  const post = async () => { calls++; };
  await assert.rejects(validateCheckoutVoucher(post, { ...options, groups: [] }));
  await assert.rejects(validateCheckoutVoucher(post, { ...options, storeId: 'removed-shop' }));
  assert.equal(calls, 0);
});

test('expired and exhausted vouchers are disabled before clicking', () => {
  const now = Date.parse('2026-10-26T00:00:00Z');
  assert.equal(checkoutVoucherDisabledReason({ minimumOrderAmount: 0, expiresAt: '2026-10-26T00:00:00Z' }, 100000, 20000, now), 'Voucher đã hết hạn');
  assert.equal(checkoutVoucherDisabledReason({ minimumOrderAmount: 0, remainingUses: 0 }, 100000, 20000, now), 'Voucher đã hết lượt sử dụng');
  assert.equal(checkoutVoucherDisabledReason({ minimumOrderAmount: 0, remainingUses: null }, 100000, 20000, now), null);
});
