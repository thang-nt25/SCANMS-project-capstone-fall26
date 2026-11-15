import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/customer/PartnerUpgradeForms.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('PartnerUpgradeForms.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let submit;
function visit(node) {
  if (ts.isJsxAttribute(node) && node.name.getText(file) === 'onSubmit') submit = node.initializer.expression.getText(file);
  ts.forEachChild(node, visit);
}
visit(file);
const compiled = ts.transpileModule(`const handler = ${submit};`, {
  compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 },
}).outputText;

function attempt(readOnly, invalidUrl) {
  const calls = [];
  const handler = new Function('readOnly', 'primaryChannel', 'secondaryChannels', 'socialChannelUrlError', 'toast', 'setCurrentStep', 'onSubmit', `${compiled}; return handler;`)(
    readOnly, { platform: 'TIKTOK', channelUrl: 'https://example.test' }, [],
    () => invalidUrl ? 'Invalid channel URL' : null,
    { error: value => calls.push(['error', value]) }, value => calls.push(['step', value]), () => calls.push(['submit']),
  );
  handler({ preventDefault: () => calls.push(['prevent']) });
  return calls;
}

test('a submitted read-only KOL profile cannot submit again', () => {
  assert.deepEqual(attempt(true, false), [['prevent']]);
});
test('editable profiles retain channel URL validation and return to step one', () => {
  assert.deepEqual(attempt(false, true), [['prevent'], ['error', 'Invalid channel URL'], ['step', 1]]);
});
test('valid editable profiles continue through the existing submit handler', () => {
  assert.deepEqual(attempt(false, false), [['submit']]);
});
