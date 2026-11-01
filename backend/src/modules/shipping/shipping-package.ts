import { BadRequestException } from '@nestjs/common';
import {
  PACKAGE_FIELDS,
  ProductPackageFields,
  validateProductPackage,
} from '../products/product-package';

export interface ShippingPackage {
  weight: number;
  length: number;
  width: number;
  height: number;
}
export type ShippingLine = {
  product: ProductPackageFields & { title?: string };
  quantity: number;
};

/** One consolidated carton: add mass, stack heights, retain the largest footprint. */
export function buildShippingPackage(lines: ShippingLine[]): ShippingPackage {
  if (!lines.length)
    throw new BadRequestException('Không có sản phẩm để tính kiện hàng.');
  const result: ShippingPackage = { weight: 0, length: 0, width: 0, height: 0 };
  for (const { product, quantity } of lines) {
    if (!product)
      throw new BadRequestException(
        'Sản phẩm không còn khả dụng để tính kiện hàng.',
      );
    if (!Number.isInteger(quantity) || quantity < 1)
      throw new BadRequestException('Số lượng kiện hàng không hợp lệ.');
    // GHN quotes use mass and dimensions; a legacy catalogue barcode must not
    // block checkout. Barcode validity is still enforced when Shop creates or
    // edits the product through the product package DTO/service.
    const { barcode: _legacyBarcode, ...packageFields } = product;
    validateProductPackage(packageFields);
    if (PACKAGE_FIELDS.some((key) => product[key] == null)) {
      throw new BadRequestException(
        `Shop cần cập nhật khối lượng và kích thước đóng gói của "${product.title || 'sản phẩm'}" trước khi tính cước.`,
      );
    }
    result.weight += product.packageWeight! * quantity;
    result.length = Math.max(result.length, product.packageLength!);
    result.width = Math.max(result.width, product.packageWidth!);
    result.height += product.packageHeight! * quantity;
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
