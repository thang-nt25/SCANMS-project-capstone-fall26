import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/services/media.service.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
  .replace("import api from './api';", 'const api = { get: (...args) => globalThis.mediaApiMock(...args) };');
const { mediaService } = await import(`data:text/javascript,${encodeURIComponent(compiled)}`);

test('media library loads every page beyond 100 items and removes duplicate IDs', async () => {
  const pages = [];
  globalThis.mediaApiMock = async (_url, { params }) => {
    pages.push(params.page);
    const start = (params.page - 1) * 100;
    const items = Array.from({ length: params.page === 3 ? 5 : 100 }, (_, i) => ({ id: String(start + i) }));
    if (params.page === 2) items.push({ id: '0' });
    return { data: { items, pagination: { totalPages: 3 } } };
  };
  try {
    const items = await mediaService.getAllMediaAssets();
    assert.equal(items.length, 205);
    assert.deepEqual(pages, [1, 2, 3]);
    assert.equal(items.at(-1).id, '204');
  } finally { delete globalThis.mediaApiMock; }
});

test('failed later pages reject instead of silently returning an incomplete library', async () => {
  globalThis.mediaApiMock = async (_url, { params }) => {
    if (params.page === 2) throw new Error('network');
    return { data: { items: [{ id: 'first' }], pagination: { totalPages: 2 } } };
  };
  try { await assert.rejects(mediaService.getAllMediaAssets(), /network/); }
  finally { delete globalThis.mediaApiMock; }
});
