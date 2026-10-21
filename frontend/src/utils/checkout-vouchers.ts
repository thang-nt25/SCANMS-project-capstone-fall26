export function collectCheckoutVouchers<T extends { id: string }>(
  lists: T[][],
): T[] {
  return [
    ...new Map(lists.flat().map((voucher) => [voucher.id, voucher])).values(),
  ];
}

export function checkoutVoucherDisabledReason(
  voucher: { minimumOrderAmount: number | null; benefitType?: string },
  goodsSubtotal: number,
  shippingFee: number,
): string | null {
  if (goodsSubtotal < (voucher.minimumOrderAmount || 0))
    return "Chưa đạt giá trị đơn tối thiểu";
  if (voucher.benefitType === "SHIPPING" && shippingFee <= 0)
    return "Cần có phí vận chuyển để dùng mã này";
  return null;
}
