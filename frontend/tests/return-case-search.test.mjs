import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/return-case-search.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { searchReturnCases } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

const cases = [
  { id: 'case-a', status: 'DISPUTED', submittedAt: '2026-11-01T00:00:00Z', order: { externalOrderSn: 'DH-001', storeName: 'Sora Skin', customerName: 'Nguyễn An', customerPhone: '0903000001', outboundGhnTrackingNumber: 'GHN001' }, customerShipment: null, exchangeShipment: null, ghnClaim: null },
  { id: 'case-b', status: 'REFUND_FAILED', submittedAt: '2026-11-03T00:00:00Z', order: { externalOrderSn: 'DH-002', storeName: 'Aura Activewear', customerName: 'Trần Bình', customerPhone: '0903000002', outboundGhnTrackingNumber: 'GHN002' }, customerShipment: { trackingNumber: 'SIM-RETURN-2' }, exchangeShipment: null, ghnClaim: { ghnReference: 'CLAIM-22' } },
];

test('searches case queues by accent-insensitive customer, shop and tracking fields', () => {
  assert.deepEqual(searchReturnCases(cases, 'nguyen an').map((item) => item.id), ['case-a']);
  assert.deepEqual(searchReturnCases(cases, 'aura claim-22').map((item) => item.id), ['case-b']);
  assert.deepEqual(searchReturnCases(cases, 'sim-return-2').map((item) => item.id), ['case-b']);
  assert.deepEqual(searchReturnCases(cases, 'DH-001').map((item) => item.id), ['case-a']);
});

test('deduplicates cases appearing in multiple Manager queues and orders newest first', () => {
  assert.deepEqual(searchReturnCases([...cases, cases[0]], 'GHN').map((item) => item.id), ['case-b', 'case-a']);
  assert.deepEqual(searchReturnCases(cases, 'unknown'), []);
  assert.deepEqual(searchReturnCases(cases, '   '), []);
});
