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
    await workbook.xlsx.load(buffer as any);
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
  it.each(['48b2b124-12d2-47f8-881f-c3107ee71084', 'f4632170-4b57-5472-a239-2e18d2b62383'])('exports a pending payout with UUID %s in an isolated transaction', async (id) => {
    const payout = { ...request, id, status: 'PENDING', batchId: null };
    const tx = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'COLLABORATOR', isActive: true, isDeleted: false,
        collaboratorProfile: { kycStatus: 'VERIFIED', bankName: payout.bankName, bankAccountNumber: payout.bankAccountNumber, bankAccountName: payout.bankAccountName },
      }) },
      $queryRaw: jest.fn().mockResolvedValue([]),
      payoutRequest: { findMany: jest.fn().mockResolvedValue([payout]), updateMany: jest.fn() },
      payoutBatch: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const ownership = { assertStoreOwnership: jest.fn(), assertFundedPayout: jest.fn() };
    const isolated = new PayoutBatchesService(
      { $transaction: (work: any) => work(tx) } as unknown as PrismaService,
      ownership as unknown as MerchantPayoutsService,
      settings,
    );
    const result = await isolated.exportBatch('test-store', 'test-owner', { payoutIds: [id] });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer as any);
    expect(workbook.getWorksheet('VietQR')!.getCell('L2').value).toBe('1800000.00');
    expect(ownership.assertFundedPayout).toHaveBeenCalledWith(tx, payout);
    expect(tx.payoutRequest.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { batchId: result.batchId, status: 'PROCESSING' } }));
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
  it('downloads the original stored workbook without creating a batch or changing payouts', async () => {
    const original = await service.buildWorkbook(batch, [request]);
    const findFirst = jest.fn().mockResolvedValue({ ...batch, fileData: original });
    const create = jest.fn();
    const updateMany = jest.fn();
    const assertStoreOwnership = jest.fn();
    const isolated = new PayoutBatchesService(
      { payoutBatch: { findFirst, create }, payoutRequest: { updateMany } } as unknown as PrismaService,
      { assertStoreOwnership } as unknown as MerchantPayoutsService,
      settings,
    );
    const result = await isolated.downloadBatch('owned-store', 'owner', batch.id);
    expect(assertStoreOwnership).toHaveBeenCalledWith('owned-store', 'owner');
    expect(findFirst).toHaveBeenCalledWith({ where: { id: batch.id, storeId: 'owned-store' } });
    expect(result.buffer.equals(original)).toBe(true);
    expect(create).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });
  it('rejects a missing or foreign batch instead of returning another shops file', async () => {
    const isolated = new PayoutBatchesService(
      { payoutBatch: { findFirst: jest.fn().mockResolvedValue(null) } } as unknown as PrismaService,
      { assertStoreOwnership: jest.fn() } as unknown as MerchantPayoutsService,
      settings,
    );
    await expect(isolated.downloadBatch('owned-store', 'owner', batch.id)).rejects.toThrow('không thuộc shop');
  });
});
