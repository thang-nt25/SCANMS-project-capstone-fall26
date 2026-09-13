import { BadRequestException } from '@nestjs/common';

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }
  return undefined;
}

export function asMoney(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const directValue = asNumber(value);
  if (directValue !== undefined) {
    return directValue;
  }

  const moneyObject = asRecord(value);
  const nestedMoney = moneyObject?.shop_money;
  const amount =
    asNumber(moneyObject?.amount ?? moneyObject?.value) ??
    (nestedMoney === undefined ? undefined : asMoney(nestedMoney));
  if (amount === undefined)
    throw new BadRequestException('Giá trị tiền không đúng định dạng');
  return amount;
}

export function requireString(value: unknown, fieldName: string): string {
  const parsedValue = asString(value);
  if (!parsedValue) {
    throw new BadRequestException(
      `Payload thiếu trường bắt buộc: ${fieldName}`,
    );
  }
  return parsedValue;
}

export function requirePositiveInteger(
  value: unknown,
  fieldName: string,
): number {
  const parsedValue = asNumber(value);
  if (
    !parsedValue ||
    !Number.isInteger(parsedValue) ||
    parsedValue < 1 ||
    parsedValue > 2147483647
  ) {
    throw new BadRequestException(`${fieldName} phải là số nguyên lớn hơn 0`);
  }
  return parsedValue;
}

export function requireNonNegativeNumber(
  value: unknown,
  fieldName: string,
): number {
  const parsedValue = asNumber(value);
  if (parsedValue === undefined || parsedValue < 0) {
    throw new BadRequestException(`${fieldName} phải là số không âm`);
  }
  return parsedValue;
}

export function unwrapOrderPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const data = asRecord(payload.data);
  return (
    asRecord(payload.order) ??
    (data ? (asRecord(data.order) ?? data) : undefined) ??
    payload
  );
}

export function joinAddress(address: Record<string, unknown> | undefined) {
  if (!address) {
    return undefined;
  }

  const explicitAddress =
    asString(address.full_address) ?? asString(address.fullAddress);
  if (explicitAddress) {
    return explicitAddress;
  }

  const addressParts = [
    asString(address.address1 ?? address.address_line1),
    asString(address.address2 ?? address.address_line2),
    asString(address.ward),
    asString(address.district),
    asString(address.city),
    asString(address.province),
    asString(address.country),
  ].filter(Boolean);

  return addressParts.length > 0 ? addressParts.join(', ') : undefined;
}

export function asPlatformDate(value: unknown): Date | undefined {
  if (value === undefined || value === null) return undefined;
  const date =
    typeof value === 'number'
      ? new Date(value < 1e12 ? value * 1000 : value)
      : typeof value === 'string'
        ? new Date(value)
        : new Date(NaN);
  if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 300000)
    throw new BadRequestException('Thời gian sự kiện sàn không hợp lệ');
  return date;
}
