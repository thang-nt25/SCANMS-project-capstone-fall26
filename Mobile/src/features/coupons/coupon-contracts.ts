import { z } from "zod";
import { amount, required } from "../common/validation";

export const CouponSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  displayCode: z.string().optional(),
  status: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
  discountValue: amount.nullish(),
  minimumOrderAmount: amount.nullish(),
  maximumDiscountAmount: amount.nullish(),
  budgetTotal: amount.nullish(),
  usageLimitTotal: amount.nullish(),
  usageLimitPerCustomer: amount.nullish(),
  expiresAt: z.string().nullish(),
  couponType: z.string().optional(),
  fundingSource: z.string().optional(),
  benefitType: z.string().optional(),
  scopeType: z.string().optional(),
  store: z.object({ id: z.string().optional(), name: z.string() }).nullish(),
});
export type Coupon = z.infer<typeof CouponSchema>;
export const CouponPageSchema = z.object({
  data: z.array(CouponSchema),
  meta: z.object({ totalPages: z.number() }),
});
export const ProposalSchema = z
  .object({
    storeId: z.string().uuid(),
    code: z
      .string()
      .trim()
      .min(4)
      .max(20)
      .regex(
        /^(?=.*[a-zA-Z])[a-zA-Z0-9]+$/,
        "Mã cần có chữ, chỉ dùng chữ Latin và số.",
      ),
    discountValue: z.coerce.number().min(1).max(100),
    note: required.max(1000),
  })
  .transform((body) => ({
    ...body,
    code: body.code.toUpperCase(),
    discountType: "PERCENTAGE",
    scopeType: "STORE_WIDE",
  }));

export const CouponTermsSchema = z
  .object({
    discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
    discountValue: z.coerce.number().positive().max(1e12),
    minimumOrderAmount: z.coerce.number().nonnegative().max(1e12),
    maximumDiscountAmount: z.coerce.number().positive().max(1e12),
    budgetTotal: z.coerce.number().positive().max(1e12),
    usageLimitTotal: z.coerce.number().int().positive().max(1e9),
    usageLimitPerCustomer: z.coerce.number().int().positive().max(1e9),
    expiresAt: z.string().datetime({ offset: true }),
  })
  .refine(
    (body) => body.discountType !== "PERCENTAGE" || body.discountValue <= 100,
    "Mức giảm phần trăm không được vượt 100%.",
  )
  .refine(
    (body) => Date.parse(body.expiresAt) > Date.now(),
    "Hạn dùng phải ở tương lai.",
  );
