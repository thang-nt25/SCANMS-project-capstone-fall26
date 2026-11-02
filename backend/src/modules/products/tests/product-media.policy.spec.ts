import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { assertProductGalleryLimit } from '../product-media.policy';

describe('Gallery limit at both API boundaries', () => {
  it.each([CreateProductDto, UpdateProductDto])(
    'rejects a fifth image in %p before persistence',
    async (Dto) => {
      const issues = await validate(
        plainToInstance(Dto, {
          subImages: Array(5).fill('https://example.test/image.png'),
        }),
        { skipMissingProperties: true },
      );
      expect(
        issues.find((issue) => issue.property === 'subImages')?.constraints,
      ).toHaveProperty('arrayMaxSize');
    },
  );
  it('rejects service calls too, without silently truncating or rejecting a valid four-image collection', () => {
    expect(() => assertProductGalleryLimit(Array(5).fill('image'))).toThrow(
      '4 ảnh phụ',
    );
    expect(() =>
      assertProductGalleryLimit(Array(4).fill('image')),
    ).not.toThrow();
    expect(() => assertProductGalleryLimit(undefined)).not.toThrow();
  });
});
