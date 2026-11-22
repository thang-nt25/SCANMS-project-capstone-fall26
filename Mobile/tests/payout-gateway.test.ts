import test from "node:test";
import assert from "node:assert/strict";
import { gatewayAction, GatewaySchema, TransferResultSchema, isSandboxPayout } from "../src/features/payouts/gateway-contract";

const gateway = GatewaySchema.parse({ provider: "BIDV_SANDBOX", environment: "SANDBOX", configured: true, message: "Sandbox" });
test("only reviewers with configured matching gateway can approve or reconcile", () => {
  assert.equal(gatewayAction(false, "PENDING", null, gateway), null);
  assert.equal(gatewayAction(true, "PENDING", null, undefined), null);
  assert.equal(gatewayAction(true, "PENDING", null, { ...gateway, configured: false }), null);
  assert.equal(gatewayAction(true, "PENDING", null, gateway), "approve");
  assert.equal(gatewayAction(true, "PROCESSING", "BIDV_SANDBOX", gateway), "reconcile");
  assert.equal(gatewayAction(true, "PROCESSING", null, gateway), null);
  assert.equal(gatewayAction(true, "PROCESSING", "GATEWAY", gateway), null);
  for (const status of ["APPROVED", "REJECTED"]) assert.equal(gatewayAction(true, status, "BIDV_SANDBOX", gateway), null);
});
test("unknown response is not interpreted as a successful transfer", () => {
  assert.equal(TransferResultSchema.safeParse({ status: "SUCCESS" }).success, false);
  assert.equal(TransferResultSchema.parse({ status: "PROCESSING" }).status, "PROCESSING");
});
test("Sandbox is identified by provider or legacy internal reference, without classifying unknown providers as verified live payments", () => {
  assert.equal(isSandboxPayout({ transferProvider: "BIDV_SANDBOX" }), true);
  assert.equal(isSandboxPayout({ bankRefCode: "SBX-example" }), true);
  assert.equal(isSandboxPayout({ transferProvider: null, bankRefCode: null }), false);
});
