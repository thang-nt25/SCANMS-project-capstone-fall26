import { z } from "zod";
const number = z.coerce.number().finite().nonnegative();
const Card = z.object({
  type: z.string().startsWith("EXCLUSIVE_DEAL"),
  proposalId: z.string().uuid(),
  productTitle: z.string().optional(),
  storeName: z.string().optional(),
  proposedCommissionRate: number.max(25).optional(),
  targetRevenue: number.optional(),
  targetOrders: z.coerce.number().int().nonnegative().nullish(),
  commitmentDays: z.number().int().positive().optional(),
  salesCommitment: z.string().optional(),
  scopeType: z.string().optional(),
  couponTerms: z
    .object({
      discountPercent: number.optional(),
      minimumOrderAmount: number.optional(),
      maximumDiscountAmount: number.optional(),
    })
    .optional(),
});
export function parseDealCard(text?: string | null) {
  if (!text || text.length > 30000 || !text.trimStart().startsWith("{"))
    return null;
  try {
    const parsed = Card.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
