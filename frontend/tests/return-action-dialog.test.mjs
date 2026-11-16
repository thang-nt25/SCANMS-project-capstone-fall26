import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';

const require = createRequire(import.meta.url);
const source = readFileSync(new URL('../src/components/returns/ReturnActionDialog.tsx', import.meta.url), 'utf8');
function fixture() {
  let selected = null;
  const module = { exports: {} };
  const Modal = () => null;
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, { module, exports: module.exports, document: { body: {}, querySelector: () => null }, require: name => {
    if (name === 'react') return { ...React, useState: () => [selected, value => { selected = value; }] };
    if (name === 'react-dom') return { createPortal: child => child };
    if (name === '../ui/Modal') return { Modal };
    return require(name);
  } });
  return { render: props => module.exports.ReturnActionDialog(props), Modal };
}
const choices = [{ label: 'Đồng ý', value: 'APPROVE' }, { label: 'Từ chối', value: 'REJECT', danger: true }];
test('decision form stays closed until the selected action opens its own dialog', () => {
  const { render, Modal } = fixture();
  const calls = [];
  const props = { title: 'Xử lý', choices, onSelect: value => calls.push(value), children: React.createElement('form') };
  const initial = render(props);
  assert.equal(initial.props.children[1], false);
  initial.props.children[0].props.children[1].props.onClick();
  const opened = render(props).props.children[1];
  assert.equal(opened.type, Modal);
  assert.equal(opened.props.title, 'Từ chối');
  assert.deepEqual(calls, ['REJECT']);
  assert.equal(opened.props.stickyHeader, true);
  opened.props.onClose();
  assert.equal(render(props).props.children[1], false);
});
test('submitting keeps the dialog open and disables closing until the request settles', () => {
  const { render } = fixture();
  const props = { title: 'Xử lý', choices, children: 'Form' };
  render(props).props.children[0].props.children[0].props.onClick();
  const busy = render({ ...props, busy: true });
  assert.ok(busy.props.children[0].props.children.every(button => button.props.disabled));
  busy.props.children[1].props.onClose();
  assert.ok(render({ ...props, busy: true }).props.children[1]);
  render(props).props.children[1].props.onClose();
  assert.equal(render(props).props.children[1], false);
});
