import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Store } from 'lucide-react';
import type { Product } from '@/types/marketplace.types';
import { formatMoney, getSafeProductImageUrl } from '@/utils/marketplace.utils';
import { LiveSessionDealBadge } from '@/components/product/LiveSessionDealBadge';

interface Props {
  product: Product;
  wished: boolean;
  onWishlist: () => void;
  onPurchase: (intent: 'cart' | 'buy', variantId?: string) => void;
  deal: React.ComponentProps<typeof LiveSessionDealBadge>['deal'];
  now: number;
}

export function MarketplaceProductCard({ product, wished, onWishlist, onPurchase, deal, now }: Props) {
  const [variantId, setVariantId] = useState('');
  const [choosing, setChoosing] = useState(false);
  const variants = (product.variants || []).filter((variant) => variant.isActive !== false);
  const variant = variants.find((candidate) => candidate.id === variantId);
  const price = variant?.price != null ? Number(variant.price) : product.price;
  const available = variants.length ? variants.some((candidate) => candidate.stockQuantity > 0) : (product.stockQuantity ?? 0) > 0;
  const selectedAvailable = !variant || variant.stockQuantity > 0;
  const buy = (intent: 'cart' | 'buy') => {
    if (variants.length && !variant) { setChoosing(true); return; }
    if (!available || !selectedAvailable) return;
    onPurchase(intent, variant?.id);
  };

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white text-left transition hover:border-[#C59B58] hover:shadow-[0_8px_24px_rgba(75,57,34,0.10)]">
      <div className="relative aspect-square overflow-hidden bg-white">
        <Link to={`/products/${product.sku || product.id}`} className="block h-full w-full">
          <img src={product.image} alt={product.name} loading="lazy" onError={(event) => { if (!event.currentTarget.dataset.fallback) { event.currentTarget.dataset.fallback = 'true'; event.currentTarget.src = getSafeProductImageUrl(null, product.name); } }} className="h-full w-full object-contain p-3 transition motion-safe:group-hover:scale-[1.03]" />
        </Link>
        <LiveSessionDealBadge deal={deal} now={now} />
        {product.origPrice > price && <span className="absolute left-2 top-2 rounded-lg border border-[#EEDFC6] bg-[#FBF5EB] px-2 py-1 text-[10px] font-bold text-[#8C6226]">−{Math.round((product.origPrice - price) / product.origPrice * 100)}%</span>}
        <button type="button" onClick={onWishlist} aria-label={wished ? `Bỏ lưu ${product.name}` : `Lưu ${product.name}`} aria-pressed={wished} className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#7D715E] hover:text-[#DC2626]"><Heart size={17} className={wished ? 'fill-[#DC2626] text-[#DC2626]' : ''} /></button>
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <Link to={product.storeId ? `/shops/${product.storeId}` : '/search'} className="mb-2 inline-flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#7D715E] hover:text-[#B88E4F]"><Store size={13} className="shrink-0" /><span className="truncate">{product.brand}</span></Link>
        <h3 className="m-0 line-clamp-2 min-h-10 text-xs font-semibold leading-5 sm:text-sm"><Link to={`/products/${product.sku || product.id}`} className="hover:text-[#B88E4F]">{product.name}</Link></h3>
        <p className="mb-2 mt-2 text-[10px] text-[#7D715E]">{available ? 'Sẵn hàng' : 'Tạm hết hàng'}</p>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 border-t border-[#EAE4D7] pt-3"><strong className="text-sm text-[#1A1612] sm:text-base">{formatMoney(price)}</strong>{product.origPrice > price && <del className="text-[10px] text-[#7D715E]">{formatMoney(product.origPrice)}</del>}</div>
        {variants.length > 0 && (choosing || variantId) && <label className="mt-3 block text-[10px] text-[#7D715E]">Chọn phân loại
          <select autoFocus={choosing} value={variantId} onChange={(event) => setVariantId(event.target.value)} className="mt-1 min-h-10 w-full rounded-lg border border-[#EAE4D7] bg-[#FAF8F5] px-2 text-xs text-[#1A1612] outline-[#C59B58]"><option value="">Vui lòng chọn</option>{variants.map((candidate) => <option key={candidate.id} value={candidate.id} disabled={candidate.stockQuantity <= 0}>{candidate.name}{candidate.stockQuantity <= 0 ? ' · Hết hàng' : ''}</option>)}</select>
        </label>}
        <div className="mt-3 grid grid-cols-[44px_1fr] gap-2">
          <button type="button" onClick={() => buy('cart')} disabled={!available || !selectedAvailable} aria-label={`Thêm ${product.name} vào giỏ`} title="Thêm vào giỏ" className="flex h-11 items-center justify-center rounded-xl border border-[#C59B58] text-[#B88E4F] hover:bg-[#FBF5EB] disabled:border-[#EAE4D7] disabled:text-[#7D715E] disabled:opacity-50"><ShoppingCart size={17} /></button>
          <button type="button" onClick={() => buy('buy')} disabled={!available || !selectedAvailable} className="min-h-11 rounded-xl bg-[#C59B58] px-2 text-[11px] font-bold text-[#231D15] hover:bg-[#B88E4F] disabled:bg-[#F3EFE6] disabled:text-[#7D715E]">{!available ? 'Hết hàng' : variants.length && !variant ? 'Chọn phân loại' : 'Mua ngay'}</button>
        </div>
      </div>
    </article>
  );
}
