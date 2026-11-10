import { z } from "zod";
import type { Product } from "../../types/contracts";
import type { Address } from "../customer/customer-contracts";

export const PurchaseLine = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).max(999),
});
export type PurchaseLine = z.infer<typeof PurchaseLine>;

/** A direct purchase contains only this selection; it never replaces the saved cart. */
export function buyNowSelection(
  product: Product,
  variantId: string | undefined,
  quantity: number,
) {
  const line = PurchaseLine.parse({
    productId: product.id,
    ...(variantId ? { variantId } : {}),
    quantity,
  });
  const variants = (product.variants || []).filter(
    (item) => item.isActive !== false,
  );
  const chosen = variants.find((item) => item.id === variantId);
  if (variants.length && !chosen)
    throw new Error("Vui lòng chọn phân loại sản phẩm.");
  if (variantId && !chosen)
    throw new Error("Phân loại đã chọn không còn khả dụng.");
  if (
    product.isActive === false ||
    (chosen?.stockQuantity ?? product.stockQuantity ?? 0) < quantity
  )
    throw new Error("Số lượng vượt quá tồn kho hiện tại.");
  return line;
}

export function deliveryAddress(address: Address) {
  if (
    [
      address.detailAddress,
      address.wardName,
      address.districtName,
      address.provinceName,
    ].some((part) => !part.trim())
  )
    throw new Error(
      "Địa chỉ cần đủ số nhà, phường/xã, quận/huyện và tỉnh/thành.",
    );
  // Some older address-book records already contain the full administrative address.
  const canonical = (part: string) =>
    part
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(
        /^(thanh pho|tp\.?|tinh|quan|huyen|phuong|xa|thi xa|thi tran)\s+/,
        "",
      )
      .trim();
  const parts = address.detailAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of [
    address.wardName,
    address.districtName,
    address.provinceName,
  ])
    if (!parts.some((existing) => canonical(existing) === canonical(part)))
      parts.push(part.trim());
  return parts.join(", ");
}
export const PurchaseInput = z.object({
  storeId: z.string().uuid(),
  customerName: z
    .string()
    .trim()
    .min(2)
    .max(150)
    .regex(/^[^<>{}\\]+$/),
  customerPhone: z
    .string()
    .trim()
    .regex(
      /^(0\d{9}|\+84\d{9})$/,
      "Số điện thoại phải gồm 10 chữ số hoặc +84.",
    ),
  shippingAddress: z
    .string()
    .trim()
    .min(5)
    .max(500)
    .regex(/^[^<>]+$/),
  policyAccepted: z.literal(true),
  paymentMethod: z.enum(["WALLET", "PAYOS"]),
  couponCode: z.string().trim().max(100).optional(),
  orderNotes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().uuid(),
  items: z.array(PurchaseLine).length(1),
});
export type PurchaseInput = z.infer<typeof PurchaseInput>;
export const CreatedPurchase = z.object({
  publicOrderCode: z.string().min(1),
  finalAmount: z.number().finite().nonnegative(),
  subtotalAmount: z.number().finite().nonnegative(),
  discountAmount: z.number().finite().nonnegative(),
  shippingFee: z.number().finite().nonnegative(),
  paymentMethod: z.string(),
  paymentStatus: z.string(),
  status: z.string(),
});
export type CreatedPurchase = z.infer<typeof CreatedPurchase>;
export const PurchaseAttempt = z.object({
  payload: PurchaseInput,
  result: CreatedPurchase.optional(),
});
export type PurchaseAttempt = z.infer<typeof PurchaseAttempt>;
export const PaymentStatus = z.object({
  paymentStatus: z.string(),
  providerStatus: z.string().nullish(),
  orderStatus: z.string(),
});
export const PaymentLink = z.object({
  paymentStatus: z.string(),
  qrCode: z.string().nullish(),
  checkoutUrl: z.string().nullish(),
  accountNumber: z.string().nullish(),
  accountName: z.string().nullish(),
});
