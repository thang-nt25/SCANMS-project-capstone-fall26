import test from "node:test";
import assert from "node:assert/strict";
import {
  mayBookReturnPickup,
  mayAssessReturnLiability,
  mergeReturnQueues,
} from "../src/features/returns/policy";

const now = Date.parse("2026-11-03T00:00:00Z");
const ready = {
  status: "SHOP_APPROVED",
  returnWarehouse: { address: "Test warehouse" },
  shipByAt: "2026-11-04T00:00:00Z",
  pickupProviderMode: "sandbox",
};
test("pickup is available only after warehouse/instructions establish a future deadline", () => {
  assert.equal(mayBookReturnPickup(ready, now), true);
  assert.equal(mayBookReturnPickup({ ...ready, shipByAt: null }, now), false);
  assert.equal(
    mayBookReturnPickup({ ...ready, returnWarehouse: null }, now),
    false,
  );
});
test("deadline boundary and invalid dates cannot enable pickup", () => {
  for (const shipByAt of [
    new Date(now).toISOString(),
    new Date(now - 1).toISOString(),
    "invalid",
  ])
    assert.equal(mayBookReturnPickup({ ...ready, shipByAt }, now), false);
});
test("disabled or absent provider cannot enable a real booking", () => {
  assert.equal(
    mayBookReturnPickup({ ...ready, pickupProviderMode: "disabled" }, now),
    false,
  );
  assert.equal(
    mayBookReturnPickup({ ...ready, pickupProviderMode: undefined }, now),
    false,
  );
});
test("pickup cannot repeat after shipment or reopen a closed case", () => {
  for (const status of [
    "REQUESTED",
    "PICKUP_BOOKED",
    "RETURN_SHIPPED",
    "COMPLETED",
    "DISPUTED",
    "EXPIRED",
  ])
    assert.equal(mayBookReturnPickup({ ...ready, status }, now), false);
});
test("liability cannot change after inspection resolved the case", () => {
  assert.equal(mayAssessReturnLiability("INSPECTING"), true);
  for (const status of [
    "EXCHANGE_PENDING",
    "REFUND_PENDING",
    "COMPLETED",
    "DISPUTED",
    "unknown",
  ])
    assert.equal(mayAssessReturnLiability(status), false);
});
test("operations queue includes disputes and stalled requests once without modifying inputs", () => {
  const active = [{ id: "a", status: "INSPECTING" }];
  const disputes = [{ id: "b", status: "DISPUTED" }];
  const stalled = [{ id: "a", status: "INSPECTING" }];
  assert.deepEqual(mergeReturnQueues(active, disputes, stalled), [
    active[0],
    disputes[0],
  ]);
  assert.equal(active.length, 1);
});
