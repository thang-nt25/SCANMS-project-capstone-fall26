import { BadRequestException } from '@nestjs/common';
import { validateChatAttachment } from '../chat-attachment.utils';

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('validateChatAttachment', () => {
  it('accepts a PNG image within the 5 MB limit', () => {
    expect(validateChatAttachment({
      originalname: 'receipt.png',
      mimetype: 'image/png',
      buffer: pngSignature,
      size: pngSignature.length,
    } as Express.Multer.File)).toBe('IMAGE');
  });

  it('rejects an image that exceeds 5 MB', () => {
    const buffer = Buffer.alloc(5 * 1024 * 1024 + 1);
    pngSignature.copy(buffer);
    expect(() => validateChatAttachment({
      originalname: 'large.png',
      mimetype: 'image/png',
      buffer,
      size: buffer.length,
    } as Express.Multer.File)).toThrow(BadRequestException);
  });

  it('rejects a forged image MIME type without the matching file signature', () => {
    const buffer = Buffer.from('not a png');
    expect(() => validateChatAttachment({
      originalname: 'fake.png',
      mimetype: 'image/png',
      buffer,
      size: buffer.length,
    } as Express.Multer.File)).toThrow(BadRequestException);
  });

  it('accepts a PDF invoice with a PDF signature', () => {
    const buffer = Buffer.from('%PDF-1.7\ninvoice');
    expect(validateChatAttachment({
      originalname: 'invoice.pdf',
      mimetype: 'application/pdf',
      buffer,
      size: buffer.length,
    } as Express.Multer.File)).toBe('DOCUMENT');
  });
});
