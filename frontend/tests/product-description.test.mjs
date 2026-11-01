import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/product-description.utils.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { parseProductDescription, buildProductDescription } = await import(`data:text/javascript,${encodeURIComponent(outputText)}`);

test('editing and removing stored specifications updates the description without duplicating old values', () => {
  const original = buildProductDescription('Serum dưỡng da', [{ key: 'Dung tích', value: '30 ml' }]);
  const parsed = parseProductDescription(original);
  assert.equal(parsed.description, 'Serum dưỡng da');
  assert.deepEqual(parsed.specifications, [{ key: 'Dung tích', value: '30 ml' }]);
  const updated = buildProductDescription(parsed.description, [{ key: 'Dung tích', value: '50 ml' }], original);
  assert.match(updated, /50 ml/);
  assert.doesNotMatch(updated, /30 ml/);
  assert.equal(buildProductDescription(parsed.description, [], original), 'Serum dưỡng da');
});

test('unchanged legacy content remains byte-for-byte stable to avoid unnecessary moderation', () => {
  const original = '📌 THÔNG SỐ KỸ THUẬT:\r\n• Dung tích: 30 ml\r\n\r\nMô tả';
  const parsed = parseProductDescription(original);
  assert.equal(buildProductDescription(parsed.description, parsed.specifications, original), original);
  assert.deepEqual(parseProductDescription('Mô tả tự do'), { description: 'Mô tả tự do', specifications: [] });
});
