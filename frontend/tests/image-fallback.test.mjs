import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/image-fallback.utils.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext },
}).outputText;
const handlers = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

for (const [handler, asset] of [
  ['handleProductImageError', 'product-placeholder.svg'],
  ['handleAvatarImageError', 'avatar-placeholder.svg'],
  ['handleStoreImageError', 'store-placeholder.svg'],
]) {
  test(`${handler} recovers after source changes and prevents an error loop`, () => {
    let assignments = 0;
    let src = 'https://broken.example/image.jpg';
    const image = {
      ownerDocument: { baseURI: 'https://scanms.io.vn/collaborator/profile' },
      get src() { return src; },
      set src(value) { src = value; assignments++; },
    };
    const fallback = `https://scanms.io.vn/assets/${asset}`;
    handlers[handler]({ currentTarget: image });
    assert.equal(image.src, fallback);
    handlers[handler]({ currentTarget: image });
    assert.equal(assignments, 1);
    src = 'https://broken.example/updated.jpg';
    handlers[handler]({ currentTarget: image });
    assert.equal(image.src, fallback);
    assert.equal(assignments, 2);
    assert.ok(existsSync(new URL(`../public/assets/${asset}`, import.meta.url)));
  });
}
