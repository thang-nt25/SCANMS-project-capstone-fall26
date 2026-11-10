import { BadRequestException, GoneException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const KOL_COUPON_MESSAGE =
  'Chỉ sử dụng mã ưu đãi độc quyền của KOL. Khách hàng tự sao chép và nhập mã khi thanh toán.';
export function retiredVoucherFeature(): never {
  throw new GoneException(KOL_COUPON_MESSAGE);
}
export function isKolExclusiveCoupon(
  coupon:
    | {
        fundingSource?: string;
        benefitType?: string;
        collaborator?: { role?: string } | null;
      }
    | null
    | undefined,
) {
  return Boolean(
    coupon &&
    coupon.fundingSource === 'SHOP_FUNDED' &&
    coupon.benefitType === 'GOODS' &&
    coupon.collaborator?.role === UserRole.COLLABORATOR,
  );
}
export function assertNoRetailVoucherSelection(dto: {
  platformCouponCode?: unknown;
  shippingCouponCode?: unknown;
  platformCouponsByStore?: unknown;
  shippingCouponsByStore?: unknown;
}) {
  for (const value of [
    dto.platformCouponCode,
    dto.shippingCouponCode,
    dto.platformCouponsByStore,
    dto.shippingCouponsByStore,
  ]) {
    if (value != null && value !== '')
      throw new BadRequestException(KOL_COUPON_MESSAGE);
  }
}
