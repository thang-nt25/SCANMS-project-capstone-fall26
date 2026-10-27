import type { CartItem, CartVariantInfo } from '@/types/cart.types';
import { getSafeProductImageUrl } from '@/utils/marketplace.utils';

export const PENDING_CHECKOUT_KEY = 'scanms_pending_checkout';
export const CART_OWNER_KEY = 'scanms_cart_owner';
export const UUID_RE = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export const getCartStorageKey = (userId?: string | null): string => {
  return userId ? `scanms_cart_u_${userId}` : 'scanms_cart_guest';
};

export const getSelectedStorageKey = (userId?: string | null): string => {
  return userId ? `scanms_cart_selected_u_${userId}` : 'scanms_cart_selected_guest';
};

export const normalizeStoredCartItem = (rawItem: any): CartItem => {
  const item = rawItem && typeof rawItem === 'object' ? rawItem : {};
  const currentVariantId = typeof item.variantId === 'string' ? item.variantId.trim() : '';
  const variants: CartVariantInfo[] = Array.isArray(item.availableVariants)
    ? item.availableVariants.filter((variant: any) => variant && typeof variant.id === 'string')
    : [];
  const tokens = new Set(
    [currentVariantId, item.sku, item.variantName]
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim().toLocaleLowerCase())
      .filter(Boolean),
  );
  const matchedVariant = UUID_RE.test(currentVariantId)
    ? variants.find((variant: CartVariantInfo) => variant.id === currentVariantId)
    : variants.find((variant: CartVariantInfo) =>
        UUID_RE.test(variant.id) &&
        [variant.id, variant.sku, variant.name]
          .map((value) => typeof value === 'string' ? value.trim().toLocaleLowerCase() : '')
          .some((token) => token && tokens.has(token)),
      ) || (variants.length === 1 && UUID_RE.test(String(variants[0]?.id || '')) ? variants[0] : null);

  return {
    ...item,
    availableVariants: variants,
    ...(matchedVariant
      ? {
          variantId: matchedVariant.id,
          variantName: matchedVariant.name || item.variantName,
          sku: matchedVariant.sku || item.sku,
          price: matchedVariant.price !== null && matchedVariant.price !== undefined && Number.isFinite(Number(matchedVariant.price)) && Number(matchedVariant.price) >= 0
            ? Number(matchedVariant.price)
            : item.price,
          stockQuantity: Number.isSafeInteger(matchedVariant.stockQuantity) && matchedVariant.stockQuantity >= 0 ? matchedVariant.stockQuantity : item.stockQuantity,
        }
      : {}),
    imageUrl: getSafeProductImageUrl(item.imageUrl, item.title, item.variantName),
  } as CartItem;
};

/** Corrupt one row must not crash the storefront or discard every valid row. */
export const isStoredCartItem = (item: any): item is CartItem => Boolean(
  item && typeof item === 'object' &&
  typeof item.cartItemId === 'string' && item.cartItemId.trim() &&
  typeof item.productId === 'string' && item.productId.trim() &&
  item.store && typeof item.store.id === 'string' && item.store.id.trim() &&
  typeof item.store.name === 'string' && typeof item.title === 'string' &&
  Number.isFinite(item.price) && item.price >= 0 &&
  Number.isSafeInteger(item.quantity) && item.quantity > 0 &&
  Number.isSafeInteger(item.stockQuantity) && item.stockQuantity >= 0,
);

export const loadCartFromStorage = (uid: string | null): CartItem[] => {
  try {
    const key = getCartStorageKey(uid);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(isStoredCartItem).flatMap(item => {
          try { return [normalizeStoredCartItem(item)]; } catch { return []; }
        });
      }
    }
  } catch {
    // Fallback
  }
  return [];
};

export const loadSelectedFromStorage = (uid: string | null): string[] => {
  try {
    const key = getSelectedStorageKey(uid);
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return [...new Set(parsed.filter((id): id is string => typeof id === 'string' && Boolean(id.trim())))];
    }
  } catch {
    // Fallback
  }
  return [];
};
