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
/** Only the explicitly approved three-use shipping benefit survives retail retirement. */
export function assertNoRetailVoucherSelection(dto: {
  platformCouponCode?: unknown; shippingCouponCode?: unknown;
  platformCouponsByStore?: unknown; shippingCouponsByStore?: unknown;
}) {
  const codes = (value: unknown): unknown[] => value == null || value === '' ? [] : typeof value === 'object' && !Array.isArray(value) ? Object.values(value) : [value];
  if ([...codes(dto.platformCouponCode), ...codes(dto.platformCouponsByStore)].some(Boolean) ||
      [...codes(dto.shippingCouponCode), ...codes(dto.shippingCouponsByStore)].some(code => code != null && code !== '' && (typeof code !== 'string' || code.trim().toUpperCase() !== 'SCANMSFREESHIP')))
    throw new BadRequestException(KOL_COUPON_MESSAGE);
}
