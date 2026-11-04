import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const output = ts.transpileModule(readFileSync(new URL('../src/utils/return-actions.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { canRequestReturnReview } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
test('return review eligibility follows rejected, failed and overdue states without duplicate disputes', () => {
  const now = Date.parse('2026-10-30T10:00:00Z');
  for (const status of ['SHOP_REJECTED', 'INSPECTION_REJECTED', 'REFUND_FAILED', 'EXPIRED']) {
    assert.equal(canRequestReturnReview({ status }, now), true);
    assert.equal(canRequestReturnReview({ status, dispute: { status: 'OPEN' } }, now), false);
    assert.equal(canRequestReturnReview({ status, dispute: { status: 'RESOLVED' } }, now), false);
  }
  for (const status of ['REQUESTED', 'SHOP_APPROVED', 'DISPUTED', 'COMPLETED', 'CLOSED', 'REFUNDED']) assert.equal(canRequestReturnReview({ status }, now), false);
  const inspection = { status: 'INSPECTING', receivedAt: '2026-10-28T10:00:00Z' };
  assert.equal(canRequestReturnReview(inspection, now), true);
  assert.equal(canRequestReturnReview(inspection, now - 1), false);
  assert.equal(canRequestReturnReview({ ...inspection, inspectionCompletedAt: '2026-10-29T10:00:00Z' }, now), false);
  assert.equal(canRequestReturnReview(null, now), false);
});
