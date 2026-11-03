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
    targetRevenue: z.coerce.number().positive().max(1e12),
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
