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
const calls = [];
const api = { post: async (...args) => { calls.push(['POST', ...args]); return { data: { data: { id: 'case-1' } } }; },
  patch: async (...args) => { calls.push(['PATCH', ...args]); return { data: { data: { id: 'case-1' } } }; } };
function load(path, imports) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: options }).outputText,
    { module, exports: module.exports, require: imports });
  return module.exports;
}
const { returnService } = load('../src/services/return.service.ts', () => ({ __esModule: true, default: api }));
const { ExchangeShipmentPanel } = load('../src/components/returns/ExchangeShipmentPanel.tsx', name => {
  if (name.endsWith('useReturnDetail')) return { useReturnAction: () => ({ isPending: false, error: null, mutateAsync: async () => {} }) };
  if (name === '@tanstack/react-query') return { useQueryClient: () => ({ invalidateQueries: async () => {} }) };
  if (name.endsWith('return.service')) return { returnService };
  if (name.endsWith('return-status.utils')) return { carrierStatusLabel: status => status || '' };
  return require(name);
});
const recipient = { name: 'Khách A', phone: '0912345678', address: '15 Đường Số 9', wardName: 'Phường A', provinceName: 'Hồ Chí Minh', weight: 500, length: 20, width: 15, height: 10 };
const base = { id: 'case-1', status: 'EXCHANGE_PENDING', pickupProviderMode: 'mock', pickupSimulationEnabled: true,
  returnWarehouse: { name: 'Kho Shop', address: '12 Đường Số 8' },
  order: { customerName: recipient.name, customerPhone: recipient.phone, shippingAddress: recipient.address }, exchangePackage: recipient };
const render = overrides => renderToStaticMarkup(React.createElement(ExchangeShipmentPanel, { request: { ...base, ...overrides } }));

test('replacement booking renders original recipient, parcel suggestions and clear demo/payment information', () => {
  const html = render({});
  assert.ok(html.includes('value="Khách A"') && html.includes('value="15 Đường Số 9"') && html.includes('value="500"'));
  assert.match(html, /Tạo vận đơn giao hàng đổi/);
  assert.match(html, /không có shipper thật/);
  assert.match(html, /không thu lại tiền hàng/);
  assert.match(html, /Ghi nhận vận đơn có sẵn/);
});

test('an uncertain prior booking locks its saved details and offers reconciliation instead of manual duplicates', () => {
  const html = render({ exchangeBooking: { pending: true, recipient: { ...recipient, address: 'Địa chỉ đã gửi lần trước' } } });
  assert.match(html, /value="Địa chỉ đã gửi lần trước"/);
  assert.equal((html.match(/<fieldset disabled=""/g) || []).length, 2);
  assert.match(html, /Thử lại vận đơn hàng đổi/);
  assert.ok(!html.includes('Ghi nhận vận đơn có sẵn'));
});

test('a delivered replacement waits for customer receipt and an unknown fee is not displayed as free', () => {
  const html = render({ status: 'EXCHANGE_SHIPPED', exchangeShipment: { carrierName: 'SCANMS Demo', trackingNumber: 'SIMX123', provider: 'MOCK', providerStatus: 'delivered', feeAmount: null } });
  assert.match(html, /SIMX123/);
  assert.match(html, /Chưa có phí xác nhận/);
  assert.match(html, /Chờ khách kiểm tra và xác nhận/);
  assert.ok(!html.includes('Mô phỏng giao hàng đổi thành công'));
});

test('new booking/sync/simulation requests use the original return case and preserve the booking payload', async () => {
  calls.length = 0;
  await returnService.bookExchangeShipment('case-1', recipient);
  await returnService.syncExchangeShipment('case-1');
  await returnService.simulateExchangeShipment('case-1', { status: 'delivered' });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), ['POST', '/returns/case-1/exchange-booking', recipient, { timeout: 45000 }]);
  assert.deepEqual(calls[1], ['POST', '/returns/case-1/exchange-booking/sync']);
  assert.equal(calls[2][0], 'PATCH');
  assert.equal(calls[2][1], '/returns/case-1/exchange-booking/simulate');
  assert.equal(calls[2][2].status, 'delivered');
});
