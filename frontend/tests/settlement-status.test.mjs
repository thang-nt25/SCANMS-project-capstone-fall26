import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/settlement-status.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { settlementStatus } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const bonus = { estimatedTotalBonus: '25000', settlementStatus: 'PENDING_SETTLEMENT' };

test('VN deadline includes all of day 5 and turns overdue at midnight on day 6', () => {
  assert.equal(settlementStatus('2026-10', bonus, new Date('2026-11-05T16:59:59Z')).tone, 'due');
  assert.equal(settlementStatus('2026-10', bonus, new Date('2026-11-05T17:00:00Z')).overdueDays, 1);
  assert.equal(settlementStatus('2026-10', bonus, new Date('2026-11-07T17:00:00Z')).overdueDays, 3);
});
test('year rollover and leap February use calendar months', () => {
  assert.equal(settlementStatus('2026-12', bonus, new Date('2027-01-05T17:00:00Z')).overdueDays, 1);
  assert.equal(settlementStatus('2028-02', bonus, new Date('2028-03-05T17:00:00Z')).overdueDays, 1);
});
test('current and future periods never warn overdue', () => {
  const now = new Date('2026-10-23T00:00:00Z');
  assert.match(settlementStatus('2026-10', bonus, now).label, /Ước tính/);
  assert.equal(settlementStatus('2026-11', bonus, now).label, 'Kỳ chưa bắt đầu');
});
test('zero and unavailable bonuses do not become overdue debts', () => {
  const now = new Date('2026-12-01T00:00:00Z');
  assert.equal(settlementStatus('2026-10', { estimatedTotalBonus: '0' }, now).label, 'Không phát sinh thưởng');
  assert.equal(settlementStatus('2026-10', {}, now).tone, 'neutral');
});
test('settled, approved and paid entries never count as overdue closing', () => {
  const now = new Date('2026-12-01T00:00:00Z');
  for (const status of ['PENDING', 'APPROVED', 'PAID']) {
    assert.equal(settlementStatus('2026-10', { ...bonus, settlement: { status, bonusAmount: '25000' } }, now).tone, 'neutral');
  }
  assert.equal(settlementStatus('2026-10', { ...bonus, settlementStatus: 'PAID' }, now).label, 'Đã hoàn tất');
});
test('invalid periods do not produce overdue warnings', () => {
  for (const period of ['', '2026-13', '2026-00', '2026-1']) assert.equal(settlementStatus(period, bonus).tone, 'neutral');
});
