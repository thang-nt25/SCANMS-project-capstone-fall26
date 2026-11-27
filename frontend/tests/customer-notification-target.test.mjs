import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/utils/notification-target.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports });
const { notificationTarget } = module.exports;
const target = (type, data) => notificationTarget({ type, data }, 'CUSTOMER');
test('KOL review feedback opens the applicant form for the current role', () => {
  for (const type of ['KOL_NEEDS_INFO', 'KOL_REJECTED']) {
    assert.equal(target(type), '/customer/upgrade/kol');
    assert.equal(notificationTarget({ type }, 'COLLABORATOR'), '/collaborator/profile?tab=kyc');
  }
});
test('withdrawal system notification opens its exact wallet request despite legacy url field', () => {
  assert.equal(target('SYSTEM', { withdrawalId: 'request-1', url: '/customer/wallet' }), '/customer/wallet?history=withdrawals&withdrawalId=request-1');
});
test('return case wins over the original order id', () => {
  assert.equal(target('ORDER_RETURN_UPDATE', { orderId: 'order-1', returnRequestId: 'case-1' }), '/customer/returns/case-1');
  assert.equal(target('ORDER_DELIVERED', { orderId: 'order-1' }), '/customer/orders/order-1');
});
test('local url is supported, generic messages have no invented destination, unsafe paths are rejected', () => {
  assert.equal(target('SYSTEM', { url: '/customer/profile' }), '/customer/profile');
  assert.equal(target('SYSTEM', {}), null);
  for (const url of ['https://elsewhere.test', '//elsewhere.test', '/\\elsewhere.test', 'javascript:alert(1)'])
    assert.equal(target('SYSTEM', { url }), null);
});
