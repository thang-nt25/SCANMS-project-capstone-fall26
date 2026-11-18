import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Heart, Minus, Plus, ShoppingCart, Store, X } from 'lucide-react';
import type { Product } from '@/types/marketplace.types';
import { formatMoney, handleProductImageError } from '@/utils/marketplace.utils';
import { LiveSessionDealBadge } from '@/components/product/LiveSessionDealBadge';
import { StoreCooperationAction } from '../affiliate/StoreCooperationAction';
import { getColourSizeOptions } from '@/utils/variant-choice';
import { authService } from '@/services/auth.service';

interface Props {
  product: Product;
  wished: boolean;
  onWishlist: () => void;
  onPurchase: (intent: 'cart' | 'buy', variantId?: string, quantity?: number) => void;
  deal: React.ComponentProps<typeof LiveSessionDealBadge>['deal'];
  now: number;
  choosing: boolean;
  onChoosingChange: (open: boolean) => void;
}

export function MarketplaceProductCard({ product, wished, onWishlist, onPurchase, deal, now, choosing, onChoosingChange }: Props) {
  const [variantId, setVariantId] = useState('');
  const setChoosing = onChoosingChange;
  const [intent, setIntent] = useState<'cart' | 'buy'>('cart');
  const [quantity, setQuantity] = useState(1);
  const [colour, setColour] = useState('');
  const [size, setSize] = useState('');
  const choiceId = useId();
  const choiceRef = useRef<HTMLDialogElement>(null);
  const variants = (product.variants || []).filter((variant) => variant.isActive !== false);
  const grouped = getColourSizeOptions(variants);
  const selectAttribute = (nextColour: string, nextSize: string) => {
    setColour(nextColour);
    setSize(nextSize);
    const match = grouped?.options.find(option => option.colour === nextColour && option.size === nextSize);
    setVariantId(match?.id ?? '');
    setQuantity(1);
  };
  const variant = variants.find((candidate) => candidate.id === variantId);
  const price = variant?.price != null ? Number(variant.price) : product.price;
  const available = variants.length ? variants.some((candidate) => candidate.stockQuantity > 0) : (product.stockQuantity ?? 0) > 0;
  const selectedAvailable = !variant || variant.stockQuantity > 0;
  const stock = variant?.stockQuantity ?? product.stockQuantity ?? 0;
  const canConfirm = available && (!variants.length || Boolean(variant)) && selectedAvailable && quantity >= 1 && quantity <= stock;
  const user = authService.getCurrentUser();
  const isAffiliateOrStaff = user?.role === 'COLLABORATOR' || user?.role === 'SHOP_MANAGER' || user?.role === 'SYSTEM_MANAGER' || user?.role === 'SYSTEM_ADMIN';
  const soldCount = Number(product.soldCount ?? 0);
  const soldLabel = Number.isFinite(soldCount)
    ? Math.max(0, Math.trunc(soldCount)).toLocaleString('vi-VN')
    : '0';

  useEffect(() => {
    if (!choosing) return;
    const dialog = choiceRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [choosing]);

  const buy = (intent: 'cart' | 'buy') => {
    if (!available) return;
    setVariantId('');
    setColour('');
    setSize('');
    setIntent(intent);
    setQuantity(1);
    setChoosing(true);
  };

  return (
    <article className="group relative flex h-full min-w-0 flex-col rounded-2xl border border-[#EAE4D7] bg-white text-left transition duration-200 hover:border-[#EEDFC6] hover:shadow-[0_6px_20px_rgba(35,29,21,0.06)]">
      <div className="relative aspect-square overflow-hidden rounded-t-2xl bg-white">
        <Link to={`/products/${product.sku || product.id}`} className="block h-full w-full">
          <img src={product.image} alt={product.name} loading="lazy" onError={handleProductImageError} className="h-full w-full object-contain p-3 transition motion-safe:group-hover:scale-[1.03]" />
        </Link>
        <LiveSessionDealBadge deal={deal} now={now} />
        {product.origPrice > price && <span className="absolute left-2 top-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-1 text-[10px] font-bold text-[#8C6226]">−{Math.round((product.origPrice - price) / product.origPrice * 100)}%</span>}
        <button type="button" onClick={onWishlist} aria-label={wished ? `Bỏ lưu ${product.name}` : `Lưu ${product.name}`} aria-pressed={wished} className="group/wishlist absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-transparent text-[#7D715E] hover:text-[#DC2626] focus-visible:outline-[#C59B58]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#DFD6C5] bg-white/95 shadow-[0_1px_4px_rgba(35,29,21,0.05)] transition-colors group-hover/wishlist:border-[#EEDFC6]"><Heart size={15} strokeWidth={1.7} className={wished ? 'fill-[#DC2626] text-[#DC2626]' : ''} /></span>
        </button>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4 max-sm:p-2.5">
        <Link to={product.storeId ? `/shops/${product.storeId}` : '/search'} className="mb-1.5 inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-[#7D715E] hover:text-[#B88E4F]"><Store size={12} className="shrink-0" /><span className="truncate">{product.brand}</span></Link>
        <h3 className="m-0 line-clamp-2 min-h-10 text-xs font-semibold leading-5 sm:text-sm max-sm:text-[13px] max-sm:leading-[19px]"><Link to={`/products/${product.sku || product.id}`} className="hover:text-[#B88E4F]">{product.name}</Link></h3>
        {product.storeId && <StoreCooperationAction storeId={product.storeId} storeName={product.brand} className="mb-2 mt-2 w-full" />}
        <div className="mb-2 mt-1.5">
          <div className="flex min-h-4 flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] text-[#7D715E]">
            {!available && <span className="text-[#D97706]">Tạm hết hàng</span>}
            {soldCount > 0 && <span data-product-sold-count className="whitespace-nowrap tabular-nums">Đã bán {soldLabel}</span>}
          </div>
          {isAffiliateOrStaff && product.commissionRate && product.commissionRate > 0 ? (
            <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF5EB] border border-[#EEDFC6] text-[#8F682E]">
              Thù lao tiếp thị: {product.commissionRate}%
            </span>
          ) : null}
        </div>
        <div className="mt-auto flex min-h-8 flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-1 tabular-nums"><strong className="text-base font-bold tracking-tight text-[#1A1612] sm:text-lg">{formatMoney(price)}</strong>{product.origPrice > price && <del className="text-[10px] text-[#7D715E]">{formatMoney(product.origPrice)}</del>}</div>
        <div className="mt-2.5 grid grid-cols-[44px_minmax(0,1fr)] gap-2">
          <button type="button" onClick={() => buy('cart')} disabled={!available} aria-label={`Thêm ${product.name} vào giỏ`} title="Thêm vào giỏ" className="flex h-11 items-center justify-center rounded-xl border border-[#C59B58] text-[#B88E4F] hover:bg-[#FBF5EB] disabled:border-[#EAE4D7] disabled:text-[#7D715E] disabled:opacity-50"><ShoppingCart size={17} /></button>
          <button type="button" onClick={() => buy('buy')} disabled={!available} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-2 text-center text-xs font-semibold leading-4 text-[#231D15] hover:bg-[#F3EFE6] disabled:border-[#EAE4D7] disabled:bg-[#FAF8F5] disabled:text-[#7D715E]">{!available ? 'Hết hàng' : 'Mua ngay'}</button>
        </div>
      {choosing && <dialog ref={choiceRef} aria-labelledby={choiceId} onCancel={() => setChoosing(false)} onClose={() => setChoosing(false)} onClick={event => { if (event.target === event.currentTarget) setChoosing(false); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[520px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white p-0 text-left text-[#1A1612] shadow-[0_16px_60px_rgba(35,29,21,0.18)] outline-none backdrop:bg-[#231D15]/35">
        <div className="flex items-center justify-between gap-2 border-b border-[#EAE4D7] px-5 py-3">
          <h4 id={choiceId} className="m-0 text-base font-semibold">{variants.length ? 'Chọn phân loại' : 'Chọn số lượng'}</h4>
          <button type="button" autoFocus onClick={() => setChoosing(false)} aria-label="Đóng chọn phân loại" className="grid size-9 place-items-center rounded-lg text-[#7D715E] hover:bg-[#FAF8F5]"><X size={20} /></button>
        </div>
        <div className="max-h-[calc(100dvh-180px)] overflow-y-auto overscroll-contain px-5 py-4">
          <div className="mb-4 flex items-center gap-3">
            <img src={product.image} alt="" onError={handleProductImageError} className="size-[72px] shrink-0 rounded-xl border border-[#EAE4D7] bg-white object-contain p-1" />
            <div className="min-w-0"><p className="m-0 line-clamp-2 text-sm font-semibold leading-5">{product.name}</p><strong className="mt-1 block text-lg tabular-nums text-[#B88E4F]">{formatMoney(price)}</strong></div>
          </div>
          {grouped ? <div className="space-y-3">
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="mb-2 text-xs font-medium">Màu sắc</legend>
              <div className="grid grid-cols-3 gap-2">
                {grouped.colours.map(value => {
                  const inStock = grouped.options.some(option => option.colour === value && variants.some(item => item.id === option.id && item.stockQuantity > 0));
                  return <button key={value} type="button" aria-pressed={colour === value} disabled={!inStock}
                    onClick={() => {
                      const compatible = grouped.options.find(option => option.colour === value && option.size === size && variants.some(item => item.id === option.id && item.stockQuantity > 0));
                      selectAttribute(value, compatible ? size : '');
                    }}
                    className={`flex min-h-9 items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${colour === value ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226]' : 'border-[#EAE4D7] bg-white hover:bg-[#FAF8F5]'}`}>
                    {value}{colour === value && <Check size={13} className="shrink-0" />}
                  </button>;
                })}
              </div>
            </fieldset>
            <fieldset className="m-0 min-w-0 border-0 p-0">
              <legend className="mb-2 text-xs font-medium">Kích cỡ</legend>
              <div className="grid grid-cols-3 gap-2">
                {grouped.sizes.map(value => {
                  const inStock = grouped.options.some(option => (!colour || option.colour === colour) && option.size === value && variants.some(item => item.id === option.id && item.stockQuantity > 0));
                  return <button key={value} type="button" aria-pressed={size === value} disabled={!inStock}
                    onClick={() => selectAttribute(colour, value)}
                    className={`flex min-h-9 items-center justify-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through ${size === value ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226]' : 'border-[#EAE4D7] bg-white hover:bg-[#FAF8F5]'}`}>
                    {value}{size === value && <Check size={13} />}
                  </button>;
                })}
              </div>
            </fieldset>
          </div> : <>
          {variants.length > 0 && <p className="mb-2 mt-5 text-xs font-semibold text-[#7D715E]">Phân loại sản phẩm</p>}
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Phân loại sản phẩm">
            {variants.map((candidate) => <button key={candidate.id} type="button" disabled={candidate.stockQuantity <= 0} aria-pressed={variantId === candidate.id} onClick={() => { setVariantId(candidate.id); setQuantity(1); }} className={`relative flex min-h-12 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-center text-xs font-medium leading-5 disabled:cursor-not-allowed disabled:opacity-40 ${variantId === candidate.id ? 'border-[#C59B58] bg-[#FBF5EB] text-[#8C6226]' : 'border-[#EAE4D7] bg-white hover:bg-[#FAF8F5]'}`}>
              <span>{candidate.name}{candidate.stockQuantity <= 0 ? ' · Hết hàng' : ''}</span>{variantId === candidate.id && <Check size={14} className="shrink-0" />}
            </button>)}
          </div>
          </>}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE4D7] pt-3"><div><span className="block text-xs font-medium">Số lượng</span>{variant && <span className="text-[11px] text-[#7D715E]">Còn {stock} sản phẩm</span>}</div><div className="inline-flex items-center overflow-hidden rounded-xl border border-[#EAE4D7]">
            <button type="button" disabled={quantity <= 1} onClick={() => setQuantity((value) => value - 1)} aria-label="Giảm số lượng" className="grid size-8 place-items-center disabled:opacity-30"><Minus size={16} /></button><span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span><button type="button" disabled={(variants.length > 0 && !variant) || quantity >= stock} onClick={() => setQuantity((value) => value + 1)} aria-label="Tăng số lượng" className="grid size-8 place-items-center disabled:opacity-30"><Plus size={16} /></button>
          </div></div>
        </div>
        <div className="border-t border-[#EAE4D7] bg-white px-5 py-3"><button type="button" disabled={!canConfirm} onClick={() => { if (!canConfirm) return; onPurchase(intent, variant?.id, quantity); setChoosing(false); }} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#EEDFC6] bg-[#FBF5EB] px-3 text-sm font-semibold hover:bg-[#F3EFE6] disabled:opacity-50"><ShoppingCart size={17} />{intent === 'cart' ? 'Thêm vào giỏ' : 'Mua ngay'}</button></div>
      </dialog>}
      </div>
    </article>
  );
}
