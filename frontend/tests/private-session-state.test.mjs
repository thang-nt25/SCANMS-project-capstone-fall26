import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const previousWindow = globalThis.window;
const values = new Map();
const listeners = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key), key: index => [...values.keys()][index] ?? null,
  get length() { return values.size; },
} });
globalThis.window = { addEventListener: (type, callback) => listeners.set(type, callback) };
const load = async name => {
  const source = readFileSync(new URL(`../src/utils/${name}.ts`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
};
const addresses = await load('checkout-address-cache');
const session = await load('private-cache-session');
after(() => {
  if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
  else delete globalThis.localStorage;
  globalThis.window = previousWindow;
});
function login(id) { values.set('user', JSON.stringify({ id })); values.set('token', `token-${id}`); }

test('checkout never imports an unowned address cache or another buyer address', () => {
  values.clear(); login('a');
  values.set('scanms_cached_addresses', JSON.stringify([{ id: 'legacy' }]));
  assert.deepEqual(addresses.readCheckoutAddresses(), []);
  addresses.cacheCheckoutAddresses([{ id: 'address-a' }]);
  login('b'); assert.deepEqual(addresses.readCheckoutAddresses(), []);
  login('a'); assert.equal(addresses.readCheckoutAddresses()[0].id, 'address-a');
  addresses.cacheCheckoutAddresses([]); assert.deepEqual(addresses.readCheckoutAddresses(), []);
});
test('logout clears every address snapshot and tolerates absent storage', () => {
  login('a'); addresses.cacheCheckoutAddresses([{ id: 'a' }]);
  login('b'); addresses.cacheCheckoutAddresses([{ id: 'b' }]);
  addresses.clearCheckoutAddressCaches();
  assert.equal([...values.keys()].some(key => key.startsWith('scanms_addresses_')), false);
});
test('private module snapshots reset on account or assigned Store changes', () => {
  let snapshot = ['previous-account'];
  session.registerPrivateCacheReset(() => { snapshot = []; });
  login('next'); listeners.get('auth-user-updated')(); assert.deepEqual(snapshot, []);
  snapshot = ['same-session']; listeners.get('auth-user-updated')(); assert.deepEqual(snapshot, ['same-session']);
  values.set('current_store_id', 'another-store'); listeners.get('storage')(); assert.deepEqual(snapshot, []);
  snapshot = ['old-role']; values.set('user', JSON.stringify({ id: 'next', role: 'SYSTEM_MANAGER' }));
  listeners.get('auth-user-updated')(); assert.deepEqual(snapshot, []);
});
