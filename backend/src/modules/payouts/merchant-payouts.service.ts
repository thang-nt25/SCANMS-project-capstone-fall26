import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PayoutRequest, PayoutStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import {
  ApprovePayoutDto,
  QueryMerchantPayoutsDto,
  RejectPayoutDto,
} from './dto/manage-payout.dto';
import { PayoutBillService, StoredPayoutBill } from './payout-bill.service';

@Injectable()
export class MerchantPayoutsService {
  private readonly logger = new Logger(MerchantPayoutsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly bills: PayoutBillService,
  ) {}

  async assertStoreOwnership(
    storeId: string,
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const store = await db.store.findFirst({
      where: {
        id: storeId,
        ownerId: userId,
        isDeleted: false,
        owner: {
          isActive: true,
          isDeleted: false,
          role: UserRole.SHOP_MANAGER,
        },
      },
    });
    if (!store)
      throw new NotFoundException(
        'Shop không tồn tại hoặc bạn không có quyền quản lý',
      );
    return store;
  }

  async listPayouts(
    storeId: string,
    userId: string,
    query: QueryMerchantPayoutsDto,
  ) {
    await this.assertStoreOwnership(storeId, userId);
    const where = {
      storeId,
      ...(query.status ? { status: query.status } : {}),
    };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.payoutRequest.findMany({
        where,
        include: { collaborator: { select: { fullName: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.payoutRequest.count({ where }),
    ]);
    return {
      requests: requests.map((request) => ({
        ...this.serializePayout(request),
        collaboratorName: request.collaborator.fullName,
      })),
      total,
      page: query.page,
      limit: query.limit,
      maxBillBytes: this.bills.maxBillBytes,
    };
  }

  async approvePayout(
    storeId: string,
    userId: string,
    payoutId: string,
    dto: ApprovePayoutDto,
    file: Express.Multer.File,
  ) {
    await this.assertStoreOwnership(storeId, userId);
    this.bills.validateBill(file);
    const bankRefCode =
      typeof dto.bankRefCode === 'string'
        ? dto.bankRefCode.trim().toUpperCase()
        : '';
    if (!/^[A-Z0-9][A-Z0-9._/ -]{0,99}$/.test(bankRefCode))
      throw new BadRequestException('Mã giao dịch ngân hàng không hợp lệ');
    const initial = await this.findOwnedPayout(this.prisma, storeId, payoutId);
    this.assertApprovable(initial);
    await this.assertFundedPayout(this.prisma, initial);
    let uploaded: StoredPayoutBill | undefined;
    try {
      uploaded = await this.bills.uploadBill(file);
      const bill = uploaded;
      const result = await this.prisma.$transaction(async (tx) => {
        await this.assertStoreOwnership(storeId, userId, tx);
        const request = await this.lockPayout(tx, storeId, payoutId);
        this.assertApprovable(request);
        await this.assertFundedPayout(tx, request);
        const approved = await tx.payoutRequest.update({
          where: { id: request.id },
          data: {
            status: PayoutStatus.APPROVED,
            bankRefCode,
            proofImageUrl: bill.secureUrl,
            proofImagePublicId: bill.publicId,
            proofImageFormat: bill.format,
            proofImageSha256: bill.sha256,
            approvedById: userId,
            processedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: 'APPROVE_PAYOUT',
            details: {
              storeId,
              payoutId,
              batchId: request.batchId,
              grossAmount: request.amount.toFixed(2),
              taxAmount: request.taxAmount.toFixed(2),
              netAmount: request.netAmount.toFixed(2),
            },
          },
        });
        // Gross was debited at request creation; approval NEVER debits again.
        return this.serializePayout(approved);
      });
      this.logger.log(`Payout approved: payoutId=${payoutId}`);
      return result;
    } catch (error: unknown) {
      if (uploaded) await this.cleanupUncommittedBill(uploaded.publicId);
      if (error instanceof HttpException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Mã giao dịch hoặc ảnh bill đã được sử dụng cho payout khác',
        );
      this.logger.error(
        `Payout approval failed: errorType=${error instanceof Error ? error.name : 'UnknownError'}`,
      );
      throw new InternalServerErrorException(
        'Không thể xác nhận payout; tải lại trạng thái trước khi thử lại',
      );
    }
  }

  async rejectPayout(
    storeId: string,
    userId: string,
    payoutId: string,
    dto: RejectPayoutDto,
  ) {
    await this.assertStoreOwnership(storeId, userId);
    const reason = typeof dto.reason === 'string' ? dto.reason.trim() : '';
    if (!reason || reason.length > 500)
      throw new BadRequestException('Cần lý do từ chối, tối đa 500 ký tự');
    return this.prisma.$transaction(async (tx) => {
      await this.assertStoreOwnership(storeId, userId, tx);
      const request = await this.lockPayout(tx, storeId, payoutId);
      // Exported requests may already be sent to a bank. Never auto-refund them.
      if (request.status !== PayoutStatus.PENDING || request.batchId)
        throw new ConflictException(
          'Chỉ được từ chối payout PENDING chưa đưa vào lô thanh toán',
        );
      await this.assertFundedPayout(tx, request);
      await this.wallets.refundRejectedWithdrawal(
        tx,
        request.collaboratorId,
        request.amount,
        { id: request.id, type: 'PAYOUT_REQUEST' },
        storeId,
      );
      const rejected = await tx.payoutRequest.update({
        where: { id: request.id },
        data: {
          status: PayoutStatus.REJECTED,
          rejectedReason: reason,
          processedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'REJECT_PAYOUT',
          details: {
            storeId,
            payoutId,
            refundedAmount: request.amount.toFixed(2),
            reason,
          },
        },
      });
      return this.serializePayout(rejected);
    });
  }

  async getBill(storeId: string, userId: string, payoutId: string) {
    await this.assertStoreOwnership(storeId, userId);
    const request = await this.findOwnedPayout(this.prisma, storeId, payoutId);
    if (!request.proofImagePublicId || !request.proofImageFormat)
      throw new NotFoundException('Không có ảnh bill được lưu theo luồng mới');
    return {
      url: this.bills.getBillDownloadUrl(
        request.proofImagePublicId,
        request.proofImageFormat,
      ),
      expiresInSeconds: 120,
    };
  }

  async lockPayout(
    tx: Prisma.TransactionClient,
    storeId: string,
    payoutId: string,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM payout_requests WHERE id = ${payoutId}::uuid AND store_id = ${storeId}::uuid FOR UPDATE`,
    );
    return this.findOwnedPayout(tx, storeId, payoutId);
  }

  async assertFundedPayout(
    tx: Prisma.TransactionClient,
    request: PayoutRequest,
  ) {
    if (
      !request.storeId ||
      request.amount.lessThanOrEqualTo(0) ||
      request.taxAmount.lessThan(0) ||
      request.netAmount.lessThanOrEqualTo(0) ||
      !request.netAmount.plus(request.taxAmount).equals(request.amount)
    )
      throw new BadRequestException(
        'Payout thiếu shop hoặc snapshot thuế hợp lệ; cần đối soát',
      );
    const debit = await tx.financialLedger.findFirst({
      where: {
        referenceId: request.id,
        referenceType: 'PAYOUT_REQUEST',
        transactionType: 'PAYOUT_WITHDRAW',
        balanceBucket: 'AVAILABLE',
        storeId: request.storeId,
        wallet: { collaboratorId: request.collaboratorId },
        amount: request.amount.negated(),
      },
    });
    if (!debit)
      throw new BadRequestException(
        'Payout chưa có ledger trừ tiền đúng shop; cần đối soát',
      );
  }

  serializePayout(request: PayoutRequest) {
    return {
      id: request.id,
      storeId: request.storeId,
      collaboratorId: request.collaboratorId,
      amount: request.amount.toFixed(2),
      taxAmount: request.taxAmount.toFixed(2),
      netAmount: request.netAmount.toFixed(2),
      status: request.status,
      bankName: request.bankName,
      bankAccountNumber: request.bankAccountNumber,
      bankAccountName: request.bankAccountName,
      bankRefCode: request.bankRefCode,
      hasBill: Boolean(request.proofImagePublicId),
      batchId: request.batchId,
      approvedById: request.approvedById,
      rejectedReason: request.rejectedReason,
      createdAt: request.createdAt,
      processedAt: request.processedAt,
    };
  }

  private async findOwnedPayout(
    db: Prisma.TransactionClient,
    storeId: string,
    payoutId: string,
  ) {
    const request = await db.payoutRequest.findFirst({
      where: { id: payoutId, storeId },
    });
    if (!request)
      throw new NotFoundException('Payout không tồn tại hoặc không thuộc shop');
    return request;
  }

  private assertApprovable(request: PayoutRequest) {
    if (
      request.status !== PayoutStatus.PENDING &&
      request.status !== PayoutStatus.PROCESSING
    )
      throw new ConflictException('Payout đã xử lý, không thể duyệt lại');
  }

  private async cleanupUncommittedBill(publicId: string) {
    try {
      // A lost commit acknowledgement must not lead to deleting a committed bill.
      const linked = await this.prisma.payoutRequest.findFirst({
        where: { proofImagePublicId: publicId },
        select: { id: true },
      });
      if (!linked) await this.bills.removeUnusedBill(publicId);
    } catch {
      this.logger.warn(
        'Bill cleanup deferred; database/storage state needs reconciliation',
      );
    }
  }
}
