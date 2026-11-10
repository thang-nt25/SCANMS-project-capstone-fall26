import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { voucherExpiryState } from "@/utils/voucher-expiry.utils";

export interface CustomerVoucher {
  id: string;
  code: string;
  couponType: "KOL_EXCLUSIVE" | "NEW_CUSTOMER_SHIPPING";
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  remainingUses: number | null;
  expiresAt: string | null;
  scopeType: string;
  fundingSource: string;
  benefitType: "GOODS" | "SHIPPING";
  store: { id: string; name: string; slug: string };
  collaborator?: { fullName: string };
}
/** Discovery only: no customer inventory or saved selection. */
export function useCustomerVouchers(userId?: string) {
  const query = useQuery<CustomerVoucher[]>({
    queryKey: ["kol-coupon-discovery-v2", userId],
    enabled: Boolean(userId),
    staleTime: 15000,
    refetchInterval: 60000,
    queryFn: async ({ signal }) => {
      const response = await api.get("/coupons/available", {
        signal,
        headers: { "x-skip-cache": "true" },
      });
      const rows = response?.data?.data ?? response?.data ?? response;
      if (!Array.isArray(rows))
        throw new Error("Không tải được mã ưu đãi KOL.");
      return rows;
    },
  });
  const now = Date.now();
  const vouchers = (query.data || []).filter(
    (row) =>
      ((row.couponType === "KOL_EXCLUSIVE" && row.benefitType === "GOODS" && row.fundingSource === "SHOP_FUNDED") ||
       (row.code === "SCANMSFREESHIP" && row.benefitType === "SHIPPING" && row.fundingSource === "PLATFORM_FUNDED")) &&
      voucherExpiryState(row.expiresAt, now) !== "expired",
  );
  return {
    vouchers,
    now,
    loading: query.isLoading,
    error: query.isError,
    retry: query.refetch,
  };
}
