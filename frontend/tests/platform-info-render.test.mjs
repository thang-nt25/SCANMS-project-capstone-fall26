import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/pages/public/PlatformInfoPage.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const module = { exports: {} };
vm.runInNewContext(code, { module, exports: module.exports, require: name => name.includes('ScanMSLogo')
  ? { ScanMSLogo: () => React.createElement('span', null, 'SCANMS') } : require(name) });
function render(component, props) { return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(component, props))); }
test('both information routes render readable content and links back to registration', () => {
  for (const kind of ['terms', 'privacy']) {
    const html = render(module.exports.default, { kind });
    assert.ok(html.includes('<h1') && html.includes('<h2'));
    assert.ok(html.includes('href="/register"'));
    assert.ok(html.includes(kind === 'terms' ? 'href="/privacy"' : 'href="/terms"'));
  }
});
test('the missing-page screen provides recovery navigation', () => {
  const html = render(module.exports.NotFoundPage);
  assert.ok(html.includes('404') && html.includes('href="/"') && html.includes('<button'));
});
