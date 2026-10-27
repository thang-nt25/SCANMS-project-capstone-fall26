import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/kol-dashboard.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { kolDashboardRange, loadKolDashboard } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

test('7-day period starts at Vietnam midnight, not 07:00', () => {
  assert.deepEqual(kolDashboardRange(7, new Date('2026-10-26T03:00:00Z')), {
    range: 'custom', days: 7, startDate: '2026-10-19T17:00:00.000Z', endDate: '2026-10-26T03:00:00.000Z',
  });
});
test('early-morning Vietnam remains on the correct local calendar day', () => {
  assert.equal(kolDashboardRange(7, new Date('2026-10-25T23:00:00Z')).startDate, '2026-10-19T17:00:00.000Z');
  assert.equal(kolDashboardRange(1, new Date('2026-10-25T17:00:00Z')).startDate, '2026-10-25T17:00:00.000Z');
});
test('month/year boundaries and leap day are calculated in Vietnam', () => {
  assert.equal(kolDashboardRange(7, new Date('2027-01-01T01:00:00Z')).startDate, '2026-12-25T17:00:00.000Z');
  assert.equal(kolDashboardRange(2, new Date('2028-03-01T01:00:00Z')).startDate, '2028-02-28T17:00:00.000Z');
});
test('rejects invalid calendar periods instead of silently querying a wrong date range', () => {
  for (const days of [0, -1, 367, 1.2, NaN]) assert.throws(() => kolDashboardRange(days));
  assert.throws(() => kolDashboardRange(7, new Date('invalid')));
});
const successful = () => ({ wallet: async () => ({ availableBalance: '0.00', pendingBalance: '0.00' }),
  ledger: async () => ({ entries: [] }), overview: async () => ({ metrics: { totalClicks: 0 } }),
  series: async () => [], tier: async () => ({ currentTier: { name: 'Đồng' } }) });
test('real zero balances and empty successful datasets are not treated as load failures', async () => {
  const snapshot = await loadKolDashboard(successful());
  assert.equal(snapshot.wallet.availableBalance, '0.00');
  assert.deepEqual(snapshot.errors, {});
});
for (const key of ['wallet', 'ledger', 'overview', 'series', 'tier']) {
  test(`failure of ${key} is explicit while other sources remain usable`, async () => {
    const sources = successful(); sources[key] = async () => { throw new Error('Offline'); };
    const snapshot = await loadKolDashboard(sources);
    assert.deepEqual(Object.keys(snapshot.errors), [key]);
    assert.deepEqual(snapshot[key], key === 'series' ? [] : null);
    if (key !== 'wallet') assert.equal(snapshot.wallet.availableBalance, '0.00');
  });
}
test('all failed requests produce five errors, not five synthetic zero values', async () => {
  const sources = Object.fromEntries(Object.keys(successful()).map(key => [key, () => { throw new Error('Synchronous failure'); }]));
  const snapshot = await loadKolDashboard(sources);
  assert.equal(Object.keys(snapshot.errors).length, 5);
  assert.equal(snapshot.wallet, null);
  assert.equal(snapshot.overview, null);
});
