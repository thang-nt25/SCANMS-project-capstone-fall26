import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/return-case-audit.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { analyzeReturnCase } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const now = new Date('2026-11-07T12:00:00.000Z');
const base = { status: 'REQUESTED', events: [], order: { outboundGhnTrackingNumber: 'GHN-1' }, dispute: null, refund: null, ghnClaim: null };
const codes = (request) => analyzeReturnCase({ ...base, ...request }, now).map((finding) => finding.code);

test('Shop-approved return without a warehouse asks for pickup setup', () => {
  assert.deepEqual(codes({ status: 'SHOP_APPROVED', returnWarehouse: null }), ['WAREHOUSE_MISSING']);
  assert.deepEqual(codes({ status: 'SHOP_APPROVED', returnWarehouse: { address: 'Shop' } }), []);
});

test('failed refund and late inspection remain independently actionable', () => {
  const result = codes({ status: 'REFUND_FAILED', refund: { status: 'FAILED' }, receivedAt: '2026-11-05T12:00:00.000Z' });
  assert.deepEqual(result, ['REFUND_FAILED']);
  assert.ok(codes({ status: 'RETURN_RECEIVED', receivedAt: '2026-11-05T12:00:00.000Z' }).includes('INSPECTION_OVERDUE'));
  assert.ok(!codes({ status: 'RETURN_RECEIVED', receivedAt: '2026-11-05T12:00:00.000Z', inspectionCompletedAt: '2026-11-06T10:00:00.000Z' }).includes('INSPECTION_OVERDUE'));
});

test('GHN fault requires a separate claim and an overdue claim needs follow-up', () => {
  const events = [{ type: 'LIABILITY_ASSESSED', data: { source: 'SYSTEM_MANAGER_REVIEW', liability: 'LOGISTICS_FAULT' } }];
  assert.ok(codes({ events }).includes('GHN_CLAIM_MISSING'));
  const result = codes({ events, ghnClaim: { status: 'SUBMITTED', updatedAt: '2026-10-30T12:00:00.000Z' } });
  assert.ok(result.includes('GHN_REPLY_OVERDUE'));
  assert.ok(!result.includes('GHN_CLAIM_MISSING'));
});

test('rejected GHN claim and open dispute stay visible without reversing customer refund', () => {
  const findings = analyzeReturnCase({ ...base, ghnClaim: { status: 'REJECTED' }, dispute: { status: 'OPEN' } }, now);
  assert.deepEqual(findings.map((item) => item.code), ['GHN_CLAIM_REJECTED', 'DISPUTE_OPEN']);
  assert.ok(findings[0].detail.includes('không thu hồi tiền đã hoàn cho khách'));
});
