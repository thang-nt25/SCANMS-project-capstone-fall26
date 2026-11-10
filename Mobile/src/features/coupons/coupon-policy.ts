import type { Role } from "../../types/contracts";

/** Copy-only discovery. Legacy cached retail vouchers are excluded. */
export function isCustomerKolCoupon(value: {
  couponType?: string;
  benefitType?: string;
  fundingSource?: string;
}) {
  return (
    value.couponType === "KOL_EXCLUSIVE" &&
    value.benefitType === "GOODS" &&
    value.fundingSource === "SHOP_FUNDED"
  );
}

/** The API returns PENDING_APPROVAL, not the order status PENDING. */
export function couponActions(role: Role, status: string | undefined) {
  return {
    approve: role === "SHOP_MANAGER" && status === "PENDING_APPROVAL",
    edit:
      role === "SHOP_MANAGER" && ["ACTIVE", "PAUSED"].includes(status || ""),
    togglePause:
      role === "COLLABORATOR" && ["ACTIVE", "PAUSED"].includes(status || ""),
    remove:
      role === "COLLABORATOR" &&
      ["PENDING_APPROVAL", "REJECTED"].includes(status || ""),
    block:
      ["SHOP_MANAGER", "SYSTEM_MANAGER", "SYSTEM_ADMIN"].includes(role) &&
      ["PENDING_APPROVAL", "ACTIVE", "PAUSED"].includes(status || ""),
    unblock:
      ["SYSTEM_MANAGER", "SYSTEM_ADMIN"].includes(role) && status === "BLOCKED",
  };
}
