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
const source = readFileSync(new URL('../src/pages/merchant/OrdersManagementPage.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('OrdersManagementPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let button, badge, refund;
function find(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'badge') badge = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'refundSucceeded') refund = node.initializer;
  if (ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'button' && node.openingElement.attributes.properties.some(attribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText(file) === 'title' && attribute.initializer &&
    ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === 'Mở hồ sơ và bước xử lý đổi trả tiếp theo')) button = node;
  ts.forEachChild(node, find);
}
find(file);
assert.ok(button && badge && refund);
let conditional = button.parent;
while (!ts.isJsxExpression(conditional)) conditional = conditional.parent;
const labelsModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/utils/return-status.utils.ts', import.meta.url), 'utf8'), { compilerOptions: options }).outputText,
  { module: labelsModule, exports: labelsModule.exports, require });
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(`export function render(order, navigate, setSelectedOrderDetails) {
  const refundSucceeded = ${refund.getText(file)};
  return <>${conditional.getText(file)}</>;
}
export function label(order) {
  const baseBadge = { label: 'Yêu cầu đổi trả' };
  const refundSucceeded = ${refund.getText(file)};
  const badge = ${badge.getText(file)};
  return badge.label;
}`, { compilerOptions: options }).outputText, { module, exports: module.exports, require,
  ...require('lucide-react'), returnStatusLabel: labelsModule.exports.returnStatusLabel });

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  return [node, ...elements(node.props.children)];
}
const order = status => ({ id: 'order-1', status: 'RETURN_REQUESTED', returnRequest: { id: 'return-case-1', status } });

test('merchant return CTA opens the actionable return case instead of the read-only order modal', () => {
  for (const status of ['REQUESTED', 'PICKUP_BOOKED', 'RETURN_SHIPPED', 'INSPECTING', 'EXCHANGE_PENDING', 'EXCHANGE_SHIPPED', 'DISPUTED']) {
    const visited = [], modals = [];
    const tree = module.exports.render(order(status), url => visited.push(url), value => modals.push(value));
    const action = elements(tree).find(node => node.type === 'button');
    assert.ok(action, `missing action for ${status}`);
    action.props.onClick();
    assert.deepEqual(visited, ['/merchant/returns/return-case-1']);
    assert.equal(modals.length, 0);
    assert.match(renderToStaticMarkup(tree), status === 'REQUESTED' ? /Xử lý yêu cầu đổi trả/ : /Tiếp tục xử lý đổi trả/);
  }
});

test('a legacy order without a linked return case can still open its original details', () => {
  const item = { id: 'order-1', status: 'RETURN_REQUESTED' }, modals = [], visited = [];
  const action = elements(module.exports.render(item, url => visited.push(url), value => modals.push(value))).find(node => node.type === 'button');
  action.props.onClick();
  assert.equal(modals[0], item);
  assert.equal(visited.length, 0);
});

test('the list reports the real return stage and retains the successful-refund label', () => {
  assert.equal(module.exports.label(order('PICKUP_BOOKED')), 'Đã đặt shipper lấy hàng');
  assert.equal(module.exports.label(order('EXCHANGE_SHIPPED')), 'Đã tạo vận đơn hàng đổi');
  assert.equal(module.exports.label({ ...order('COMPLETED'), returnRequest: { status: 'COMPLETED', resolution: 'REFUND', refund: { status: 'SUCCEEDED' } } }), 'Đã hoàn tiền');
});
