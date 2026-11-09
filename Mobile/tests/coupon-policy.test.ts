import test from "node:test";
import assert from "node:assert/strict";
import { statusText } from "../src/types/contracts";
import {
  couponActions,
  isCustomerKolCoupon,
} from "../src/features/coupons/coupon-policy";
import {
  CouponSchema,
  CouponTermsSchema,
  ProposalSchema,
} from "../src/features/coupons/coupon-contracts";
test("customer discovery shows only explicitly typed KOL goods coupons", () => {
  assert.equal(
    isCustomerKolCoupon({
      couponType: "KOL_EXCLUSIVE",
      fundingSource: "SHOP_FUNDED",
      benefitType: "GOODS",
    }),
    true,
  );
  for (const value of [
    {},
    { fundingSource: "SHOP_FUNDED", benefitType: "GOODS" },
    {
      couponType: "KOL_EXCLUSIVE",
      fundingSource: "PLATFORM_FUNDED",
      benefitType: "GOODS",
    },
    {
      couponType: "KOL_EXCLUSIVE",
      fundingSource: "SHOP_FUNDED",
      benefitType: "SHIPPING",
    },
  ])
    assert.equal(isCustomerKolCoupon(value), false);
});

test("Shop approval uses the coupon API state and cannot be exposed to other roles", () => {
  assert.equal(statusText("PENDING_APPROVAL"), "Chờ Shop duyệt");
  assert.equal(couponActions("SHOP_MANAGER", "PENDING_APPROVAL").approve, true);
  assert.equal(couponActions("SHOP_MANAGER", "PENDING").approve, false);
  for (const role of [
    "CUSTOMER",
    "COLLABORATOR",
    "SYSTEM_MANAGER",
    "SYSTEM_ADMIN",
  ] as const)
    assert.equal(couponActions(role, "PENDING_APPROVAL").approve, false);
  assert.equal(couponActions("COLLABORATOR", "PAUSED").togglePause, true);
  assert.equal(couponActions("COLLABORATOR", "BLOCKED").togglePause, false);
  assert.equal(couponActions("COLLABORATOR", "ACTIVE").remove, false);
  assert.equal(couponActions("SYSTEM_MANAGER", "BLOCKED").unblock, true);
  assert.equal(couponActions("SHOP_MANAGER", "BLOCKED").unblock, false);
});

test("KOL proposals normalize the code and validate the registered Shop and percentage", () => {
  const proposal = {
    storeId: "550e8400-e29b-41d4-a716-446655440000",
    code: "  thinh10  ",
    discountValue: "10",
    note: "Mã cho người theo dõi",
  };
  assert.equal(ProposalSchema.parse(proposal).code, "THINH10");
  for (const patch of [
    { code: "12345" },
    { storeId: "wrong" },
    { discountValue: "101" },
    { discountValue: "NaN" },
  ])
    assert.equal(
      ProposalSchema.safeParse({ ...proposal, ...patch }).success,
      false,
    );
});

test("Shop terms accept Prisma decimal strings but reject fractional usage, nonfinite amounts and expired dates", () => {
  const terms = {
    discountType: "PERCENTAGE",
    discountValue: "10",
    minimumOrderAmount: "0",
    maximumDiscountAmount: "50000",
    budgetTotal: "1000000",
    usageLimitTotal: "100",
    usageLimitPerCustomer: "1",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  assert.equal(CouponTermsSchema.parse(terms).budgetTotal, 1000000);
  for (const patch of [
    { usageLimitTotal: "1.5" },
    { usageLimitPerCustomer: "0" },
    { budgetTotal: "Infinity" },
    { discountValue: "101" },
    { expiresAt: "2000-01-01T00:00:00Z" },
  ])
    assert.equal(
      CouponTermsSchema.safeParse({ ...terms, ...patch }).success,
      false,
    );
  assert.equal(
    CouponSchema.parse({
      id: "coupon",
      displayCode: "KOL10",
      discountType: "PERCENTAGE",
      discountValue: "10.00",
    }).discountValue,
    "10.00",
  );
});
