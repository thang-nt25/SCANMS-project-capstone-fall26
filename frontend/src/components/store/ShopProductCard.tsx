import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { LiveSessionDealBadge } from '../product/LiveSessionDealBadge';
import type { ShopProduct } from '../../types/storefront.types';
import type { ComponentProps } from 'react';

const money = (value: number) => `${Number(value).toLocaleString('vi-VN')} ₫`;
export function ShopProductCard({
  product,
  deal,
  now,
}: {
  product: ShopProduct;
  deal: ComponentProps<typeof LiveSessionDealBadge>['deal'];
  now: number;
}) {
  return (
    <Link
      to={`/products/${product.sku || product.id}`}
      data-shop-product
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#EAE4D7] bg-white transition hover:border-[#C59B58] hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-[#F3EFE6]">
        <LiveSessionDealBadge deal={deal} now={now} />
        <img
          src={product.imageUrl || '/assets/product-placeholder.svg'}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(event) => {
            if (!event.currentTarget.dataset.fallback) {
              event.currentTarget.dataset.fallback = 'true';
              event.currentTarget.src = '/assets/product-placeholder.svg';
            }
          }}
        />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold text-[#1A1612] sm:text-base">
          {product.title}
        </h3>
        <div className="mt-2">
          <p className="whitespace-nowrap text-sm font-bold text-[#B88E4F] sm:text-lg">
            {money(product.price)}
          </p>
          {product.originalPrice &&
            Number(product.originalPrice) > Number(product.price) && (
              <p className="text-xs text-[#7D715E] line-through">
                {money(product.originalPrice)}
              </p>
            )}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-3 text-[11px] text-[#7D715E]">
          {Number(product.reviewCount) > 0 &&
          Number(product.rating) >= 1 &&
          Number(product.rating) <= 5 ? (
            <span
              data-product-rating
              className="inline-flex items-center gap-1 rounded-md border border-[#EEDFC6] bg-[#FBF5EB] px-1.5 py-0.5 text-[#1A1612]"
              aria-label={`${Number(product.rating).toFixed(1)} trên 5 sao, ${Number(product.reviewCount).toLocaleString('vi-VN')} đánh giá`}
            >
              <Star
                size={13}
                aria-hidden="true"
                className="shrink-0 fill-[#C59B58] text-[#C59B58]"
              />
              <span className="font-semibold tabular-nums">
                {Number(product.rating).toFixed(1)}
              </span>
              <span className="tabular-nums text-[#7D715E]">
                ({Number(product.reviewCount).toLocaleString('vi-VN')})
              </span>
            </span>
          ) : (
            <span data-product-rating>Chưa có đánh giá</span>
          )}
          <span
            data-product-sold-count
            className="whitespace-nowrap tabular-nums"
          >
            Đã bán{' '}
            {Number.isFinite(Number(product.soldCount))
              ? Math.max(
                  0,
                  Math.trunc(Number(product.soldCount)),
                ).toLocaleString('vi-VN')
              : '0'}
          </span>
        </div>
      </div>
    </Link>
  );
}
