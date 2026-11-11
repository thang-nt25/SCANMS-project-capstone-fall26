import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/returns/ShopReturnDecisionForm.tsx', import.meta.url), 'utf8');
const options = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX };
const helpers = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/utils/return-actions.ts', import.meta.url), 'utf8'), { compilerOptions: options }).outputText,
  { module: helpers, exports: helpers.exports, require });
const { buildShopApprovalResponse } = helpers.exports;
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: options }).outputText, {
  module, exports: module.exports, require: name => {
    if (name === '@tanstack/react-query') return { useQueryClient: () => ({ invalidateQueries: async () => {} }) };
    if (name.endsWith('order.service')) return { orderService: {} };
    if (name.endsWith('upload.service')) return { uploadService: {} };
    if (name.endsWith('toast')) return { toast: { success() {} } };
    if (name.endsWith('return-actions')) return helpers.exports;
    if (name === 'react-router-dom') return { Link: ({ to, children }) => React.createElement('a', { href: to }, children) };
    return require(name);
  },
});
const { ShopReturnDecisionForm } = module.exports;
const request = { id: 'case-1', status: 'REQUESTED', preferredResolution: 'EXCHANGE' };
const file = ts.createSourceFile('ShopReturnDecisionForm.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let decide;
function find(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'decide') decide = node; ts.forEachChild(node, find); }
find(file);
assert.ok(decide);
function handler(overrides = {}) {
  const calls = [], uploads = [], errors = [], navigation = [];
  const context = {
    request, orderId: 'order-1', busy: { current: false }, processed: null,
    approvalNote: '', rejectionNote: '', reason: '', files: [], buildShopApprovalResponse,
    setError: value => errors.push(value), setWorking() {}, setProcessed() {},
    orderService: { respondReturnRequest: async (...args) => { calls.push(args); return { message: 'Đã duyệt', returnRequest: { id: request.id } }; } },
    uploadService: { uploadMedia: async file => { uploads.push(file); return { url: 'https://example.test/evidence.jpg' }; } },
    client: { invalidateQueries: async () => {} }, toast: { success() {} },
    onProcessed: (decision, result) => navigation.push([decision, result.returnRequest.id]), ...overrides,
  };
  vm.createContext(context);
  vm.runInContext(ts.transpileModule(decide.getText(file), { compilerOptions: options }).outputText, context);
  return { run: decision => context.decide(decision), calls, uploads, errors, navigation, context };
}

test('blank notes keep approval enabled, while rejection remains protected by evidence requirements', () => {
  const html = renderToStaticMarkup(React.createElement(ShopReturnDecisionForm, { orderId: 'order-1', request }));
  const forms = html.match(/<form\b[\s\S]*?<\/form>/g);
  assert.equal(forms.length, 2);
  assert.match(forms[0], /Chấp nhận yêu cầu đổi sản phẩm/);
  assert.ok(!forms[0].includes('disabled=""'));
  assert.ok(!forms[0].includes('required=""'));
  assert.match(forms[0], /không bắt buộc/);
  assert.match(forms[1], /<button[^>]*disabled=""/);
  assert.match(html, /<details class=/);
});

test('approval posts a valid customer-facing explanation with no refusal fields or media upload', async () => {
  const test = handler();
  await test.run('APPROVE');
  assert.equal(test.calls.length, 1);
  assert.equal(test.calls[0][0], 'order-1');
  const dto = test.calls[0][1];
  assert.equal(dto.decision, 'APPROVE');
  assert.match(dto.response, /chấp nhận yêu cầu đổi sản phẩm/);
  assert.ok(dto.response.length >= 10 && dto.response.length <= 1000);
  assert.equal(dto.rejectionReason, undefined);
  assert.equal(dto.evidenceUrls, undefined);
  assert.equal(test.uploads.length, 0);
  assert.deepEqual(test.navigation, [['APPROVE', 'case-1']]);
  assert.ok(buildShopApprovalResponse('EXCHANGE', 'x'.repeat(850)).length <= 1000);
});

test('overlapping approval clicks submit only one decision', async () => {
  let finish;
  let count = 0;
  const test = handler({ orderService: { respondReturnRequest: () => { count++; return new Promise(resolve => { finish = resolve; }); } } });
  const first = test.run('APPROVE');
  await test.run('APPROVE');
  assert.equal(count, 1);
  finish({ message: 'Đã duyệt', returnRequest: { id: request.id } });
  await first;
});

test('rejection without explanation/evidence never calls the decision API', async () => {
  const test = handler();
  await test.run('REJECT');
  assert.equal(test.calls.length, 0);
  assert.equal(test.uploads.length, 0);
  assert.ok(test.errors.some(value => value.includes('20 ký tự')));
});

test('a supported rejection uploads evidence and asks the manager to arbitrate', async () => {
  const test = handler({ reason: 'EVIDENCE_MISMATCH', rejectionNote: 'Bằng chứng cho thấy thùng bị hư hỏng trong quá trình vận chuyển.', files: [{ name: 'packing.mp4' }] });
  await test.run('REJECT');
  assert.equal(test.uploads.length, 1);
  assert.equal(test.calls[0][1].escalateToManager, true);
  assert.equal(test.calls[0][1].rejectionReason, 'EVIDENCE_MISMATCH');
  assert.equal(test.calls[0][1].evidenceUrls[0], 'https://example.test/evidence.jpg');
});
