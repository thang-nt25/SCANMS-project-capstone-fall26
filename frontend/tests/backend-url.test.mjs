import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/backend-url.ts', import.meta.url), 'utf8').split('export const backendUrls =')[0];
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { resolveBackendUrls } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
test('Android/LAN dev uses same-origin proxy instead of device localhost', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    assert.deepEqual(resolveBackendUrls(`http://${host}:3000/api`, `http://${host}:3000`, true), { api: '/api', socket: '' });
  }
});
test('explicit deployed endpoints remain intact and missing endpoints use same-origin', () => {
  assert.deepEqual(resolveBackendUrls('https://api.scanms.vn/api/', 'https://socket.scanms.vn/', true), { api: 'https://api.scanms.vn/api', socket: 'https://socket.scanms.vn' });
  assert.deepEqual(resolveBackendUrls('https://api.scanms.vn/api', undefined, false), { api: 'https://api.scanms.vn/api', socket: 'https://api.scanms.vn' });
  assert.deepEqual(resolveBackendUrls(undefined, undefined, false), { api: '/api', socket: '' });
});
