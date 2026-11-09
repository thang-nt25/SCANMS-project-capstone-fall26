import { z } from "zod";
import type { Role } from "../../types/contracts";

type ReviewableProduct = {
  moderationStatus?: string;
  createdById?: string | null;
  submittedById?: string | null;
};
export function canModerateProduct(
  role: Role,
  userId: string,
  product: ReviewableProduct,
): boolean {
  return (
    ["SYSTEM_MANAGER", "SYSTEM_ADMIN"].includes(role) &&
    product.moderationStatus === "DRAFT" &&
    product.createdById !== userId &&
    product.submittedById !== userId
  );
}
export const ProductDecisionSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().max(1000),
  })
  .refine((input) => input.status !== "REJECTED" || input.reason.length >= 3, {
    message: "Nhập lý do từ chối ít nhất 3 ký tự.",
    path: ["reason"],
  });
