import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/utils/payout-rejection-reasons.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { hasRejectionReason, toggleRejectionReason } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('clicking a reason adds it once and clicking again removes only that line', () => {
  const reason = 'Chưa khai báo mã số thuế';
  const initial = 'Ghi chú riêng của kế toán';
  const selected = toggleRejectionReason(initial, reason);
  assert.equal(selected, `${initial}\n${reason}`);
  assert.equal(hasRejectionReason(selected, reason), true);
  assert.equal(toggleRejectionReason(selected, reason), initial);
});
test('prefilled reasons with punctuation toggle off; longer notes containing the words are preserved', () => {
  const reason = 'Thông tin ngân hàng không khớp hồ sơ KYC';
  const note = `${reason}: cần đối chiếu chủ tài khoản`;
  assert.equal(toggleRejectionReason(`${reason}.\n${note}`, reason), note);
  assert.equal(hasRejectionReason(note, reason), false);
});
