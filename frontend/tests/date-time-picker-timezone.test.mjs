import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/components/common/DateTimePicker.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('picker.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const fn = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'parseSafeDate');
const context = vm.createContext({ Date });
vm.runInContext(ts.transpileModule(fn.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
const parse = context.parseSafeDate;

test('ISO UTC and explicit offsets preserve the instant used by picker min/max bounds', () => {
  for (const value of ['2026-10-27T03:00:00.000Z', '2026-10-27T10:00:00+07:00', '2026-10-26T23:00:00-04:00']) {
    assert.equal(parse(value).getTime(), Date.parse('2026-10-27T03:00:00Z'));
  }
});
test('local date and datetime strings retain wall-clock fields', () => {
  const local = parse('2026-10-27T10:35');
  assert.equal(local.getHours(), 10); assert.equal(local.getMinutes(), 35);
  assert.equal(parse('2026-10-27').getHours(), 0);
  assert.equal(parse('2026-10-27T10:35:42.5').getMilliseconds(), 500);
});
test('invalid local calendar dates and times cannot silently roll into another day', () => {
  for (const value of ['', '2026-02-31', '2026-10-27T25:00', '2026-13-01', 'not-a-date']) assert.equal(parse(value), null);
});
