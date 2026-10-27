import type { CheckoutShopGroup } from '../components/checkout/CheckoutItemsSection';
import type { VoucherSlot } from './voucher-intent';

type Post = (path: string, body: Record<string, unknown>) => Promise<unknown>;
interface Applied { code: string; discountAmount: number; storeId: string; storeName: string; discountType?: string }
interface ValidationOptions {
  code: string;
  groups: CheckoutShopGroup[];
  shippingFees: Record<string, number>;
  shopDiscounts: Record<string, { code: string; discountAmount: number }>;
  customerPhone?: string;
  slot?: VoucherSlot;
  storeId?: string;
}

/** Preview only: never claims a voucher, creates an order or spends its quota. */
export async function validateCheckoutVoucher(post: Post, options: ValidationOptions): Promise<Applied & { slot: VoucherSlot }> {
  const code = options.code.trim().toUpperCase();
  const groups = options.groups.filter(group => !options.storeId || group.store.id === options.storeId);
  if (!code || !groups.length) throw new Error('Vui lòng chọn sản phẩm trước khi áp dụng voucher.');
  let lastMessage = 'Voucher không áp dụng được cho sản phẩm trong đơn.';
  for (const slot of options.slot ? [options.slot] : ['SHOP', 'PLATFORM', 'SHIPPING'] as const) {
    for (const group of groups) {
      try {
        const shop = options.shopDiscounts[group.store.id];
        const response: any = await post(slot === 'SHOP' ? '/coupons/validate' : '/coupons/preview-stacked', {
          code, storeId: group.store.id, customerPhone: options.customerPhone?.trim() || undefined,
          ...(slot === 'SHOP' ? {
            items: group.items.map(item => ({ productId: item.productId, variantId: item.variantId || undefined, quantity: item.quantity })),
          } : {
            benefitType: slot === 'SHIPPING' ? 'SHIPPING' : 'GOODS',
            goodsSubtotal: group.subtotal,
            shippingFee: options.shippingFees[group.store.id] || 0,
            shopDiscount: shop?.discountAmount || 0,
            shopCouponCode: shop?.code,
          }),
        });
        const result = response?.data?.data ?? response?.data ?? response;
        const amount = Number(result?.discountAmount);
        const base = slot === 'SHIPPING' ? options.shippingFees[group.store.id] || 0 : group.subtotal;
        if ((slot === 'SHOP' && result?.valid !== true) || !Number.isFinite(amount) || amount <= 0 || amount > base) {
          throw new Error(result?.message || 'Voucher chưa đạt điều kiện áp dụng.');
        }
        return { slot, code: result.code || code, discountAmount: amount, discountType: result.discountType,
          storeId: group.store.id, storeName: group.store.name };
      } catch (error: any) {
        const status = error?.status ?? error?.response?.status;
        // A transport/auth/server failure is not evidence that a code is invalid.
        if (status === 401 || status === 403 || status === 429 || status >= 500 || ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(error?.code)) throw error;
        lastMessage = error?.response?.data?.message || error?.message || lastMessage;
      }
    }
  }
  throw new Error(lastMessage);
}
