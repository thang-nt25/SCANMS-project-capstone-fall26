import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/demo-login.ts', import.meta.url), 'utf8');
async function load(env) {
  const output = ts.transpileModule(source.replaceAll('import.meta.env', JSON.stringify(env)), {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}
const roles = ['customer', 'kol', 'shop', 'manager', 'admin'];
const enabled = { DEV: true, VITE_ENABLE_DEMO_LOGIN: 'true' };

test('each demo role uses its own complete environment credential pair', async () => {
  const env = { ...enabled };
  for (const role of roles) {
    env[`VITE_DEMO_${role.toUpperCase()}_IDENTIFIER`] = ` ${role}@example.test `;
    env[`VITE_DEMO_${role.toUpperCase()}_PASSWORD`] = `fixture-${role}`;
  }
  const { getDemoLogin } = await load(env);
  for (const role of roles) {
    assert.deepEqual(getDemoLogin(role), { identifier: `${role}@example.test`, password: `fixture-${role}` });
  }
});

test('autofill requires the explicit flag and a development build', async () => {
  for (const mode of [{ DEV: false, VITE_ENABLE_DEMO_LOGIN: 'true' }, { DEV: true }, { DEV: true, VITE_ENABLE_DEMO_LOGIN: 'false' }]) {
    const { getDemoLogin } = await load({ ...mode, VITE_DEMO_ADMIN_IDENTIFIER: 'admin@example.test', VITE_DEMO_ADMIN_PASSWORD: 'fixture' });
    assert.equal(getDemoLogin('admin'), null);
  }
});

test('a configured identifier can be filled while the user enters the current password manually', async () => {
  const { getDemoLogin } = await load({ ...enabled, VITE_DEMO_SHOP_IDENTIFIER: 'shop@example.test' });
  assert.deepEqual(getDemoLogin('shop'), { identifier: 'shop@example.test', password: '' });
});

test('missing identifiers never fall back to hardcoded credentials', async () => {
  for (const pair of [{}, { VITE_DEMO_SHOP_PASSWORD: 'fixture' }, { VITE_DEMO_SHOP_IDENTIFIER: ' ', VITE_DEMO_SHOP_PASSWORD: 'fixture' }]) {
    const { getDemoLogin } = await load({ ...enabled, ...pair });
    assert.equal(getDemoLogin('shop'), null);
  }
});
