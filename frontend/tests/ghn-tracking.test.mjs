import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/ghn-tracking.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { getGhnTrackingCode, trackingMismatch } = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(compiled)}`);
test('uses official and manual GHN codes consistently; never sends other carriers to GHN', () => {
  assert.equal(getGhnTrackingCode({ ghnOrderCode: 'L8RBUE', trackingNumber: 'OLD' }), 'L8RBUE');
  assert.equal(getGhnTrackingCode({ trackingNumber: 'L8RBUE', carrierName: 'Giao Hàng Nhanh (GHN)' }), 'L8RBUE');
  assert.equal(getGhnTrackingCode({ trackingNumber: 'GHTK123', carrierName: 'GHTK' }), null);
  assert.equal(getGhnTrackingCode({ trackingNumber: 'GHN-MAYBE' }), null);
});
test('reports conflicting delivery status without regressing financial order state or treating stale data as current', () => {
  assert.ok(trackingMismatch('DELIVERED', 'ready_to_pick', false));
  assert.ok(trackingMismatch('SHIPPING', 'delivered', false));
  assert.equal(trackingMismatch('SHIPPING', 'delivering', false), null);
  assert.equal(trackingMismatch('DELIVERED', 'ready_to_pick', true), null);
});
