import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/variant-choice.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { getColourSizeOptions } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('colour and size preserve every original variant ID, including missing combinations', () => {
  const result = getColourSizeOptions([
    { id: 'white-l', name: 'Trắng tinh, Size L' },
    { id: 'navy-s', name: 'Xanh navy, Size S' },
    { id: 'white-m', name: 'Trắng tinh, Size M' },
  ]);
  assert.deepEqual(result.colours, ['Trắng tinh', 'Xanh navy']);
  assert.deepEqual(result.sizes, ['S', 'M', 'L']);
  assert.equal(result.options.find(item => item.colour === 'Trắng tinh' && item.size === 'M').id, 'white-m');
  assert.equal(result.options.find(item => item.colour === 'Xanh navy' && item.size === 'L'), undefined);
});

test('generic, mixed and ambiguous variants retain the original selector', () => {
  assert.equal(getColourSizeOptions([]), null);
  assert.equal(getColourSizeOptions([{ id: '1', name: 'Tuýp 100 ml' }]), null);
  assert.equal(getColourSizeOptions([{ id: '1', name: 'Đen, Size M' }, { id: '2', name: 'Hộp quà' }]), null);
  assert.equal(getColourSizeOptions([{ id: '1', name: 'Đen, Size M' }, { id: '2', name: 'Đen, Size M' }]), null);
});
