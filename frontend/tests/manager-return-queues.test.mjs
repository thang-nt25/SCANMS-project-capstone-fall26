import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/pages/admin/AdminReturnOversightPage.tsx', import.meta.url), 'utf8');
function fixture(queue, withRecords = false) {
  const module = { exports: {} };
  let params = new URLSearchParams({ tab: 'returns', ...(queue ? { group: queue } : {}) });
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, { module, exports: module.exports, URLSearchParams, require: name => {
    if (name === '@tanstack/react-query') return {
      useQuery: () => ({ data: [], isPending: false }),
      useQueries: ({ queries }) => queries.map(({ queryKey }) => {
        const request = { id: `case-${queryKey[0]}`, status: 'SHOP_REJECTED', order: { externalOrderSn: `ORDER-${queryKey[0]}`, storeName: 'Store' }, events: [], shopResponse: 'PRIVATE_SHOP_RESPONSE' };
        return { data: { items: withRecords ? [{ request, dispute: queryKey[0] === 'return-disputes' ? { id: 'dispute-1' } : undefined }] : [], total: withRecords ? 1 : 0, pageSize: 20 }, isPending: false, isError: false };
      }),
    };
    if (name === 'react-router-dom') return { Link: ({ to, state, children, ...props }) => React.createElement('a', { ...props, href: to }, children), useLocation: () => ({ pathname: '/admin/arbitration', search: '' }), useSearchParams: () => [params, () => {}] };
    if (name.endsWith('auth.service')) return { authService: { getCurrentUser: () => ({ id: 'manager-1' }) } };
    if (name.endsWith('ReturnCaseProducts')) return { caseProducts: () => [], CaseProductImage: () => null, claimLabels: {}, returnDate: () => '', returnMoney: value => String(value) };
    if (name.endsWith('return-status.utils')) return { returnStatusLabel: value => value };
    if (name.startsWith('@/') || name.endsWith('.css')) return {};
    return require(name);
  } });
  return { Component: module.exports.default, params: () => params };
}

const queues = ['rejected', 'active', 'ghn', 'stalled', 'disputes', 'history'];
const keys = ['rejected-return-reviews', 'active-return-oversight', 'ghn-claims', 'stalled-return-inspections', 'return-disputes', 'return-history'];
test('each manager queue displays only its own list and keeps every category accessible', () => {
  for (const queue of queues) {
    const { Component } = fixture(queue, true);
    const html = renderToStaticMarkup(React.createElement(Component));
    assert.equal((html.match(/aria-pressed=/g) || []).length, 6);
    assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
    for (let i = 0; i < keys.length; i++) assert.equal(html.includes(`ORDER-${keys[i]}`), queues[i] === queue);
    assert.equal((html.match(/class="return-unified-list"/g) || []).length, 1);
  }
});
test('default and invalid queue links show disputes without exposing other records', () => {
  for (const queue of [undefined, 'invalid']) {
    const { Component } = fixture(queue, true);
    const html = renderToStaticMarkup(React.createElement(Component));
    assert.ok(html.includes('ORDER-return-disputes'));
    assert.ok(!html.includes('ORDER-active-return-oversight'));
  }
});
test('loaded queues link to the case without auto-opening private evidence or decision forms', () => {
  for (let i = 0; i < queues.length; i++) {
    const { Component } = fixture(queues[i], true);
    const html = renderToStaticMarkup(React.createElement(Component));
    assert.ok(html.includes(`/admin/returns/case-${keys[i]}`));
    assert.ok(!html.includes('PRIVATE_SHOP_RESPONSE'));
    assert.ok(!html.includes('role="dialog"'));
    assert.ok(!html.includes('<form'));
    if (queues[i] === 'disputes') assert.ok(html.includes('?panel=handling'));
  }
});
