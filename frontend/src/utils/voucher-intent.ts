export type VoucherSlot = "SHOP" | "PLATFORM" | "SHIPPING";

export function voucherSlot(voucher: {
  fundingSource?: string;
  benefitType?: string;
}): 'SHOP' | null {
  if (voucher.benefitType === 'SHIPPING'
    || (voucher.fundingSource && voucher.fundingSource !== 'SHOP_FUNDED')) return null;
  return 'SHOP';
}

export function voucherProductUrl(productId: string, _code: string): string {
  return `/products/${encodeURIComponent(productId)}`;
}
