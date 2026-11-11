import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

/** Dedicated cover validation; avatar, receipts and proof images keep their own policy. */
export async function validateProductCover(file?: Express.Multer.File) {
  if (!file?.buffer?.length)
    throw new BadRequestException('Vui lòng chọn ảnh bìa sản phẩm.');
  if (file.buffer.length > 5 * 1024 * 1024)
    throw new BadRequestException('Ảnh bìa tối đa 5 MB.');
  try {
    const metadata = await sharp(file.buffer, {
      limitInputPixels: 40_000_000,
    }).metadata();
    if (
      !['jpeg', 'png', 'webp'].includes(metadata.format || '') ||
      (metadata.pages ?? 1) > 1
    )
      throw new BadRequestException(
        'Ảnh bìa cần là ảnh tĩnh JPG, PNG hoặc WEBP.',
      );
    if (!metadata.width || !metadata.height || metadata.width <= 0 || metadata.height <= 0)
      throw new BadRequestException(
        'Không đọc được kích thước ảnh bìa. Vui lòng chọn lại ảnh hợp lệ.',
      );
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(
      'Không đọc được ảnh bìa. Vui lòng chọn lại ảnh hợp lệ.',
    );
  }
}
