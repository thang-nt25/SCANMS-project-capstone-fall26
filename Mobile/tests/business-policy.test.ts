import test from "node:test";
import assert from "node:assert/strict";
import {
  canOpenModule,
  canReviewVipExceptions,
} from "../src/features/workspace/policy";
import {
  addCartLine,
  AddressInput,
  type CartItem,
} from "../src/features/customer/customer-contracts";
const product = "e227c822-38c5-49f5-9c22-b60458e3956e",
  variant = "c6bd8760-9de6-5ef6-8ccb-fecdfd7a022b",
  another = "d91cc7b7-896e-489b-a746-d044053fd4b5";
const line = (id?: string): CartItem => ({
  cartItemId: `${product}_${id || "base"}`,
  productId: product,
  variantId: id,
  title: "Test product",
  price: "10000",
  quantity: 1,
  stockQuantity: 10,
  isActive: true,
  store: { id: another, name: "Test shop" },
});
test("buyer cannot enter operations, personnel or merchant commands", () => {
  for (const feature of [
    "pricing",
    "payouts",
    "kyc",
    "staff",
    "product-edit",
    "manual-orders",
    "fraud",
    "audit",
  ])
    assert.equal(canOpenModule("CUSTOMER", feature), false);
  for (const feature of [
    "cart",
    "addresses",
    "returns",
    "identity",
    "notifications",
    "wallet",
    "coupons",
  ])
    assert.equal(canOpenModule("CUSTOMER", feature), true);
});
test("Manager has operations queues but cannot acquire Admin personnel or VIP exception powers", () => {
  for (const feature of [
    "kyc",
    "returns",
    "samples",
    "reviews",
    "pricing",
    "payouts",
    "audit",
    "fraud",
  ])
    assert.equal(canOpenModule("SYSTEM_MANAGER", feature), true);
  assert.equal(canOpenModule("SYSTEM_MANAGER", "staff"), false);
  assert.equal(canReviewVipExceptions("SYSTEM_MANAGER"), false);
  assert.equal(canReviewVipExceptions("SYSTEM_ADMIN"), true);
});
test("unknown and prototype-inherited module names are rejected", () => {
  for (const feature of ["__proto__", "constructor", "toString", "missing"])
    assert.equal(canOpenModule("SYSTEM_ADMIN", feature), false);
});
test("KOC has earning workflows without merchant or operations decisions", () => {
  for (const feature of [
    "marketing",
    "samples",
    "wallet",
    "social",
    "kyc",
    "campaigns",
  ])
    assert.equal(canOpenModule("COLLABORATOR", feature), true);
  for (const feature of ["payouts", "pricing", "product-edit", "staff"])
    assert.equal(canOpenModule("COLLABORATOR", feature), false);
});
test("cart aggregates the same SKU without changing other variants or the input snapshot", () => {
  const input = [line(variant), line(another)];
  const result = addCartLine(input, product, variant, 2);
  assert.equal(result[0].quantity, 3);
  assert.equal(result[1].quantity, 1);
  assert.equal(input[0].quantity, 1);
});
test("cart keeps base product distinct from SKU and never generates a variant ID", () => {
  const result = addCartLine([line(variant)], product, undefined, 1);
  assert.equal(result.length, 2);
  assert.equal("variantId" in result[1], false);
  assert.throws(() => addCartLine([], product, "Blue - XL", 1));
});
test("cart rejects invalid quantities, aggregate overflow and excessive number of lines", () => {
  assert.throws(() => addCartLine([], product, variant, 0));
  assert.throws(() => addCartLine([], product, variant, 1.5));
  assert.throws(() =>
    addCartLine([{ ...line(variant), quantity: 999 }], product, variant, 1),
  );
  assert.throws(() =>
    addCartLine(
      Array.from({ length: 100 }, () => line(variant)),
      another,
      undefined,
      1,
    ),
  );
});
test("shipping address requires GHN IDs, phone and detailed street address", () => {
  const value = {
    fullName: "Người thử",
    phoneNumber: "0912345678",
    provinceCode: "202",
    provinceName: "Hồ Chí Minh",
    districtCode: "1442",
    districtName: "Quận 1",
    wardCode: "20101",
    wardName: "Phường 1",
    detailAddress: "12 đường A",
    isDefault: false,
  };
  assert.equal(AddressInput.safeParse(value).success, true);
  assert.equal(
    AddressInput.safeParse({ ...value, wardCode: "" }).success,
    false,
  );
  assert.equal(
    AddressInput.safeParse({ ...value, phoneNumber: "abc" }).success,
    false,
  );
  assert.equal(
    AddressInput.safeParse({ ...value, detailAddress: " " }).success,
    false,
  );
});
