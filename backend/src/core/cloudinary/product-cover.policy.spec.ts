import sharp from 'sharp';
import { validateProductCover } from './product-cover.policy';
import { UploadController } from './upload.controller';

async function image(width: number, height: number) {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: 'white' },
  })
    .png()
    .toBuffer();
  return { buffer, mimetype: 'image/png' } as Express.Multer.File;
}
describe('Product cover input validation', () => {
  it('accepts images of various dimensions and aspect ratios', async () => {
    await expect(
      validateProductCover(await image(800, 800)),
    ).resolves.toBeUndefined();
    await expect(
      validateProductCover(await image(500, 500)),
    ).resolves.toBeUndefined();
    await expect(
      validateProductCover(await image(1200, 800)),
    ).resolves.toBeUndefined();
    await expect(
      validateProductCover(await image(600, 900)),
    ).resolves.toBeUndefined();
  });
  it('inspects bytes rather than trusting the MIME supplied by the caller', async () => {
    await expect(
      validateProductCover({
        buffer: Buffer.from('not a real image'),
        mimetype: 'image/png',
      } as any),
    ).rejects.toThrow('Không đọc được');
    await expect(
      validateProductCover({
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      } as any),
    ).rejects.toThrow('5 MB');
  });
  it('never invokes Cloudinary for an invalid cover and preserves the generic image path', async () => {
    const cloudinary: any = {
      uploadImage: jest.fn().mockResolvedValue({ secureUrl: '/image.png' }),
    };
    const controller = new UploadController(cloudinary);
    const invalid = {
      buffer: Buffer.from('not a valid image byte array'),
      mimetype: 'image/png',
    } as any;
    await expect(controller.uploadProductCover(invalid)).rejects.toThrow('Không đọc được');
    expect(cloudinary.uploadImage).not.toHaveBeenCalled();
    const valid = await image(50, 50);
    await controller.uploadImage(valid, 'receipts');
    expect(cloudinary.uploadImage).toHaveBeenCalledWith(valid, 'receipts');
  });
});
