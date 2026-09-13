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

export function validateCustomerName(value: string): string {
  if (!value || typeof value !== 'string') {
    throw new BadRequestException('Họ và tên người nhận là bắt buộc');
  }
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 150) {
    throw new BadRequestException('Họ và tên người nhận phải từ 2 đến 150 ký tự');
  }
  // Disallow HTML tags, script injection
  if (/<[^>]*>/.test(trimmed) || /[<>{}\\]/.test(trimmed)) {
    throw new BadRequestException(
      'Họ và tên không được chứa ký tự đặc biệt hoặc mã độc script',
    );
  }
  return trimmed;
}

export function validateShippingAddress(value: string): string {
  if (!value || typeof value !== 'string') {
    throw new BadRequestException('Địa chỉ nhận hàng là bắt buộc');
  }
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > 500) {
    throw new BadRequestException('Địa chỉ nhận hàng phải từ 5 đến 500 ký tự');
  }
  if (/<[^>]*>/.test(trimmed)) {
    throw new BadRequestException('Địa chỉ không được chứa mã độc script');
  }
  return trimmed;
}

export function validateOrderNotes(value?: string): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 500) {
    throw new BadRequestException('Ghi chú giao hàng không được vượt quá 500 ký tự');
  }
  return trimmed.replace(/<[^>]*>/g, '');
}


