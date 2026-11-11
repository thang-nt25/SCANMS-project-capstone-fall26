import { useState } from 'react';
import { AlertCircle, Loader2, MessageSquare, Pencil, ShoppingBag, ShoppingCart, Store, Tag, Truck } from 'lucide-react';
import type { CartItem } from '../../context/CartContext';
import { formatMoney, getSafeProductImageUrl } from '../../utils/marketplace.utils';
import type { AppliedShopVoucher } from './ScanmsCheckoutVoucherModal';

export interface CheckoutShopGroup { store: CartItem['store']; items: CartItem[]; subtotal: number }

export interface CheckoutItemsSectionProps {
  groups: CheckoutShopGroup[];
  shippingFees: Record<string, number>;
  notes: string;
  onNotesChange: (value: string) => void;
  onChat: (store: CartItem['store']) => void;
  onEditCart: () => void;
  onContinueShopping: () => void;
  appliedCoupons?: Record<string, AppliedShopVoucher>;
  onApplyCoupon?: (storeId: string, code: string) => Promise<void> | void;
  onRemoveCoupon?: (storeId: string) => void;
  couponLoadingStoreId?: string | null;
  couponErrors?: Record<string, string | null>;
  onClearCouponError?: (storeId: string) => void;
}

function ShopVoucherRow({
  storeId,
  storeName,
  applied,
  isLoading,
  errorMsg,
  onApply,
  onRemove,
  onClearError,
}: {
  storeId: string;
  storeName: string;
  applied?: AppliedShopVoucher;
  isLoading: boolean;
  errorMsg?: string | null;
  onApply?: (storeId: string, code: string) => Promise<void> | void;
  onRemove?: (storeId: string) => void;
  onClearError?: (storeId: string) => void;
}) {
  const [code, setCode] = useState('');

  return (
    <div className="checkout-shop-voucher px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#FFFDF9] via-[#FAF6EE] to-[#FFFDF9] border-t border-[#EEDFC6]">
      {applied ? (
        <div className="flex items-center justify-between gap-3 p-3 bg-gradient-to-r from-[#FBF5EB] to-[#FAF8F5] border border-amber-300 rounded-xl shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-[#EEDFC6] flex items-center justify-center shrink-0 text-[#B88E4F] shadow-2xs">
              <Tag size={15} />
            </div>
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 min-w-0">
              <span className="font-mono font-black text-xs text-[#8F682E] bg-white px-2.5 py-0.5 rounded-md border border-[#EEDFC6] shadow-2xs">
                {applied.code}
              </span>
              <span className="text-xs font-extrabold text-[#059669]">
                −{formatMoney(applied.discountAmount)}
              </span>
              <span className="text-[11px] text-[#7D715E] hidden md:inline font-medium">
                (Ưu đãi KOC cho {storeName})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove?.(storeId)}
            className="px-3 py-1.5 rounded-lg border border-[#EAE4D7] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#7D715E] hover:text-[#DC2626] transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            Hủy mã
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5 text-xs text-[#7D715E]">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#EEDFC6] flex items-center justify-center text-[#B88E4F] shrink-0 shadow-2xs">
                <Tag size={14} />
              </div>
              <span className="font-bold text-[#1A1612]">Mã ưu đãi KOC của Shop:</span>
            </div>
            <div className="flex items-center gap-2 flex-1 sm:flex-initial min-w-[260px] max-w-[380px]">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (errorMsg) onClearError?.(storeId);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (code.trim() && !isLoading) {
                      void onApply?.(storeId, code.trim());
                    }
                  }
                }}
                placeholder="Nhập mã KOC (VD: THAONHI16)"
                className="flex-1 min-h-[40px] px-3.5 py-1.5 text-xs font-mono font-bold uppercase rounded-xl border border-[#EAE4D7] bg-white text-[#1A1612] placeholder:text-[#7D715E] placeholder:font-sans placeholder:normal-case focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 focus:outline-none transition-all shadow-2xs"
              />
              <button
                type="button"
                disabled={isLoading || !code.trim()}
                onClick={() => {
                  if (code.trim() && !isLoading) {
                    void onApply?.(storeId, code.trim());
                  }
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-gradient-to-r from-[#EA580C] via-[#D97706] to-[#C59B58] hover:from-[#C2410C] hover:via-[#B45309] hover:to-[#B88E4F] text-white text-xs font-bold transition-all shadow-xs hover:shadow-amber-500/25 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                {isLoading ? <Loader2 size={13} className="animate-spin" /> : 'Áp dụng'}
              </button>
            </div>
          </div>
          {errorMsg && (
            <div className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 bg-red-50 text-[#DC2626] border border-red-200">
              <AlertCircle size={13} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CheckoutItemsSection({
  groups,
  shippingFees,
  notes,
  onNotesChange,
  onChat,
  onEditCart,
  onContinueShopping,
  appliedCoupons,
  onApplyCoupon,
  onRemoveCoupon,
  couponLoadingStoreId,
  couponErrors,
  onClearCouponError,
}: CheckoutItemsSectionProps) {
  return (
    <section
      className="checkout-section checkout-products min-w-0 border border-[#EAE4D7] rounded-2xl bg-white text-left shadow-xs overflow-hidden"
      aria-labelledby="checkout-products-title"
    >
      <header className="checkout-section-heading flex items-center justify-between flex-wrap gap-3 p-4 sm:p-5 border-b border-[#EAE4D7] bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0 shadow-2xs">
            <ShoppingBag size={17} aria-hidden="true" />
          </div>
          <div>
            <h2 id="checkout-products-title" className="text-sm sm:text-base font-bold text-[#1A1612]">
              Sản phẩm đặt mua
            </h2>
            <p className="text-[11px] text-[#7D715E]">Kiểm tra danh sách và mức giảm giá theo từng cửa hàng</p>
          </div>
        </div>
        <div className="checkout-products-actions flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={onEditCart}
            className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 border border-[#EAE4D7] hover:border-[#C59B58] rounded-xl bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#1A1612] transition-colors shadow-2xs cursor-pointer"
          >
            <Pencil size={13} className="text-[#B88E4F]" />
            <span>Sửa giỏ hàng</span>
          </button>
          <button
            type="button"
            onClick={onContinueShopping}
            className="inline-flex items-center justify-center gap-1.5 min-h-[36px] px-3 py-1.5 border border-[#EAE4D7] hover:border-[#C59B58] rounded-xl bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#1A1612] transition-colors shadow-2xs cursor-pointer"
          >
            <ShoppingCart size={13} className="text-[#B88E4F]" />
            <span>Mua thêm</span>
          </button>
        </div>
      </header>

      <div
        className="checkout-product-columns grid grid-cols-[minmax(0,1fr)_140px_90px_140px] gap-4 px-6 py-2.5 bg-[#FAF8F5] border-b border-[#EAE4D7] text-[#7D715E] text-[11px] font-bold uppercase tracking-wider hidden sm:grid"
        aria-hidden="true"
      >
        <span>Sản phẩm</span>
        <span className="text-right">Đơn giá</span>
        <span className="text-right">Số lượng</span>
        <span className="text-right">Thành tiền</span>
      </div>

      {groups.map((group) => {
        const storeId = group.store.id || 'default_store';
        const applied = appliedCoupons?.[storeId];
        const isLoading = couponLoadingStoreId === storeId;
        const errorMsg = couponErrors?.[storeId];

        return (
          <section
            key={group.store.id}
            className="checkout-shop border-b border-[#EAE4D7] last:border-b-0"
            aria-label={`Đặt mua tại ${group.store.name}`}
          >
            {/* Store Header Banner */}
            <header className="checkout-shop-heading flex items-center justify-between flex-wrap gap-2.5 px-4 sm:px-6 py-3 bg-[#FDFBF7] border-b border-[#EAE4D7]">
              <div className="flex items-center gap-2 min-w-0">
                <Store size={15} className="text-[#B88E4F] shrink-0" />
                <strong className="text-xs sm:text-[13px] font-bold text-[#1A1612] truncate">
                  {group.store.name}
                </strong>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBF5EB] text-[#8F682E] border border-[#EEDFC6]">
                  Chính hãng
                </span>
              </div>
              <button
                type="button"
                onClick={() => onChat(group.store)}
                className="inline-flex items-center gap-1.5 min-h-[32px] px-3 py-1 rounded-lg border border-[#EAE4D7] hover:border-[#C59B58] bg-white hover:bg-[#FBF5EB] text-xs font-semibold text-[#7D715E] hover:text-[#1A1612] transition-colors cursor-pointer shadow-2xs"
              >
                <MessageSquare size={13} className="text-[#B88E4F]" />
                <span>Chat với shop</span>
              </button>
            </header>

            {/* Product Items */}
            <div className="checkout-shop-items px-4 sm:px-6 divide-y divide-[#EAE4D7]">
              {group.items.map((item) => (
                <article
                  className="checkout-product-row grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px_90px_140px] items-center gap-3 sm:gap-4 py-4"
                  key={item.cartItemId}
                >
                  <div className="checkout-product-identity flex items-start gap-3 min-w-0">
                    <img
                      src={getSafeProductImageUrl(item.imageUrl, item.title, item.variantName)}
                      alt={item.title}
                      className="shrink-0 w-16 h-16 p-1 border border-[#EAE4D7] rounded-xl bg-white object-contain shadow-2xs"
                      onError={(event) => {
                        if (!event.currentTarget.dataset.hasFallback) {
                          event.currentTarget.dataset.hasFallback = 'true';
                          event.currentTarget.src = getSafeProductImageUrl(null, item.title);
                        }
                      }}
                    />
                    <div className="min-w-0">
                      <h3 className="text-xs sm:text-[13px] font-bold text-[#1A1612] leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      {item.variantName && (
                        <p className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#F3EFE6] text-[#7D715E] text-[11px] font-medium border border-[#EAE4D7]/70">
                            Phân loại: {item.variantName}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="checkout-product-unit text-xs text-right tabular-nums text-[#7D715E] hidden sm:block">
                    {formatMoney(item.price)}
                  </div>

                  <div className="checkout-product-quantity text-xs text-right tabular-nums font-bold text-[#1A1612] hidden sm:block">
                    ×{item.quantity}
                  </div>

                  <div className="checkout-product-line-total flex items-center justify-between sm:justify-end gap-2 text-xs text-right tabular-nums">
                    <span className="sm:hidden text-[#7D715E]">
                      {formatMoney(item.price)} × {item.quantity}
                    </span>
                    <strong className="text-xs sm:text-[13px] font-black text-[#1A1612]">
                      {formatMoney(item.price * item.quantity)}
                    </strong>
                  </div>
                </article>
              ))}
            </div>

            {/* MÃ ƯU ĐÃI CREATOR / KOC GẮN VỚI TỪNG SHOP */}
            <ShopVoucherRow
              storeId={storeId}
              storeName={group.store.name}
              applied={applied}
              isLoading={isLoading}
              errorMsg={errorMsg}
              onApply={onApplyCoupon}
              onRemove={onRemoveCoupon}
              onClearError={onClearCouponError}
            />

            {/* Shop Footer: GHN Shipping & Shop Subtotal */}
            <footer className="checkout-shop-footer flex items-center justify-between flex-wrap gap-2.5 px-4 sm:px-6 py-3 bg-[#FAF8F5]/60 border-t border-[#EAE4D7] text-xs text-[#7D715E]">
              <span className="inline-flex items-center gap-2">
                <Truck size={15} className="text-[#B88E4F] shrink-0" />
                <span>Vận chuyển GHN:</span>
                {shippingFees[group.store.id] !== undefined && (
                  <strong className="font-bold text-[#1A1612]">
                    {formatMoney(shippingFees[group.store.id])}
                  </strong>
                )}
              </span>
              <span className="inline-flex items-center gap-2">
                <span>
                  Tiền hàng ({group.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm):
                </span>
                {applied && applied.discountAmount > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="line-through text-[#7D715E] text-xs">
                      {formatMoney(group.subtotal)}
                    </span>
                    <strong className="text-sm font-black text-[#B45309]">
                      {formatMoney(Math.max(0, group.subtotal - applied.discountAmount))}
                    </strong>
                  </span>
                ) : (
                  <strong className="text-sm font-bold text-[#1A1612]">
                    {formatMoney(group.subtotal)}
                  </strong>
                )}
              </span>
            </footer>
          </section>
        );
      })}

      {/* Order Notes */}
      <div className="checkout-notes grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)] items-center gap-2 sm:gap-4 p-4 sm:p-5 border-t border-[#EAE4D7] bg-[#FAF8F5]/30">
        <label htmlFor="checkout-order-notes" className="text-xs font-semibold text-[#7D715E]">
          {groups.length > 1 ? 'Lời nhắn cho các cửa hàng:' : 'Lời nhắn cho shop:'}
        </label>
        <input
          id="checkout-order-notes"
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Ghi chú giao hàng, gọi trước khi giao…"
          className="w-full min-h-[40px] px-3.5 py-2 text-xs rounded-xl border border-[#EAE4D7] bg-white text-[#1A1612] placeholder:text-[#7D715E] focus:outline-none focus:border-[#C59B58] focus:ring-2 focus:ring-[#C59B58]/20 transition-all shadow-2xs"
        />
        {groups.length > 1 && (
          <p className="sm:col-start-2 text-[11px] text-[#7D715E] -mt-1">
            Lời nhắn này được gửi đồng thời tới tất cả cửa hàng trong đơn.
          </p>
        )}
      </div>
    </section>
  );
}
