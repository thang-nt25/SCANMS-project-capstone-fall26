export function chatVoucherDiscount(coupon: { discountType: string; discountValue: number | string; benefitType?: string }) {
  const value = coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `${Number(coupon.discountValue).toLocaleString('vi-VN')}₫`;
  return `${coupon.benefitType === 'SHIPPING' ? 'Giảm phí vận chuyển' : 'Giảm'} ${value}`;
}

export function chatVoucherHint(coupon: { benefitType?: string; fundingSource?: string }) {
  return coupon.benefitType === 'SHIPPING' ? 'Nhập ở ô voucher vận chuyển khi thanh toán.' : coupon.fundingSource === 'PLATFORM_FUNDED' ? 'Nhập ở ô voucher Sàn khi thanh toán.' : 'Nhập ở ô voucher Shop khi thanh toán.';
}
