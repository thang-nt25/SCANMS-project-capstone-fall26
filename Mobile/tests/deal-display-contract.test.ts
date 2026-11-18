import test from "node:test";
import assert from "node:assert/strict";
import { DealSchema } from "../src/types/contracts";

test("VIP contract retains product thumbnail, scope and timing from backend", () => {
  const deal = DealSchema.parse({ id: "deal", status: "PENDING_ADMIN_APPROVAL", proposedCommissionRate: 20, targetRevenue: 100000000, commitmentDays: 14, scopeType: "SELECTED_PRODUCTS", scopeProducts: [{ productId: "one" }, { productId: "two" }], product: { title: "Sản phẩm", imageUrl: "/assets/product.jpg" }, createdAt: "2026-11-05T01:00:00.000Z", commitmentStartedAt: null, commitmentEndsAt: null });
  assert.equal(deal.product?.imageUrl, "/assets/product.jpg");
  assert.equal(deal.scopeProducts?.length, 2);
  assert.equal(deal.commitmentStartedAt, null);
  assert.equal(deal.createdAt, "2026-11-05T01:00:00.000Z");
});
test("older VIP responses without thumbnails or dates stay usable", () => {
  const deal = DealSchema.parse({ id: "legacy", status: "PENDING", proposedCommissionRate: "14", product: { title: "Mẫu cũ" } });
  assert.equal(deal.product?.imageUrl, undefined);
  assert.equal(deal.commitmentEndsAt, undefined);
});
