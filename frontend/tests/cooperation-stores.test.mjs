import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/cooperation-stores.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { mergeCooperationStores } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const invite = { id: 'invite', storeId: 'aura', status: 'PENDING', requestedByKol: false, createdAt: '2026-11-02T00:00:00Z', store: { id: 'aura', name: 'Aura' } };

test('a Shop invitation appears even when no conversation or deal exists', () => {
  const [store] = mergeCooperationStores([], [invite]);
  assert.equal(store.id, 'aura');
  assert.equal(store.name, 'Aura');
  assert.equal(store.cooperationStatus, 'PENDING');
  assert.equal(store.requestedByKol, false);
  assert.equal(store.conversationId, undefined);
  assert.equal(store.unreadCount, undefined);
});

test('merging a relationship preserves chat metadata and never duplicates or mutates the contact', () => {
  const contact = { id: 'aura', name: 'Aura', conversationId: 'chat', unreadCount: 2, lastMessageText: 'Existing message' };
  const result = mergeCooperationStores([contact], [invite]);
  assert.equal(result.length, 1);
  assert.equal(result[0].conversationId, 'chat');
  assert.equal(result[0].unreadCount, 2);
  assert.equal(result[0].lastMessageText, 'Existing message');
  assert.equal(contact.cooperationStatus, undefined);
});

test('outgoing KOC requests remain distinguishable from incoming Shop invitations', () => {
  const [store] = mergeCooperationStores([], [{ ...invite, requestedByKol: true }]);
  assert.equal(store.requestedByKol, true);
  assert.equal(store.lastMessageText, 'Đang chờ Shop duyệt yêu cầu');
});

test('approved and rejected responses retain relationship history without a pending invitation', () => {
  for (const status of ['APPROVED', 'REJECTED']) {
    const [store] = mergeCooperationStores([], [{ ...invite, status }]);
    assert.equal(store.cooperationStatus, status);
    assert.notEqual(store.cooperationStatus, 'PENDING');
  }
});
