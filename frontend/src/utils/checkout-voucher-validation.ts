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
  if (options.slot && options.slot !== 'SHOP')
    throw new Error('Chỉ hỗ trợ mã ưu đãi độc quyền KOL cho tiền hàng.');
  const groups = options.groups.filter(group => !options.storeId || group.store.id === options.storeId);
  if (!code || !groups.length) throw new Error('Vui lòng chọn sản phẩm trước khi áp dụng voucher.');
  let lastMessage = 'Voucher không áp dụng được cho sản phẩm trong đơn.';
  for (const slot of ['SHOP'] as const) {
    for (const group of groups) {
      try {
        const response: any = await post('/coupons/validate', {
          code, storeId: group.store.id, customerPhone: options.customerPhone?.trim() || undefined,
            items: group.items.map(item => ({ productId: item.productId, variantId: item.variantId || undefined, quantity: item.quantity })),
        });
        const result = response?.data?.data ?? response?.data ?? response;
        const amount = Number(result?.discountAmount);
        if (result?.valid !== true || !Number.isFinite(amount) || amount <= 0 || amount > group.subtotal) {
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
