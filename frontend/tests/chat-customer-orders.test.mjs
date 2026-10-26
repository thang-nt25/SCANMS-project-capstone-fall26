import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/chat-customer-orders.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { chatCustomerOrderQuery, chatOrderSummary } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
test('chat history queries the exact customer ID, never a name search', () => {
  assert.deepEqual(chatCustomerOrderQuery('shop', 'customer-a'), { storeId: 'shop', customerId: 'customer-a', limit: 10 });
  assert.notDeepEqual(chatCustomerOrderQuery('shop', 'customer-a'), chatCustomerOrderQuery('shop', 'customer-b'));
});
test('missing chat identity never falls back to all shop orders', () => {
  assert.equal(chatCustomerOrderQuery('shop', undefined), null);
  assert.equal(chatCustomerOrderQuery(undefined, 'customer'), null);
});
test('order cards and shared status use actual merchant order code, amount and tracking', () => {
  const result = chatOrderSummary({ id: '123456789', externalOrderSn: 'DH-REAL', finalAmount: 250000, trackingNumber: 'GHN123' });
  assert.equal(result.orderCode, 'DH-REAL');
  assert.equal(result.totalAmount, 250000);
  assert.equal(result.shippingCode, 'GHN123');
  assert.equal(chatOrderSummary({ id: 'abc', finalAmount: 0, totalAmount: 100000 }).totalAmount, 0);
});
