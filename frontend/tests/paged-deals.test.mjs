import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/utils/paged-deals.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { readDealPages } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
test('combined deal hubs read beyond 100 and 200 proposals', async () => {
  const all = Array.from({ length: 231 }, (_, id) => ({ id })); const pages = [];
  const result = await readDealPages(async page => {
    pages.push(page); return { items: all.slice((page - 1) * 50, page * 50), total: all.length, page, pageSize: 50 };
  });
  assert.deepEqual(result, all); assert.deepEqual(pages, [1, 2, 3, 4, 5]);
});
test('a failed or inconsistent later page never looks like a complete empty history', async () => {
  await assert.rejects(readDealPages(async page => {
    if (page === 2) throw new Error('network');
    return { items: [{ id: 1 }], total: 51, page, pageSize: 50 };
  }), /network/);
  await assert.rejects(readDealPages(async page => ({ items: [], total: 51, page, pageSize: 50 })));
});

test('keyset loading survives insertion and deletion between pages without duplicate deals', async () => {
  const original = Array.from({ length: 101 }, (_, index) => ({ id: 101 - index }));
  let rows = [...original];
  const result = await readDealPages(async (page, after) => {
    if (page === 2) { rows.unshift({ id: 102 }); rows = rows.filter(row => row.id !== Number(after)); }
    const remaining = after ? rows.filter(row => row.id < Number(after)) : rows;
    const items = remaining.slice(0, 50);
    return { items, total: rows.length, page, pageSize: 50, nextCursor: items.length === 50 ? String(items.at(-1).id) : null };
  });
  assert.deepEqual(result, original);
  assert.equal(new Set(result.map(row => row.id)).size, result.length);
});

test('legacy pagination rejects changing totals or duplicated identities', async () => {
  await assert.rejects(readDealPages(async page => ({ items: [{ id: page }], total: page === 1 ? 51 : 52, page, pageSize: 50 })), /vừa thay đổi/);
  await assert.rejects(readDealPages(async page => ({ items: [{ id: 1 }], total: 51, page, pageSize: 50 })), /vừa thay đổi/);
});

test('a repeated cursor fails instead of looping forever', async () => {
  await assert.rejects(readDealPages(async page => ({ items: [{ id: page }], total: 100, page, pageSize: 50, nextCursor: 'same' })), /Mốc phân trang/);
});
