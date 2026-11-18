import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/utils/escrow-amounts.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { escrowAmounts, escrowMoney, escrowTotal } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('old total-only response is unknown, not NaN or invented zero', () => {
  const item = { commissionAmount: '40000' };
  assert.deepEqual(escrowAmounts(item), {standard:null,deal:null});
  assert.equal(escrowTotal([item], 'standard'),null);
  assert.doesNotMatch(escrowMoney(undefined), /NaN|0/);
});
test('explicit zero is preserved while empty and invalid snapshots stay unknown', () => {
  assert.deepEqual(escrowAmounts({pendingStandardAmount:'0',pendingDealAmount:'0'}), {standard:0,deal:0});
  for(const value of ['', ' ', 'invalid', null, undefined, Infinity, -1]) {
    assert.doesNotMatch(escrowMoney(value), /NaN/);
    assert.equal(escrowAmounts({pendingStandardAmount:value}).standard, null);
  }
});
test('valid raw snapshots remain compatible with older response names', () => {
  const rows = [
    {commissionAmount:'41600',baseCommissionAmount:null,dealBonusAmount:'0',dealBonusStatus:'NONE'},
    {commissionAmount:'40000',baseCommissionAmount:'27500',dealBonusAmount:'12500',dealBonusStatus:'PENDING_KPI'},
    {commissionAmount:'80000',baseCommissionAmount:'55000',dealBonusAmount:'25000',dealBonusStatus:'PENDING_KPI'},
  ];
  assert.equal(escrowTotal(rows,'standard'),124100);
  assert.equal(escrowTotal(rows,'deal'),37500);
  assert.equal(escrowTotal([...rows,{commissionAmount:'123'}],'deal'),null);
});

test('released standard is zero while remaining Deal is still held', () => {
  assert.deepEqual(escrowAmounts({status:'APPROVED',baseCommissionAmount:'27500',dealBonusAmount:'12500',dealBonusStatus:'PENDING_KPI'}),{standard:0,deal:12500});
});
