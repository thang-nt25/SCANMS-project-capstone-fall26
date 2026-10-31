import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('same-account name refresh notifies UI once and ignores an obsolete session', async () => {
  const oldStorage = globalThis.localStorage, oldWindow = globalThis.window;
  const values = new Map([['token', 'current'], ['user', JSON.stringify({ id: 'customer', fullName: 'TEST FLOW 5 - CUSTOMER' })]]);
  const events = [];
  let options;
  let next = { id: 'customer', fullName: 'Nguyễn Minh An', role: 'CUSTOMER' };
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  globalThis.window = { dispatchEvent: event => events.push(event.type) };
  globalThis.__profileRefreshApi = { get: async (_url, config) => { options = config; return { data: next }; } };
  try {
    const source = readFileSync(new URL('../src/services/auth.service.ts', import.meta.url), 'utf8')
      .replace("import api from './api';", 'const api = globalThis.__profileRefreshApi;')
      .replace("import { productLoginUrl } from '../utils/login-return';", 'const productLoginUrl = value => value;');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const { authService } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
    await authService.getMe();
    assert.equal(authService.getCurrentUser().fullName, 'Nguyễn Minh An');
    assert.deepEqual(events, ['auth-user-updated']);
    assert.equal(options.headers['x-skip-cache'], 'true');
    await authService.getMe();
    assert.equal(events.length, 1);
    globalThis.__profileRefreshApi.get = async () => { values.set('token', 'new-session'); return { data: { ...next, fullName: 'Obsolete response' } }; };
    await assert.rejects(authService.getMe(), /Phiên đăng nhập đã thay đổi/);
    assert.equal(authService.getCurrentUser().fullName, 'Nguyễn Minh An');
  } finally {
    globalThis.localStorage = oldStorage; globalThis.window = oldWindow;
    delete globalThis.__profileRefreshApi;
  }
});
