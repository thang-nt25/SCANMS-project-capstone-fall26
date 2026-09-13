import ExcelJS from 'exceljs';
import { ConfigService } from '@nestjs/config';
import { PayoutRequest, Prisma } from '@prisma/client';
import { PayoutBatchesService } from './payout-batches.service';
import { PayoutSettingsService } from './payout-settings.service';
import { PrismaService } from '../../core/database/prisma.service';
import { MerchantPayoutsService } from './merchant-payouts.service';

describe('VietQR workbook', () => {
  const settings = new PayoutSettingsService(
    new ConfigService({
      PAYOUT_VIETQR_BANKS: JSON.stringify([
        { bin: '970436', code: 'VCB', name: 'Vietcombank' },
      ]),
    }),
  );
  const service = new PayoutBatchesService(
    {} as PrismaService,
    {} as MerchantPayoutsService,
    settings,
  );
  const batch = {
    id: '38b2b124-12d2-47f8-881f-c3107ee71084',
    createdAt: new Date(),
  };
  const request = {
    id: '48b2b124-12d2-47f8-881f-c3107ee71084',
    collaboratorId: '58b2b124-12d2-47f8-881f-c3107ee71084',
    bankName: 'VCB',
    bankAccountNumber: '00123456789',
    bankAccountName: '=HYPERLINK("https://example.test")',
    amount: new Prisma.Decimal(2000000),
    taxAmount: new Prisma.Decimal(200000),
    netAmount: new Prisma.Decimal(1800000),
  } as PayoutRequest;
  it('uses net payment, preserves account zeros and stores untrusted text as strings', async () => {
    const buffer = await service.buildWorkbook(batch, [request]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('VietQR')!;
    expect(sheet.getCell('H2').value).toBe('00123456789');
    expect(sheet.getCell('I2').value).toBe(request.bankAccountName);
    expect(sheet.getCell('I2').type).toBe(ExcelJS.ValueType.String);
    expect(sheet.getCell('J2').value).toBe('2000000.00');
    expect(sheet.getCell('K2').value).toBe('200000.00');
    expect(sheet.getCell('L2').value).toBe('1800000.00');
    const url = new URL(sheet.getCell('O2').value as string);
    expect(url.pathname).toBe('/image/970436-00123456789-compact2.png');
    expect(url.searchParams.get('amount')).toBe('1800000');
    expect(url.searchParams.get('addInfo')).toBe(
      'SCANMS ' + request.id.replace(/-/g, ''),
    );
    expect(workbook.getWorksheet('Huong dan')!.rowCount).toBeGreaterThan(0);
  });
  it.each([
    { bankName: 'unknown' },
    { bankAccountNumber: '=1+1' },
    { bankAccountName: '' },
    {
      netAmount: new Prisma.Decimal('1800000.01'),
      amount: new Prisma.Decimal('2000000.01'),
    },
    { netAmount: new Prisma.Decimal(1) },
  ])(
    'rejects unsafe banking or invalid payment snapshots %#',
    async (change) => {
      await expect(
        service.buildWorkbook(batch, [{ ...request, ...change }]),
      ).rejects.toThrow();
    },
  );
});
