import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/ledger-amount.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { ledgerAmountPresentation } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

for (const [value, direction, text] of [
  ['-1000000.00', 'debit', '-1.000.000 ₫'],
  ['25000.00', 'credit', '+25.000 ₫'],
  ['-25000.10', 'debit', '-25.000,1 ₫'],
  ['0.01', 'credit', '+0,01 ₫'],
  ['-0.01', 'debit', '-0,01 ₫'],
  ['0.00', 'neutral', '0 ₫'],
  ['-0.00', 'neutral', '0 ₫'],
  ['+00010.50', 'credit', '+10,5 ₫'],
  ['9999999999999999.99', 'credit', '+9.999.999.999.999.999,99 ₫'],
  [-200000, 'debit', '-200.000 ₫'],
]) {
  test(`formats signed ledger ${value} without inferring from its bucket`, () => {
    assert.deepEqual(ledgerAmountPresentation(value), { direction, text });
  });
}
for (const value of [undefined, null, '', 'NaN', NaN, Infinity, {}, '1e6', '1,000', '1.001']) {
  test(`invalid ledger value ${String(value)} is unknown, never synthetic zero`, () => {
    assert.deepEqual(ledgerAmountPresentation(value), { direction: 'unknown', text: '—' });
  });
}
