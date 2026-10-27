import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/media-pagination.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { fetchAllMediaPages } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const assets = Array.from({ length: 251 }, (_, index) => ({ id: String(index), title: `Media ${index}` }));
const response = (page, list = assets) => ({ items: list.slice((page - 1) * 100, page * 100),
  pagination: { page, total: list.length, limit: 100, totalPages: Math.ceil(list.length / 100) } });
test('all 251 assets, including items past 100, are available to search and pack export', async () => {
  const pages = [], progress = [];
  const result = await fetchAllMediaPages(async (page, limit) => { pages.push([page, limit]); return response(page); }, { onProgress: (...value) => progress.push(value) });
  assert.deepEqual(pages, [[1, 100], [2, 100], [3, 100]]);
  assert.deepEqual(result, assets);
  assert.deepEqual(progress.at(-1), [251, 251]);
  assert.ok(result.some(asset => asset.title === 'Media 250'));
});
test('empty catalogue completes without requesting a nonexistent page', async () => {
  let calls = 0;
  assert.deepEqual(await fetchAllMediaPages(async page => { calls++; return response(page, []); }), []);
  assert.equal(calls, 1);
});
test('a failed later page never returns a partial collection as a full pack', async () => {
  await assert.rejects(fetchAllMediaPages(async page => { if (page === 2) throw new Error('Offline'); return response(page); }), /Offline/);
});
test('duplicate pages and inconsistent totals fail explicitly rather than truncating export', async () => {
  await assert.rejects(fetchAllMediaPages(async page => ({ ...response(page), items: response(1).items })), /Chưa tải đủ/);
  await assert.rejects(fetchAllMediaPages(async page => response(page, page === 1 ? assets : assets.slice(1))), /vừa thay đổi/);
});
test('malformed pagination is rejected', async () => {
  for (const pagination of [null, { total: 1, page: 1, limit: 0, totalPages: Infinity }, { total: 251, page: 2, limit: 100, totalPages: 3 }]) {
    await assert.rejects(fetchAllMediaPages(async () => ({ items: [], pagination })), /phân trang/);
  }
});
test('aborting midway stops further pages and never publishes partial results', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(fetchAllMediaPages(async page => { calls++; controller.abort(); return response(page); }, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(calls, 1);
});
