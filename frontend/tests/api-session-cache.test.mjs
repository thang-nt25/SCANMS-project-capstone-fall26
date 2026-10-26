import { readFileSync } from 'node:fs';
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import ts from 'typescript';

const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
const { apiCache } = await import(moduleUrl(compile(readFileSync(new URL('../src/utils/api-cache.utils.ts', import.meta.url), 'utf8'))));
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const originalWindow = globalThis.window;
const values = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key) } });
globalThis.window = { dispatchEvent() {} };
globalThis.__sessionTestAxios = axios;
globalThis.__sessionTestCache = apiCache;
const source = readFileSync(new URL('../src/services/api.ts', import.meta.url), 'utf8')
  .replace("import axios from 'axios';", 'const axios = globalThis.__sessionTestAxios;')
  .replace("import { apiCache } from '@/utils/api-cache.utils';", 'const apiCache = globalThis.__sessionTestCache;')
  .replace('import.meta.env.VITE_API_URL', 'undefined');
const { default: api } = await import(moduleUrl(compile(source)));
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
after(() => {
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
  globalThis.window = originalWindow;
  delete globalThis.__sessionTestAxios;
  delete globalThis.__sessionTestCache;
});

test('API cannot return cached private data from another account', async () => {
  apiCache.clear();
  let calls = 0;
  api.defaults.adapter = async config => { calls++; return response(config, { owner: values.get('token') }); };
  values.set('token', 'owner-a');
  assert.deepEqual(await api.get('/kyc/profile'), { owner: 'owner-a' });
  assert.deepEqual(await api.get('/kyc/profile'), { owner: 'owner-a' });
  assert.equal(calls, 1);
  values.set('token', 'owner-b');
  assert.deepEqual(await api.get('/kyc/profile'), { owner: 'owner-b' });
  assert.equal(calls, 2);
});

test('a slow old-session response is cancelled and cannot populate cache', async () => {
  apiCache.clear();
  values.set('token', 'old');
  let finish;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  api.defaults.adapter = config => new Promise(resolve => { finish = () => resolve(response(config, { private: 'old' })); started(); });
  const request = api.get('/kyc/profile');
  await ready;
  values.set('token', 'new');
  finish();
  await assert.rejects(request, error => axios.isCancel(error));
  assert.equal(apiCache.get('/kyc/profile'), null);
});

test('a GET started before an order mutation cannot repopulate stale stock', async () => {
  apiCache.clear();
  let finish;
  let started;
  const ready = new Promise(resolve => { started = resolve; });
  api.defaults.adapter = config => new Promise(resolve => { finish = () => resolve(response(config, { stock: 10 })); started(); });
  const request = api.get('/products');
  await ready;
  apiCache.invalidateAffected('/orders');
  finish();
  assert.deepEqual(await request, { stock: 10 });
  assert.equal(apiCache.get('/products'), null);
});

test('abort identity and network error codes survive normalization', async () => {
  api.defaults.adapter = async config => { throw new axios.CanceledError('cancelled', config); };
  await assert.rejects(api.get('/products'), error => axios.isCancel(error));
  api.defaults.adapter = async config => { throw new axios.AxiosError('Offline', 'ERR_NETWORK', config); };
  await assert.rejects(api.post('/coupons/validate', {}), error => error.code === 'ERR_NETWORK');
});
