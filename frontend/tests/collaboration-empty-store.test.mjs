import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/collaborator/ShopCollaborationPage.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('ShopCollaborationPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const effects = [];
function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(file) === 'useEffect') effects.push(node);
  ts.forEachChild(node, visit);
}
visit(file);
const compile = (text) => ts.transpileModule(`const value = ${text};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
}).outputText + '\nreturn value;';

test('effect dependencies can render before any store is selected', () => {
  let checked = 0;
  for (const effect of effects) {
    const dependencies = effect.arguments[1];
    if (!dependencies || !ts.isArrayLiteralExpression(dependencies)) continue;
    for (const dependency of dependencies.elements) {
      const text = dependency.getText(file);
      if (!text.includes('selectedStore')) continue;
      const evaluate = new Function('selectedStore', compile(text));
      assert.doesNotThrow(() => evaluate(null));
      assert.doesNotThrow(() => evaluate(undefined));
      checked++;
    }
  }
  assert.ok(checked >= 2, 'exercise store-dependent hooks from the real component');
});

const polling = effects.find((effect) => effect.arguments[0].getText(file).includes('productLoadSequence.current++'));
assert.ok(polling, 'find the product polling effect');
const createEffect = new Function('selectedStore', 'activeTab', 'loadStoreProducts', 'document', 'window', 'productLoadSequence', compile(polling.arguments[0].getText(file)));

test('an empty store installs no polling or focus listener', () => {
  const calls = [];
  const window = { setInterval: () => calls.push('timer'), addEventListener: () => calls.push('listener') };
  const effect = createEffect(null, 'products', () => calls.push('load'), { hidden: false }, window, { current: 0 });
  assert.equal(effect(), undefined);
  assert.deepEqual(calls, []);
});

test('polling captures the chosen store ID and cleans up on store changes', () => {
  const loads = [];
  const listeners = new Map();
  const store = { id: 'shop-a' };
  const sequence = { current: 0 };
  let tick;
  let cleared = false;
  const window = {
    setInterval: (callback) => { tick = callback; return 1; },
    clearInterval: () => { cleared = true; },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => listeners.delete(name),
  };
  const document = { hidden: false, addEventListener: window.addEventListener, removeEventListener: window.removeEventListener };
  const cleanup = createEffect(store, 'products', (...args) => loads.push(args), document, window, sequence)();
  store.id = 'shop-b';
  tick();
  assert.deepEqual(loads, [['shop-a', true]]);
  cleanup();
  assert.equal(cleared, true);
  assert.equal(listeners.size, 0);
  assert.equal(sequence.current, 1);
});
