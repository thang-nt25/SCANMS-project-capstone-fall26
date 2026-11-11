import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('dialogs trap Tab, isolate Escape to the top dialog, restore focus and preserve nested scroll locks', async () => {
  const originalDocument = globalThis.document, originalWindow = globalThis.window;
  const handlers = new Set(), cleanups = [];
  const document = { activeElement: null, body: { style: { overflow: 'auto' } } };
  globalThis.document = document;
  globalThis.window = { addEventListener: (_type, fn) => handlers.add(fn), removeEventListener: (_type, fn) => handlers.delete(fn) };
  function element() { return { isConnected: true, focus() { document.activeElement = this; }, getClientRects: () => [{}], getAttribute: () => null }; }
  const opener = element(), first = element(), last = element(); opener.focus();
  const outer = { ...element(), contains: target => [first, last].includes(target), querySelectorAll: () => [first, last] };
  const inner = { ...element(), contains: () => false, querySelectorAll: () => [] };
  let nextDialog = outer, id = 0, closedOuter = 0, closedInner = 0;
  globalThis.__dialogHooks = { useId: () => `dialog-${++id}`, useRef: value => ({ current: value === null ? nextDialog : value }), useEffect: fn => cleanups.push(fn()) };
  try {
    const source = readFileSync(new URL('../src/hooks/useDialogFocus.ts', import.meta.url), 'utf8')
      .replace("import { useEffect, useId, useRef } from 'react';", 'const { useEffect, useId, useRef } = globalThis.__dialogHooks;');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    const { useDialogFocus } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    const key = (key, shiftKey = false) => { for (const fn of handlers) fn({ key, shiftKey, preventDefault() {} }); };
    useDialogFocus(true, () => closedOuter++);
    assert.equal(document.activeElement, outer); key('Tab'); assert.equal(document.activeElement, first);
    key('Tab', true); assert.equal(document.activeElement, last);
    nextDialog = inner; useDialogFocus(true, () => closedInner++);
    key('Escape'); assert.equal(closedOuter, 0); assert.equal(closedInner, 1);
    cleanups.pop()(); assert.equal(document.body.style.overflow, 'hidden'); assert.equal(document.activeElement, last);
    cleanups.pop()(); assert.equal(document.body.style.overflow, 'auto'); assert.equal(document.activeElement, opener);
  } finally { globalThis.document = originalDocument; globalThis.window = originalWindow; delete globalThis.__dialogHooks; }
});
