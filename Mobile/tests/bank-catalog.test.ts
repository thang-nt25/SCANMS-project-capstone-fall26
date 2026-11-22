import assert from "node:assert/strict";
import test from "node:test";
import { BankCatalogSchema, bankMatches, bankStoredName } from "../src/services/bank-catalog";
const bank = { id: 1, name: "Ngân hàng Đầu tư và Phát triển Việt Nam", code: "BIDV", bin: "970418", shortName: "BIDV", logo: "https://example.test/bank.png" };
test("bank search supports Vietnamese without accents, alias and BIN", () => {
  assert.equal(bankMatches(bank, "dau tu"), true);
  assert.equal(bankMatches(bank, "bidv"), true);
  assert.equal(bankMatches(bank, "970418"), true);
  assert.equal(bankMatches(bank, "unrelated"), false);
});
test("saved bank name includes an explicit catalog BIN", () => {
  assert.equal(bankStoredName(bank), "BIDV (970418)");
});
test("only successful bank catalogs with valid BINs are accepted", () => {
  assert.equal(BankCatalogSchema.safeParse({ code: "00", data: [bank] }).success, true);
  assert.equal(BankCatalogSchema.safeParse({ code: "99", data: [] }).success, false);
  assert.equal(BankCatalogSchema.safeParse({ code: "00", data: [{ ...bank, bin: "bad" }] }).success, false);
});
