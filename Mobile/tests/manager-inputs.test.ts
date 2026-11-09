import test from "node:test";
import assert from "node:assert/strict";
import {
  canModerateProduct,
  ProductDecisionSchema,
} from "../src/features/moderation/moderation-policy";
import {
  floorPriceInput,
  promotionReviewInput,
} from "../src/features/pricing/pricing-inputs";
import { ApiClient } from "../src/services/api/client";

const variantId = "e227c822-38c5-49f5-9c22-b60458e3956e";
test("Manager and Admin can decide only pending records created and submitted by someone else", () => {
  for (const role of ["SYSTEM_MANAGER", "SYSTEM_ADMIN"] as const) {
    assert.equal(
      canModerateProduct(role, "reviewer", {
        moderationStatus: "DRAFT",
        createdById: "maker",
        submittedById: "submitter",
      }),
      true,
    );
    for (const status of ["APPROVED", "REJECTED", undefined])
      assert.equal(
        canModerateProduct(role, "reviewer", { moderationStatus: status }),
        false,
      );
    assert.equal(
      canModerateProduct(role, "reviewer", {
        moderationStatus: "DRAFT",
        createdById: "reviewer",
      }),
      false,
    );
    assert.equal(
      canModerateProduct(role, "reviewer", {
        moderationStatus: "DRAFT",
        submittedById: "reviewer",
      }),
      false,
    );
  }
  for (const role of ["CUSTOMER", "COLLABORATOR", "SHOP_MANAGER"] as const)
    assert.equal(
      canModerateProduct(role, "reviewer", { moderationStatus: "DRAFT" }),
      false,
    );
});
test("product rejection requires the backend minimum reason and enforces the maximum", () => {
  assert.equal(
    ProductDecisionSchema.safeParse({ status: "REJECTED", reason: "  " })
      .success,
    false,
  );
  assert.equal(
    ProductDecisionSchema.safeParse({ status: "REJECTED", reason: "ab" })
      .success,
    false,
  );
  assert.deepEqual(
    ProductDecisionSchema.parse({ status: "REJECTED", reason: "  Sai nhãn  " }),
    { status: "REJECTED", reason: "Sai nhãn" },
  );
  assert.equal(
    ProductDecisionSchema.safeParse({
      status: "REJECTED",
      reason: "x".repeat(1001),
    }).success,
    false,
  );
  assert.equal(
    ProductDecisionSchema.safeParse({ status: "APPROVED", reason: "" }).success,
    true,
  );
});
test("MAP form maps numeric strings to the nested variant payload used by SetFloorPriceDto", () => {
  const input = {
    floorPrice: "150000",
    reason: "Đối chiếu giá niêm yết",
    [variantId]: "175000",
  };
  assert.deepEqual(floorPriceInput([variantId]).parse(input), {
    floorPrice: 150000,
    reason: input.reason,
    variants: [{ variantId, floorPrice: 175000 }],
  });
});
test("MAP blocks blank, negative, excessive precision and out-of-range money before sending", () => {
  const schema = floorPriceInput([variantId]);
  for (const value of ["", "0", "-1", "12.001", "1000000000001", "NaN"]) {
    assert.equal(
      schema.safeParse({
        floorPrice: value,
        reason: "Đối chiếu giá sản phẩm",
        [variantId]: "100000",
      }).success,
      false,
    );
    assert.equal(
      schema.safeParse({
        floorPrice: "100000",
        reason: "Đối chiếu giá sản phẩm",
        [variantId]: value,
      }).success,
      false,
    );
  }
  assert.equal(
    schema.safeParse({
      floorPrice: "100000.25",
      reason: "Đối chiếu giá sản phẩm",
      [variantId]: "100000.01",
    }).success,
    true,
  );
});
test("promotion decisions send a boolean and require a reason matching ReviewPricePromotionDto", () => {
  assert.deepEqual(
    promotionReviewInput.parse({
      approve: "no",
      note: "  Ngân sách chưa phù hợp  ",
    }),
    { approve: false, note: "Ngân sách chưa phù hợp" },
  );
  assert.equal(
    promotionReviewInput.parse({
      approve: "yes",
      note: "Ngân sách đã được đối chiếu",
    }).approve,
    true,
  );
  assert.equal(
    promotionReviewInput.safeParse({
      approve: "true",
      note: "Ngân sách đã được đối chiếu",
    }).success,
    false,
  );
  assert.equal(
    promotionReviewInput.safeParse({ approve: "yes", note: "ngắn" }).success,
    false,
  );
});
test("the MAP command reaches the API as JSON numbers and preserves the authenticated route", async () => {
  const client = new ApiClient(
    "http://localhost:3000/api",
    { get: () => "test-manager-token", onUnauthorized() {} },
    async (url, options) => {
      assert.equal(
        String(url),
        `http://localhost:3000/api/pricing/products/${variantId}/floor`,
      );
      assert.equal(options?.method, "PUT");
      const headers = options?.headers as Record<string, string>;
      assert.equal(headers.Authorization, "Bearer test-manager-token");
      const body = JSON.parse(String(options?.body));
      assert.equal(body.floorPrice, 150000);
      assert.deepEqual(body.variants, [{ variantId, floorPrice: 175000 }]);
      return new Response(
        JSON.stringify({ success: true, data: { updated: true } }),
      );
    },
  );
  const body = floorPriceInput([variantId]).parse({
    floorPrice: "150000",
    reason: "Giá sàn được phê duyệt",
    [variantId]: "175000",
  });
  assert.deepEqual(
    await client.request(`/pricing/products/${variantId}/floor`, {
      method: "PUT",
      body,
    }),
    { updated: true },
  );
});
