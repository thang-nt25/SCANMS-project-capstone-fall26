import { readFileSync } from 'node:fs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const memory = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => memory.get(key) ?? null } });
after(() => { if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage); else delete globalThis.localStorage; });
const source = readFileSync(new URL('../src/utils/cart-storage.utils.ts', import.meta.url), 'utf8')
  .replace("import { getSafeProductImageUrl } from '@/utils/marketplace.utils';", "const getSafeProductImageUrl = value => typeof value === 'string' ? value : '/fallback.png';");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { loadCartFromStorage, loadSelectedFromStorage, getCartStorageKey, getSelectedStorageKey } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const variantId = '2f67001b-09a5-5958-85fd-5f401831c871';
const item = { cartItemId: 'product_base', productId: 'product', title: 'Serum', price: 100000, quantity: 2, stockQuantity: 5,
  isActive: true, store: { id: 'sora', name: 'Sora Skin' } };

test('one corrupt row cannot crash the page or discard valid products', () => {
  memory.set(getCartStorageKey(null), JSON.stringify([null, {}, item, { ...item, store: null }, { ...item, quantity: -1 }, { ...item, price: 'NaN' }]));
  const loaded = loadCartFromStorage(null);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].quantity, 2);
  assert.equal(loaded[0].imageUrl, '/fallback.png');
});

test('malformed variant snapshots do not empty the whole basket', () => {
  memory.set(getCartStorageKey('a'), JSON.stringify([{ ...item, variantId: 'legacy', availableVariants: [null, false, { id: variantId, sku: 7, name: 8, price: 'NaN', stockQuantity: -10 }] }]));
  const [loaded] = loadCartFromStorage('a');
  assert.equal(loaded.variantId, variantId);
  assert.equal(loaded.price, 100000);
  assert.equal(loaded.stockQuantity, 5);
});

test('out-of-stock products remain visible for correction', () => {
  memory.set(getCartStorageKey('zero'), JSON.stringify([{ ...item, stockQuantity: 0 }]));
  assert.equal(loadCartFromStorage('zero')[0].stockQuantity, 0);
});

test('selected IDs are strings, unique and non-empty', () => {
  memory.set(getSelectedStorageKey('a'), JSON.stringify([null, {}, 2, '', 'product_base', 'product_base']));
  assert.deepEqual(loadSelectedFromStorage('a'), ['product_base']);
});

test('invalid JSON is recoverable and account baskets remain isolated', () => {
  memory.set(getCartStorageKey('broken'), '{');
  memory.set(getCartStorageKey('b'), JSON.stringify([{ ...item, quantity: 3 }]));
  assert.deepEqual(loadCartFromStorage('broken'), []);
  assert.equal(loadCartFromStorage('b')[0].quantity, 3);
  assert.equal(loadCartFromStorage(null)[0].quantity, 2);
});
