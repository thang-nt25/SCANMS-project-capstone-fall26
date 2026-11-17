import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/pages/admin/AdminReturnDisputesPage.tsx', import.meta.url), 'utf8');
function fixture(queue, withRecords = false) {
  const module = { exports: {} };
  let params = new URLSearchParams({ tab: 'returns', ...(queue ? { queue } : {}) });
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, { module, exports: module.exports, URLSearchParams, require: name => {
    if (name === '@tanstack/react-query') return {
      useQueryClient: () => ({}), useMutation: () => ({}),
      useQuery: ({ queryKey }) => {
        const record = { id: 'case-1', status: 'SHOP_REJECTED', order: { externalOrderSn: 'DH-2026-TEST', storeName: 'PRIVATE_SHOP_DETAILS' }, events: [], shopResponse: 'PRIVATE_SHOP_RESPONSE' };
        const item = queryKey[0] === 'return-disputes' ? { id: 'dispute-1', returnRequest: record } : record;
        return { data: { items: withRecords ? [item] : [], total: withRecords ? 1 : 0 }, isLoading: false };
      },
    };
    if (name === 'react-router-dom') return { Link: 'a', useSearchParams: () => [params, fn => { params = fn(params); }] };
    if (name.endsWith('return-case-search')) return { searchReturnCases: () => [] };
    if (name.endsWith('return.service')) return { returnService: {} };
    if (name.startsWith('../../') || name === '../returns/ReturnDetailPage') return {};
    return require(name);
  } });
  return { Component: module.exports.default, params: () => params };
}

const queues = ['shop-rejected', 'active-returns', 'ghn-claims', 'stalled-returns', 'open-disputes', 'return-history'];
test('each manager queue displays only its own panel and keeps every category accessible', () => {
  for (const queue of queues) {
    const { Component } = fixture(queue);
    const html = renderToStaticMarkup(React.createElement(Component));
    for (const id of queues) {
      const panel = html.match(new RegExp(`<section[^>]*id="${id}"[^>]*>`));
      assert.ok(panel, id);
      assert.equal(panel[0].includes('hidden=""'), id !== queue, `${queue}: ${id}`);
      assert.ok(html.includes(`aria-controls="${id}"`));
    }
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  }
});
test('default and invalid queue links show disputes without exposing all panels', () => {
  for (const queue of [undefined, 'invalid']) {
    const { Component } = fixture(queue);
    const html = renderToStaticMarkup(React.createElement(Component));
    assert.match(html, /<section id="open-disputes"/);
    assert.equal((html.match(/<section hidden=""/g) || []).length, 5);
  }
});

test('loaded queues show order codes without auto-opening evidence or decision forms', () => {
  for (const queue of queues) {
    const { Component } = fixture(queue, true);
    const html = renderToStaticMarkup(React.createElement(Component));
    assert.ok(html.includes('DH-2026-TEST'));
    assert.ok(!html.includes('PRIVATE_SHOP_DETAILS'));
    assert.ok(!html.includes('PRIVATE_SHOP_RESPONSE'));
    assert.ok(!html.includes('role="dialog"'));
    assert.ok(!html.includes('Lưu quyết định'));
  }
});
