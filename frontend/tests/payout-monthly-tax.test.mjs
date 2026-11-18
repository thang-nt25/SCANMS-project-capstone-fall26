import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/utils/payout-tax.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { monthlyTaxPreview, payoutTaxLabel, payoutTableTaxLabel } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('new fixed withholding snapshots display 10% without monthly totals', () => {
  const context = { policy: 'FLAT_10_PERCENT_V1', month: '2026-11', rate: '0.10' };
  assert.equal(payoutTaxLabel('200000', context), 'Thuế TNCN · 10%');
  assert.equal(payoutTableTaxLabel('200000', '20000', context), 'Thuế 10%');
});

test('table labels retain saved withholding and show multiple brackets when applicable', () => {
  assert.equal(payoutTableTaxLabel('200000', '10000', null), 'Thuế 5%');
  assert.equal(payoutTableTaxLabel('200000', '20000', null), 'Thuế 10%');
  assert.equal(payoutTableTaxLabel('400000', '30000', {policy:'MONTHLY_PROGRESSIVE_V1',monthlyGrossBefore:'9800000'}), 'Thuế 5–10%');
  assert.equal(payoutTableTaxLabel('0', '0', null), 'Thuế đã lưu');
});
test('400k preview follows cumulative monthly gross, including threshold crossings', () => {
  for (const [base, expected, label] of [['0', 2000000n, '5%'], ['10000000', 4000000n, '10%'], ['110000000', 14000000n, '35%'], ['9800000', 3000000n, '5–10%']]) {
    assert.deepEqual(monthlyTaxPreview(40000000n, base), { tax: expected, rateLabel: label });
  }
});
test('new month resets the estimate and historical flat-rate snapshots keep their label', () => {
  assert.equal(monthlyTaxPreview(40000000n, '0').tax, 2000000n);
  assert.equal(payoutTaxLabel('400000', { policy: 'MONTHLY_PROGRESSIVE_V1', monthlyGrossBefore: '110000000' }), 'Thuế TNCN · 35%');
  assert.equal(payoutTaxLabel('400000', null), 'Thuế TNCN · đã lưu');
  assert.equal(payoutTaxLabel('400000', { policy: 'MONTHLY_PROGRESSIVE_V1', monthlyGrossBefore: '0' }), 'Thuế TNCN · 5%');
  assert.equal(payoutTaxLabel('400000', { policy: 'MONTHLY_PROGRESSIVE_V1', monthlyGrossBefore: '10000000' }), 'Thuế TNCN · 10%');
});
