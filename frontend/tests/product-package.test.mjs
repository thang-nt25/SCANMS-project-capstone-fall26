import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../src/utils/product-package.utils.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const { isValidEan13, productPackageInput } = await import(
  `data:text/javascript;charset=utf-8,${encodeURIComponent(compiled)}`
);

test("customer-facing EAN validation agrees with the backend checksum algorithm", () => {
  assert.equal(isValidEan13("4006381333931"), true);
  for (const invalid of [
    "",
    "4006381333932",
    "123",
    "400638133393a",
    " 4006381333931",
  ])
    assert.equal(isValidEan13(invalid), false);
});

test('legacy policy edits preserve unknown measurements; new products must provide actual measurements', () => {
  const empty = { barcode: '', packageWeight: '', packageLength: '', packageWidth: '', packageHeight: '' };
  assert.deepEqual(productPackageInput(empty, {}), {});
  assert.throws(() => productPackageInput(empty), /số đo đóng gói/);
  assert.throws(() => productPackageInput({ ...empty, barcode: '4006381333931' }), /số đo đóng gói/);
  assert.throws(() => productPackageInput(empty, { packageWeight: 500 }), /số đo đóng gói/);
  assert.deepEqual(productPackageInput({ ...empty, packageWeight: 777 }, {}), { packageWeight: 777 });
});

test('products without barcode are allowed and existing optional barcodes can be removed', () => {
  const form = { barcode: '', packageWeight: 500, packageLength: 20, packageWidth: 10, packageHeight: 10 };
  assert.deepEqual(productPackageInput(form), { packageWeight: 500, packageLength: 20, packageWidth: 10, packageHeight: 10 });
  assert.equal(productPackageInput(form, { barcode: '4006381333931' }).barcode, null);
  assert.throws(() => productPackageInput({ ...form, barcode: '4006381333932' }), /EAN-13/);
});
