import {
  BadRequestException,
  Body,
  Controller,
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
              collaboratorProfile: {
                select: { avatarUrl: true, taxCode: true, kycStatus: true },
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

    return {
      requests: requests.map((request) => ({
        ...this.payouts.serializePayout(request),
        collaboratorId: request.collaborator.id,
        collaboratorName: request.collaborator.fullName,
        collaboratorEmail: request.collaborator.email,
        collaboratorPhone: request.collaborator.phoneNumber,
        collaboratorAvatar:
          request.collaborator.collaboratorProfile?.avatarUrl ?? null,
        collaboratorTaxCode:
          request.collaborator.collaboratorProfile?.taxCode ?? null,
        kycStatus:
          request.collaborator.collaboratorProfile?.kycStatus ?? 'UNVERIFIED',
        storeName: request.store?.name ?? 'Sàn SCANMS (Toàn hệ thống)',
        approvedByName: request.approvedBy?.fullName ?? null,
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
          where: { status: PayoutStatus.PENDING },
          _count: { id: true },
          _sum: { amount: true, netAmount: true, taxAmount: true },
        }),
        this.prisma.payoutRequest.aggregate({
          where: { status: PayoutStatus.APPROVED },
          _count: { id: true },
          _sum: { amount: true, netAmount: true, taxAmount: true },
        }),
        this.prisma.payoutRequest.count({
          where: { status: PayoutStatus.PROCESSING },
        }),
        this.prisma.payoutRequest.count(),
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
    this.bills.validateBill(bill);
    const bankRefCode =
      typeof dto.bankRefCode === 'string' && dto.bankRefCode.trim().length > 0
        ? dto.bankRefCode.trim().toUpperCase()
        : null;
    if (!bankRefCode)
      throw new BadRequestException(
        'Cần mã giao dịch ngân hàng thật để xác nhận giải ngân',
      );

    const request = await this.prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });
    if (!request) {
      throw new NotFoundException('Yêu cầu chi trả không tồn tại');
    }
    if (
      request.status !== PayoutStatus.PENDING &&
      request.status !== PayoutStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Chỉ có thể duyệt payout ở trạng thái PENDING hoặc PROCESSING',
      );
    }

    const uploaded = await this.bills.uploadBill(bill);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM payout_requests WHERE id = ${payoutId}::uuid FOR UPDATE`;
        const locked = await tx.payoutRequest.findUnique({
          where: { id: payoutId },
        });
        if (!locked) throw new NotFoundException('Payout không tồn tại');
        if (
          locked.status !== PayoutStatus.PENDING &&
          locked.status !== PayoutStatus.PROCESSING
        ) {
          throw new BadRequestException(
            'Chỉ có thể duyệt payout ở trạng thái PENDING hoặc PROCESSING',
          );
        }

        await assertPayoutFunding(tx, locked);
        if (locked.transferLeaseUntil && locked.transferLeaseUntil > new Date())
          throw new BadRequestException('Đang đối soát ngân hàng, vui lòng chờ kết quả');
        if (locked.status === PayoutStatus.PENDING) await assertPayoutBeneficiary(tx, locked);
        await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`bank-reference:${bankRefCode}`}, 0))`;
        const duplicate = await tx.payoutRequest.findFirst({
          where: { bankRefCode, id: { not: payoutId } },
        });
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
      await this.bills.removeUnusedBill(uploaded.publicId);
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
