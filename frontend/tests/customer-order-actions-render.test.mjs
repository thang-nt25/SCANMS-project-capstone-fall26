import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const options = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX };
function loadUtility(path) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: options }).outputText,
    { module, exports: module.exports, require });
  return module.exports;
}
const { getCustomerOrderActions } = loadUtility('../src/utils/customer-order-actions.ts');
const { canRequestReturnReview } = loadUtility('../src/utils/return-actions.ts');
const source = readFileSync(new URL('../src/pages/customer/CustomerPortalPage.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('CustomerPortalPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let actions;
function find(node) {
  if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(attribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText(file) === 'className' &&
    attribute.initializer && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text.startsWith('customer-order-actions '))) actions = node;
  ts.forEachChild(node, find);
}
find(file);
assert.ok(actions, 'the real order action row must exist');
let callback = actions.parent;
while (callback && !ts.isArrowFunction(callback)) callback = callback.parent;
assert.ok(callback && ts.isBlock(callback.body));
// Execute the actual list flags and JSX, so a second visibility condition cannot
// override an otherwise-correct eligibility helper without failing this test.
const flags = callback.body.statements.filter(ts.isVariableStatement).map(statement => statement.getText(file)).join('\n');
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(`export function render(order, bindings) {
  const { navigate, setReturnOrder } = bindings;
  ${flags}
  return (${actions.getText(file)});
}`, { compilerOptions: options }).outputText, {
  module, exports: module.exports, require,
  ...require('lucide-react'), getCustomerOrderActions, canRequestReturnReview,
  returnStatusLabel: status => status,
  Link: ({ to, children, ...props }) => React.createElement('a', { ...props, href: to }, children),
  handleReorder() {}, handleOpenChat() {}, setSelectedOrderDetails() {},
  setCancellingOrderId() {}, handleConfirmReceipt() {}, setReviewOrder() {}, setViewedReviewOrder() {}, confirmingOrderId: null,
});

function order(overrides = {}) {
  const deliveredAt = new Date(Date.now() - 86400000).toISOString();
  return { id: 'order-1', externalOrderSn: 'DH-RECEIVED', status: 'COMPLETED', deliveredAt, completedAt: deliveredAt,
    orderItems: [{ id: 'line-1', productId: 'product-1', quantity: 1, product: { title: 'Sản phẩm' } }], productReviews: [], ...overrides };
}
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  return [node, ...elements(node.props.children)];
}
function render(item) {
  const calls = [];
  const row = module.exports.render(item, { navigate: url => calls.push(url), setReturnOrder: value => calls.push(value) });
  return { calls, row, html: renderToStaticMarkup(row), buttons: elements(row).filter(node => node.type === 'button') };
}
const text = node => renderToStaticMarkup(node).replace(/<[^>]+>/g, '').trim();

test('a received/completed order exposes its return action, details and only one reorder action', () => {
  const item = order();
  const { calls, html, buttons } = render(item);
  const returnButton = buttons.find(button => text(button) === 'Trả hàng / Hoàn tiền');
  assert.ok(returnButton, 'confirming receipt must not hide eligible returns');
  returnButton.props.onClick();
  assert.equal(calls[0], item, 'the return form receives the selected order');
  assert.equal(buttons.filter(button => text(button) === 'Mua lại').length, 1);
  assert.match(html, /href="\/customer\/orders\/order-1"/);
  assert.ok(!buttons.some(button => text(button) === 'Hủy đơn'));
});

test('the rendered list keeps the return window and active-case protections', () => {
  for (const item of [
    order({ status: 'PENDING' }), order({ status: 'CANCELLED' }),
    order({ deliveredAt: new Date(Date.now() - 15 * 86400000).toISOString() }),
    order({ returnRequest: { id: 'case-1', status: 'REQUESTED' } }),
  ]) {
    assert.ok(!render(item).buttons.some(button => text(button) === 'Trả hàng / Hoàn tiền'));
  }
  assert.ok(render(order({ status: 'DELIVERED' })).buttons.some(button => text(button) === 'Trả hàng / Hoàn tiền'));
});
