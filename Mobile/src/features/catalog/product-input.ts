import { z } from "zod";
export function validEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const sum = value
    .slice(0, 12)
    .split("")
    .reduce(
      (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
      0,
    );
  return (10 - (sum % 10)) % 10 === Number(value[12]);
}
const text = z.string().trim().min(1, "Cần điền trường bắt buộc.");
const dimension = z.coerce.number().int().min(1).max(150);
export const ProductInputSchema = z
  .object({
    storeId: z.string().uuid(),
    title: text,
    sku: text,
    categoryName: text,
    description: text,
    ingredients: text,
    origin: text,
    labelInfo: text,
    imageUrl: z.string().url(),
    subImages: z.array(z.string().url()).max(4),
    originProofLinks: z.array(z.string().url()).min(1),
    labelProofLinks: z.array(z.string().url()).min(1),
    barcode: z
      .string()
      .refine(validEan13, "Barcode EAN-13 sai định dạng hoặc số kiểm tra."),
    packageWeight: z.coerce.number().int().min(1).max(30000),
    packageLength: dimension,
    packageWidth: dimension,
    packageHeight: dimension,
    price: z.coerce.number().positive(),
    stockQuantity: z.number().int().nonnegative(),
    isAffiliateEnabled: z.boolean(),
    sampleEnabled: z.boolean(),
    sampleQuota: z.number().int().nonnegative(),
    variants: z
      .array(
        z.object({
          name: text,
          sku: text,
          price: z.coerce.number().positive(),
          stockQuantity: z.coerce.number().int().nonnegative(),
          imageUrl: z.string().url(),
          attributes: z.record(z.string(), z.string().trim().min(1)),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((input, context) => {
    if (input.sampleEnabled && input.sampleQuota < 1)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bật cấp mẫu cần có suất mẫu lớn hơn 0.",
        path: ["sampleQuota"],
      });
    if (
      new Set(input.variants.map((item) => item.sku.trim().toLowerCase()))
        .size !== input.variants.length
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SKU phân loại không được trùng nhau.",
        path: ["variants"],
      });
  });
