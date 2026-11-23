import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/sample-video.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } });
const { pendingSampleVideo, sampleVideoLink } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('moderation selects the video being viewed, even if an older revision remains pending', () => {
  const old = { id: 'old', status: 'PENDING', urlOrContent: 'https://www.tiktok.com/@kol/video/1' };
  const current = { id: 'current', status: 'PENDING', urlOrContent: 'https://www.tiktok.com/@kol/video/2' };
  assert.equal(pendingSampleVideo({ status: 'VIDEO_SUBMITTED', reviewVideoUrl: current.urlOrContent, videoAssets: [old, current] }), current);
});

test('missing or already reviewed current assets cannot fall back to another pending video', () => {
  const asset = { id: 'old', status: 'PENDING', urlOrContent: 'https://www.tiktok.com/@kol/video/1' };
  assert.equal(pendingSampleVideo({ status: 'VIDEO_SUBMITTED', reviewVideoUrl: 'https://www.tiktok.com/@kol/video/2', videoAssets: [asset] }), undefined);
  assert.equal(pendingSampleVideo({ status: 'VIDEO_SUBMITTED', reviewVideoUrl: asset.urlOrContent, videoAssets: [{ ...asset, status: 'APPROVED' }] }), undefined);
  for (const status of ['APPROVED', 'COMPLETED', 'REVISION_REQUIRED']) {
    assert.equal(pendingSampleVideo({ status, reviewVideoUrl: asset.urlOrContent, videoAssets: [asset] }), undefined);
  }
});

test('external video links reject executable, malformed and credential-bearing URLs', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', 'http://example.test', 'https://user:pass@example.test', 'invalid', '']) {
    assert.equal(sampleVideoLink(value), null);
  }
  assert.equal(sampleVideoLink('https://www.tiktok.com/@kol/video/123'), 'https://www.tiktok.com/@kol/video/123');
});
