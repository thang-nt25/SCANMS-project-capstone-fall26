import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
const require = createRequire(import.meta.url);

test('an already open Select transfers focus on ArrowDown/ArrowUp, including no selected value', () => {
  let stateIndex = 0, refIndex = 0, active = null;
  const states = [], refs = [];
  const hooks = { ...React,
    useState: initial => { const i = stateIndex++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = value; }]; },
    useRef: initial => refs[refIndex++] ??= { current: initial },
    useEffect() {}, useLayoutEffect() {}, useId: () => 'select-test',
    useMemo: fn => fn(), useCallback: fn => fn,
  };
  const code = ts.transpileModule(readFileSync(new URL('../src/components/ui/Select.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => name === 'react' ? hooks : name.includes('/cn') ? { cn: (...values) => values.filter(value => typeof value === 'string').join(' ') } : require(name) });
  const choices = [0, 1].map(index => ({ focus() { active = index; }, getAttribute: () => 'false' }));
  const render = () => {
    stateIndex = refIndex = 0;
    const tree = module.exports.Select.render({ id: 'choice', value: '', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }, null);
    const nodes = [];
    const walk = node => { if (Array.isArray(node)) return node.forEach(walk); if (!node?.props) return; nodes.push(node); walk(node.props.children); };
    walk(tree);
    for (const node of nodes) if (node.props.role === 'listbox') node.props.ref.current = { querySelectorAll: () => choices };
    return nodes.find(node => node.props.id === 'choice');
  };
  render().props.onClick();
  const trigger = render();
  const event = key => ({ key, preventDefault() {}, stopPropagation() {} });
  trigger.props.onKeyDown(event('ArrowDown')); assert.equal(active, 0);
  trigger.props.onKeyDown(event('ArrowUp')); assert.equal(active, 1);
});
