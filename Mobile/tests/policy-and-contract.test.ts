import test from "node:test";
import assert from "node:assert/strict";
import {
  canRespondToDeal,
  DealInputSchema,
} from "../src/features/deals/deal-policy";
import {
  ProductInputSchema,
  validEan13,
} from "../src/features/catalog/product-input";
import { BootstrapSchema, RoleSchema } from "../src/types/contracts";
import { ROLE_TABS } from "../src/navigation/role-tabs";
import { canReviewVipExceptions } from "../src/features/workspace/policy";
import { mergeMessages } from "../src/services/realtime/messages";
import { validateInput } from "../src/utils/validate-input";
test("Manager cannot access admin-only users or exception tabs", () => {
  assert.ok(!ROLE_TABS.SYSTEM_MANAGER.includes("users"));
  assert.ok(!ROLE_TABS.SYSTEM_MANAGER.includes("exceptions"));
  assert.ok(ROLE_TABS.SYSTEM_ADMIN.includes("users"));
  assert.ok(canReviewVipExceptions("SYSTEM_ADMIN"));
  assert.equal(canReviewVipExceptions("SYSTEM_MANAGER"), false);
  for (const role of RoleSchema.options)
    assert.ok(ROLE_TABS[role].includes("account"));
});
test("only the counterparty can respond to a pending VIP agreement", () => {
  assert.equal(
    canRespondToDeal("COLLABORATOR", "PENDING", "SHOP_MANAGER"),
    true,
  );
  assert.equal(
    canRespondToDeal("SHOP_MANAGER", "PENDING", "COLLABORATOR"),
    true,
  );
  for (const role of RoleSchema.options)
    assert.equal(canRespondToDeal(role, "APPROVED", "COLLABORATOR"), false);
  assert.equal(
    canRespondToDeal("SHOP_MANAGER", "PENDING", "SHOP_MANAGER"),
    false,
  );
  assert.equal(
    canRespondToDeal("SYSTEM_MANAGER", "PENDING", "COLLABORATOR"),
    false,
  );
});
const deal = {
  productId: "98fc42f4-f231-4f41-9d2a-95d0314cb285",
  proposedCommissionRate: "20",
  targetRevenue: "2000000",
  commitmentDays: "14",
  salesCommitment: "Video review and sales campaign",
  videoReviewCommitment: true,
  scopeType: "SINGLE_PRODUCT",
};
test("VIP supports revenue KPI and rates above 16 while rejecting rates beyond 25", () => {
  assert.equal(DealInputSchema.parse(deal).proposedCommissionRate, 20);
  assert.equal(
    DealInputSchema.safeParse({ ...deal, proposedCommissionRate: 26 }).success,
    false,
  );
  assert.equal(
    DealInputSchema.safeParse({ ...deal, targetRevenue: 0 }).success,
    false,
  );
});
test("group scope needs at least two distinct products", () => {
  assert.equal(
    DealInputSchema.safeParse({
      ...deal,
      scopeType: "SELECTED_PRODUCTS",
      productIds: [deal.productId],
    }).success,
    false,
  );
  assert.equal(
    DealInputSchema.safeParse({
      ...deal,
      scopeType: "SELECTED_PRODUCTS",
      productIds: [deal.productId, "91545028-6b04-44e1-b2c1-b99701d9abe1"],
    }).success,
    true,
  );
});
test("validates EAN-13 using the checksum, not just the digit count", () => {
  assert.equal(validEan13("8938505974196"), false);
  assert.equal(validEan13("4006381333931"), true);
  assert.equal(validEan13("4006381333932"), false);
  assert.equal(validEan13("123"), false);
});
test("invalid product input shows local field errors rather than pretending the server failed", () => {
  assert.throws(() => validateInput(ProductInputSchema, {}), /title/);
});
test("chat reconnect merges duplicate IDs, preserves order, excludes another conversation", () => {
  const a = {
    id: "1",
    conversationId: "a",
    senderId: "sender",
    createdAt: "2026-11-02T00:00:00Z",
    messageText: "first",
  };
  const b = { ...a, id: "2", createdAt: "2026-11-02T00:01:00Z" };
  assert.deepEqual(
    mergeMessages(
      [
        [b, a],
        [a, { ...b, id: "secret", conversationId: "other" }],
      ],
      "a",
    ).map((item) => item.id),
    ["1", "2"],
  );
});
test("bootstrap rejects invented role aliases and missing live assignment contract", () => {
  assert.equal(RoleSchema.safeParse("ADMIN").success, false);
  assert.equal(RoleSchema.safeParse("KOL").success, false);
  assert.equal(
    BootstrapSchema.safeParse({ contractVersion: 1 }).success,
    false,
  );
});
