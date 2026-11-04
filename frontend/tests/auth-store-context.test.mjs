import { readFileSync } from 'node:fs';
import test, { after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const values = new Map();
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalWindow = globalThis.window;
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
} });
globalThis.window = { dispatchEvent() {} };
let user;
globalThis.__authStoreApi = {
  post: async () => ({ data: { accessToken: 'fixture-token', user } }),
  get: async () => ({ data: user }),
};
const source = readFileSync(new URL('../src/services/auth.service.ts', import.meta.url), 'utf8')
  .replace("import api from './api';", 'const api = globalThis.__authStoreApi;')
  .replace("import { productLoginUrl } from '../utils/login-return';", "const productLoginUrl = () => '/login';");
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { authService } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));

beforeEach(() => { values.clear(); values.set('current_store_id', 'previous-shop'); });
after(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
  globalThis.window = originalWindow;
  delete globalThis.__authStoreApi;
});

test('password login uses the assigned Shop for a manager who owns no stores', async () => {
  user = { id: 'staff', role: 'SHOP_MANAGER', storeId: 'assigned-shop', stores: [] };
  await authService.login('staff@example.test', 'fixture-password');
  assert.equal(values.get('current_store_id'), 'assigned-shop');
});

test('Google login uses the same assignment contract', async () => {
  user = { id: 'staff', role: 'SHOP_MANAGER', storeId: 'assigned-shop', stores: [] };
  await authService.googleLogin('fixture-google-token', 'SHOP_MANAGER');
  assert.equal(values.get('current_store_id'), 'assigned-shop');
});

test('profile refresh clears a stale Shop after assignment is revoked', async () => {
  user = { id: 'staff', role: 'SHOP_MANAGER', storeId: null, stores: [] };
  values.set('token', 'fixture-token');
  await authService.getMe();
  assert.equal(values.has('current_store_id'), false);
});

test('owners keep their Shop when no explicit assignment exists', async () => {
  user = { id: 'owner', role: 'SHOP_MANAGER', stores: [{ id: 'owned-shop' }] };
  await authService.login('owner@example.test', 'fixture-password');
  assert.equal(values.get('current_store_id'), 'owned-shop');
});

test('switching to Customer never keeps a previous manager Shop', async () => {
  user = { id: 'customer', role: 'CUSTOMER', storeId: 'unexpected-stale-value', stores: [] };
  await authService.login('customer@example.test', 'fixture-password');
  assert.equal(values.has('current_store_id'), false);
});
