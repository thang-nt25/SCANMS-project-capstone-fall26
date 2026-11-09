import test from "node:test";
import assert from "node:assert/strict";
import {
  WalletSummarySchema,
  TopUpAmountInput,
  TopUpSchema,
  isOpenTopUp,
  safePayosCheckout,
} from "../src/features/wallets/wallet-contracts";
import { paymentQrImage } from "../src/features/wallets/payment-qr";

const summary = {
  availableBalance: "1500000.00",
  pendingBalance: "0.00",
  minimumWithdrawalAmount: "200000.00",
  canWithdraw: false,
  kycStatus: "UNVERIFIED",
  stores: [],
  bankAccount: null,
  withdrawalTaxPolicy: { threshold: "0.00", rate: "0.10" },
};
test("wallet accepts the actual Prisma Decimal tax policy instead of rejecting the whole summary", () => {
  const actual = WalletSummarySchema.parse(summary);
  assert.equal(actual.availableBalance, "1500000.00");
  assert.equal(Number(actual.withdrawalTaxPolicy.rate) * 100, 10);
  assert.equal(
    WalletSummarySchema.parse({
      ...summary,
      withdrawalTaxPolicy: { threshold: 2000000, rate: 0.1 },
    }).withdrawalTaxPolicy.threshold,
    2000000,
  );
});
test("wallet rejects invalid financial values rather than coercing missing data to zero", () => {
  for (const value of ["", "not-a-number", null, undefined, Infinity])
    assert.equal(
      WalletSummarySchema.safeParse({ ...summary, availableBalance: value })
        .success,
      false,
    );
  assert.equal(
    WalletSummarySchema.safeParse({
      ...summary,
      withdrawalTaxPolicy: { threshold: "0", rate: "1.1" },
    }).success,
    false,
  );
});
test("clawback debt stays visible as a negative balance and does not invent withdrawal permission", () => {
  const actual = WalletSummarySchema.parse({
    ...summary,
    availableBalance: "-10000.00",
  });
  assert.equal(actual.availableBalance, "-10000.00");
  assert.equal(actual.canWithdraw, false);
});
test("top-up requires an integer VND amount within backend payOS limits", () => {
  for (const value of ["10000", " 100000 ", "50000000"])
    assert.equal(typeof TopUpAmountInput.parse(value), "number");
  for (const value of [
    "0",
    "9999",
    "50000001",
    "-10000",
    "10000.5",
    "1e5",
    "100.000",
    "",
  ])
    assert.equal(TopUpAmountInput.safeParse(value).success, false);
});
test("checkout URLs cannot use another host, credentials, a port or an unsafe scheme", () => {
  assert.equal(
    safePayosCheckout("https://pay.payos.vn/web/abc"),
    "https://pay.payos.vn/web/abc",
  );
  for (const url of [
    "https://pay.payos.vn.attacker.test/",
    "https://pay.payos.vn@attacker.test/",
    "https://name:secret@pay.payos.vn/",
    "https://pay.payos.vn:8443/",
    "http://pay.payos.vn/",
    "javascript:alert(1)",
    "bad",
    null,
  ])
    assert.equal(safePayosCheckout(url), null);
});
test("only open payment states are eligible for polling and cancellation", () => {
  for (const status of [
    "CREATING",
    "PENDING",
    "UNDERPAID",
    "PROCESSING",
  ] as const)
    assert.equal(isOpenTopUp(status), true);
  for (const status of ["PAID", "CANCELLED", "EXPIRED", "FAILED"] as const)
    assert.equal(isOpenTopUp(status), false);
  assert.equal(
    TopUpSchema.shape.status.safeParse("SUCCESS_FROM_REDIRECT").success,
    false,
  );
});
test("payment QR is generated locally as an embedded image and preserves UTF-8 input", () => {
  const image = paymentQrImage("SCANMS TEST 100000");
  assert.ok(image.startsWith("data:image/gif;base64,"));
  assert.ok(
    Buffer.from(image.split(",")[1], "base64")
      .subarray(0, 6)
      .toString()
      .startsWith("GIF"),
  );
  assert.notEqual(paymentQrImage("NẠP VÍ"), paymentQrImage("NAP VI"));
  assert.throws(() => paymentQrImage(""));
});
