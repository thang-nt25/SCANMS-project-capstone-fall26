import { BadRequestException } from '@nestjs/common';

export function isValidShippingFee(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Only a confirmed numeric GHN quote can authorize checkout, including a real zero quote. */
export function requireShippingFee(value: unknown): number {
  if (!isValidShippingFee(value)) {
    throw new BadRequestException('Chưa có cước GHN hợp lệ. Vui lòng tính lại phí vận chuyển trước khi đặt hàng.');
  }
  return value;
}
