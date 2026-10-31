import {
  Controller,
  Get,
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
import { PayoutTransferService } from './payout-transfer.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceReportController {
  constructor(
    private readonly reports: FinanceReportService,
    private readonly transfers: PayoutTransferService,
    private readonly prisma: PrismaService,
  ) {}
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
  executive() {
    return this.reports.executive();
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
  reconcileLedger() {
    return this.reports.reconcileLedger();
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
      select: { id: true },
    });
    if (!payout) throw new NotFoundException('Không tìm thấy chứng từ của bạn');
    const certificate = await this.prisma.payoutTaxCertificate.findUnique({
      where: { payoutId: id },
    });
    if (!certificate)
      throw new NotFoundException(
        'Chứng từ thuế chưa được đơn vị phát hành cung cấp',
      );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="SCANMS-tax-${id}.pdf"`,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.send(Buffer.from(certificate.fileData));
  }
  @Get('admin/payouts/escrow')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  escrow(@Query('page') page?: string) {
    return this.reports.escrow(page === undefined ? 1 : Number(page));
  }
  @Get('admin/payouts/gateway')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  gateway() {
    return this.transfers.availability();
  }
  @Post('payouts/:id/approve')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfers.transfer(id, user.id);
  }
  @Post('payouts/:id/reconcile')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  reconcile(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.transfers.transfer(id, user.id, true);
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
