import { BadRequestException } from '@nestjs/common';

export interface ProductPackageFields {
  barcode?: string | null;
  packageWeight?: number | null;
  packageLength?: number | null;
  packageWidth?: number | null;
  packageHeight?: number | null;
}

export const PACKAGE_FIELDS = [
  'packageWeight',
  'packageLength',
  'packageWidth',
  'packageHeight',
] as const;

export function isValidEan13(value: string): boolean {
  if (!/^\d{13}$/.test(value)) return false;
  const sum = [...value.slice(0, 12)].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
    0,
  );
  return (10 - (sum % 10)) % 10 === Number(value[12]);
}

export function validateProductPackage(input: ProductPackageFields): void {
  if (input.barcode != null && !isValidEan13(input.barcode)) {
    throw new BadRequestException(
      'Barcode EAN-13 phải có 13 chữ số và đúng số kiểm tra.',
    );
  }
  for (const field of PACKAGE_FIELDS) {
    const value = input[field];
    const max = field === 'packageWeight' ? 30000 : 150;
    if (
      value != null &&
      (!Number.isInteger(value) || value < 1 || value > max)
    ) {
      throw new BadRequestException(
        `${field} phải là số nguyên từ 1 đến ${max}.`,
      );
    }
  }
}
