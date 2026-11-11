import { BadRequestException } from '@nestjs/common';
import {
  PACKAGE_FIELDS,
  ProductPackageFields,
  validateProductPackageDimensions,
} from '../products/product-package';

export interface ShippingPackage {
  weight: number;
  length: number;
  width: number;
  height: number;
}
export type ShippingLine = {
  product: ProductPackageFields & { title?: string };
  variant?: {
    packageWeight?: number | null;
    packageLength?: number | null;
    packageWidth?: number | null;
    packageHeight?: number | null;
    attributes?: any;
  } | null;
  quantity: number;
};

/** One consolidated carton: add mass, stack heights, retain the largest footprint. */
export function buildShippingPackage(lines: ShippingLine[]): ShippingPackage {
  if (!lines.length)
    throw new BadRequestException('Không có sản phẩm để tính kiện hàng.');
  const result: ShippingPackage = { weight: 0, length: 0, width: 0, height: 0 };
  for (const line of lines) {
    const { product, variant, quantity } = line;
    if (!product)
      throw new BadRequestException(
        'Sản phẩm không còn khả dụng để tính kiện hàng.',
      );
    if (!Number.isInteger(quantity) || quantity < 1)
      throw new BadRequestException('Số lượng kiện hàng không hợp lệ.');
    // Legacy catalog barcodes must not block shipping; product writes still validate EAN-13.
    validateProductPackageDimensions(product);
    if (PACKAGE_FIELDS.some((key) => product[key] == null)) {
      throw new BadRequestException(
        `Shop cần cập nhật khối lượng và kích thước đóng gói của "${product.title || 'sản phẩm'}" trước khi tính cước.`,
      );
    }

    // Resolve variant-level packaging overrides if available
    const variantAttrs =
      variant?.attributes &&
      typeof variant.attributes === 'object' &&
      !Array.isArray(variant.attributes)
        ? (variant.attributes as Record<string, any>)
        : {};

    const rawWeight =
      variant?.packageWeight ??
      variantAttrs.packageWeight ??
      variantAttrs.weight ??
      product.packageWeight!;
    const unitWeight = Number.isInteger(Number(rawWeight)) && Number(rawWeight) > 0 ? Number(rawWeight) : product.packageWeight!;

    const rawLength = variant?.packageLength ?? variantAttrs.packageLength ?? product.packageLength!;
    const unitLength = Number.isInteger(Number(rawLength)) && Number(rawLength) > 0 ? Number(rawLength) : product.packageLength!;

    const rawWidth = variant?.packageWidth ?? variantAttrs.packageWidth ?? product.packageWidth!;
    const unitWidth = Number.isInteger(Number(rawWidth)) && Number(rawWidth) > 0 ? Number(rawWidth) : product.packageWidth!;

    const rawHeight = variant?.packageHeight ?? variantAttrs.packageHeight ?? product.packageHeight!;
    const unitHeight = Number.isInteger(Number(rawHeight)) && Number(rawHeight) > 0 ? Number(rawHeight) : product.packageHeight!;

    result.weight += unitWeight * quantity;
    result.length = Math.max(result.length, unitLength);
    result.width = Math.max(result.width, unitWidth);
    result.height += unitHeight * quantity;
  }
  assertShippingPackage(result);
  return result;
}

export function assertShippingPackage(value: ShippingPackage): void {
  for (const key of ['weight', 'length', 'width', 'height'] as const) {
    if (
      !Number.isInteger(value[key]) ||
      value[key] < 1 ||
      value[key] > (key === 'weight' ? 19999 : 150)
    ) {
      throw new BadRequestException(
        'Dịch vụ GHN hiện tại hỗ trợ kiện dưới 20 kg và kích thước tối đa 150 cm. Hãy giảm số lượng hoặc chia đơn; hàng nặng cần dịch vụ riêng.',
      );
    }
  }
}

/** Orders placed before v1 retain the exact dimensions assumed by the old checkout. */
export function lockedOrderPackage(
  raw: Record<string, any>,
  quantity: number,
): ShippingPackage {
  if (raw.shippingPackage) {
    assertShippingPackage(raw.shippingPackage);
    const { weight, length, width, height } = raw.shippingPackage;
    return { weight, length, width, height };
  }
  if (raw.shippingPackageVersion === 1)
    throw new BadRequestException('Đơn hàng thiếu snapshot kiện hàng đã chốt.');
  const legacy = {
    weight: Math.max(500, quantity * 500),
    length: 15,
    width: 10,
    height: 5,
  };
  assertShippingPackage(legacy);
  return legacy;
}
