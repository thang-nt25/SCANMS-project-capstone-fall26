import test from "node:test";
import assert from "node:assert/strict";
import { CancellationInput } from "../src/features/orders/cancel-order";

test("cancellation requires an allowed selection and never sends an arbitrary reason code", () => {
  for (const reason of ["", "INVALID", "DAMAGED"])
    assert.equal(CancellationInput.safeParse({ reason, details: "" }).success, false);
});

test("predefined cancellation uses the readable API reason and ignores stale custom text", () => {
  assert.deepEqual(
    CancellationInput.parse({ reason: "CHANGE_ADDRESS", details: "previous custom reason" }),
    { reason: "Muốn đổi địa chỉ nhận hàng" },
  );
});

test("custom cancellation trims input and enforces the existing reason length limit", () => {
  for (const details of ["", "    ", "1234", "a".repeat(501)])
    assert.equal(CancellationInput.safeParse({ reason: "OTHER", details }).success, false);
  assert.deepEqual(
    CancellationInput.parse({ reason: "OTHER", details: "  Tôi đặt nhầm số lượng  " }),
    { reason: "Tôi đặt nhầm số lượng" },
  );
  assert.equal(CancellationInput.safeParse({ reason: "OTHER", details: "a".repeat(500) }).success, true);
});
