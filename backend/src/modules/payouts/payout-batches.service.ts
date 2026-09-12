import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PayoutBatch,
  PayoutRequest,
  PayoutStatus,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../core/database/prisma.service';
import { MerchantPayoutsService } from './merchant-payouts.service';
import { PayoutSettingsService } from './payout-settings.service';
import { ExportPayoutBatchDto } from './dto/manage-payout.dto';
import { QueryWithdrawalsDto } from './dto/query-withdrawals.dto';

@Injectable()
export class PayoutBatchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payouts: MerchantPayoutsService,
    private readonly settings: PayoutSettingsService,
  ) {}

  async exportBatch(
    storeId: string,
    userId: string,
    dto: ExportPayoutBatchDto,
  ) {
    await this.payouts.assertStoreOwnership(storeId, userId);
    if (
      !Array.isArray(dto.payoutIds) ||
      dto.payoutIds.length < 1 ||
      dto.payoutIds.length > 200 ||
      new Set(dto.payoutIds).size !== dto.payoutIds.length ||
      dto.payoutIds.some(
        (id) =>
          typeof id !== 'string' ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            id,
          ),
      )
    )
      throw new BadRequestException(
        'Chọn 1–200 payout UUID hợp lệ, không trùng',
      );
    const ids = [...dto.payoutIds].sort();
    return this.prisma.$transaction(
      async (tx) => {
        await this.payouts.assertStoreOwnership(storeId, userId, tx);
        await tx.$queryRaw(
          Prisma.sql`SELECT id FROM payout_requests WHERE store_id = ${storeId}::uuid AND id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR UPDATE`,
        );
        const requests = await tx.payoutRequest.findMany({
          where: { storeId, id: { in: ids } },
          orderBy: { id: 'asc' },
        });
        if (requests.length !== ids.length)
          throw new NotFoundException(
            'Có payout không tồn tại hoặc không thuộc shop',
          );
        if (
          requests.some(
            (request) =>
              request.status !== PayoutStatus.PENDING || request.batchId,
          )
        )
          throw new ConflictException(
            'Chỉ xuất payout PENDING chưa thuộc lô thanh toán',
          );
        for (const request of requests)
          await this.payouts.assertFundedPayout(tx, request);
        const batch = {
          id: randomUUID(),
          storeId,
          createdById: userId,
          createdAt: new Date(),
        };
        // Generate/validate the workbook BEFORE changing state. Failure rolls back all.
        const buffer = await this.buildWorkbook(batch, requests);
        await tx.payoutBatch.create({ data: { ...batch, fileData: buffer } });
        await tx.payoutRequest.updateMany({
          where: { storeId, id: { in: ids } },
          data: { batchId: batch.id, status: PayoutStatus.PROCESSING },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: 'EXPORT_VIETQR_PAYOUT_BATCH',
            details: {
              storeId,
              batchId: batch.id,
              count: requests.length,
              netTotal: requests
                .reduce(
                  (total, request) => total.plus(request.netAmount),
                  new Prisma.Decimal(0),
                )
                .toFixed(2),
            },
          },
        });
        return {
          batchId: batch.id,
          buffer,
          filename: `SCANMS-VietQR-${batch.id}.xlsx`,
        };
      },
      { timeout: 15000 },
    );
  }

  async downloadBatch(storeId: string, userId: string, batchId: string) {
    await this.payouts.assertStoreOwnership(storeId, userId);
    const batch = await this.prisma.payoutBatch.findFirst({
      where: { id: batchId, storeId },
    });
    if (!batch)
      throw new NotFoundException(
        'Lô thanh toán không tồn tại hoặc không thuộc shop',
      );
    // Return the persisted file byte-for-byte, even after bank configuration changes.
    return {
      batchId: batch.id,
      buffer: Buffer.from(batch.fileData),
      filename: `SCANMS-VietQR-${batch.id}.xlsx`,
    };
  }

  async listBatches(
    storeId: string,
    userId: string,
    query: QueryWithdrawalsDto,
  ) {
    await this.payouts.assertStoreOwnership(storeId, userId);
    const [batches, total] = await this.prisma.$transaction([
      this.prisma.payoutBatch.findMany({
        where: { storeId },
        select: {
          id: true,
          createdAt: true,
          _count: { select: { payouts: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.payoutBatch.count({ where: { storeId } }),
    ]);
    return {
      batches: batches.map((batch) => ({
        id: batch.id,
        createdAt: batch.createdAt,
        payoutCount: batch._count.payouts,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async buildWorkbook(
    batch: Pick<PayoutBatch, 'id' | 'createdAt'>,
    requests: PayoutRequest[],
  ) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SCANMS';
    workbook.created = batch.createdAt;
    const sheet = workbook.addWorksheet('VietQR');
    sheet.columns = [
      { header: 'STT', key: 'index', width: 7 },
      { header: 'Mã lô', key: 'batchId', width: 40 },
      { header: 'Mã payout', key: 'payoutId', width: 40 },
      { header: 'Mã KOL', key: 'collaboratorId', width: 40 },
      { header: 'Ngân hàng', key: 'bankName', width: 25 },
      { header: 'Mã ngân hàng', key: 'bankCode', width: 18 },
      { header: 'BIN ngân hàng', key: 'bankBin', width: 18 },
      { header: 'Số tài khoản', key: 'accountNumber', width: 25 },
      { header: 'Tên người thụ hưởng', key: 'accountName', width: 30 },
      { header: 'Số tiền yêu cầu', key: 'grossAmount', width: 22 },
      { header: 'Thuế TNCN', key: 'taxAmount', width: 20 },
      { header: 'Số tiền chuyển khoản', key: 'netAmount', width: 25 },
      { header: 'Loại tiền', key: 'currency', width: 12 },
      { header: 'Nội dung chuyển khoản', key: 'description', width: 45 },
      { header: 'VietQR URL', key: 'qrUrl', width: 70 },
    ];
    requests.forEach((request, index) => {
      if (
        !request.bankName ||
        !request.bankAccountName?.trim() ||
        !request.bankAccountNumber ||
        !/^[0-9]{1,30}$/.test(request.bankAccountNumber)
      )
        throw new BadRequestException(
          `Payout ${request.id}: thông tin ngân hàng không hợp lệ`,
        );
      if (
        !request.netAmount.isInteger() ||
        request.netAmount.lessThanOrEqualTo(0) ||
        request.netAmount.greaterThan('9999999999999') ||
        !request.netAmount.plus(request.taxAmount).equals(request.amount)
      )
        throw new BadRequestException(
          `Payout ${request.id}: tiền thực nhận VietQR phải là số VNĐ nguyên, không tự làm tròn`,
        );
      const bank = this.settings.resolveBank(request.bankName);
      const description = `SCANMS ${request.id.replace(/-/g, '')}`;
      const url = new URL(
        `${bank.bin}-${request.bankAccountNumber}-${this.settings.qrTemplate}.png`,
        this.settings.qrBaseUrl.endsWith('/')
          ? this.settings.qrBaseUrl
          : `${this.settings.qrBaseUrl}/`,
      );
      url.search = new URLSearchParams({
        amount: request.netAmount.toFixed(0),
        addInfo: description,
        accountName: request.bankAccountName.trim(),
      }).toString();
      // Text cells retain leading zeros and cannot execute Excel formulas.
      sheet.addRow({
        index: index + 1,
        batchId: batch.id,
        payoutId: request.id,
        collaboratorId: request.collaboratorId,
        bankName: bank.name,
        bankCode: bank.code,
        bankBin: bank.bin,
        accountNumber: request.bankAccountNumber,
        accountName: request.bankAccountName.trim(),
        grossAmount: request.amount.toFixed(2),
        taxAmount: request.taxAmount.toFixed(2),
        netAmount: request.netAmount.toFixed(2),
        currency: 'VND',
        description,
        qrUrl: url.toString(),
      });
    });
    for (const column of sheet.columns.slice(1)) column.numFmt = '@';
    sheet.getRow(1).font = { bold: true, color: { argb: 'FF231D15' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3EFE6' },
    };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = 'A1:O1';
    const notes = workbook.addWorksheet('Huong dan');
    notes.getColumn(1).width = 110;
    for (const note of [
      `Lô ${batch.id}; chỉ thanh toán Số tiền chuyển khoản (net), không dùng gross.`,
      'File đối soát kèm Quick Link VietQR; không phải mẫu import thống nhất của mọi ngân hàng.',
      'Xuất/tải lại Excel không chuyển tiền và không xác nhận đã trả. Đối chiếu mã payout trước mỗi giao dịch để tránh trả hai lần.',
      'Sau khi chuyển khoản, upload bill riêng và mã giao dịch để xác nhận từng payout.',
      'Tải lại lô giữ nguyên danh sách và số tiền ban đầu, có thể bao gồm payout đã trả; không thanh toán lại.',
      'Mở VietQR URL sẽ gửi thông tin người thụ hưởng tới nhà cung cấp VietQR. Không chia sẻ file chứa dữ liệu ngân hàng.',
      'Payout PROCESSING không được hoàn tiền tự động; nếu ngân hàng báo thất bại, liên hệ quản trị để đối soát.',
    ])
      notes.addRow([note]);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
