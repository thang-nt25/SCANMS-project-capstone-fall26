import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const MAX_ORDER_AMOUNT = 9999999999999.99;
export const MAX_ORDER_ITEMS = 500;

export function normalizeCustomerPhone(value: string): string {
  let phone = value.trim().replace(/[()\s-]/g, '');
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  if (!/^0\d{9}$/.test(phone)) {
    throw new BadRequestException(
      'Số điện thoại phải gồm 10 chữ số hoặc định dạng +84',
    );
  }
  return phone;
}

export function validateOrderMoney(value: number, field: string): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_ORDER_AMOUNT ||
    new Prisma.Decimal(value).decimalPlaces() > 2
  ) {
    throw new BadRequestException(
      `${field} phải là số tiền không âm, tối đa 13 chữ số và 2 chữ số thập phân`,
    );
  }
}
