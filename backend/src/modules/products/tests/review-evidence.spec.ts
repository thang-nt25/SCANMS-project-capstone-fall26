import { ReviewEvidenceService } from '../review-evidence.service';
import { ReviewReportDto } from '../dto/review-actions.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('review report evidence', () => {
  const file = (bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) => ({ buffer: bytes, size: bytes.length, originalname: 'proof.png', mimetype: 'image/png' } as Express.Multer.File);
  function fixture(ownerId = 'shop') {
    const prisma: any = { productReview: { findUnique: jest.fn().mockResolvedValue({ product: { store: { ownerId } } }) } };
    const storage: any = { uploadImage: jest.fn().mockResolvedValue({ secureUrl: 'https://example.com/proof.png' }), uploadVideo: jest.fn().mockResolvedValue({ secureUrl: 'https://example.com/proof.mp4' }) };
    return { service: new ReviewEvidenceService(prisma, storage), storage };
  }
  it('uploads a validated image for the owning Shop', async () => {
    const { service, storage } = fixture();
    await expect(service.upload('shop', 'review', file())).resolves.toEqual({ secureUrl: 'https://example.com/proof.png' });
    expect(storage.uploadImage).toHaveBeenCalledWith(file(), 'scanms/review-reports/shop/review');
  });
  it('rejects another Shop before uploading', async () => {
    const { service, storage } = fixture('other');
    await expect(service.upload('shop', 'review', file())).rejects.toMatchObject({ status: 403 });
    expect(storage.uploadImage).not.toHaveBeenCalled();
  });
  it('rejects a disguised file or an image above 5 MB', async () => {
    const { service, storage } = fixture();
    await expect(service.upload('shop', 'review', file(Buffer.from('not an image')))).rejects.toMatchObject({ status: 400 });
    const large = Buffer.alloc(5 * 1024 * 1024 + 1); file().buffer.copy(large);
    await expect(service.upload('shop', 'review', file(large))).rejects.toMatchObject({ status: 400 });
    expect(storage.uploadImage).not.toHaveBeenCalled();
  });
  it('accepts more than three photos while validating optional links separately', async () => {
    const dto = { reason: 'SPAM', details: 'Thông tin quảng cáo không liên quan', images: Array.from({ length: 20 }, (_, index) => `https://example.com/${index}.png`) };
    expect(await validate(plainToInstance(ReviewReportDto, dto))).toHaveLength(0);
    expect(await validate(plainToInstance(ReviewReportDto, { ...dto, evidence: ['http://example.com'] }))).not.toHaveLength(0);
  });
  it.each([['mp4', 'isom', 'video/mp4'], ['mov', 'qt  ', 'video/quicktime']])('uploads valid %s video and enforces 50 MB', async (extension, brand, mimetype) => {
    const { service, storage } = fixture();
    const header = Buffer.alloc(24); header.writeUInt32BE(24); header.write('ftyp', 4); header.write(brand, 8);
    const video = { buffer: header, size: header.length, originalname: `proof.${extension}`, mimetype } as Express.Multer.File;
    await expect(service.upload('shop', 'review', video)).resolves.toEqual({ secureUrl: 'https://example.com/proof.mp4' });
    expect(storage.uploadVideo).toHaveBeenCalledWith(video, 'scanms/review-reports/shop/review');
    const large = Buffer.alloc(50 * 1024 * 1024 + 1); header.copy(large);
    await expect(service.upload('shop', 'review', { ...video, buffer: large, size: large.length })).rejects.toMatchObject({ status: 400 });
    expect(storage.uploadVideo).toHaveBeenCalledTimes(1);
  });
});
