import { z } from "zod";
const moneyInput = z.coerce
  .number()
  .positive()
  .max(1e12)
  .multipleOf(0.01, "Số tiền chỉ được có tối đa 2 chữ số thập phân.");

/** Matches SetFloorPriceDto; dynamic variant fields become the backend's nested array. */
export function floorPriceInput(variantIds: readonly string[]) {
  return z
    .object({
      floorPrice: moneyInput,
      reason: z.string().trim().min(10).max(1000),
      ...Object.fromEntries(variantIds.map((id) => [id, moneyInput])),
    })
    .transform((body) => ({
      floorPrice: body.floorPrice,
      reason: body.reason,
      variants: variantIds.map((id) => ({
        variantId: id,
        floorPrice: body[id as keyof typeof body] as number,
      })),
    }));
}
export const promotionReviewInput = z
  .object({
    approve: z.enum(["yes", "no"]),
    note: z.string().trim().min(10).max(1000),
  })
  .transform((body) => ({ approve: body.approve === "yes", note: body.note }));
