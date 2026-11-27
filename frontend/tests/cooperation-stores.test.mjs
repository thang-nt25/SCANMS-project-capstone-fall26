import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/cooperation-stores.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS },
}).outputText;

const mod = { exports: {} };
new Function('module', 'exports', transpiled)(mod, mod.exports);
const { mergeCooperationStores } = mod.exports;

test('mergeCooperationStores preserves history flags and clean labels across REJECTED/TERMINATED/PENDING/APPROVED', () => {
  const result = mergeCooperationStores(
    [
      { id: 'store-history', name: 'Sora Skin', conversationId: 'conv-1', messageCount: 3, lastMessageText: 'Chào Shop', lastMessageAt: '2026-11-28T01:00:00Z' },
    ],
    [
      { id: 'rel-1', storeId: 'store-history', status: 'REJECTED', requestedByKol: false, hasHistory: true, note: 'Tạm hoãn', updatedAt: '2026-11-28T02:00:00Z', store: { id: 'store-history', name: 'Sora Skin' } },
      { id: 'rel-2', storeId: 'store-no-history', status: 'REJECTED', requestedByKol: false, hasHistory: false, updatedAt: '2026-11-28T02:05:00Z', store: { id: 'store-no-history', name: 'Aura Wear' } },
      { id: 'rel-3', storeId: 'store-term', status: 'TERMINATED', requestedByKol: true, hasHistory: false, updatedAt: '2026-11-28T01:50:00Z', store: { id: 'store-term', name: 'GreenBio' } },
    ],
  );

  const s1 = result.find((s) => s.id === 'store-history');
  const s2 = result.find((s) => s.id === 'store-no-history');
  const s3 = result.find((s) => s.id === 'store-term');

  assert.equal(s1.hasCooperationHistory, true);
  assert.equal(s1.cooperationStatus, 'REJECTED');
  assert.equal(s1.lastMessageText, 'Chào Shop');

  assert.equal(s2.hasCooperationHistory, false);
  assert.equal(s2.lastMessageText, 'Hợp tác đã bị từ chối');

  assert.equal(s3.hasCooperationHistory, false);
  assert.equal(s3.lastMessageText, 'Hợp tác đã chấm dứt');
});
