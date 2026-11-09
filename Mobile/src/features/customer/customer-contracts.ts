import { z } from "zod";
import { amount, required } from "../common/validation";
export const AddressSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phoneNumber: z.string(),
  provinceCode: z.string().nullish(),
  provinceName: z.string(),
  districtCode: z.string().nullish(),
  districtName: z.string(),
  wardCode: z.string().nullish(),
  wardName: z.string(),
  detailAddress: z.string(),
  isDefault: z.boolean(),
  latitude: z.coerce.number().min(-90).max(90).nullish(),
  longitude: z.coerce.number().min(-180).max(180).nullish(),
});
export type Address = z.infer<typeof AddressSchema>;
export const AddressInput = AddressSchema.omit({ id: true }).extend({
  fullName: required.max(150),
  phoneNumber: z.string().regex(/^\+?\d{9,15}$/, "Số điện thoại không hợp lệ."),
  provinceCode: required,
  districtCode: required,
  wardCode: required,
  detailAddress: required.max(500),
}).refine(value => (value.latitude == null) === (value.longitude == null), { message: "Cần đủ vĩ độ và kinh độ.", path: ["latitude"] });
export const CartItemSchema = z.object({
  cartItemId: z.string(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullish(),
  variantName: z.string().nullish(),
  title: z.string(),
  imageUrl: z.string().nullish(),
  price: amount,
  quantity: z.number().int(),
  stockQuantity: z.number(),
  isActive: z.boolean(),
  store: z.object({ id: z.string(), name: z.string() }),
});
export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  warnings: z.array(z.string()).optional(),
});
export type CartItem = z.infer<typeof CartItemSchema>;
export function addCartLine(
  items: CartItem[],
  productId: string,
  variantId: string | undefined,
  quantity: number,
) {
  const match = items.find(
    (item) =>
      item.productId === productId &&
      (item.variantId || undefined) === variantId,
  );
  const rows = items.map((item) => ({
    productId: item.productId,
    ...(item.variantId ? { variantId: item.variantId } : {}),
    quantity: item.quantity,
  }));
  if (match) rows[items.indexOf(match)].quantity += quantity;
  else rows.push({ productId, ...(variantId ? { variantId } : {}), quantity });
  return z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1).max(999),
      }),
    )
    .max(100)
    .parse(rows);
}
