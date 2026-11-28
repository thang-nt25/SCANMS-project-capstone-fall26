import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, BadgeCheck, Trash2, Minus, Plus, ChevronRight, ArrowRight, ArrowLeft, MessageCircle } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { useCart, type CartItem } from '@/context/CartContext';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { formatMoney, getSafeProductImageUrl } from '@/utils/marketplace.utils';
import { useScanmsChat } from '@/context/ScanmsChatContext';
import { toast } from '@/utils/toast';
import { handleStoreImageError } from '@/utils/image-fallback.utils';

const isAvailable = (item: CartItem) => item.isActive && item.stockQuantity > 0;

export default function CartPage() {
  const navigate = useNavigate();
  const [pendingRemoval, setPendingRemoval] = useState<string[]>([]);
  const cancelRemoval = () => setPendingRemoval([]);
  const { dialog, dialogId } = useDialogFocus(pendingRemoval.length > 0, cancelRemoval);
  const goBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate('/marketplace');
  };
  const backButton = <button type="button" onClick={goBack} className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#EAE4D7] bg-white px-2.5 text-xs font-medium text-[#7D715E] transition-colors hover:border-[#EEDFC6] hover:bg-[#FBF5EB] hover:text-[#8C6226] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C59B58]"><ArrowLeft size={14} aria-hidden="true" />Quay lại</button>;
  const {
    cart,
    selectedItemIds,
    groupedByStore,
    updateQuantity,
    updateVariant,
    removeItem,
    removeItems,
    toggleSelectItem,
    toggleSelectStore,
    toggleSelectAll,
    startCheckout,
    isValidatingStock,
    isCartSyncing,
  } = useCart();

  const { openChat } = useScanmsChat();

  const selectable = cart.filter(isAvailable);
  const selected = selectable.filter((item) => selectedItemIds.includes(item.cartItemId));
  const allSelected = selectable.length > 0 && selectable.every((item) => selectedItemIds.includes(item.cartItemId));
  const selectedCount = selected.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = selected.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const estimatedTotal = subtotal;

  const handleCheckout = () => {
    if (selected.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm để tiếp tục thanh toán');
      return;
    }
    // Codes are entered explicitly in checkout; the cart does not preselect one.
    startCheckout(selected);
  };

  const handleRemoveSelected = () => {
    if (selected.length > 0) setPendingRemoval(selected.map(item => item.cartItemId));
  };

  const confirmRemoveSelected = () => {
    const ids = new Set(pendingRemoval);
    const itemsToRemove = cart.filter(item => ids.has(item.cartItemId));
    setPendingRemoval([]);
    if (!itemsToRemove.length) return;
    removeItems(itemsToRemove.map(item => item.cartItemId));
    toast.info(`Đã xóa ${itemsToRemove.length} sản phẩm khỏi giỏ hàng.`);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612] flex flex-col font-sans">
      {/* Top Header */}
      <PublicHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-3 lg:hidden">{backButton}</div>
        {/* Cart Contents */}
        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="bg-white rounded-3xl border border-[#EAE4D7] p-12 sm:p-16 text-center max-w-xl mx-auto shadow-xs my-8">
            <div className="w-24 h-24 rounded-3xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <ShoppingBag size={44} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A1612] mb-2">
              Giỏ hàng của bạn đang trống
            </h2>
            <p className="text-sm text-[#7D715E] mb-8 leading-relaxed max-w-md mx-auto">
              Không có sản phẩm nào trong giỏ hàng. Khám phá các sản phẩm chính hãng với ưu đãi độc quyền từ các đối tác tiếp thị ngay hôm nay!
            </p>
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <span>Khám phá Marketplace ngay</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          /* Full-width cart with aligned desktop columns */
          <div className="space-y-5">
            {/* Left Column: Product Table grouped by Shop (8 cols) */}
            <div className="space-y-4">
              {/* Header Bar */}
              <div className="bg-white rounded-2xl border border-[#EAE4D7] px-5 py-3.5 hidden lg:grid lg:grid-cols-[minmax(0,1fr)_130px_140px_150px_72px] gap-4 items-center text-xs font-semibold text-[#7D715E]">
                <div className="min-w-0 flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-[#C59B58] cursor-pointer"
                    checked={allSelected}
                    disabled={!selectable.length}
                    ref={(el) => {
                      if (el) el.indeterminate = selected.length > 0 && !allSelected;
                    }}
                    onChange={() => toggleSelectAll()}
                  />
                  <span>Sản phẩm ({cart.length})</span>
                  <span className="ml-1 border-l border-[#EAE4D7] pl-3">{backButton}</span>
                </div>
                <div className="text-center">Đơn giá</div>
                <div className="text-center">Số lượng</div>
                <div className="text-right">Thành tiền</div>
                <div className="text-center">Thao tác</div>
              </div>

              {/* Grouped by Store */}
              {groupedByStore.map((group) => {
                const groupSelected = group.items.filter(
                  (item) => isAvailable(item) && selectedItemIds.includes(item.cartItemId),
                );
                const groupSubtotal = groupSelected.reduce((sum, item) => sum + item.price * item.quantity, 0);


                return (
                  <div
                    key={group.storeId}
                    className="bg-white rounded-2xl border border-[#EAE4D7] overflow-hidden"
                  >
                    {/* Shop Header */}
                    <div className="px-4 py-3 sm:px-5 border-b border-[#EAE4D7]/70 bg-white flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-[#C59B58] cursor-pointer"
                          checked={group.allSelected}
                          disabled={!group.items.some(isAvailable)}
                          ref={(el) => {
                            if (el) el.indeterminate = group.someSelected;
                          }}
                          onChange={() => toggleSelectStore(group.storeId)}
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-9 h-9 rounded-xl bg-white border border-[#EAE4D7] p-1 flex items-center justify-center shrink-0 overflow-hidden">
                            <img src={group.storeLogoUrl || '/assets/store-placeholder.svg'} alt="" onError={handleStoreImageError} className="h-full w-full object-contain" />
                          </span>
                          <Link
                            to={`/shops/${group.storeSlug || group.storeId}`}
                            className="font-bold text-sm text-[#1A1612] hover:text-[#B88E4F] transition-colors truncate"
                          >
                            {group.storeName}
                          </Link>
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-[#B88E4F]">
                            <BadgeCheck size={13} />
                            Chính hãng
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {openChat && (
                          <button
                            type="button"
                            onClick={() => openChat({ id: group.storeId, name: group.storeName })}
                            className="inline-flex h-9 items-center gap-1.5 px-3 rounded-lg bg-[#FBF5EB] text-xs font-medium text-[#7D715E] hover:text-[#B88E4F] transition-colors cursor-pointer"
                          >
                            <MessageCircle size={13} />
                            <span>Chat</span>
                          </button>
                        )}
                        <Link
                          to={`/shops/${group.storeSlug || group.storeId}`}
                          className="inline-flex h-9 items-center gap-1 px-3 rounded-lg text-xs font-medium text-[#7D715E] hover:bg-[#FAF8F5] hover:text-[#B88E4F] transition-colors"
                        >
                          <span>Xem Shop</span>
                          <ChevronRight size={13} />
                        </Link>
                      </div>
                    </div>

                    {/* Shop Products List */}
                    <div className="divide-y divide-[#EAE4D7]">
                      {group.items.map((item) => {
                        const available = isAvailable(item);
                        const isItemSelected = selectedItemIds.includes(item.cartItemId);
                        const variants = item.availableVariants || [];

                        return (
                          <div
                            key={item.cartItemId}
                            className={`px-4 py-5 sm:px-5 transition-colors ${!available ? 'opacity-50 bg-[#FAF8F5]' : 'hover:bg-[#FAF8F5]/40'}`}
                          >
                            <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1fr)_130px_140px_150px_72px] gap-4 items-center">
                              {/* Checkbox, Image, Title (Col 6) */}
                              <div className="col-span-2 lg:col-span-1 flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded accent-[#C59B58] cursor-pointer shrink-0"
                                  checked={isItemSelected && available}
                                  disabled={!available}
                                  onChange={() => toggleSelectItem(item.cartItemId)}
                                />
                                <Link
                                  to={`/products/${item.productId}`}
                                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-white border border-[#EAE4D7] p-1 shrink-0 overflow-hidden flex items-center justify-center hover:border-[#C59B58] transition-colors"
                                >
                                  <img
                                    src={getSafeProductImageUrl(item.imageUrl, item.title)}
                                    alt={item.title}
                                    className="w-full h-full object-contain"
                                    onError={(e) => {
                                      if (!e.currentTarget.dataset.fallback) {
                                        e.currentTarget.dataset.fallback = 'true';
                                        e.currentTarget.src = getSafeProductImageUrl(null, item.title);
                                      }
                                    }}
                                  />
                                </Link>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-semibold text-xs sm:text-sm text-[#1A1612] line-clamp-2 leading-snug">
                                    <Link
                                      to={`/products/${item.productId}`}
                                      className="hover:text-[#B88E4F] transition-colors"
                                    >
                                      {item.title}
                                    </Link>
                                  </h3>

                                  {/* Variant info or selector */}
                                  <div className="mt-1.5">
                                    {variants.length > 1 ? (
                                      <select
                                        value={item.variantId || ''}
                                        onChange={(e) => updateVariant(item.cartItemId, e.target.value)}
                                        aria-label={`Phân loại ${item.title}`}
                                        className="text-xs py-2 px-2.5 border border-[#EAE4D7] rounded-lg bg-[#FAF8F5] text-[#7D715E] max-w-full font-medium focus:outline-none focus:ring-2 focus:ring-[#EEDFC6]"
                                      >
                                        {!item.variantId && <option value="" disabled>Chọn biến thể</option>}
                                        {variants.map((v) => (
                                          <option
                                            key={v.id}
                                            value={v.id}
                                            disabled={v.isActive === false || v.stockQuantity <= 0}
                                          >
                                            {v.name} {v.stockQuantity <= 0 ? '(Hết hàng)' : ''}
                                          </option>
                                        ))}
                                      </select>
                                    ) : item.variantName ? (
                                      <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-[#FAF8F5] text-[#7D715E] border border-[#EAE4D7]">
                                        Phân loại: {item.variantName}
                                      </span>
                                    ) : null}
                                  </div>

                                  {!available && (
                                    <p className="text-[11px] font-bold text-[#DC2626] mt-1">
                                      {item.stockQuantity <= 0 ? 'Sản phẩm tạm hết hàng' : 'Sản phẩm đã ngừng kinh doanh'}
                                    </p>
                                  )}
                                  {available && item.stockQuantity <= 3 && (
                                    <p className="text-[11px] font-semibold text-[#B88E4F] mt-1">
                                      Chỉ còn {item.stockQuantity} sản phẩm trong kho
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Price (Col 2) */}
                              <div className="lg:text-center flex flex-col sm:flex-row lg:block gap-1 items-baseline justify-between min-w-0">
                                <span className="text-xs text-[#7D715E] lg:hidden">Đơn giá:</span>
                                <div>
                                  <strong className="text-sm font-semibold text-[#1A1612] tabular-nums">
                                    {formatMoney(item.price)}
                                  </strong>
                                </div>
                              </div>

                              {/* Quantity (Col 2) */}
                              <div className="flex flex-col items-end gap-1 lg:flex-row lg:items-center lg:justify-center min-w-0">
                                <span className="text-xs text-[#7D715E] lg:hidden">Số lượng:</span>
                                <div className="inline-flex items-center border border-[#EAE4D7] rounded-xl bg-white overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                                    disabled={!available || item.quantity <= 1}
                                    className="w-10 h-10 flex items-center justify-center text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#1A1612] disabled:opacity-30 transition-colors cursor-pointer"
                                    title="Giảm số lượng"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <span className="w-10 h-10 flex items-center justify-center border-x border-[#EAE4D7] text-sm font-semibold text-[#1A1612] tabular-nums">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                                    disabled={!available || item.quantity >= item.stockQuantity}
                                    className="w-10 h-10 flex items-center justify-center text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#1A1612] disabled:opacity-30 transition-colors cursor-pointer"
                                    title="Tăng số lượng"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Total & Action (Col 2) */}
                              <div className="flex items-center justify-between lg:justify-end gap-3">
                                <span className="text-xs text-[#7D715E] lg:hidden">Thành tiền:</span>
                                <strong className="text-base font-bold text-[#B88E4F] tabular-nums">
                                  {formatMoney(item.price * item.quantity)}
                                </strong>
                              </div>
                              <div className="flex items-center justify-end lg:justify-center">
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.cartItemId)}
                                  className="w-10 h-10 flex items-center justify-center text-[#7D715E] hover:text-[#DC2626] hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                                  title="Xóa sản phẩm"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Shop Footer: Store Subtotal */}
                    <div className="mx-4 sm:mx-5 py-3 border-t border-[#EAE4D7]/70 flex items-center justify-end gap-2 text-xs">
                      {group.items.length > 0 && (
                        <div className="flex items-center justify-end gap-2 text-xs">
                          <span className="text-[#7D715E]">Tạm tính</span>
                          <span className="text-[#EAE4D7]">·</span>
                          <strong className="text-sm font-bold text-[#1A1612] tabular-nums">
                            {formatMoney(groupSubtotal)}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            </div>
            {/* Cart checkout bar */}
            <div className="sticky bottom-2 z-20 rounded-2xl border border-[#EAE4D7] bg-white shadow-[0_-4px_24px_rgba(35,29,21,0.06)] lg:bottom-20">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE4D7] px-4 py-3 sm:px-5 text-xs text-[#7D715E]">
                <span>Mã độc quyền KOL được nhập ở bước thanh toán.</span>
                <span>Phí vận chuyển tính theo địa chỉ nhận hàng.</span>
              </div>
              <div className="grid grid-cols-1 gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-6">
                <div className="flex items-center justify-between gap-4 lg:justify-start">
                  <label className="flex items-center gap-3 text-sm font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả sản phẩm"
                      className="h-4 w-4 accent-[#C59B58]"
                      checked={allSelected}
                      disabled={!selectable.length}
                      ref={(el) => { if (el) el.indeterminate = selected.length > 0 && !allSelected; }}
                      onChange={() => toggleSelectAll()}
                    />
                    Chọn tất cả ({selectable.length})
                  </label>
                  <button type="button" aria-haspopup="dialog" onClick={handleRemoveSelected} disabled={!selected.length}
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#EAE4D7] px-2.5 text-xs font-medium text-[#7D715E] transition-colors hover:border-[#DC2626]/25 hover:bg-[#DC2626]/5 hover:text-[#DC2626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F] disabled:opacity-40">
                    <Trash2 size={15} aria-hidden="true" /> Xóa đã chọn
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4 lg:block lg:text-right" aria-live="polite">
                  <p className="text-sm text-[#7D715E]">Tổng tiền hàng ({selectedCount} sản phẩm)</p>
                  <strong className="text-2xl font-bold text-[#B88E4F] tabular-nums">{formatMoney(estimatedTotal)}</strong>
                </div>
                <button type="button" id="cart-checkout-btn" onClick={handleCheckout}
                  disabled={!selected.length || isValidatingStock || isCartSyncing}
                  className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl border border-[#EEDFC6] bg-[#C59B58] px-8 py-3 text-sm font-bold text-[#1A1612] hover:bg-[#B88E4F] disabled:bg-[#F3EFE6] disabled:text-[#7D715E] disabled:cursor-not-allowed transition-colors lg:min-w-48">
                  {isValidatingStock || isCartSyncing ? 'Đang đồng bộ...' : <>Mua hàng {selectedCount > 0 && `(${selectedCount})`} <ArrowRight size={18} /></>}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {pendingRemoval.length > 0 && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-[#231D15]/25 px-4 pt-4 sm:pt-6">
          <div
            ref={dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={dialogId}
            tabIndex={-1}
            className="w-full max-w-lg rounded-2xl border border-[#EAE4D7] bg-white p-5 font-sans text-[#1A1612] shadow-xl outline-none sm:p-6"
          >
            <h2 id={dialogId} className="text-base font-medium leading-6">
              Bạn có muốn xóa {pendingRemoval.length} sản phẩm đã chọn khỏi giỏ hàng?
            </h2>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={cancelRemoval} className="min-h-10 rounded-lg border border-[#EAE4D7] px-4 text-sm font-medium hover:bg-[#FAF8F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88E4F]">
                Hủy
              </button>
              <button type="button" onClick={confirmRemoveSelected} className="min-h-10 rounded-lg bg-[#DC2626] px-4 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]">
                Xóa
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

    </div>
  );
}
