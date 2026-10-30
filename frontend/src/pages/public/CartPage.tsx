import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Store,
  Trash2,
  Minus,
  Plus,
  Ticket,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { useCart, type CartItem } from '@/context/CartContext';
import { formatMoney, getSafeProductImageUrl } from '@/utils/marketplace.utils';
import {
  ScanmsCheckoutVoucherModal,
  type AppliedShopVoucher,
  type AppliedPlatformVoucher,
} from '@/components/checkout/ScanmsCheckoutVoucherModal';
import type { CheckoutShopGroup } from '@/components/checkout/CheckoutItemsSection';
import { useScanmsChat } from '@/context/ScanmsChatContext';
import { toast } from '@/utils/toast';
import './CartPage.css';

const isAvailable = (item: CartItem) => item.isActive && item.stockQuantity > 0;

export default function CartPage() {
  const {
    cart,
    selectedItemIds,
    totalCount,
    groupedByStore,
    updateQuantity,
    updateVariant,
    removeItem,
    removeItems,
    toggleSelectItem,
    toggleSelectStore,
    toggleSelectAll,
    startCheckout,
    refreshCartStock,
    isValidatingStock,
    isCartSyncing,
  } = useCart();

  const { openChat } = useScanmsChat();

  // Voucher state for 3-tier discounts
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [appliedShopCoupons, setAppliedShopCoupons] = useState<Record<string, AppliedShopVoucher>>({});
  const [appliedPlatformCoupon, setAppliedPlatformCoupon] = useState<AppliedPlatformVoucher | null>(null);
  const [appliedShippingCoupon, setAppliedShippingCoupon] = useState<AppliedPlatformVoucher | null>(null);

  const selectable = cart.filter(isAvailable);
  const selected = selectable.filter((item) => selectedItemIds.includes(item.cartItemId));
  const allSelected = selectable.length > 0 && selectable.every((item) => selectedItemIds.includes(item.cartItemId));
  const selectedCount = selected.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = selected.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Convert cart grouped by store to the CheckoutShopGroup[] format
  const itemsGroupedByShop: CheckoutShopGroup[] = useMemo(() => {
    return groupedByStore.map((g) => {
      const items = g.items.filter((item) => isAvailable(item) && selectedItemIds.includes(item.cartItemId));
      const groupSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return {
        store: {
          id: g.storeId,
          name: g.storeName,
          slug: g.storeSlug,
        },
        items,
        subtotal: groupSubtotal,
      };
    });
  }, [groupedByStore, selectedItemIds]);

  // Calculate discounts
  const totalShopDiscount = useMemo(() => {
    return Object.values(appliedShopCoupons).reduce((sum, v) => sum + (v.discountAmount || 0), 0);
  }, [appliedShopCoupons]);

  const platformDiscount = appliedPlatformCoupon ? appliedPlatformCoupon.discountAmount : 0;
  const estimatedTotal = Math.max(0, subtotal - totalShopDiscount - platformDiscount);

  const handleCheckout = () => {
    if (selected.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm để tiếp tục thanh toán');
      return;
    }
    // Pass selected items and any preselected coupon to the checkout flow
    startCheckout(selected, appliedPlatformCoupon?.code || '');
  };

  const handleRemoveSelected = () => {
    if (selected.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selected.length} sản phẩm đã chọn khỏi giỏ hàng?`)) {
      removeItems(selected.map((i) => i.cartItemId));
    }
  };

  return (
    <div className="cart-page">
      <PublicHeader cartPage sticky={false} />
      <main className="cart-page__main">

        {cart.length === 0 ? (
          <section className="cart-page__empty">
            <ShoppingBag size={46} strokeWidth={1.4} />
            <h2>Giỏ hàng của bạn đang trống</h2>
            <p>Khám phá sản phẩm từ các gian hàng trên SCANMS.</p>
            <Link className="cart-page__button cart-page__button--primary" to="/marketplace">Tiếp tục mua sắm <ArrowRight size={17} /></Link>
          </section>
        ) : (
          <>
            <div className="cart-page__table-head cart-page__columns" aria-hidden="true">
              <label><input type="checkbox" checked={allSelected} onChange={event => toggleSelectAll(event.target.checked)} disabled={selectable.length === 0} tabIndex={-1} />Sản phẩm ({totalCount})</label>
              <span>Đơn giá</span><span>Số lượng</span><span>Số tiền</span><span>Thao tác</span>
            </div>

            <div className="cart-page__shops">
              {groupedByStore.map((group) => {
                const available = group.items.filter(isAvailable);
                const groupSelected = available.filter(item => selectedItemIds.includes(item.cartItemId));
                const groupAllSelected = available.length > 0 && groupSelected.length === available.length;
                const groupSubtotal = groupSelected.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const shopVoucher = appliedShopCoupons[group.storeId];
                const shopUrl = `/shops/${encodeURIComponent(group.storeSlug || group.storeId)}`;
                return (
                  <section className="cart-page__shop" key={group.storeId} aria-label={`Gian hàng ${group.storeName}`}>
                    <header className="cart-page__shop-heading">
                      <input type="checkbox" aria-label={`Chọn gian hàng ${group.storeName}`} checked={groupAllSelected} disabled={available.length === 0}
                        ref={node => { if (node) node.indeterminate = groupSelected.length > 0 && !groupAllSelected; }}
                        onChange={() => toggleSelectStore(group.storeId)} />
                      <Link to={shopUrl}><Store size={18} /><strong>{group.storeName}</strong><ChevronRight size={14} /></Link>
                      <button type="button" className="cart-page__chat" onClick={() => openChat({ id: group.storeId, name: group.storeName })}><MessageCircle size={16} />Chat với shop</button>
                    </header>

                    {group.items.map(item => {
                      const availableItem = isAvailable(item);
                      return (
                        <article className={`cart-page__item cart-page__columns${availableItem ? '' : ' cart-page__item--unavailable'}`} key={item.cartItemId}>
                          <div className="cart-page__product">
                            <input type="checkbox" aria-label={`Chọn ${item.title}`} checked={availableItem && selectedItemIds.includes(item.cartItemId)} disabled={!availableItem} onChange={() => toggleSelectItem(item.cartItemId)} />
                            <Link to={`/products/${encodeURIComponent(item.productId)}`} className="cart-page__image" aria-label={`Xem ${item.title}`}>
                              <img src={getSafeProductImageUrl(item.imageUrl)} alt={item.title} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = getSafeProductImageUrl(); }} />
                            </Link>
                            <div className="cart-page__product-info">
                              <Link className="cart-page__product-title" to={`/products/${encodeURIComponent(item.productId)}`}>{item.title}</Link>
                              {(item.availableVariants?.length ?? 0) > 1 ? (
                                <select aria-label={`Phân loại ${item.title}`} value={item.variantId || ''} onChange={event => updateVariant(item.cartItemId, event.target.value)}>
                                  {item.availableVariants?.map(variant => <option key={variant.id} value={variant.id} disabled={variant.isActive === false || variant.stockQuantity <= 0}>{variant.name}{variant.stockQuantity <= 0 ? ' — Hết hàng' : ''}</option>)}
                                </select>
                              ) : item.variantName ? <span className="cart-page__variant">{item.variantName}</span> : null}
                              {!availableItem && <span className="cart-page__stock">{item.isActive ? 'Hết hàng' : 'Ngừng kinh doanh'}</span>}
                              {availableItem && item.quantity > item.stockQuantity && <span className="cart-page__stock">Chỉ còn {item.stockQuantity} sản phẩm</span>}
                            </div>
                          </div>
                          <div className="cart-page__price"><span>{formatMoney(item.price)}</span>{Number(item.originalPrice) > item.price && <del>{formatMoney(Number(item.originalPrice))}</del>}</div>
                          <div className="cart-page__quantity">
                            <button type="button" aria-label={`Giảm số lượng ${item.title}`} disabled={!availableItem || item.quantity <= 1 || isCartSyncing} onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}><Minus size={14} /></button>
                            <span aria-label={`Số lượng ${item.title}`}>{item.quantity}</span>
                            <button type="button" aria-label={`Tăng số lượng ${item.title}`} disabled={!availableItem || item.quantity >= item.stockQuantity || isCartSyncing} onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}><Plus size={14} /></button>
                          </div>
                          <strong className="cart-page__line-total">{formatMoney(item.price * item.quantity)}</strong>
                          <button type="button" className="cart-page__remove" aria-label={`Xóa ${item.title}`} onClick={() => removeItem(item.cartItemId)}><Trash2 size={17} /><span>Xóa</span></button>
                        </article>
                      );
                    })}

                    <footer className="cart-page__shop-footer">
                      <button type="button" onClick={() => setIsVoucherModalOpen(true)}><Ticket size={17} />{shopVoucher ? `Voucher shop: ${shopVoucher.code}` : 'Chọn voucher của shop'}<ChevronRight size={14} /></button>
                      <span>Tiền hàng đã chọn <strong>{formatMoney(groupSubtotal)}</strong></span>
                    </footer>
                  </section>
                );
              })}
            </div>

            <section className="cart-page__voucher" aria-label="Ưu đãi giỏ hàng">
              <button type="button" className="cart-page__refresh" onClick={() => void refreshCartStock()} disabled={isValidatingStock || isCartSyncing}>
                <RefreshCw size={15} className={isValidatingStock ? 'cart-page__spin' : ''} />{isValidatingStock ? 'Đang cập nhật…' : 'Cập nhật giá & kho'}
              </button>
              <div><Ticket size={21} /><strong>SCANMS Voucher</strong></div>
              <button type="button" id="cart-scanms-voucher-btn" onClick={() => setIsVoucherModalOpen(true)}>Chọn hoặc nhập mã <ChevronRight size={16} /></button>
              {(totalShopDiscount > 0 || platformDiscount > 0 || appliedShippingCoupon) && <p>
                {totalShopDiscount > 0 && <span>Voucher shop: −{formatMoney(totalShopDiscount)}</span>}
                {platformDiscount > 0 && <span>Voucher sàn: −{formatMoney(platformDiscount)}</span>}
                {appliedShippingCoupon && <span>Mã vận chuyển: {appliedShippingCoupon.code}</span>}
              </p>}
            </section>

            <section className="cart-page__checkout" aria-label="Tổng tiền và mua hàng">
              <div className="cart-page__bulk">
                <label><input type="checkbox" aria-label="Chọn tất cả sản phẩm" checked={allSelected} disabled={selectable.length === 0} onChange={event => toggleSelectAll(event.target.checked)}
                  ref={node => { if (node) node.indeterminate = selected.length > 0 && !allSelected; }} />Chọn tất cả <span>({selectable.length})</span></label>
                <button type="button" disabled={selected.length === 0} onClick={handleRemoveSelected}>Xóa đã chọn</button>
              </div>
              <div className="cart-page__checkout-total" aria-live="polite">
                <span>Tổng tiền <span>({selectedCount} sản phẩm)</span><strong>{formatMoney(estimatedTotal)}</strong></span>
                <small>{totalShopDiscount + platformDiscount > 0 ? `Đã giảm ${formatMoney(totalShopDiscount + platformDiscount)} · ` : ''}Chưa gồm phí vận chuyển</small>
              </div>
              <button type="button" id="cart-checkout-btn" className="cart-page__button cart-page__button--primary" disabled={selected.length === 0 || isValidatingStock || isCartSyncing} onClick={handleCheckout}>
                {isValidatingStock || isCartSyncing ? 'Đang cập nhật…' : 'Mua hàng'}<ArrowRight size={17} />
              </button>
            </section>
          </>
        )}
      </main>

      {/* SCANMS Checkout Voucher Modal Component */}
      <ScanmsCheckoutVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        groups={itemsGroupedByShop}
        shippingFeesByStore={{}}
        totalShippingFee={0}
        rawGoodsSubtotal={subtotal}
        appliedShopCoupons={appliedShopCoupons}
        appliedPlatformCoupon={appliedPlatformCoupon}
        appliedShippingCoupon={appliedShippingCoupon}
        onApplyShopCoupon={(storeId, v) => {
          setAppliedShopCoupons((prev) => ({
            ...prev,
            [storeId]: { ...v, storeId },
          }));
        }}
        onRemoveShopCoupon={(storeId) => {
          setAppliedShopCoupons((prev) => {
            const next = { ...prev };
            delete next[storeId];
            return next;
          });
        }}
        onApplyPlatformCoupon={(v) => setAppliedPlatformCoupon(v)}
        onRemovePlatformCoupon={() => setAppliedPlatformCoupon(null)}
        onApplyShippingCoupon={(v) => setAppliedShippingCoupon(v)}
        onRemoveShippingCoupon={() => setAppliedShippingCoupon(null)}
      />
    </div>
  );
}
