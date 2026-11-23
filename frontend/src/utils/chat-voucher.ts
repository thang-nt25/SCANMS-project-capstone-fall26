export function chatVoucherDiscount(coupon: { discountType: string; discountValue: number | string; benefitType?: string }) {
  const value = coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `${Number(coupon.discountValue).toLocaleString('vi-VN')}₫`;
  return `${coupon.benefitType === 'SHIPPING' ? 'Giảm phí vận chuyển' : 'Giảm'} ${value}`;
}

export function isRetiredChatVoucher(coupon: { benefitType?: string; fundingSource?: string }) {
  return coupon.benefitType === 'SHIPPING'
    || Boolean(coupon.fundingSource && coupon.fundingSource !== 'SHOP_FUNDED');
}

export function chatVoucherHint(coupon: { benefitType?: string; fundingSource?: string }) {
  return isRetiredChatVoucher(coupon)
    ? 'Ưu đãi cũ đã ngừng hỗ trợ. Chỉ dùng mã độc quyền KOL.'
    : 'Sao chép mã KOL và tự nhập khi thanh toán. Mã không được lưu vào tài khoản.';
}
