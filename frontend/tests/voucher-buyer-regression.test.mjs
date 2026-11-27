import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const readSource = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('a variant must be both discounted and in stock to qualify for the banner', () => {
  const { outputText } = ts.transpileModule(readSource('utils/marketplace.utils.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  new Function('exports', outputText)(exports);
  const { hasCatalogDiscount } = exports;
  const product = {
    price: 100,
    origPrice: 100,
    stockQuantity: 2,
    variants: [{ price: '100', listPrice: '150', stockQuantity: 0 }, { price: '150', listPrice: '150', stockQuantity: 2 }],
  };
  assert.equal(hasCatalogDiscount(product), true);
  assert.equal(hasCatalogDiscount(product, true), false);
  product.variants[0].stockQuantity = 1;
  assert.equal(hasCatalogDiscount(product, true), true);
  assert.equal(hasCatalogDiscount({ price: 100, origPrice: 150, stockQuantity: 1 }, true), true);
});

test('marketplace promotes discounted products and redirects the former public voucher page', () => {
  const discountPath = '/search?discount=true&inStock=true';
  const hero = readSource('components/marketplace/MarketplaceHero.tsx');
  const routes = readSource('routes/AppRoutes.tsx');
  assert.ok(hero.includes("to={hasDiscounts ? discountedCatalogPath : '/search'}"));
  assert.ok(routes.includes(`path="/offers" element={<Navigate to="${discountPath}" replace />}`));
  assert.doesNotMatch(hero, /to="\/offers"/);
});

test('buyer voucher screens do not fetch a catalog of KOC codes', () => {
  assert.doesNotMatch(readSource('pages/customer/CustomerVouchersTab.tsx'), /useCustomerVouchers|\/coupons\/available/);
  assert.doesNotMatch(readSource('pages/public/ShopPage.tsx'), /usePublicVoucherDiscovery|\/coupons\/available/);
});
