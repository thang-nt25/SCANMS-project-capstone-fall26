import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  Body,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { createHash } from 'crypto';
import { PrismaService } from '../../core/database/prisma.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { FinanceReportService } from './finance-report.service';
import { isTestPayout } from './payout-environment';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceReportController {
  constructor(
    private readonly reports: FinanceReportService,
    private readonly prisma: PrismaService,
  ) {}
  @Get('admin/payouts/pending-work')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  pendingWork(@CurrentUser('id') userId: string) {
    return this.reports.pendingWork(userId);
  }
  @Get('stores/:storeId/pnl-report')
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  storePnl(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reports.storePnl(storeId, user.id, user.role);
  }
  @Get('analytics/executive-summary')
  @Roles(UserRole.SYSTEM_ADMIN)
  executive(@Query('yearMonth') month?: string) {
    return this.reports.executive(month);
  }
  @Post('stores/:storeId/finance-costs')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  recordCost(
    @Param('storeId', ParseUUIDPipe) storeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      subjectType: string;
      subjectId: string;
      amount: string;
      evidence: string;
    },
  ) {
    return this.reports.recordCost(storeId, user.id, body);
  }
  @Get('admin/payouts/tax-report')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  taxReport(@Query('yearMonth') month: string) {
    return this.reports.monthlyTax(month);
  }
  @Get('admin/payouts/ledger-reconciliation')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  reconcileLedger(@Query('yearMonth') month?: string) {
    return this.reports.reconcileLedger(month);
  }
  @Get('admin/payouts/ledger-reconciliation/details')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  reconciliationDetails(@Query('yearMonth') month: string, @Query('account') account: string, @Query('page') page?: string) {
    return this.reports.reconciliationDetails(month, account, page === undefined ? 1 : Number(page));
  }

  @Post('admin/payouts/:id/tax-certificate')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  async attachCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: { issuer: string; certificateNumber: string; issuedAt: string },
  ) {
    if (
      !file?.buffer ||
      file.buffer.subarray(0, 5).toString('ascii') !== '%PDF-' ||
      !body.issuer?.trim() ||
      body.issuer.length > 150 ||
      !body.certificateNumber?.trim() ||
      body.certificateNumber.length > 100 ||
      !body.issuedAt ||
      !Number.isFinite(Date.parse(body.issuedAt))
    )
      throw new BadRequestException(
        'Cần PDF chứng từ đã phát hành, đơn vị phát hành, số chứng từ và ngày phát hành',
      );
    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payoutRequest.findFirst({
        where: { id, status: 'APPROVED', taxAmount: { gt: 0 } },
      });
      if (!payout)
        throw new NotFoundException(
          'Không tìm thấy khoản chi đã khấu trừ thuế',
        );
      if (isTestPayout(payout)) throw new BadRequestException('Không phát hành chứng từ thuế cho giao dịch thử nghiệm cũ');
      const certificate = await tx.payoutTaxCertificate.create({
        data: {
          payoutId: id,
          issuer: body.issuer.trim(),
          certificateNumber: body.certificateNumber.trim(),
          issuedAt: new Date(body.issuedAt),
          fileData: new Uint8Array(file.buffer),
          sha256: createHash('sha256').update(file.buffer).digest('hex'),
          uploadedById: user.id,
        },
        select: { id: true, sha256: true },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ATTACH_ISSUED_TAX_CERTIFICATE',
          details: {
            payoutId: id,
            ...certificate,
            issuer: body.issuer,
            certificateNumber: body.certificateNumber,
          },
        },
      });
      return certificate;
    });
  }

  @Get('wallets/tax-invoices/:id/certificate')
  @Roles(UserRole.COLLABORATOR)
  async downloadCertificate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const payout = await this.prisma.payoutRequest.findFirst({
      where: { id, collaboratorId: user.id, status: 'APPROVED' },
      select: {
        id: true,
        transferProvider: true,
        bankRefCode: true,
        amount: true,
        taxAmount: true,
        netAmount: true,
        createdAt: true,
        processedAt: true,
        collaborator: { select: { fullName: true } },
      },
    });
    if (!payout) throw new NotFoundException('Không tìm thấy chứng từ của bạn');
    if (isTestPayout(payout)) throw new BadRequestException('Giao dịch thử nghiệm cũ không có chứng từ thuế thực tế');
    const certificate = await this.prisma.payoutTaxCertificate.findUnique({
      where: { payoutId: id },
    });
    const pdfBuffer = certificate
      ? Buffer.from(certificate.fileData)
      : buildTaxCertificatePdf(payout);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="SCANMS-tax-${id}.pdf"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.send(pdfBuffer);
  }
  @Get('admin/payouts/escrow')
  @Header('Cache-Control', 'private, no-store')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  escrow(@Query('page') page?: string, @Query('reviewOnly') reviewOnly?: string) {
    return this.reports.escrow(page === undefined ? 1 : Number(page), reviewOnly === 'true');
  }
  @Get('admin/payouts/escrow/:id/movements')
  @Header('Cache-Control', 'private, no-store')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  escrowMovements(@Param('id', ParseUUIDPipe) id: string, @Query('page') page?: string) {
    return this.reports.escrowMovements(id, page === undefined ? 1 : Number(page));
  }
  @Get('wallets/tax-invoices')
  @Roles(UserRole.COLLABORATOR)
  taxStatements(@CurrentUser() user: AuthenticatedUser) {
    return this.reports.taxStatements(user.id);
  }
  @Get('wallets/tax-invoices/:id')
  @Roles(UserRole.COLLABORATOR)
  receipt(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reports.receipt(user.id, id);
  }
}

function buildTaxCertificatePdf(payout: {
  id: string;
  amount: any;
  taxAmount: any;
  netAmount: any;
  bankRefCode: string | null;
  createdAt: Date;
  processedAt: Date | null;
  collaborator?: { fullName?: string | null } | null;
}): Buffer {
  const esc = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/[()\\]/g, '\\$&');
  const lines = [
    'SCANMS - CHUNG TU KHAU TRU THUE TNCN (10%)',
    `Ma phieu chi: ${payout.id.slice(0, 8).toUpperCase()}`,
    `Doi tac: ${esc(payout.collaborator?.fullName || 'Cong tac vien SCANMS')}`,
    `So tien yeu cau (Gross): ${Number(payout.amount || 0).toLocaleString('en-US')} VND`,
    `Thue TNCN da khau tru (10%): ${Number(payout.taxAmount || 0).toLocaleString('en-US')} VND`,
    `Thuc nhan (Net 90%): ${Number(payout.netAmount || 0).toLocaleString('en-US')} VND`,
    `Ma giao dich ngan hang: ${esc(payout.bankRefCode || 'N/A')}`,
    `Ngay duyet chi: ${(payout.processedAt || payout.createdAt).toISOString().slice(0, 10)}`,
  ];
  const content = [
    'BT',
    '/F1 12 Tf',
    '50 760 Td',
    ...lines.flatMap((line, i) => [
      i === 0 ? `(${line}) Tj` : `0 -22 Td (${line}) Tj`,
    ]),
    'ET',
  ].join('\n');
  const objs = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${Buffer.byteLength(content, 'utf8')} >> stream\n${content}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objs) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${obj}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}
