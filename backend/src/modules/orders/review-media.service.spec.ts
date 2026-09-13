import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderReviewDto } from './dto/create-review.dto';
import {
  ReviewMediaService,
  validateReviewMedia,
} from './review-media.service';
import { PrismaService } from '../../core/database/prisma.service';
import { CloudinaryService } from '../../core/cloudinary/cloudinary.service';
import { createReviewToken } from './order-security.utils';

function file(name: string, type: string, bytes: Buffer): Express.Multer.File {
  return {
    originalname: name,
    mimetype: type,
    size: bytes.length,
    buffer: bytes,
  } as Express.Multer.File;
}

describe('FR-18 review media and DTO', () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]);
  it('accepts matching PNG, JPEG and WEBP signatures', () => {
    expect(validateReviewMedia(file('review.png', 'image/png', png))).toBe(
      'image',
    );
    expect(
      validateReviewMedia(
        file('review.jpg', 'image/jpeg', Buffer.from([255, 216, 255, 0])),
      ),
    ).toBe('image');
    expect(
      validateReviewMedia(
        file('review.webp', 'image/webp', Buffer.from('RIFF1234WEBP')),
      ),
    ).toBe('image');
  });
  it('rejects spoofed MIME/extensions, empty and oversized images', () => {
    expect(() => validateReviewMedia()).toThrow(BadRequestException);
    expect(() =>
      validateReviewMedia(file('review.jpg', 'image/jpeg', png)),
    ).toThrow();
    expect(() =>
      validateReviewMedia(
        file('review.svg', 'image/svg+xml', Buffer.from('<svg/>')),
      ),
    ).toThrow();
    const large = Buffer.alloc(5 * 1024 * 1024 + 1);
    png.copy(large);
    expect(() =>
      validateReviewMedia(file('review.png', 'image/png', large)),
    ).toThrow();
  });
  it('accepts MP4/MOV headers and rejects fake video', () => {
    const bytes = Buffer.alloc(24);
    bytes.writeUInt32BE(24);
    bytes.write('ftyp', 4);
    bytes.write('isom', 8);
    expect(validateReviewMedia(file('review.mp4', 'video/mp4', bytes))).toBe(
      'video',
    );
    bytes.write('qt  ', 8);
    expect(
      validateReviewMedia(file('review.mov', 'video/quicktime', bytes)),
    ).toBe('video');
    expect(() =>
      validateReviewMedia(file('review.mp4', 'video/mp4', bytes)),
    ).toThrow();
  });
  it('requires order proof and product ownership before calling storage', async () => {
    const config = new ConfigService({
      JWT_SECRET: 'qa-only',
      CLOUDINARY_URL: 'qa-provider-config',
    });
    const store = {
      uploadImage: jest
        .fn()
        .mockResolvedValue({ secureUrl: 'https://example.test/review.png' }),
    };
    const db = {
      order: {
        findUnique: jest.fn().mockResolvedValue({
          status: 'DELIVERED',
          orderItems: [{ productId: 'product' }],
        }),
      },
      productReview: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new ReviewMediaService(
      db as unknown as PrismaService,
      config,
      store as unknown as CloudinaryService,
    );
    const dto = {
      productId: 'product',
      reviewToken: createReviewToken(config, 'order'),
    };
    await expect(
      service.upload(
        'order',
        { ...dto, reviewToken: 'wrong' },
        file('review.png', 'image/png', png),
      ),
    ).rejects.toThrow();
    await expect(
      service.upload(
        'order',
        { ...dto, productId: 'outside-order' },
        file('review.png', 'image/png', png),
      ),
    ).rejects.toThrow();
    expect(store.uploadImage).not.toHaveBeenCalled();
    await expect(
      service.upload('order', dto, file('review.png', 'image/png', png)),
    ).resolves.toEqual({ secureUrl: 'https://example.test/review.png' });
    expect(store.uploadImage).toHaveBeenCalledWith(
      expect.anything(),
      'scanms/reviews/order/product',
    );
    store.uploadImage.mockRejectedValueOnce(
      new Error('provider credential must not leak'),
    );
    await expect(
      service.upload('order', dto, file('review.png', 'image/png', png)),
    ).rejects.toThrow(ServiceUnavailableException);
  });
  it('validates 10–1000 characters, HTTPS galleries and one video', async () => {
    const dto = {
      productId: '00000000-0000-4000-8000-000000000001',
      reviewToken: createReviewToken(
        new ConfigService({ JWT_SECRET: 'qa-only' }),
        'order',
      ),
      rating: 4,
      comment: 'Sản phẩm tốt, đóng gói đẹp.',
      images: ['https://example.test/a.png'],
      video: 'https://example.test/a.mp4',
    };
    expect(
      await validate(plainToInstance(CreateOrderReviewDto, dto)),
    ).toHaveLength(0);
    for (const payload of [
      { ...dto, comment: '123456789' },
      { ...dto, comment: 'x'.repeat(1001) },
      {
        ...dto,
        images: Array.from(
          { length: 6 },
          (_, i) => `https://example.test/${i}.png`,
        ),
      },
      { ...dto, images: ['javascript:alert(1)'] },
      { ...dto, video: 'http://example.test/a.mov' },
    ])
      expect(
        (await validate(plainToInstance(CreateOrderReviewDto, payload))).length,
      ).toBeGreaterThan(0);
  });
});
