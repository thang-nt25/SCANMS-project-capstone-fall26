import api from '@/services/api';
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
  ShieldCheck,
  Truck,
  MessageCircle,
  Tag,
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
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [partnerCodeLoading, setPartnerCodeLoading] = useState(false);
  const [partnerCodeMsg, setPartnerCodeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleApplyPartnerCodeCart = async () => {
    const code = partnerCodeInput.trim().toUpperCase();
    if (!code) return;
    if (selected.length === 0) {
      setPartnerCodeMsg({ type: 'error', text: 'Vui lòng chọn ít nhất 1 sản phẩm để áp dụng mã.' });
      return;
    }
    const targetStoreId = selected[0]?.store?.id;
    if (!targetStoreId) {
      setPartnerCodeMsg({ type: 'error', text: 'Không xác định được gian hàng sản phẩm.' });
      return;
    }
    setPartnerCodeLoading(true);
    setPartnerCodeMsg(null);
    try {
      const res: any = await api.post('/coupons/validate', {
        code,
        storeId: targetStoreId,
        items: selected.filter((i) => i.store?.id === targetStoreId).map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.price,
        })),
        hasProductDiscount: false,
        hasShopVoucher: false,
        hasPlatformVoucher: false,
      });
      const data = res?.data || res;
      setAppliedShopCoupons({
        [targetStoreId]: {
          storeId: targetStoreId,
          code: data.code || code,
          discountAmount: Number(data.discountAmount) || 0,
          discountType: data.discountType,
        },
      });
      setPartnerCodeMsg({
        type: 'success',
        text: `Đã áp dụng mã ${data.code || code}, giảm ${formatMoney(Number(data.discountAmount) || 0)}.`,
      });
    } catch (err: any) {
      setPartnerCodeMsg({
        type: 'error',
        text: err?.response?.data?.message || 'Mã ưu đãi không hợp lệ cho sản phẩm đã chọn.',
      });
    } finally {
      setPartnerCodeLoading(false);
    }
  };

  const handleRemovePartnerCodeCart = (storeId: string) => {
    setAppliedShopCoupons((prev) => {
      const next = { ...prev };
      delete next[storeId];
      return next;
    });
    setPartnerCodeInput('');
    setPartnerCodeMsg(null);
  };

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
  const shippingDiscount = appliedShippingCoupon ? appliedShippingCoupon.discountAmount : 0;
  const estimatedTotal = Math.max(0, subtotal - totalShopDiscount - platformDiscount);

  const handleCheckout = () => {
    if (selected.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm để tiếp tục thanh toán');
      return;
    }
    // Pass selected items and any preselected coupon to the checkout flow
    startCheckout(selected, Object.values(appliedShopCoupons)[0]?.code || appliedPlatformCoupon?.code || '');
  };

  const handleRemoveSelected = () => {
    if (selected.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selected.length} sản phẩm đã chọn khỏi giỏ hàng?`)) {
      removeItems(selected.map((i) => i.cartItemId));
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1612] flex flex-col font-sans">
      {/* Top Header */}
      <PublicHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <nav className="flex items-center gap-2 text-xs text-[#7D715E] mb-1.5" aria-label="Breadcrumb">
              <Link to="/marketplace" className="hover:text-[#B88E4F] transition-colors">Trang chủ</Link>
              <span>/</span>
              <span className="font-semibold text-[#1A1612]">Giỏ hàng</span>
            </nav>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1A1612]">
                Giỏ Hàng
              </h1>
              {totalCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F]">
                  {totalCount} sản phẩm
                </span>
              )}
            </div>
          </div>

          {cart.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void refreshCartStock()}
                disabled={isValidatingStock || isCartSyncing}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#EAE4D7] bg-white text-xs font-semibold text-[#7D715E] hover:text-[#B88E4F] hover:border-[#C59B58] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <RefreshCw size={14} className={isValidatingStock || isCartSyncing ? 'animate-spin' : ''} />
                <span>{isValidatingStock || isCartSyncing ? 'Đang kiểm tra tồn kho...' : 'Cập nhật giá & kho'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Freeship Alert Banner */}
        {cart.length > 0 && (
          <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-white border border-[#EAE4D7] shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
              <Truck size={20} />
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-bold text-[#1A1612] sm:text-sm">
                Ưu đãi miễn phí vận chuyển toàn quốc từ SCANMS
              </p>
              <p className="text-[#7D715E] mt-0.5">
                Nhập mã ưu đãi của Đối tác tiếp thị (KOC) ở thanh bên phải để áp dụng giảm giá trực tiếp cho đơn hàng.
              </p>
            </div>
          </div>
        )}

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
          /* Main 2-Column SCANMS E-Commerce Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Product Table grouped by Shop (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Header Bar */}
              <div className="bg-white rounded-2xl border border-[#EAE4D7] p-4 shadow-xs hidden md:grid md:grid-cols-12 gap-4 items-center text-xs font-bold text-[#7D715E]">
                <div className="col-span-6 flex items-center gap-3">
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
                </div>
                <div className="col-span-2 text-center">Đơn giá</div>
                <div className="col-span-2 text-center">Số lượng</div>
                <div className="col-span-2 text-right">Số tiền</div>
              </div>

              {/* Grouped by Store */}
              {groupedByStore.map((group) => {
                const groupSelected = group.items.filter(
                  (item) => isAvailable(item) && selectedItemIds.includes(item.cartItemId),
                );
                const groupSubtotal = groupSelected.reduce((sum, item) => sum + item.price * item.quantity, 0);
                const shopVoucher = appliedShopCoupons[group.storeId];

                return (
                  <div
                    key={group.storeId}
                    className="bg-white rounded-2xl border border-[#EAE4D7] shadow-xs overflow-hidden transition-all"
                  >
                    {/* Shop Header */}
                    <div className="p-3.5 sm:p-4 border-b border-[#EAE4D7] bg-[#FAF8F5]/60 flex items-center justify-between gap-3 flex-wrap">
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
                          <span className="w-7 h-7 rounded-lg bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                            <Store size={15} />
                          </span>
                          <Link
                            to={`/shops/${group.storeSlug || group.storeId}`}
                            className="font-bold text-sm text-[#1A1612] hover:text-[#B88E4F] transition-colors truncate"
                          >
                            {group.storeName}
                          </Link>
                          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#FBF5EB] text-[#B88E4F] border border-[#EEDFC6]">
                            Chính hãng
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {openChat && (
                          <button
                            type="button"
                            onClick={() => openChat({ id: group.storeId, name: group.storeName })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-white text-[11px] font-medium text-[#7D715E] hover:text-[#B88E4F] hover:border-[#C59B58] transition-colors cursor-pointer"
                          >
                            <MessageCircle size={13} />
                            <span>Chat ngay</span>
                          </button>
                        )}
                        <Link
                          to={`/shops/${group.storeSlug || group.storeId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#EAE4D7] bg-white text-[11px] font-medium text-[#7D715E] hover:text-[#B88E4F] transition-colors"
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
                            className={`p-4 transition-colors ${!available ? 'opacity-50 bg-[#FAF8F5]' : ''}`}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                              {/* Checkbox, Image, Title (Col 6) */}
                              <div className="md:col-span-6 flex items-start gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded accent-[#C59B58] cursor-pointer mt-3 shrink-0"
                                  checked={isItemSelected && available}
                                  disabled={!available}
                                  onChange={() => toggleSelectItem(item.cartItemId)}
                                />
                                <Link
                                  to={`/products/${item.productId}`}
                                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-white border border-[#EAE4D7] p-1 shrink-0 overflow-hidden flex items-center justify-center hover:border-[#C59B58] transition-colors"
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
                                        className="text-[11px] py-1 px-2 border border-[#EAE4D7] rounded-lg bg-[#FAF8F5] text-[#1A1612] max-w-full font-medium"
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
                              <div className="md:col-span-2 md:text-center flex md:block items-baseline justify-between">
                                <span className="text-xs text-[#7D715E] md:hidden">Đơn giá:</span>
                                <div>
                                  <strong className="text-sm font-bold text-[#1A1612]">
                                    {formatMoney(item.price)}
                                  </strong>
                                  {!!item.originalPrice && item.originalPrice > item.price && (
                                    <del className="block text-[11px] text-[#7D715E] mt-0.5">
                                      {formatMoney(item.originalPrice)}
                                    </del>
                                  )}
                                </div>
                              </div>

                              {/* Quantity (Col 2) */}
                              <div className="md:col-span-2 flex items-center md:justify-center justify-between">
                                <span className="text-xs text-[#7D715E] md:hidden">Số lượng:</span>
                                <div className="inline-flex items-center border border-[#EAE4D7] rounded-xl bg-white overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                                    disabled={!available || item.quantity <= 1}
                                    className="w-8 h-8 flex items-center justify-center text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#1A1612] disabled:opacity-30 transition-colors cursor-pointer"
                                    title="Giảm số lượng"
                                  >
                                    <Minus size={13} />
                                  </button>
                                  <span className="w-10 text-center text-xs font-bold text-[#1A1612] tabular-nums">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                                    disabled={!available || item.quantity >= item.stockQuantity}
                                    className="w-8 h-8 flex items-center justify-center text-[#7D715E] hover:bg-[#FBF5EB] hover:text-[#1A1612] disabled:opacity-30 transition-colors cursor-pointer"
                                    title="Tăng số lượng"
                                  >
                                    <Plus size={13} />
                                  </button>
                                </div>
                              </div>

                              {/* Total & Action (Col 2) */}
                              <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3">
                                <span className="text-xs text-[#7D715E] md:hidden">Thành tiền:</span>
                                <strong className="text-sm font-bold text-[#B88E4F] tabular-nums">
                                  {formatMoney(item.price * item.quantity)}
                                </strong>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item.cartItemId)}
                                  className="w-8 h-8 flex items-center justify-center text-[#7D715E] hover:text-[#DC2626] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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

                    {/* Shop Footer: Shop Voucher Row & Subtotal */}
                    <div className="p-3.5 sm:p-4 bg-[#FAF8F5]/80 border-t border-[#EAE4D7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      {/* Shop Voucher Trigger */}
                      <div
                        onClick={() => setIsVoucherModalOpen(true)}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <Ticket size={16} className="text-[#B88E4F]" />
                        <span className="font-semibold text-[#1A1612]">Voucher của Shop:</span>
                        {shopVoucher ? (
                          <span className="px-2 py-0.5 rounded-md bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] font-bold">
                            {shopVoucher.code} (-{formatMoney(shopVoucher.discountAmount)})
                          </span>
                        ) : (
                          <span className="text-[#B88E4F] group-hover:underline font-medium">
                            Chọn hoặc nhập mã ưu đãi của Shop &gt;
                          </span>
                        )}
                      </div>

                      {/* Store Subtotal */}
                      {group.items.length > 0 && (
                        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
                          <span className="text-[#7D715E]">Tiền hàng gian hàng đã chọn:</span>
                          <strong className="text-sm font-bold text-[#1A1612] tabular-nums">
                            {formatMoney(groupSubtotal)}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Bulk Actions Bar */}
              <div className="bg-white rounded-2xl border border-[#EAE4D7] p-4 shadow-xs flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-[#C59B58]"
                      checked={allSelected}
                      disabled={!selectable.length}
                      onChange={() => toggleSelectAll()}
                    />
                    <span>Chọn tất cả ({selectable.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveSelected}
                    disabled={selected.length === 0}
                    className="text-[#7D715E] hover:text-[#DC2626] transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    Xóa các mục đã chọn
                  </button>
                </div>
                <div className="text-[#7D715E]">
                  Đã chọn <strong className="text-[#1A1612]">{selectedCount}</strong> sản phẩm
                </div>
              </div>
            </div>

            {/* Right Column: Sticky Summary & SCANMS Voucher Card (4 cols) */}
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
              {/* Mã Ưu Đãi Đối Tác Tiếp Thị */}
              <div className="bg-white rounded-2xl border border-[#EAE4D7] p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] text-[#B88E4F] flex items-center justify-center shrink-0">
                    <Tag size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#1A1612]">Mã Ưu Đãi Đối Tác Tiếp Thị</h3>
                    <p className="text-[11px] text-[#7D715E]">Nhập mã giới thiệu của KOC để nhận giá ưu đãi</p>
                  </div>
                </div>

                {totalShopDiscount > 0 ? (
                  <div className="p-3 rounded-xl bg-[#FBF5EB] border border-[#EEDFC6] space-y-2">
                    {Object.values(appliedShopCoupons).map((v) => (
                      <div key={v.code} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#8F682E] bg-white px-2 py-0.5 rounded border border-[#EEDFC6]">
                            {v.code}
                          </span>
                          <span className="font-semibold text-[#1A1612]">
                            -{formatMoney(v.discountAmount)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePartnerCodeCart(v.storeId)}
                          className="text-[11px] font-semibold text-[#7D715E] hover:text-[#DC2626] transition-colors cursor-pointer"
                        >
                          Hủy mã
                        </button>
                      </div>
                    ))}
                    <p className="text-[11px] text-[#7D715E]">
                      Đã ghi nhận ưu đãi từ Đối tác tiếp thị.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={partnerCodeInput}
                        onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleApplyPartnerCodeCart();
                          }
                        }}
                        placeholder="Nhập mã (Ví dụ: THAONHI16)"
                        className="flex-1 min-h-[38px] px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xl border border-[#EAE4D7] bg-[#FAF8F5] text-[#1A1612] placeholder:text-[#7D715E] placeholder:font-sans placeholder:normal-case focus:bg-white focus:border-[#C59B58] focus:outline-none transition-all"
                      />
                      <button
                        type="button"
                        disabled={partnerCodeLoading || !partnerCodeInput.trim()}
                        onClick={() => void handleApplyPartnerCodeCart()}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[#C59B58] hover:bg-[#B88E4F] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {partnerCodeLoading ? 'Đang kiểm tra...' : 'Áp dụng'}
                      </button>
                    </div>
                  </div>
                )}

                {partnerCodeMsg && (
                  <div
                    className={`mt-2.5 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${
                      partnerCodeMsg.type === 'error'
                        ? 'bg-red-50 text-[#DC2626] border border-red-200'
                        : 'bg-[#FBF5EB] text-[#8C6B32] border border-[#EEDFC6]'
                    }`}
                  >
                    <span>{partnerCodeMsg.text}</span>
                  </div>
                )}
              </div>

              {/* Order Summary & Checkout Card */}
              <div className="bg-white rounded-2xl border border-[#EAE4D7] p-5 sm:p-6 shadow-xs">
                <h3 className="font-bold text-base text-[#1A1612] mb-4">
                  Tóm tắt đơn hàng
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between text-[#7D715E]">
                    <span>Tổng tiền hàng ({selectedCount} món):</span>
                    <strong className="text-sm font-semibold text-[#1A1612] tabular-nums">
                      {formatMoney(subtotal)}
                    </strong>
                  </div>

                  {totalShopDiscount > 0 && (
                    <div className="flex items-center justify-between text-[#B88E4F]">
                      <span>Ưu đãi đối tác tiếp thị:</span>
                      <strong className="font-bold tabular-nums">
                        -{formatMoney(totalShopDiscount)}
                      </strong>
                    </div>
                  )}

                  {platformDiscount > 0 && (
                    <div className="flex items-center justify-between text-[#B88E4F]">
                      <span>Mã giảm giá sàn SCANMS:</span>
                      <strong className="font-bold tabular-nums">
                        -{formatMoney(platformDiscount)}
                      </strong>
                    </div>
                  )}

                  {shippingDiscount > 0 && (
                    <div className="flex items-center justify-between text-[#059669]">
                      <span>Ước tính giảm phí vận chuyển:</span>
                      <strong className="font-bold tabular-nums">
                        -{formatMoney(shippingDiscount)}
                      </strong>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#EAE4D7] flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1A1612] block">
                        Tổng thanh toán (Tạm tính):
                      </span>
                      <span className="text-[10px] text-[#7D715E]">
                        (Chưa gồm cước GHN thực tế)
                      </span>
                    </div>
                    <strong className="text-2xl font-black text-[#B88E4F] tabular-nums tracking-tight">
                      {formatMoney(estimatedTotal)}
                    </strong>
                  </div>
                </div>

                {/* Main Checkout Button */}
                <button
                  type="button"
                  id="cart-checkout-btn"
                  onClick={handleCheckout}
                  disabled={selected.length === 0 || isValidatingStock || isCartSyncing}
                  className="mt-6 w-full py-4 px-6 rounded-2xl bg-[#C59B58] hover:bg-[#B88E4F] disabled:bg-[#F3EFE6] disabled:border-[#EAE4D7] disabled:text-[#7D715E] text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Tiến hành Mua Hàng</span>
                  {selectedCount > 0 && <span>({selectedCount})</span>}
                  <ArrowRight size={18} />
                </button>

                {selected.length === 0 && (
                  <p className="mt-2 text-center text-[11px] text-[#7D715E]">
                    Vui lòng chọn ít nhất 1 sản phẩm để tiếp tục đặt hàng
                  </p>
                )}

                {/* Trust & Guarantee Badge */}
                <div className="mt-5 pt-4 border-t border-[#EAE4D7] flex items-center gap-2.5 text-[11px] text-[#7D715E]">
                  <ShieldCheck size={18} className="text-[#B88E4F] shrink-0" />
                  <span>
                    Bảo đảm thanh toán an toàn 100% qua bảo chứng sàn SCANMS & Đổi trả dễ dàng trong 14 ngày.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* SCANMS Checkout Voucher Modal Component */}
      <ScanmsCheckoutVoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        groups={itemsGroupedByShop}
        shippingFeesByStore={{}}
        totalShippingFee={30000} // Cước tạm tính giả định cho trang giỏ hàng
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
