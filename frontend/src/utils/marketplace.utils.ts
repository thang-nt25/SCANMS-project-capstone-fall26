import type { CartLine, Creator, Product } from '@/types/marketplace.types';

export function formatMoney(value: number | string): string {
  const num = typeof value === 'number' ? value : Number(value) || 0;
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

export const discountedCatalogPath = '/search?discount=true&inStock=true';

export function hasCatalogDiscount(product: Product, inStockOnly = false): boolean {
  const variants = product.variants?.filter(variant => variant.isActive !== false) ?? [];
  if (variants.length) {
    return variants.some(variant =>
      (!inStockOnly || variant.stockQuantity > 0) &&
      Number(variant.listPrice) > Number(variant.price ?? product.price),
    ) || (
      variants.every(variant => variant.listPrice == null) &&
      product.origPrice > product.price &&
      (!inStockOnly || variants.some(variant => variant.stockQuantity > 0 && Number(variant.price ?? product.price) === product.price))
    );
  }
  return (!inStockOnly || (product.stockQuantity ?? 0) > 0) && product.origPrice > product.price;
}

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function calculateCart(lines: CartLine[], products: Product[], creator: Creator) {
  const subtotal = lines.reduce(
    (sum, line) => sum + (products.find((p) => p.id === line.productId)?.price ?? 0) * line.quantity,
    0
  );

  const eligibleSubtotal = lines.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.productId);
    return sum + (product?.kol?.coupon === creator.coupon ? (product.price ?? 0) * line.quantity : 0);
  }, 0);
  const minimum = Number(creator.voucherInfo.minOrder.replace(/\D/g, ''));
  const maximum = Number(creator.voucherInfo.maxDiscount.replace(/\D/g, ''));
  const discount =
    eligibleSubtotal >= minimum
      ? Math.min(Math.round((eligibleSubtotal * creator.voucherInfo.discountPct) / 100), maximum)
      : 0;
  return { subtotal, discount, total: subtotal - discount };
}

export function getSafeProductImageUrl(
  imageUrl?: string | null,
  title?: string,
  categoryName?: string
): string {
  if (
    imageUrl &&
    typeof imageUrl === 'string' &&
    imageUrl.trim() &&
    !imageUrl.includes('data:image/svg+xml') &&
    !imageUrl.includes('scanms-placeholder') &&
    !imageUrl.includes('placeholder.png') &&
    !imageUrl.includes('placeholder')
  ) {
    const source = imageUrl.trim();
    // Seed photos belong to this frontend, not a particular development port.
    // Keep remote/CDN and uploaded image URLs unchanged.
    try {
      const url = new URL(source);
      if (
        ['http:', 'https:'].includes(url.protocol) &&
        ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
        url.pathname.startsWith('/assets/')
      ) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
    } catch {
      // Relative asset paths are already resolved against the current website.
    }
    return source;
  }

  // A missing photo must not silently display a different product or brand.
  // Keep this fallback local so upstream image outages cannot break it too.
  void title;
  void categoryName;
  return '/assets/product-placeholder.svg';
}

export function handleProductImageError(event: { currentTarget: HTMLImageElement }): void {
  const image = event.currentTarget;
  const fallback = new URL(getSafeProductImageUrl(), image.ownerDocument.baseURI).href;
  if (image.src !== fallback) image.src = fallback;
}
