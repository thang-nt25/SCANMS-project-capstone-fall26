import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const output = ts.transpileModule(readFileSync(new URL('../src/utils/deal-demo.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
const { dealDemoState } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const base = { startedAt: 0, durationSeconds: 30, now: 0, completed: 0, target: 2, settled: false };
test('input and approval preparation do not consume the demo clock', () => {
  assert.deepEqual(dealDemoState({ ...base, startedAt: null, now: 999999 }), { remaining: 30, expired: false, state: 'PENDING' });
});
test('thirty seconds only starts counting after approval', () => {
  assert.equal(dealDemoState({ ...base, now: 29000 }).remaining, 1);
  assert.equal(dealDemoState({ ...base, now: 30000 }).state, 'SETTLING');
});
test('expiry does not immediately declare a failure or sanction', () => {
  assert.equal(dealDemoState({ ...base, now: 90000 }).state, 'SETTLING');
});
test('completion during settlement can satisfy the minimum target', () => {
  assert.equal(dealDemoState({ ...base, now: 90000, completed: 2, settled: true }).state, 'ACHIEVED');
});
test('insufficient completed orders lead to review, not automatic sanctions', () => {
  assert.equal(dealDemoState({ ...base, now: 90000, completed: 1, settled: true }).state, 'REVIEW_REQUIRED');
});
test('five and ten minute demos keep their full configured duration', () => {
  for (const durationSeconds of [300, 600]) {
    assert.equal(dealDemoState({ ...base, durationSeconds, now: 30000 }).state, 'ACTIVE');
  }
});
