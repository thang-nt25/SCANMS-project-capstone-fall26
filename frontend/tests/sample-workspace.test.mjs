import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/sample-workspace.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const { sampleDeadline, sampleNeedsAttention, canSubmitSampleVideo, SAMPLE_STATUS_LABELS, sampleSandboxCode, withSampleSandboxState, sampleShopLink, SAMPLE_EVENT_LABELS } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('revision deadline takes priority over original obligation', () => {
  assert.equal(sampleDeadline({ revisionDeadlineAt: '2026-10-20T00:00:00Z', deadlineAt: '2026-10-10T00:00:00Z' }), Date.parse('2026-10-20T00:00:00Z'));
});
test('missing and malformed dates never produce a fake overdue indicator', () => {
  assert.equal(sampleDeadline({ deadlineAt: 'invalid' }), null);
  assert.equal(sampleNeedsAttention({ status: 'RECEIVED' }), false);
});
test('completed work is not urgent even after its original deadline', () => {
  assert.equal(sampleNeedsAttention({ status: 'COMPLETED', deadlineAt: '2020-01-01' }), false);
});
test('deadline soon, revision, delivery issue and overdue require attention', () => {
  const now = Date.parse('2026-10-18T00:00:00Z');
  for (const status of ['OVERDUE', 'REVISION_REQUIRED', 'DELIVERY_ISSUE']) assert.equal(sampleNeedsAttention({ status }, now), true);
  assert.equal(sampleNeedsAttention({ status: 'RECEIVED', deadlineAt: '2026-10-20T00:00:00Z' }, now), true);
  assert.equal(sampleNeedsAttention({ status: 'RECEIVED', deadlineAt: '2026-10-25T00:00:00Z' }, now), false);
});
test('only received, overdue and revision states allow video submission', () => {
  for (const status of Object.keys(SAMPLE_STATUS_LABELS)) assert.equal(canSubmitSampleVideo(status), ['RECEIVED', 'OVERDUE', 'REVISION_REQUIRED'].includes(status));
});

test('sandbox overlays affect only test shipments without changing authoritative live requests', () => {
  const request = { id: 'sample', status: 'APPROVED', product: { storeId: 'shop', store: { id: 'shop' } }, shippingCharges: [{ environment: 'TEST', trackingNumber: 'TEST123' }] };
  const state = { receivedAt: '2026-10-20', deadlineAt: '2026-11-03', videoUrl: null };
  assert.equal(sampleSandboxCode(request), 'TEST123');
  const effective = withSampleSandboxState(request, state);
  assert.equal(effective.status, 'RECEIVED');
  assert.equal(effective.deadlineAt, state.deadlineAt);
  assert.equal(request.status, 'APPROVED');
  assert.equal(withSampleSandboxState(request, { ...state, status: 'OVERDUE' }).status, 'OVERDUE');
  assert.equal(withSampleSandboxState(request, { ...state, videoUrl: 'https://tiktok.com/video' }).status, 'VIDEO_SUBMITTED');
  const live = { ...request, trackingNumber: 'LIVE123', status: 'SHIPPED' };
  assert.equal(sampleSandboxCode(live), null);
  assert.equal(withSampleSandboxState(live, state), live);
  assert.equal(sampleShopLink(request), '/collaborator/collaboration?shop=shop&tab=samples&sampleId=sample');
  assert.equal(SAMPLE_EVENT_LABELS.GHN_DELIVERED, 'GHN xác nhận giao thành công');
});
