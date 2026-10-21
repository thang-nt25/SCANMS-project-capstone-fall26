import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/pages/collaborator/ShopCollaborationPage.tsx', import.meta.url), 'utf8');
const file = ts.createSourceFile('ShopCollaborationPage.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const elements = [];
function visit(node) {
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) elements.push(node);
  ts.forEachChild(node, visit);
}
visit(file);
function callback(opening, name) {
  const attribute = opening.attributes.properties.find((item) => ts.isJsxAttribute(item) && item.name.getText(file) === name);
  assert.ok(attribute?.initializer?.expression, `find ${name}`);
  return ts.transpileModule(`const callback = ${attribute.initializer.expression.getText(file)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.None },
  }).outputText + '\nreturn callback;';
}

test('chat VIP action opens the current shop product picker without navigation', () => {
  const button = elements.find((node) => ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'button' && node.getText(file).includes('Đề xuất deal VIP'));
  assert.ok(button);
  let selectedId;
  new Function('selectedStore', 'setDealPickerStoreId', callback(button.openingElement, 'onClick'))(
    { id: 'sora-shop' }, (value) => { selectedId = value; },
  )();
  assert.equal(selectedId, 'sora-shop');
});

test('selecting a picker product closes the picker and opens the proposal form', () => {
  const picker = elements.find((node) => ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'DealProductPicker');
  assert.ok(picker);
  const actions = [];
  const product = { id: 'serum', title: 'Serum' };
  new Function('setDealPickerStoreId', 'handleOpenDealModal', callback(picker, 'onSelect'))(
    (value) => actions.push(['picker', value]), (value) => actions.push(['proposal', value]),
  )(product);
  assert.deepEqual(actions, [['picker', null], ['proposal', product]]);
});
