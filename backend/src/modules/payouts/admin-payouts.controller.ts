import {
  BadRequestException,
  Body,
  Controller,
  ConflictException,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PayoutRequest, PayoutStatus, Prisma, UserRole } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../../core/database/prisma.service';
import {
  ApprovePayoutDto,
  ExportPayoutBatchDto,
  QueryMerchantPayoutsDto,
  ReceiptApprovalDto,
  RejectPayoutDto,
} from './dto/manage-payout.dto';
import { MerchantPayoutsService } from './merchant-payouts.service';
import { PayoutBatchesService } from './payout-batches.service';
import { PayoutBillService } from './payout-bill.service';
import { WalletsService } from '../wallets/wallets.service';
import { postFinance, postPayoutCompletion } from './finance-posting';
import { assertPayoutFunding } from './payout-funding';
import { assertPayoutBeneficiary } from './payout-beneficiary';
import { evaluatePayoutRisk } from './payout-risk';
import { assertPayoutNetSnapshot, lockPayoutTaxForRequest, payoutMonthlySummaries, refreshPendingMonthlyTax } from './payout-monthly-tax';
import { payoutTaxMonth } from './payout-tax.service';
import { actualPayoutWhere, isTestPayout } from './payout-environment';

@ApiTags('Admin Payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
@Controller('admin/payouts')
export class AdminPayoutsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payouts: MerchantPayoutsService,
    private readonly batches: PayoutBatchesService,
    private readonly bills: PayoutBillService,
    private readonly wallets: WalletsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Toàn bộ danh sách yêu cầu rút tiền trên toàn sàn' })
  async list(@Query() query: QueryMerchantPayoutsDto & { search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const search = query.search?.trim();

    const where: Prisma.PayoutRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              {
                collaborator: {
                  fullName: { contains: search, mode: 'insensitive' },
                },
              },
              {
                collaborator: {
                  email: { contains: search, mode: 'insensitive' },
                },
              },
              { bankAccountName: { contains: search, mode: 'insensitive' } },
              { bankAccountNumber: { contains: search, mode: 'insensitive' } },
              { bankRefCode: { contains: search, mode: 'insensitive' } },
              { store: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [requests, total] = await this.prisma.$transaction([
      this.prisma.payoutRequest.findMany({
        where,
        include: {
          collaborator: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              role: true,
              isActive: true,
              isDeleted: true,
              wallet: { include: { storeWallets: true } },
              collaboratorProfile: {
                select: { avatarUrl: true, taxCode: true, kycStatus: true, bankName: true, bankAccountNumber: true, bankAccountName: true },
              },
            },
          },
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payoutRequest.count({ where }),
    ]);

    const monthlySummaries = await payoutMonthlySummaries(this.prisma, requests);
    const rejected = requests.filter(request => request.status === PayoutStatus.REJECTED);
    const refunds = rejected.length ? await this.prisma.financialLedger.findMany({
      where: { referenceType: 'PAYOUT_REQUEST', transactionType: 'PAYOUT_REJECT_REFUND', balanceBucket: 'AVAILABLE', amount: { gt: 0 },
        OR: rejected.map(request => ({ referenceId: request.id, wallet: { collaboratorId: request.collaboratorId } })),
      }, select: { referenceId: true, amount: true },
    }) : [];
    const funding = await this.prisma.financialLedger.groupBy({
      by: ['referenceId', 'walletId', 'storeId'],
      where: { referenceType: 'PAYOUT_REQUEST', referenceId: { in: requests.map(request => request.id) }, transactionType: 'PAYOUT_WITHDRAW', balanceBucket: 'AVAILABLE' },
      _sum: { amount: true },
    });
    return {
      requests: requests.map((request) => ({
        ...this.payouts.serializePayout(request),
        refundedAmount: request.status === PayoutStatus.REJECTED && refunds.some(entry => entry.referenceId === request.id)
          ? refunds.filter(entry => entry.referenceId === request.id).reduce((sum, entry) => sum.plus(entry.amount), new Prisma.Decimal(0)).toFixed(2) : null,
        collaboratorId: request.collaborator.id,
        monthlyWithdrawalSummary: monthlySummaries.get(`${request.collaboratorId}:${payoutTaxMonth(request.createdAt).month}`),
        collaboratorName: request.collaborator.fullName,
        collaboratorEmail: request.collaborator.email,
        collaboratorPhone: request.collaborator.phoneNumber,
        collaboratorAvatar:
          request.collaborator.collaboratorProfile?.avatarUrl ?? null,
        collaboratorTaxCode:
          request.collaborator.collaboratorProfile?.taxCode ?? null,
        kycStatus:
          request.collaborator.collaboratorProfile?.kycStatus ?? 'UNVERIFIED',
        storeName: request.store?.name ?? 'Toàn hệ thống SCANMS',
        approvedByName: request.approvedBy?.fullName ?? null,
        risk: evaluatePayoutRisk({
          ...request,
          fundedAmount: funding.filter(entry => entry.referenceId === request.id && entry.walletId === request.collaborator.wallet?.id && (!request.storeId || entry.storeId === request.storeId)).reduce((sum, entry) => sum.plus(entry._sum.amount ?? 0), new Prisma.Decimal(0)),
        }),
      })),
      total,
      page,
      limit,
      maxBillBytes: this.bills.maxBillBytes,
    };
  }

  @Get('stats')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Tổng quan chỉ số dòng tiền và chi trả toàn sàn' })
  async getStats() {
    const [pendingAgg, approvedAgg, processingCount, totalRequests] =
      await Promise.all([
        this.prisma.payoutRequest.aggregate({
          where: { status: PayoutStatus.PENDING, ...actualPayoutWhere },
          _count: { id: true },
          _sum: { amount: true, netAmount: true, taxAmount: true },
        }),
        this.prisma.payoutRequest.aggregate({
          where: { status: PayoutStatus.APPROVED, ...actualPayoutWhere },
          _count: { id: true },
          _sum: { amount: true, netAmount: true, taxAmount: true },
        }),
        this.prisma.payoutRequest.count({
          where: { status: PayoutStatus.PROCESSING, ...actualPayoutWhere },
        }),
        this.prisma.payoutRequest.count({ where: actualPayoutWhere }),
      ]);

    return {
      pending: {
        count: pendingAgg._count.id,
        grossAmount: pendingAgg._sum.amount?.toFixed(2) || '0.00',
        netAmount: pendingAgg._sum.netAmount?.toFixed(2) || '0.00',
        taxAmount: pendingAgg._sum.taxAmount?.toFixed(2) || '0.00',
      },
      approved: {
        count: approvedAgg._count.id,
        grossAmount: approvedAgg._sum.amount?.toFixed(2) || '0.00',
        netAmount: approvedAgg._sum.netAmount?.toFixed(2) || '0.00',
        taxAmount: approvedAgg._sum.taxAmount?.toFixed(2) || '0.00',
      },
      processingCount,
      totalRequests,
    };
  }

  @Get(':payoutId/evidence')
  @Header('Cache-Control', 'no-store')
  async evidence(@Param('payoutId', new ParseUUIDPipe()) payoutId: string) {
    const request = await this.prisma.payoutRequest.findUnique({ where: { id: payoutId }, include: {
      collaborator: { include: { collaboratorProfile: true, wallet: { include: { storeWallets: true } } } },
    } });
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu chi trả');
    const ledger = await this.prisma.financialLedger.findMany({ where: {
      referenceId: payoutId, referenceType: 'PAYOUT_REQUEST', transactionType: 'PAYOUT_WITHDRAW', balanceBucket: 'AVAILABLE',
      wallet: { collaboratorId: request.collaboratorId }, ...(request.storeId ? { storeId: request.storeId } : {}),
    }, select: { id: true, amount: true, createdAt: true } });
    const fundedAmount = ledger.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0));
    const risk = evaluatePayoutRisk({ ...request, fundedAmount });
    const profile = request.collaborator.collaboratorProfile;
    const wallet = request.collaborator.wallet;
    const json = profile?.socialLinksJson;
    const documents = json && typeof json === 'object' && !Array.isArray(json) ? json : {};
    const documentUrl = (key: string) => {
      const value = documents[key];
      if (typeof value !== 'string') return null;
      try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; } catch { return null; }
    };
    const details: Record<string, string[]> = {
      ACTIVE_COLLABORATOR: [`Vai trò: ${request.collaborator.role}`, `Tài khoản: ${request.collaborator.isActive && !request.collaborator.isDeleted ? 'Hoạt động' : 'Đã khóa hoặc ngừng hoạt động'}`],
      VERIFIED_KYC: [`Trạng thái: ${profile?.kycStatus ?? 'UNVERIFIED'}`, `CCCD: ${profile?.idCardNumber ? `•••• ${profile.idCardNumber.slice(-4)}` : 'Chưa bổ sung'}`, `Hồ sơ cập nhật: ${profile?.updatedAt.toISOString() ?? 'Chưa có hồ sơ'}`],
      BENEFICIARY_MATCH: [`Lệnh rút: ${request.bankName ?? 'Chưa có ngân hàng'} · ${request.bankAccountNumber ?? 'Chưa có STK'} · ${request.bankAccountName ?? 'Chưa có chủ tài khoản'}`, `Hồ sơ KYC: ${profile?.bankName || 'Chưa bổ sung'} · ${profile?.bankAccountNumber || 'Chưa bổ sung'} · ${profile?.bankAccountName || 'Chưa bổ sung'}`],
      WALLET_CONSISTENCY: [`Khả dụng: ${wallet?.availableBalance.toFixed(2) ?? '0'} đ`, `Chờ giải tỏa: ${wallet?.pendingBalance.toFixed(2) ?? '0'} đ`, `Cần đối soát: ${wallet?.earningsReviewRequired ? 'Có' : 'Không'}`],
      FUNDED_PAYOUT: [`Tiền giữ cho lệnh: ${fundedAmount.abs().toFixed(2)} đ`, ...ledger.map(row => `${row.id} · ${row.amount.toFixed(2)} đ`)],
      TAX_SNAPSHOT: [`Yêu cầu: ${request.amount.toFixed(2)} đ`, `Thuế: ${request.taxAmount.toFixed(2)} đ · Thực nhận: ${request.netAmount.toFixed(2)} đ`],
      TAX_ID: [`Mã số thuế: ${profile?.taxCode || 'Chưa bổ sung'}`, 'Chỉ kiểm tra đã khai báo; chưa xác minh với cơ quan thuế.'],
    };
    const missing: Record<string, string> = {
      ACTIVE_COLLABORATOR: 'Tài khoản KOL không hoạt động.', VERIFIED_KYC: 'KYC chưa được xác minh; cần bổ sung hoặc chờ duyệt hồ sơ định danh.',
      BENEFICIARY_MATCH: 'Thông tin ngân hàng không khớp hồ sơ KYC.', WALLET_CONSISTENCY: 'Ví cần đối soát; bộ phận vận hành xử lý.',
      FUNDED_PAYOUT: 'Thiếu bút toán giữ tiền; bộ phận kế toán kiểm tra.', TAX_SNAPSHOT: 'Số tiền hoặc thuế cần đối soát; bộ phận kế toán kiểm tra.',
      TAX_ID: 'Chưa khai báo mã số thuế.',
    };
    const context = request.taxContext;
    if (context && typeof context === 'object' && !Array.isArray(context) && typeof context.monthlyGrossBefore === 'string')
      details.TAX_SNAPSHOT.push(`Tổng trước lệnh: ${context.monthlyGrossBefore} đ · Tháng: ${String(context.month ?? '')}`);
    return {
      payoutId, name: request.collaborator.fullName, requestStatus: request.status, rejectedReason: request.rejectedReason, checkedAt: new Date().toISOString(),
      ...risk,
      checks: risk.checks.map(check => ({ ...check, detail: details[check.code], missing: check.passed ? null : missing[check.code],
        documents: check.code === 'VERIFIED_KYC' ? [
          { label: 'CCCD mặt trước', url: documentUrl('frontCardUrl') }, { label: 'CCCD mặt sau', url: documentUrl('backCardUrl') },
        ] : [],
      })),
    };
  }

  @Patch(':payoutId/approve')
  @ApiOperation({
    summary: 'Kế toán/Admin sàn duyệt chi trả và đính kèm ủy nhiệm chi',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bill'],
      properties: {
        bill: { type: 'string', format: 'binary' },
        bankRefCode: { type: 'string' },
        note: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('bill'))
  async approve(
    @Param('payoutId', new ParseUUIDPipe()) payoutId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ApprovePayoutDto | ReceiptApprovalDto,
    @UploadedFile() bill: Express.Multer.File,
  ) {
    const proofHash = this.bills.validateBill(bill);
    const bankRefCode =
      typeof dto.bankRefCode === 'string' && dto.bankRefCode.trim().length > 0
        ? dto.bankRefCode.trim().toUpperCase()
        : null;
    if (!bankRefCode)
      throw new BadRequestException(
        'Cần mã giao dịch ngân hàng thật để xác nhận giải ngân',
      );
    if (!/^[A-Z0-9][A-Z0-9._/ -]{0,99}$/.test(bankRefCode))
      throw new BadRequestException('Mã giao dịch ngân hàng không hợp lệ (tối đa 100 ký tự)');

    const request = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });
    if (!request) {
      throw new NotFoundException('Yêu cầu chi trả không tồn tại');
    }
    if (isTestPayout(request))
      throw new BadRequestException('Yêu cầu thử nghiệm cũ không thể xác nhận thành chuyển khoản thực tế.');
    if (
      request.status !== PayoutStatus.PENDING &&
      request.status !== PayoutStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Chỉ có thể duyệt payout ở trạng thái PENDING hoặc PROCESSING',
      );
    }

    if (await this.prisma.payoutRequest.findFirst({
      where: { proofImageSha256: proofHash, id: { not: payoutId } },
      select: { id: true },
    })) {
      throw new ConflictException('Chứng từ này đã được dùng cho yêu cầu khác. Vui lòng chọn đúng chứng từ chuyển khoản của yêu cầu này.');
    }
    const uploaded = await this.bills.uploadBill(bill);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await lockPayoutTaxForRequest(tx, payoutId);
        await tx.$queryRaw`SELECT id FROM payout_requests WHERE id = ${payoutId}::uuid FOR UPDATE`;
        const locked = await tx.payoutRequest.findUnique({
          where: { id: payoutId },
        });
        if (!locked) throw new NotFoundException('Payout không tồn tại');
        if (isTestPayout(locked))
          throw new BadRequestException('Yêu cầu thử nghiệm cũ không thể xác nhận thành chuyển khoản thực tế.');
        if (
          locked.status !== PayoutStatus.PENDING &&
          locked.status !== PayoutStatus.PROCESSING
        ) {
          throw new BadRequestException(
            'Chỉ có thể duyệt payout ở trạng thái PENDING hoặc PROCESSING',
          );
        }

        await assertPayoutFunding(tx, locked);
        assertPayoutNetSnapshot(locked, dto.expectedNetAmount);
        if (locked.transferLeaseUntil && locked.transferLeaseUntil > new Date())
          throw new BadRequestException('Đang đối soát ngân hàng, vui lòng chờ kết quả');
        if (locked.status === PayoutStatus.PENDING) await assertPayoutBeneficiary(tx, locked);
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`bank-reference:${bankRefCode}`}, 0))`;
        const duplicate = await tx.payoutRequest.findFirst({
          where: { OR: [{ bankRefCode }, { proofImageSha256: uploaded.sha256 }], id: { not: payoutId } },
        });
        if (duplicate?.proofImageSha256 === uploaded.sha256)
          throw new ConflictException('Chứng từ này đã được dùng cho yêu cầu khác. Vui lòng chọn đúng chứng từ chuyển khoản của yêu cầu này.');
        if (duplicate)
          throw new BadRequestException(
            'Mã giao dịch ngân hàng đã được sử dụng',
          );
        const approved = await tx.payoutRequest.update({
          where: { id: payoutId },
          data: {
            status: PayoutStatus.APPROVED,
            bankRefCode,
            proofImageUrl: uploaded.secureUrl,
            proofImagePublicId: uploaded.publicId,
            proofImageFormat: uploaded.format,
            proofImageSha256: uploaded.sha256,
            approvedById: user.id,
            processedAt: new Date(),
            transferProvider: 'MANUAL',
          },
        });

        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'ADMIN_APPROVE_PAYOUT',
            details: {
              payoutId,
              grossAmount: locked.amount.toFixed(2),
              taxAmount: locked.taxAmount.toFixed(2),
              netAmount: locked.netAmount.toFixed(2),
              bankRefCode,
              note: dto.note ?? null,
            },
          },
        });

        await tx.notification.create({
          data: {
            userId: locked.collaboratorId,
            type: 'PAYOUT_COMPLETED',
            title: 'Đã chi trả thu nhập đối tác',
            message: `Đã xác nhận chuyển ${locked.netAmount.toFixed(2)} VND. Thuế khấu trừ ${locked.taxAmount.toFixed(2)} VND.`,
            data: { payoutId, actionUrl: '/collaborator/wallet' },
          },
        });
        await postPayoutCompletion(tx, locked);
        return this.payouts.serializePayout(approved);
      });

      return result;
    } catch (err) {
      await this.bills.removeUnusedBill(uploaded.publicId).catch(() => undefined);
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Chứng từ hoặc mã giao dịch ngân hàng đã được dùng cho yêu cầu khác. Vui lòng kiểm tra lại giao dịch và chứng từ.');
      }
      throw err;
    }
  }

  @Patch(':payoutId/reject')
  @ApiOperation({
    summary: 'Kế toán/Admin sàn từ chối yêu cầu và hoàn tiền vào ví',
  })
  async reject(
    @Param('payoutId', new ParseUUIDPipe()) payoutId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectPayoutDto,
  ) {
    const reason = typeof dto.reason === 'string' ? dto.reason.trim() : '';
    if (!reason || reason.length > 500) {
      throw new BadRequestException(
        'Cần cung cấp lý do từ chối (tối đa 500 ký tự)',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await lockPayoutTaxForRequest(tx, payoutId);
      await tx.$queryRaw`SELECT id FROM payout_requests WHERE id = ${payoutId}::uuid FOR UPDATE`;
      const request = await tx.payoutRequest.findUnique({
        where: { id: payoutId },
      });
      if (!request) throw new NotFoundException('Payout không tồn tại');
      if (request.status !== PayoutStatus.PENDING || request.batchId) {
        throw new BadRequestException(
          'Chỉ được từ chối yêu cầu ở trạng thái PENDING chưa đưa vào lô',
        );
      }

      await assertPayoutFunding(tx, request);
      await this.wallets.refundRejectedWithdrawal(
        tx,
        request.collaboratorId,
        request.amount,
        { id: request.id, type: 'PAYOUT_REQUEST' },
        request.storeId ?? undefined,
      );

      const rejected = await tx.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: PayoutStatus.REJECTED,
          rejectedReason: reason,
          processedAt: new Date(),
        },
      });
      await refreshPendingMonthlyTax(tx, request.collaboratorId, request.createdAt);
      await postFinance(
        tx,
        request.id,
        'PAYOUT_REFUND',
        'PAYOUT_RESERVED',
        'PARTNER_EARNINGS_PAYABLE',
        request.amount,
      );

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'ADMIN_REJECT_PAYOUT',
          details: {
            payoutId,
            refundedAmount: request.amount.toFixed(2),
            reason,
          },
        },
      });
      await tx.notification.create({ data: {
        userId: request.collaboratorId, type: 'SYSTEM', title: 'Yêu cầu rút tiền bị từ chối',
        message: `${reason}\nĐã hoàn tiền về ví khả dụng.`,
        data: { payoutId, actionUrl: '/collaborator/wallet', reason },
      } });
      return this.payouts.serializePayout(rejected);
    });
  }

  @Get(':payoutId/bill')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Lấy link tải chứng từ chi trả có ký hạn' })
  async bill(@Param('payoutId', new ParseUUIDPipe()) payoutId: string) {
    const request = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });
    if (!request?.proofImagePublicId || !request?.proofImageFormat) {
      throw new NotFoundException('Yêu cầu này chưa có chứng từ ủy nhiệm chi');
    }

    return {
      url: this.bills.getBillDownloadUrl(
        request.proofImagePublicId,
        request.proofImageFormat,
      ),
      expiresInSeconds: 120,
    };
  }
}
