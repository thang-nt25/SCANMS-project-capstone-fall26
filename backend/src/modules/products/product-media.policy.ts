import { BadRequestException } from '@nestjs/common';

export const MAX_PRODUCT_GALLERY_IMAGES = 4;

/** Validate before slicing/persisting, so extra images cannot be silently lost. */
export function assertProductGalleryLimit(images: unknown) {
  if (images == null) return;
  if (!Array.isArray(images) || images.length > MAX_PRODUCT_GALLERY_IMAGES)
    throw new BadRequestException(
      'Sản phẩm có tối đa 4 ảnh phụ. Vui lòng xóa ảnh vượt giới hạn trước khi lưu.',
    );
}
