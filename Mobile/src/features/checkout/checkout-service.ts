import { z } from "zod";
import type { ApiClient } from "../../services/api/client";
import { unwrapEnvelope } from "../../services/api/client";
import {
  PurchaseLine,
  PurchaseInput,
  CreatedPurchase,
  PurchaseAttempt,
} from "./checkout-contracts";

const Validation = z.object({
  isValid: z.boolean(),
  warnings: z.array(z.string()),
  items: z
    .array(
      z.object({
        productId: z.string(),
        currentPrice: z.number().finite().nonnegative(),
        stockQuantity: z.number(),
        isAvailable: z.boolean(),
        store: z.object({ id: z.string() }),
      }),
    )
    .length(1),
});
export type CheckoutQuote = {
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  couponCode?: string;
};
/** Reuse the web's quote/validation endpoints; prices and shipping are never submitted as authority. */
export async function quotePurchase(
  client: Pick<ApiClient, "request">,
  input: {
    line: PurchaseLine;
    storeId: string;
    address: string;
    phone: string;
    couponCode: string;
  },
  signal?: AbortSignal,
): Promise<CheckoutQuote> {
  const line = PurchaseLine.parse(input.line);
  const validation = Validation.parse(
    unwrapEnvelope(
      await client.request("/orders/validate-cart", {
        method: "POST",
        body: { items: [line] },
        signal,
      }),
    ),
  );
  const item = validation.items[0];
  if (
    !validation.isValid ||
    !item.isAvailable ||
    item.stockQuantity < line.quantity ||
    item.productId !== line.productId ||
    item.store.id !== input.storeId
  )
    throw new Error(
      validation.warnings.join("\n") ||
        "Sản phẩm không còn đủ điều kiện đặt mua.",
    );
  const shipping = z
    .object({ totalFee: z.number().finite().nonnegative() })
    .parse(
      unwrapEnvelope(
        await client.request("/shipping/ghn/quote-address", {
          method: "POST",
          body: {
            storeId: input.storeId,
            address: input.address,
            items: [line],
          },
          signal,
          timeout: 30000,
        }),
      ),
    );
  const subtotal = item.currentPrice * line.quantity;
  let discount = 0,
    couponCode: string | undefined;
  const code = input.couponCode.trim().toUpperCase();
  if (code) {
    const coupon = z
      .object({
        valid: z.literal(true),
        code: z.string().min(1),
        discountAmount: z.number().finite().nonnegative(),
      })
      .parse(
        unwrapEnvelope(
          await client.request("/coupons/validate", {
            method: "POST",
            body: {
              code,
              storeId: input.storeId,
              customerPhone: input.phone,
              items: [line],
              hasProductDiscount: false,
              hasShopVoucher: false,
              hasPlatformVoucher: false,
            },
            signal,
          }),
        ),
      );
    if (coupon.discountAmount > subtotal)
      throw new Error("Mức giảm mã KOL không hợp lệ.");
    discount = coupon.discountAmount;
    couponCode = coupon.code;
  }
  return {
    subtotal,
    shippingFee: shipping.totalFee,
    discount,
    total: subtotal - discount + shipping.totalFee,
    couponCode,
  };
}

export interface AttemptStorage {
  get(): Promise<string | null>;
  set(value: string): Promise<void>;
  remove(): Promise<void>;
}
/** Save before POST. A timeout/remount retries the exact payload and key, never a second order. */
export class PurchaseCoordinator {
  private attempt: PurchaseAttempt | null = null;
  private running = false;
  constructor(
    private client: Pick<ApiClient, "request">,
    private storage: AttemptStorage,
  ) {}
  async restore() {
    const saved = await this.storage.get();
    this.attempt = saved ? PurchaseAttempt.parse(JSON.parse(saved)) : null;
    return this.attempt;
  }
  async submit(input?: PurchaseInput) {
    if (this.running) throw new Error("Đang xử lý đơn hàng.");
    this.running = true;
    try {
      if (this.attempt?.result) return this.attempt.result;
      const payload = this.attempt?.payload || PurchaseInput.parse(input);
      this.attempt = { payload };
      // If storage fails, no order is sent. A successful POST with a failed response save
      // still has its original key on disk and is recovered by backend idempotency.
      await this.storage.set(JSON.stringify(this.attempt));
      const result = CreatedPurchase.parse(
        unwrapEnvelope(
          await this.client.request("/orders", {
            method: "POST",
            body: payload,
            timeout: 60000,
          }),
        ),
      );
      this.attempt = { payload, result };
      await this.storage.set(JSON.stringify(this.attempt));
      return result;
    } finally {
      this.running = false;
    }
  }
  async clear() {
    if (this.running) throw new Error("Đang xử lý đơn hàng.");
    await this.storage.remove();
    this.attempt = null;
  }
}
