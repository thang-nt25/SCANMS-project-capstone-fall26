import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/merchant-payout-view.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { payoutPagination, fixturePayoutView } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const now = new Date('2026-10-25T23:00:00Z');
const options = { page: 1, limit: 10, status: '', filter: 'ALL', search: '' };
const rows = Array.from({ length: 25 }, (_, index) => ({ id: String(index), collaboratorName: `Khach ${index}`,
  status: 'PENDING', kycStatus: 'VERIFIED', netAmount: '900000.00', taxAmount: '100000.00', processedAt: null }));
test('25 total requests can navigate all three pages instead of stopping after 10 rows', () => {
  assert.deepEqual(payoutPagination(25, 10, 1), { page: 1, totalPages: 3, canPrevious: false, canNext: true });
  assert.equal(payoutPagination(25, 10, 3).canNext, false);
  assert.equal(fixturePayoutView(rows, { ...options, page: 3 }, now).requests.length, 5);
});
test('empty and shortened final pages clamp safely', () => {
  assert.equal(payoutPagination(0, 10, 3).page, 1);
  assert.equal(payoutPagination(20, 10, 3).page, 2);
});
test('search and KPI filters combine and find a request outside page one', () => {
  const result = fixturePayoutView(rows, { ...options, filter: 'PENDING', search: 'Khach 24' }, now);
  assert.deepEqual(result.requests.map(row => row.id), ['24']);
  assert.equal(result.total, 1);
  assert.equal(result.summary.pending.count, 25);
});
test('today uses processedAt and excludes old approvals; withheld tax excludes rejected/pending', () => {
  const result = fixturePayoutView([
    { ...rows[0], status: 'APPROVED', processedAt: '2026-10-25T17:00:00Z' },
    { ...rows[1], status: 'APPROVED', processedAt: '2026-10-25T16:59:59Z' },
    { ...rows[2], status: 'APPROVED', processedAt: '2026-10-26T17:00:00Z' },
    { ...rows[3], status: 'REJECTED' }, rows[4],
  ], { ...options, filter: 'APPROVED' }, now);
  assert.equal(result.requests.length, 1);
  assert.equal(result.summary.approvedToday.count, 1);
  assert.equal(result.summary.approvedToday.netAmount, '900000.00');
  assert.equal(result.summary.withheldTax.count, 3);
  assert.equal(result.summary.withheldTax.amount, '300000.00');
});
test('KYC only covers actionable requests and still respects a search keyword', () => {
  const result = fixturePayoutView([{ ...rows[0], kycStatus: 'UNVERIFIED' }, { ...rows[1], kycStatus: 'UNVERIFIED', status: 'APPROVED' }], { ...options, filter: 'KYC', search: 'Khach 1' }, now);
  assert.equal(result.requests.length, 0);
  assert.equal(result.summary.kycPendingCount, 1);
});
