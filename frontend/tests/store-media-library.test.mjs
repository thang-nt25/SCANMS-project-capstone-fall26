import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const compile = filename => ts.transpileModule(readFileSync(new URL(`../src/utils/${filename}`, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = source => `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`;
const { loadStoreMediaLibrary } = await import(moduleUrl(compile('store-media-library.ts')));
const packUrl = moduleUrl(compile('media-pack.utils.ts'));
const { copyMediaScript, mediaSourceUrl, isExternalMediaVideo } = await import(moduleUrl(compile('media-asset.utils.ts').replace("'./media-pack.utils'", JSON.stringify(packUrl))));
const asset = (id, overrides = {}) => ({ id, storeId: 'a', assetType: 'VIDEO', status: 'APPROVED', urlOrContent: '/clip.mp4', ...overrides });

test('loads every page and excludes other shops, pending/rejected/hidden items and unsupported types', async () => {
  const calls = [];
  const items = await loadStoreMediaLibrary('a', async page => {
    calls.push(page);
    return { data: { items: page === 1 ? [asset('1'), asset('pending', { status: 'PENDING' }), asset('b', { storeId: 'b' })]
      : [asset('1'), asset('2', { assetType: 'COPYWRITE_TEXT' }), asset('hidden', { status: 'HIDDEN' }), asset('rejected', { status: 'REJECTED' }), asset('pdf', { assetType: 'PDF' })], pagination: { totalPages: 2 } } };
  });
  assert.deepEqual(calls, [1, 2]);
  assert.deepEqual(items.map(item => item.id), ['1', '2']);
});

test('a failed later page rejects instead of showing a misleading partial library', async () => {
  await assert.rejects(loadStoreMediaLibrary('a', async page => {
    if (page === 2) throw new Error('Network unavailable');
    return { items: [asset('1')], pagination: { totalPages: 2 } };
  }), /Network unavailable/);
  await assert.rejects(loadStoreMediaLibrary('a', async () => ({ unexpected: true })), /Không đọc được/);
  assert.deepEqual(await loadStoreMediaLibrary('a', async () => ({ items: [], pagination: { totalPages: 0 } })), []);
});

test('copies the complete multiline script, awaits completion and propagates clipboard denial', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let resolveCopy;
  const script = asset('script', { assetType: 'COPYWRITE_TEXT', urlOrContent: 'Mở đầu\nTriển khai đầy đủ\nKết thúc' });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: value => {
    assert.equal(value, script.urlOrContent);
    return new Promise(resolve => { resolveCopy = resolve; });
  } } } });
  try {
    let finished = false;
    const task = copyMediaScript(script).then(() => { finished = true; });
    await Promise.resolve();
    assert.equal(finished, false);
    resolveCopy(); await task; assert.equal(finished, true);
    globalThis.navigator.clipboard.writeText = async () => { throw new Error('Denied'); };
    await assert.rejects(copyMediaScript(script), /Denied/);
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else delete globalThis.navigator;
  }
});

test('distinguishes streaming pages from downloadable files and blocks unsafe sources', () => {
  const base = 'https://scanms.vn';
  assert.equal(isExternalMediaVideo(asset('yt', { urlOrContent: 'https://youtu.be/123' }), base), true);
  assert.equal(isExternalMediaVideo(asset('file'), base), false);
  assert.equal(mediaSourceUrl(asset('bad', { urlOrContent: 'javascript:alert(1)' }), base), null);
  assert.equal(mediaSourceUrl(asset('empty', { urlOrContent: ' ' }), base), null);
  assert.equal(mediaSourceUrl(asset('file'), base), 'https://scanms.vn/clip.mp4');
});
