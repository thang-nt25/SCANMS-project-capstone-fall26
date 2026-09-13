import { ConfigService } from '@nestjs/config';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { PayoutBillService } from './payout-bill.service';
import { PayoutSettingsService } from './payout-settings.service';
import {
  ApprovePayoutDto,
  ExportPayoutBatchDto,
  RejectPayoutDto,
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
