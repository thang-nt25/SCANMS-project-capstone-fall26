import { validateSync } from 'class-validator';
import { UpdateProductDto } from '../dto/update-product.dto';
import { ProductVariantInputDto } from '../dto/sync-product-variants.dto';

describe('Product editor API validation', () => {
  it('rejects an update with more than four supplementary images', () => {
    const dto = Object.assign(new UpdateProductDto(), { subImages: Array(5).fill('https://example.com/image.jpg') });
    expect(validateSync(dto).some(error => error.property === 'subImages')).toBe(true);
    dto.subImages = dto.subImages.slice(0, 4);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('rejects fractional inventory and zero product price before a write', () => {
    const dto = Object.assign(new UpdateProductDto(), { stockQuantity: 1.5, price: 0 });
    expect(validateSync(dto).map(error => error.property)).toEqual(expect.arrayContaining(['stockQuantity', 'price']));
    dto.stockQuantity = 0;
    dto.price = 1;
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('requires a positive variant price when supplied, and allows product-price inheritance', () => {
    const dto = Object.assign(new ProductVariantInputDto(), { sku: 'SKU-1', name: '30 ml', stockQuantity: 0, price: 0 });
    expect(validateSync(dto).some(error => error.property === 'price')).toBe(true);
    dto.price = undefined;
    expect(validateSync(dto)).toHaveLength(0);
  });
});
