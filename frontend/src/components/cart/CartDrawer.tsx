import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Minus, Plus, RefreshCw, ShoppingBag, Store, Trash2, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import type { CartItem } from '@/types/cart.types';
import { formatMoney, getSafeProductImageUrl } from '@/utils/marketplace.utils';

const isAvailable = (item: CartItem) => item.isActive && item.stockQuantity > 0;

function CartProductRow({ item, selected, onSelect, onQuantity, onVariant, onRemove, onClose }: {
  item: CartItem; selected: boolean; onSelect: () => void;
  onQuantity: (quantity: number) => void; onVariant: (variantId: string) => void;
  onRemove: () => void; onClose: () => void;
}) {
  const available = isAvailable(item);
  const variants = item.availableVariants || [];
  return (
    <article className="scanms-cart-item grid grid-cols-[17px_76px_minmax(0,1fr)] gap-x-[12px] gap-y-[10px] p-[17px_0] [&_+_.scanms-cart-item]:border-t [&_+_.scanms-cart-item]:border-t-[#EAE4D7] [&_h3]:m-[2px_0_0] [&_h3]:flex-1 [&_h3]:min-w-0 [&_h3]:text-[13px] [&_h3]:font-[600] [&_h3]:leading-[1.55] [&_h3_a]:[display:-webkit-box] [&_h3_a]:[-webkit-line-clamp:2] [&_h3_a]:[-webkit-box-orient:vertical] [&_h3_a]:overflow-hidden [&_h3_a]:text-[color:inherit]! [&_h3_a]:no-underline [&_h3_a:hover]:text-[color:#B88E4F]! [&[data-available='false']_.scanms-cart-item__image]:opacity-[.5] [@media_(max-width:480px)]:grid-cols-[17px_64px_minmax(0,1fr)] [@media_(max-width:480px)]:gap-x-[9px] [@media_(max-width:480px)]:p-[14px_0] [@media_(max-width:480px)]:[&_h3]:text-[12px]" data-available={available}>
      <input type="checkbox" className="scanms-cart-check scanms-cart-item__check w-[17px] h-[17px] m-0 shrink-0 accent-[#C59B58] cursor-pointer mt-[12px] [&:disabled]:opacity-[.4] [&:disabled]:cursor-not-allowed"
        checked={selected && available} disabled={!available} onChange={onSelect}
        aria-label={`Chọn ${item.title}${item.variantName ? `, ${item.variantName}` : ''}`} />
      <Link to={`/products/${item.productId}`} onClick={onClose} className="scanms-cart-item__image flex items-center justify-center h-[82px] bg-[color:#FFFFFF] border border-[#EAE4D7] rounded-[12px] p-[5px] overflow-hidden [&_img]:w-full [&_img]:h-full [&_img]:object-contain [@media_(max-width:480px)]:h-[72px] [@media_(max-width:480px)]:rounded-[10px]" tabIndex={-1} aria-hidden="true">
        <img key={item.imageUrl} src={getSafeProductImageUrl(item.imageUrl, item.title)} alt=""
          onError={(event) => {
            if (!event.currentTarget.dataset.fallback) {
              event.currentTarget.dataset.fallback = 'true';
              event.currentTarget.src = getSafeProductImageUrl(null, item.title);
            }
          }} />
      </Link>
      <div className="scanms-cart-item__details min-w-0">
        <div className="scanms-cart-item__heading flex items-start gap-[3px]">
          <h3><Link to={`/products/${item.productId}`} onClick={onClose}>{item.title}</Link></h3>
          <button type="button" className="scanms-cart-icon scanms-cart-item__remove inline-flex items-center justify-center w-[44px] h-[44px] shrink-0 p-0 bg-transparent border-0 rounded-[12px] text-[color:#7D715E]! [transition:background_150ms,color_150ms] mt-[-8px] mr-[-12px] [&:hover]:bg-[color:#FEF2F2] [&:hover]:text-[color:#DC2626]!" onClick={onRemove}
            aria-label={`Xóa ${item.title} khỏi giỏ hàng`} title="Xóa sản phẩm"><Trash2 size={16} /></button>
        </div>
        {variants.length > 1 ? (
          <select value={item.variantId || ''} onChange={(event) => onVariant(event.target.value)}
            aria-label={`Tùy chọn của ${item.title}`} className="scanms-cart-variant relative flex items-center justify-between max-w-full w-full min-h-[44px] mt-[8px] p-[5px_26px_5px_10px] border border-[#EAE4D7] rounded-[8px] bg-[color:#FAF8F5] text-[color:#7D715E] text-[11px] leading-[1.5] text-ellipsis [&::picker-icon]:absolute [&::picker-icon]:[inset-inline-end:10px] [&::picker-icon]:top-[50%] [&::picker-icon]:[translate:0_-50%] [&::picker-icon]:[margin-inline-start:0]! [&::picker-icon]:text-[10px]">
            {!item.variantId && <option value="" disabled>Chọn loại sản phẩm</option>}
            {variants.map((variant) => <option key={variant.id} value={variant.id} disabled={variant.isActive === false || variant.stockQuantity <= 0}>
              {variant.name}{variant.isActive === false ? ' · Ngừng bán' : variant.stockQuantity <= 0 ? ' · Hết hàng' : ''}
            </option>)}
          </select>
        ) : item.variantName ? <p className="scanms-cart-item__variant inline-block m-[7px_0_0] p-[4px_8px] bg-[color:#FAF8F5] rounded-[6px] text-[color:#7D715E]! text-[11px] leading-[1.5]">{item.variantName}</p> : null}
        {!item.isActive ? <p className="scanms-cart-item__unavailable m-[6px_0_0] text-[11px] leading-[1.5] text-[color:#DC2626]!">Sản phẩm ngừng bán</p>
          : item.stockQuantity <= 0 ? <p className="scanms-cart-item__unavailable m-[6px_0_0] text-[11px] leading-[1.5] text-[color:#DC2626]!">Sản phẩm hết hàng</p>
          : item.stockQuantity <= 3 ? <p className="scanms-cart-item__stock m-[6px_0_0] text-[11px] leading-[1.5] text-[color:#8C6226]!">Chỉ còn {item.stockQuantity} sản phẩm</p> : null}
      </div>
      <div className="scanms-cart-item__bottom [grid-column:2_/_-1] flex items-center justify-between gap-[12px]">
        <div className="scanms-cart-item__prices flex items-baseline flex-wrap gap-[3px_8px] min-w-0 [&_strong]:text-[color:#1A1612]! [&_strong]:text-[14px] [&_strong]:font-[700] [&_strong]:whitespace-nowrap [&_del]:text-[color:#7D715E]! [&_del]:text-[10px] [&_del]:whitespace-nowrap [@media_(max-width:480px)]:flex-col [@media_(max-width:480px)]:gap-[2px] [@media_(max-width:480px)]:[&_strong]:text-[13px]">
          <strong>{formatMoney(item.price)}</strong>
          {!!item.originalPrice && item.originalPrice > item.price && <del>{formatMoney(item.originalPrice)}</del>}
        </div>
        <div className="scanms-cart-quantity flex items-center shrink-0 h-[46px] overflow-hidden border border-[#EAE4D7] rounded-[9px] bg-[color:#FFFFFF] [&_button]:grid [&_button]:place-items-center [&_button]:w-[44px] [&_button]:h-[44px] [&_button]:p-0 [&_button]:border-0 [&_button]:bg-transparent [&_button]:text-[color:#7D715E]! [&_button:focus-visible]:outline-offset-[-3px] [&_button:hover:not(:disabled)]:bg-[color:#FBF5EB] [&_button:hover:not(:disabled)]:text-[color:#231D15]! [&_button:disabled]:opacity-[.35] [&_output]:block [&_output]:min-w-[30px] [&_output]:text-center [&_output]:text-[12px] [&_output]:font-[600] [&_output]:text-[color:#1A1612]! [&_output]:tabular-nums" role="group" aria-label={`Số lượng ${item.title}`}>
          <button type="button" onClick={() => onQuantity(item.quantity - 1)} disabled={!available || item.quantity <= 1}
            aria-label={`Giảm số lượng ${item.title}`}><Minus size={14} /></button>
          <output aria-live="polite" aria-label={`Số lượng hiện tại: ${item.quantity}`}>{item.quantity}</output>
          <button type="button" onClick={() => onQuantity(item.quantity + 1)} disabled={!available || item.quantity >= item.stockQuantity}
            aria-label={`Tăng số lượng ${item.title}`}><Plus size={14} /></button>
        </div>
      </div>
    </article>
  );
}

export function CartDrawer() {
  const { cart, selectedItemIds, totalCount, isCartOpen, closeCart, groupedByStore,
    updateQuantity, updateVariant, removeItem, toggleSelectItem, toggleSelectStore, toggleSelectAll,
    startCheckout, refreshCartStock, isValidatingStock, isCartSyncing } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!isCartOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    titleRef.current?.focus();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;
  const selectable = cart.filter(isAvailable);
  const selected = selectable.filter((item) => selectedItemIds.includes(item.cartItemId));
  const allSelected = selectable.length > 0 && selectable.every((item) => selectedItemIds.includes(item.cartItemId));
  const selectedCount = selected.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = selected.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return createPortal(
    <dialog ref={dialogRef} className="scanms-cart-dialog fixed inset-0 w-full max-w-none h-[100dvh] max-h-none m-0 p-0 border-0 bg-transparent text-[color:#1A1612]! overflow-hidden [font-family:inherit]! text-left [&[open]]:flex [&[open]]:justify-end [&::backdrop]:bg-[color:rgb(35_29_21_/_34%)] [&::backdrop]:backdrop-filter-[blur(3px)]" aria-labelledby="scanms-cart-title"
      onCancel={(event) => { event.preventDefault(); closeCart(); }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled])',
        )).filter((element) => element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === titleRef.current)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      }}
      onClick={(event) => { if (event.target === event.currentTarget) closeCart(); }}>
      <div className="scanms-cart-panel flex flex-col w-[min(100%,580px)] h-full min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#EEDFC6_transparent]! bg-[color:#FFFFFF] shadow-[-16px_0_56px_rgb(35_29_21_/_12%)] animate-[scanms-cart-enter_220ms_ease-out] [&_:is(button,a,input,select)]:[-webkit-tap-highlight-color:transparent] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_:is(button,a,input,select):focus-visible]:outline-[2px] [&_:is(button,a,input,select):focus-visible]:outline-solid [&_:is(button,a,input,select):focus-visible]:outline-[#C59B58] [&_:is(button,a,input,select):focus-visible]:outline-offset-[3px] [@media_(prefers-reduced-motion:reduce)]:animate-none [@media_(prefers-reduced-motion:reduce)]:[&_*]:transition-none">
        <header className="scanms-cart-header flex items-center justify-between gap-[12px] p-[24px] shrink-0 border-b border-b-[#EAE4D7] [&_h2]:m-0 [&_h2]:text-[21px] [&_h2]:font-[750] [&_h2]:leading-[1.3] [&_h2]:tracking-[-.025em]! [&_h2]:outline-none [&_p]:m-[5px_0_0] [&_p]:text-[color:#7D715E]! [&_p]:text-[12px] [&_p]:leading-[1.5] [@media_(max-width:480px)]:p-[18px_16px] [@media_(max-width:480px)]:gap-[8px] [@media_(max-width:480px)]:[&_h2]:text-[18px] [@media_(max-width:480px)]:[&_p]:text-[11px]">
          <div className="scanms-cart-header__identity flex items-center gap-[13px] min-w-0 [@media_(max-width:480px)]:gap-[10px]">
            <span className="scanms-cart-header__icon grid place-items-center w-[46px] h-[46px] shrink-0 rounded-[14px] bg-[color:#FBF5EB] border border-[#EEDFC6] text-[color:#B88E4F]! [@media_(max-width:480px)]:w-[40px] [@media_(max-width:480px)]:h-[40px] [@media_(max-width:480px)]:rounded-[12px]" aria-hidden="true"><ShoppingBag size={23} strokeWidth={1.7} /></span>
            <div>
              <h2 id="scanms-cart-title" ref={titleRef} tabIndex={-1}>Giỏ hàng của bạn</h2>
              <p>{cart.length ? `${totalCount} sản phẩm · ${groupedByStore.length} gian hàng` : 'Chọn món bạn yêu thích trên SCANMS'}</p>
            </div>
          </div>
          <button type="button" onClick={closeCart} className="scanms-cart-icon scanms-cart-close inline-flex items-center justify-center w-[44px] h-[44px] shrink-0 p-0 bg-transparent border border-[#EAE4D7] rounded-[12px] text-[color:#7D715E]! [transition:background_150ms,color_150ms] [&:hover]:bg-[color:#FAF8F5] [&:hover]:text-[color:#231D15]!" aria-label="Đóng giỏ hàng" title="Đóng giỏ hàng (Esc)"><X size={21} /></button>
        </header>

        {cart.length > 0 && <div className="scanms-cart-toolbar flex items-center justify-between gap-[12px] p-[8px_24px] border-b border-b-[#EAE4D7] shrink-0 [@media_(max-width:480px)]:p-[6px_16px]">
          <label className="scanms-cart-selection inline-flex items-center gap-[10px] min-h-[44px] cursor-pointer text-[12px] font-[600]">
            <input type="checkbox" className="scanms-cart-check w-[17px] h-[17px] m-0 shrink-0 accent-[#C59B58] cursor-pointer [&:disabled]:opacity-[.4] [&:disabled]:cursor-not-allowed" checked={allSelected} disabled={!selectable.length}
              ref={(element) => { if (element) element.indeterminate = selected.length > 0 && !allSelected; }}
              onChange={() => toggleSelectAll()} />
            <span>Chọn tất cả</span>
          </label>
          <button type="button" onClick={() => void refreshCartStock()} disabled={isValidatingStock || isCartSyncing}
            className="scanms-cart-refresh inline-flex items-center gap-[6px] min-h-[44px] p-[0_2px] border-0 bg-transparent text-[11px] font-[500] text-[color:#7D715E]! [&:hover]:text-[color:#B88E4F]! [&:disabled]:opacity-[.6]" aria-label="Cập nhật giá và tồn kho">
            <RefreshCw size={14} className={isValidatingStock || isCartSyncing ? 'scanms-cart-spin animate-[scanms-cart-spin_1s_linear_infinite] [@media_(prefers-reduced-motion:reduce)]:animate-none' : ''} aria-hidden="true" />
            <span>{isValidatingStock || isCartSyncing ? 'Đang cập nhật…' : 'Cập nhật'}</span>
          </button>
        </div>}

        <div className="scanms-cart-body flex-auto shrink-0 bg-[color:#FAF8F5] p-[18px] [scrollbar-width:thin] [scrollbar-color:#EEDFC6_transparent]! [@media_(max-width:480px)]:p-[12px]">
          {!cart.length ? <div className="scanms-cart-empty flex min-h-full flex-col items-center justify-center text-center p-[32px_16px] [&_h3]:m-0 [&_h3]:text-[20px] [&_h3]:font-[700] [&_p]:m-[10px_0_24px] [&_p]:max-w-[240px] [&_p]:text-[13px] [&_p]:leading-[1.7] [&_p]:text-[color:#7D715E]!">
            <span className="scanms-cart-empty__icon grid place-items-center w-[84px] h-[84px] mb-[22px] border border-[#EEDFC6] rounded-[26px] bg-[color:#FBF5EB] text-[color:#B88E4F]!" aria-hidden="true"><ShoppingBag size={36} strokeWidth={1.3} /></span>
            <h3>Giỏ hàng đang trống</h3>
            <p>Thêm sản phẩm yêu thích để chọn mua cùng lúc.</p>
            <button type="button" onClick={closeCart} className="scanms-cart-primary inline-flex items-center justify-center gap-[12px] min-h-[48px] p-[12px_20px] border border-[#C59B58] rounded-[12px] bg-(--color-brand) text-[color:#231D15]! [font-family:inherit]! text-[13px] font-[700] [transition:background_150ms,border-color_150ms] [&:hover:not(:disabled)]:bg-(--color-brand-strong) [&:hover:not(:disabled)]:border-[#B88E4F] [&:disabled]:bg-[color:#F3EFE6] [&:disabled]:border-[#EAE4D7] [&:disabled]:text-[color:#7D715E]!">Tiếp tục mua sắm<ArrowRight size={17} /></button>
          </div> : groupedByStore.map((group) => {
            const groupSelected = group.items.filter((item) => isAvailable(item) && selectedItemIds.includes(item.cartItemId));
            const groupTotal = groupSelected.reduce((sum, item) => sum + item.price * item.quantity, 0);
            return <section key={group.storeId} className="scanms-cart-shop border border-[#EAE4D7] rounded-[16px] bg-[color:#FFFFFF] mb-[14px] [&:last-child]:mb-0" aria-label={`Gian hàng ${group.storeName}`}>
              <div className="scanms-cart-shop__header flex items-center gap-[10px] p-[13px_16px] border-b border-b-[#EAE4D7] [@media_(max-width:480px)]:p-[12px] [@media_(max-width:480px)]:gap-[8px]">
                <input type="checkbox" className="scanms-cart-check w-[17px] h-[17px] m-0 shrink-0 accent-[#C59B58] cursor-pointer [&:disabled]:opacity-[.4] [&:disabled]:cursor-not-allowed" checked={group.allSelected}
                  aria-label={`Chọn tất cả sản phẩm của ${group.storeName}`} disabled={!group.items.some(isAvailable)}
                  ref={(element) => { if (element) element.indeterminate = group.someSelected; }}
                  onChange={() => toggleSelectStore(group.storeId)} />
                <Link to={`/shops/${group.storeSlug || group.storeId}`} onClick={closeCart} className="scanms-cart-shop__name inline-flex items-center gap-[7px] min-w-0 text-[12px] font-[650] text-[color:#231D15]! no-underline [&_span]:overflow-hidden [&_span]:text-ellipsis [&_span]:whitespace-nowrap [&_svg]:shrink-0 [&_svg]:text-[color:#B88E4F]! [&:hover]:text-[color:#B88E4F]!">
                  <Store size={16} aria-hidden="true" /><span>{group.storeName}</span><ChevronRight size={14} aria-hidden="true" />
                </Link>
                <span className="scanms-cart-shop__count ml-auto shrink-0 text-[10px] text-[color:#7D715E]! [@media_(max-width:480px)]:text-[9px]">{group.items.length} mặt hàng</span>
              </div>
              <div className="scanms-cart-shop__items p-[0_16px] [@media_(max-width:480px)]:p-[0_12px]">{group.items.map((item) => <CartProductRow key={item.cartItemId} item={item}
                selected={selectedItemIds.includes(item.cartItemId)} onSelect={() => toggleSelectItem(item.cartItemId)}
                onQuantity={(quantity) => updateQuantity(item.cartItemId, quantity)} onVariant={(variantId) => updateVariant(item.cartItemId, variantId)}
                onRemove={() => removeItem(item.cartItemId)} onClose={closeCart} />)}</div>
              {group.items.length > 1 && <div className="scanms-cart-shop__subtotal flex items-center justify-between gap-[12px] p-[11px_16px] border-t border-t-[#EAE4D7] text-[11px] text-[color:#7D715E]! [&_strong]:text-[color:#231D15]! [&_strong]:font-[600]"><span>Tiền hàng đã chọn</span><strong>{formatMoney(groupTotal)}</strong></div>}
            </section>;
          })}
        </div>

        {cart.length > 0 && <footer className="scanms-cart-footer shrink-0 border-t border-t-[#EAE4D7] bg-[color:#FFFFFF] p-[20px_24px_max(20px,env(safe-area-inset-bottom))] shadow-[0_-6px_24px_rgb(35_29_21_/_3%)] [@media_(max-width:480px)]:p-[16px_16px_max(16px,env(safe-area-inset-bottom))]">
          <div className="scanms-cart-summary flex items-center justify-between gap-[12px] [&_span]:block [&_span]:text-[13px] [&_span]:font-[600] [&_small]:block [&_small]:mt-[4px] [&_small]:text-[color:#7D715E]! [&_small]:text-[11px] [&_>_strong]:text-[25px] [&_>_strong]:tracking-[-.035em]! [&_>_strong]:font-[750] [&_>_strong]:tabular-nums [&_>_strong]:whitespace-nowrap [@media_(max-width:480px)]:[&_>_strong]:text-[23px]">
            <div><span>Tạm tính tiền hàng</span><small>Đã chọn {selectedCount} sản phẩm</small></div>
            <strong aria-live="polite" aria-atomic="true">{formatMoney(subtotal)}</strong>
          </div>
          <p className="scanms-cart-footer__note m-[12px_0_14px] text-[11px] leading-[1.6] text-[color:#7D715E]!">Phí vận chuyển và ưu đãi được tính ở bước thanh toán.</p>
          <button type="button" onClick={() => startCheckout(selected)} disabled={!selected.length || isValidatingStock || isCartSyncing} className="scanms-cart-primary scanms-cart-checkout inline-flex items-center justify-center gap-[12px] min-h-[48px] p-[12px_20px] border border-[#C59B58] rounded-[12px] bg-[color:#FBF5EB] text-[color:#1A1612]! [font-family:inherit]! text-[13px] font-[700] [transition:background_150ms,border-color_150ms] w-full border-[#EEDFC6] [&:hover:not(:disabled)]:bg-[color:#F3EFE6] [&:hover:not(:disabled)]:border-[#C59B58] [&:disabled]:bg-[color:#F3EFE6] [&:disabled]:border-[#EAE4D7] [&:disabled]:text-[color:#7D715E]!">
            <span>Thanh toán{selectedCount > 0 ? ` (${selectedCount})` : ''}</span><ArrowRight size={18} />
          </button>
          {!selected.length && <p className="scanms-cart-footer__hint m-[8px_0_0] text-[11px] text-center text-[color:#7D715E]!" role="status">Chọn sản phẩm để tiếp tục thanh toán.</p>}
        </footer>}
      </div>
    </dialog>, document.body,
  );
}
