import { z } from "zod";
import type { Role } from "../../types/contracts";
export function canRespondToDeal(
  role: Role,
  status: string,
  initiatorRole?: string,
) {
  return (
    status === "PENDING" &&
    ((role === "COLLABORATOR" && initiatorRole === "SHOP_MANAGER") ||
      (role === "SHOP_MANAGER" && initiatorRole === "COLLABORATOR"))
  );
}
export const DealInputSchema = z
  .object({
    productId: z.string().uuid("Chọn sản phẩm hợp lệ."),
    proposedCommissionRate: z.coerce.number().min(10).max(25),
    targetOrders: z.coerce.number().int().min(1).max(1000000),
    commitmentDays: z.coerce.number().int().min(1).max(366),
    salesCommitment: z.string().trim().min(5).max(1000),
    videoReviewCommitment: z.literal(true),
    scopeType: z.enum(["SINGLE_PRODUCT", "SELECTED_PRODUCTS", "STORE_WIDE"]),
    productIds: z.array(z.string().uuid()).max(100).optional(),
  })
  .superRefine((input, context) => {
    if (
      input.scopeType === "SELECTED_PRODUCTS" &&
      new Set([input.productId, ...(input.productIds || [])]).size < 2
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Chọn ít nhất hai sản phẩm cùng gian hàng.",
        path: ["productIds"],
      });
  });

/** New agreements use orders; preserve the unit of legacy revenue agreements. */
export function dealKpiDisplay(deal: {
  targetOrders?: number | null;
  targetRevenue?: number | string | null;
}) {
  if (deal.targetOrders != null && deal.targetOrders > 0)
    return {
      label: "KPI số đơn",
      value: `${deal.targetOrders.toLocaleString("vi-VN")} đơn`,
    };
  if (deal.targetRevenue != null && Number(deal.targetRevenue) > 0)
    return {
      label: "KPI doanh thu (cũ)",
      value: `${Number(deal.targetRevenue).toLocaleString("vi-VN")} đ`,
    };
  return { label: "KPI", value: "Chưa có dữ liệu" };
}
