import { ConfigService } from '@nestjs/config';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PayoutBillService } from './payout-bill.service';
import { PayoutSettingsService } from './payout-settings.service';
import { PrismaService } from '../../core/database/prisma.service';
import { v2 as cloudinary } from 'cloudinary';
import {
  ApprovePayoutDto,
  ExportPayoutBatchDto,
  RejectPayoutDto,
  ReceiptApprovalDto,
} from './dto/manage-payout.dto';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9uoAAAAASUVORK5CYII=',
  'base64',
);
export function testBill(buffer = png): Express.Multer.File {
  return {
    buffer,
    size: buffer.length,
    originalname: 'bill.png',
    mimetype: 'image/png',
  } as Express.Multer.File;
}

describe('Payout bill validation', () => {
  const bills = new PayoutBillService(
    new PayoutSettingsService(new ConfigService()),
  );
  it('accepts a PNG and produces a stable SHA256 for duplicate detection', () => {
    expect(bills.validateBill(testBill())).toMatch(/^[a-f0-9]{64}$/);
    expect(bills.validateBill(testBill())).toBe(bills.validateBill(testBill()));
  });
  it('accepts a PDF only when the extension, MIME, header and EOF match', () => {
    const pdf = {
      ...testBill(Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n')),
      originalname: 'bill.PDF',
      mimetype: 'application/pdf',
    };
    expect(bills.validateBill(pdf)).toMatch(/^[a-f0-9]{64}$/);
    expect(() => bills.validateBill({ ...pdf, mimetype: 'image/png' })).toThrow(
      BadRequestException,
    );
    expect(() =>
      bills.validateBill({ ...pdf, originalname: 'bill.png' }),
    ).toThrow(BadRequestException);
    expect(() =>
      bills.validateBill({
        ...testBill(Buffer.from('%PDF-1.7\ntruncated')),
        originalname: 'bill.pdf',
        mimetype: 'application/pdf',
      }),
    ).toThrow(BadRequestException);
  });
  it.each([
    undefined,
    testBill(Buffer.alloc(0)),
    testBill(Buffer.from('<svg onload="alert(1)"></svg>')),
    { ...testBill(), mimetype: 'image/jpeg' },
    { ...testBill(), originalname: 'bill.svg' },
    { ...testBill(), size: 1 },
    testBill(Buffer.alloc(5242881)),
  ])('rejects missing, empty, spoofed or oversized bill %#', (file) => {
    expect(() => bills.validateBill(file)).toThrow(BadRequestException);
  });
});

describe('Reuse committed private manual evidence', () => {
  afterEach(() => jest.restoreAllMocks());
  it('reuses identical validated evidence without uploading it again', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ publicId: 'private-proof', format: 'png', secureUrl: 'https://example.invalid/proof.png' }]) };
    const service = new PayoutBillService(new PayoutSettingsService(new ConfigService()), prisma as unknown as PrismaService);
    const upload = jest.spyOn(cloudinary.uploader, 'upload_stream');
    await expect(service.uploadBill(testBill(), true)).resolves.toMatchObject({ publicId: 'private-proof', reused: true, sha256: service.validateBill(testBill()) });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(upload).not.toHaveBeenCalled();
  });
  it('still rejects invalid bytes before looking for reusable evidence', async () => {
    const prisma = { $queryRaw: jest.fn() };
    const service = new PayoutBillService(new PayoutSettingsService(new ConfigService()), prisma as unknown as PrismaService);
    await expect(service.uploadBill(testBill(Buffer.from('invalid')), true)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

describe('VietQR configuration', () => {
  it('maps configured aliases including accents to official bank BIN', () => {
    const settings = new PayoutSettingsService(
      new ConfigService({
        PAYOUT_VIETQR_BANKS: JSON.stringify([
          {
            bin: '970436',
            code: 'VCB',
            name: 'Vietcombank',
            aliases: ['Ngân hàng Ngoại thương'],
          },
        ]),
      }),
    );
    expect(settings.resolveBank('ngan hang ngoai thuong').bin).toBe('970436');
    expect(settings.resolveBank('vcb').bin).toBe('970436');
    expect(() => settings.resolveBank('Unknown bank')).toThrow(
      BadRequestException,
    );
  });
  it.each([
    { PAYOUT_MAX_BILL_BYTES: 'NaN' },
    { PAYOUT_MAX_BILL_BYTES: '0' },
    { PAYOUT_VIETQR_BANKS: '{}' },
    { PAYOUT_VIETQR_BANKS: '[{"bin":"bad","code":"ABC","name":"Test"}]' },
    {
      PAYOUT_VIETQR_BANKS: JSON.stringify([
        { bin: '970436', code: 'A', name: 'Test' },
        { bin: '970415', code: 'B', name: 'Test' },
      ]),
    },
    { PAYOUT_VIETQR_BASE_URL: 'http://example.test/' },
    { PAYOUT_VIETQR_BASE_URL: 'https://user:secret@example.test/' },
    { PAYOUT_VIETQR_TEMPLATE: '../bad' },
  ])('fails explicitly on invalid configuration %#', (config) => {
    expect(
      () => new PayoutSettingsService(new ConfigService(config)),
    ).toThrow();
  });
});

describe('Merchant payout DTOs', () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  it('accepts a receipt and optional note without inventing a bank reference', async () => {
    expect(
      await pipe.transform(
        { note: ' transferred ' },
        { type: 'body', metatype: ReceiptApprovalDto },
      ),
    ).toEqual({ note: 'transferred' });
    await expect(
      pipe.transform(
        { note: 'x'.repeat(501) },
        { type: 'body', metatype: ReceiptApprovalDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { bankRefCode: '' },
        { type: 'body', metatype: ReceiptApprovalDto },
      ),
    ).rejects.toThrow();
  });
  it('normalizes a bank reference and rejects client-supplied status', async () => {
    expect(
      await pipe.transform(
        { bankRefCode: ' tx123 ' },
        { type: 'body', metatype: ApprovePayoutDto },
      ),
    ).toEqual({ bankRefCode: 'TX123' });
    await expect(
      pipe.transform(
        { bankRefCode: 'TX123', status: 'APPROVED' },
        { type: 'body', metatype: ApprovePayoutDto },
      ),
    ).rejects.toThrow();
  });
  it('rejects whitespace-only rejection reason', async () => {
    await expect(
      pipe.transform(
        { reason: '   ' },
        { type: 'body', metatype: RejectPayoutDto },
      ),
    ).rejects.toThrow();
  });
  it.each(
    [
      [],
      ['bad'],
      [
        '38b2b124-12d2-47f8-881f-c3107ee71084',
        '38b2b124-12d2-47f8-881f-c3107ee71084',
      ],
    ].map((payoutIds) => ({ payoutIds })),
  )(
    'rejects empty, malformed or repeated payout IDs %j',
    async ({ payoutIds }) => {
      await expect(
        pipe.transform(
          { payoutIds },
          { type: 'body', metatype: ExportPayoutBatchDto },
        ),
      ).rejects.toThrow();
    },
  );
});
