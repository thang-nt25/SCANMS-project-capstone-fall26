import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const module = { exports: {} };
const code = ts.transpileModule(readFileSync(new URL('../src/components/orders/MerchantOrderTrackingCodes.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
vm.runInNewContext(code, { module, exports: module.exports, require });
const { MerchantOrderTrackingCodes } = module.exports;
const order = { trackingNumber: 'LYG6D7', carrierName: 'GHN', returnRequest: { exchangeShipment: {
  trackingNumber: 'SIMX12345', carrierName: 'SCANMS Demo', provider: 'MOCK', providerStatus: 'ready_to_pick',
} } };
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement(node)) return [];
  return [node, ...elements(node.props.children)];
}
const render = item => renderToStaticMarkup(React.createElement(MerchantOrderTrackingCodes, { order: item, copiedTrackingId: null, onCopy() {} }));

test('new replacement code is primary and the original remains visibly identified', () => {
  const html = render(order);
  assert.match(html, /Hàng đổi mới/);
  assert.match(html, /Demo/);
  assert.match(html, /Giao ban đầu/);
  assert.ok(html.indexOf('SIMX12345') < html.indexOf('LYG6D7'));
});

test('copy actions use the selected shipment code, not the original code for both', () => {
  const copied = [];
  const tree = MerchantOrderTrackingCodes({ order, copiedTrackingId: null, onCopy: code => copied.push(code) });
  const buttons = elements(tree).filter(node => node.type === 'button');
  buttons.forEach(button => button.props.onClick({}));
  assert.deepEqual(copied, ['SIMX12345', 'LYG6D7']);
});

test('replacement tracking still appears if the original order has no tracking code', () => {
  const html = render({ ...order, trackingNumber: null });
  assert.match(html, /SIMX12345/);
  assert.ok(!html.includes('Giao ban đầu'));
});

test('temporary reservations stay hidden and ordinary orders keep their own waybill', () => {
  const html = render({ ...order, returnRequest: { exchangeShipment: { trackingNumber: 'SC-X-placeholder', providerStatus: 'booking_retry' } } });
  assert.ok(!html.includes('SC-X-placeholder'));
  assert.match(html, /LYG6D7/);
  assert.match(render({ trackingNumber: 'GHN-ORIGINAL', carrierName: 'GHN' }), /GHN-ORIGINAL/);
});
