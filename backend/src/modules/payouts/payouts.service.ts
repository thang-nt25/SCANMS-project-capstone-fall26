import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { KycStatus, PayoutStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WalletsService } from '../wallets/wallets.service';
import { WithdrawalPolicyService } from '../wallets/withdrawal-policy.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { QueryWithdrawalsDto } from './dto/query-withdrawals.dto';

// FR-23 owns tax/net calculations; FR-24 owns processing and approval.
const PAYOUT_SUMMARY_SELECT = {
  id: true,
  amount: true,
  status: true,
  createdAt: true,
  processedAt: true,
} satisfies Prisma.PayoutRequestSelect;

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletsService: WalletsService,
    private readonly policy: WithdrawalPolicyService,
  ) {}

  async createWithdrawal(collaboratorId: string, dto: CreateWithdrawalDto) {
    // Keep money as Decimal throughout; never convert through floating-point Number.
    if (
      typeof dto.amount !== 'string' ||
      !/^\d{1,13}(\.\d{1,2})?$/.test(dto.amount)
    ) {
      throw new BadRequestException('Số tiền rút không hợp lệ');
    }
    const amount = new Prisma.Decimal(dto.amount);
    if (amount.lessThan(this.policy.minimumAmount)) {
      throw new BadRequestException(
        `Số tiền rút tối thiểu là ${this.policy.minimumAmount.toFixed(2)} VNĐ`,
      );
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: collaboratorId },
          select: {
            role: true,
            isActive: true,
            isDeleted: true,
            collaboratorProfile: {
              select: {
                kycStatus: true,
                bankName: true,
                bankAccountNumber: true,
                bankAccountName: true,
              },
            },
          },
        });
        if (
          !user ||
          user.role !== UserRole.COLLABORATOR ||
          !user.isActive ||
          user.isDeleted
        ) {
          throw new ForbiddenException('Tài khoản không được phép rút tiền');
        }
        const profile = user.collaboratorProfile;
        if (!profile || profile.kycStatus !== KycStatus.VERIFIED) {
          throw new BadRequestException(
            'Vui lòng hoàn tất xác minh KYC trước khi rút tiền',
          );
        }
        if (
          !profile.bankName.trim() ||
          !profile.bankAccountNumber.trim() ||
          !profile.bankAccountName.trim()
        ) {
          throw new BadRequestException(
            'Hồ sơ chưa có đầy đủ thông tin tài khoản ngân hàng',
          );
        }

        const wallet =
          await this.walletsService.debitAvailableBalanceForWithdrawal(
            tx,
            collaboratorId,
            amount,
          );
        const request = await tx.payoutRequest.create({
          data: {
            collaboratorId,
            amount,
            status: PayoutStatus.PENDING,
            bankName: profile.bankName.trim(),
            bankAccountNumber: profile.bankAccountNumber.trim(),
            bankAccountName: profile.bankAccountName.trim(),
            // Global wallet: no unvalidated merchant/store ID from the client.
            // Tax, ledgers and payout approval are intentionally outside FR-22.
          },
          select: PAYOUT_SUMMARY_SELECT,
        });

        return {
          message: 'Tạo yêu cầu rút tiền thành công, đang chờ xử lý',
          request: { ...request, amount: request.amount.toFixed(2) },
          availableBalance: wallet.availableBalance.toFixed(2),
        };
      });

      // No bank account numbers, credentials or full request payload in logs.
      this.logger.log(`Withdrawal created: requestId=${result.request.id}`);
      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      // Driver messages may contain connection details: only log the error class.
      this.logger.error(
        `Withdrawal transaction failed: errorType=${error instanceof Error ? error.name : 'UnknownError'}`,
      );
      throw new InternalServerErrorException(
        'Không thể tạo yêu cầu rút tiền, vui lòng thử lại sau',
      );
    }
  }

  async getMyWithdrawals(collaboratorId: string, query: QueryWithdrawalsDto) {
    const where = { collaboratorId };
    const [requests, total] = await this.prisma.$transaction([
      this.prisma.payoutRequest.findMany({
        where,
        select: PAYOUT_SUMMARY_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.payoutRequest.count({ where }),
    ]);
    return {
      requests: requests.map((request) => ({
        ...request,
        amount: request.amount.toFixed(2),
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
