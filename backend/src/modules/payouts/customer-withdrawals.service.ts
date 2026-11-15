import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomerWithdrawal, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { WalletsService } from '../wallets/wallets.service';
import { PayoutBillService } from './payout-bill.service';
import { postFinance } from './finance-posting';
import {
  CreateCustomerWithdrawalDto,
  CustomerManualApprovalDto,
  QueryCustomerWithdrawalsDto,
} from './dto/customer-withdrawal.dto';

@Injectable()
export class CustomerWithdrawalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallets: WalletsService,
    private readonly bills: PayoutBillService,
  ) {}

  private assertCustomer(user: AuthenticatedUser) {
    if (user.role !== UserRole.CUSTOMER) throw new ForbiddenException();
  }
  private assertOperator(user: AuthenticatedUser) {
    if (
      user.role !== UserRole.SYSTEM_ADMIN &&
      user.role !== UserRole.SYSTEM_MANAGER
    )
      throw new ForbiddenException();
  }
  private serialize(row: CustomerWithdrawal, internal = false) {
    const { proofPublicId, proofHash, proofFormat, requestKey, ...item } = row;
    void proofHash;
    void proofFormat;
    void requestKey;
    return {
      ...item,
      note: internal || row.status === 'REJECTED' ? row.note : null,
      hasProof: !!proofPublicId,
      amount: row.amount.toString(),
    };
  }

  async create(user: AuthenticatedUser, dto: CreateCustomerWithdrawalDto) {
    this.assertCustomer(user);
    const amount = new Prisma.Decimal(dto.amount);
    if (
      !amount.isFinite() ||
      !amount.isInteger() ||
      amount.lt(200000) ||
      amount.gt(999999999999)
    )
      throw new BadRequestException(
        'Số tiền rút không hợp lệ, tối thiểu 200.000 đ',
      );
    return this.prisma.$transaction(async (tx) => {
      // Serialize retries with the same client key before checking/inserting.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${dto.requestKey}))`;
      const existing = await tx.customerWithdrawal.findUnique({
        where: { requestKey: dto.requestKey },
      });
      if (existing) {
        if (
          existing.userId !== user.id ||
          !existing.amount.equals(amount) ||
          existing.bankName !== dto.bankName ||
          existing.bankAccountNumber !== dto.bankAccountNumber ||
          existing.bankAccountName !== dto.bankAccountName
        )
          throw new ConflictException('Mã yêu cầu đã được sử dụng');
        return this.serialize(existing);
      }
      const request = await tx.customerWithdrawal.create({
        data: { ...dto, amount, userId: user.id },
      });
      await this.wallets.reserveCustomerWithdrawal(
        tx,
        user.id,
        amount,
        request.id,
      );
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CUSTOMER_WITHDRAWAL_CREATED',
          details: { withdrawalId: request.id, amount: amount.toString() },
        },
      });
      return this.serialize(request);
    });
  }

  async list(
    user: AuthenticatedUser,
    query: QueryCustomerWithdrawalsDto,
    admin = false,
  ) {
    if (admin) this.assertOperator(user);
    else this.assertCustomer(user);
    const search = query.search?.trim();
    const matchingUsers = search
      ? await this.prisma.user.findMany({
          where: { OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ] },
          select: { id: true },
        })
      : [];
    const requestId = search?.replace(/^RKH-/i, '');
    const requestIds = requestId && /^[a-f0-9-]{1,36}$/i.test(requestId)
      ? await this.prisma.$queryRaw<{ id: string }[]>`SELECT id FROM customer_withdrawals WHERE id::text ILIKE ${`${requestId}%`}`
      : [];
    const where: Prisma.CustomerWithdrawalWhereInput = {
      ...(admin ? {} : { userId: user.id }),
      ...(query.status ? { status: query.status } : {}),
      ...(search ? { OR: [
        { userId: { in: matchingUsers.map(user => user.id) } },
        { id: { in: requestIds.map(row => row.id) } },
        { bankAccountNumber: { contains: search, mode: 'insensitive' } },
        { bankAccountName: { contains: search, mode: 'insensitive' } },
        { bankRefCode: { contains: search, mode: 'insensitive' } },
      ] } : {}),
    };
    const [rows, total, totals] = await this.prisma.$transaction([
      this.prisma.customerWithdrawal.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.customerWithdrawal.count({ where }),
      this.prisma.customerWithdrawal.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        where: admin ? {} : { userId: user.id },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);
    const users = admin
      ? await this.prisma.user.findMany({
          where: { id: { in: rows.map((r) => r.userId) } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    return {
      items: rows.map((row) => ({
        ...this.serialize(row, admin),
        customer: users.find((u) => u.id === row.userId),
      })),
      total,
      page: query.page,
      limit: query.limit,
      summary: Object.fromEntries(totals.map(group => [group.status, {
        amount: group._sum?.amount?.toString() ?? '0',
        count: typeof group._count === 'object' ? group._count._all ?? 0 : 0,
      }])),
    };
  }

  private async locked(tx: Prisma.TransactionClient, id: string) {
    await tx.$queryRaw`SELECT id FROM customer_withdrawals WHERE id = ${id}::uuid FOR UPDATE`;
    const row = await tx.customerWithdrawal.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy yêu cầu rút');
    if (row.status !== 'PENDING')
      throw new ConflictException(
        'Yêu cầu đã được xử lý. Hãy tải lại danh sách.',
      );
    return row;
  }

  async approve(
    user: AuthenticatedUser,
    id: string,
    dto: CustomerManualApprovalDto,
    file?: Express.Multer.File,
  ) {
    this.assertOperator(user);
    const hash = this.bills.validateBill(file);
    const duplicate = await this.prisma.customerWithdrawal.findFirst({
      where: { OR: [{ bankRefCode: dto.bankRefCode }, { proofHash: hash }] },
    });
    if (duplicate)
      throw new ConflictException(
        'Chứng từ hoặc mã tham chiếu đã dùng cho yêu cầu khác',
      );
    const bill = await this.bills.uploadBill(file!);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await this.locked(tx, id);
        await postFinance(
          tx,
          row.id,
          'CUSTOMER_WITHDRAWAL_PAID',
          'CUSTOMER_WITHDRAWAL_RESERVED',
          'CORPORATE_BANK',
          row.amount,
          'CUSTOMER_WITHDRAWAL',
        );
        const updated = await tx.customerWithdrawal.update({
          where: { id },
          data: {
            status: 'APPROVED',
            bankRefCode: dto.bankRefCode,
            proofPublicId: bill.publicId,
            proofFormat: bill.format,
            proofHash: bill.sha256,
            note: dto.note,
            processedBy: user.id,
            processedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            action: 'CUSTOMER_WITHDRAWAL_APPROVED',
            details: {
              withdrawalId: id,
              amount: row.amount.toString(),
              bankRefCode: dto.bankRefCode,
              method: 'MANUAL',
            },
          },
        });
        await tx.notification.create({
          data: {
            userId: row.userId,
            title: 'Rút tiền hoàn tất',
            message: `Yêu cầu rút ${row.amount.toNumber().toLocaleString('vi-VN')} đ đã được xác nhận chuyển khoản.`,
            type: 'SYSTEM',
            data: { withdrawalId: id, url: '/customer/wallet' },
          },
        });
        return this.serialize(updated);
      });
    } catch (error) {
      await this.bills.removeUnusedBill(bill.publicId).catch(() => undefined);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Chứng từ hoặc mã tham chiếu đã được sử dụng',
        );
      throw error;
    }
  }

  async reject(user: AuthenticatedUser, id: string, reason: string) {
    this.assertOperator(user);
    return this.prisma.$transaction(async (tx) => {
      const row = await this.locked(tx, id);
      await this.wallets.refundCustomerWithdrawal(
        tx,
        row.userId,
        row.amount,
        row.id,
      );
      const updated = await tx.customerWithdrawal.update({
        where: { id },
        data: {
          status: 'REJECTED',
          note: reason,
          processedBy: user.id,
          processedAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'CUSTOMER_WITHDRAWAL_REJECTED',
          details: { withdrawalId: id, reason },
        },
      });
      await tx.notification.create({
        data: {
          userId: row.userId,
          title: 'Yêu cầu rút tiền bị từ chối',
          message: `${reason}. Số tiền đã được hoàn về ví mua sắm.`,
          type: 'SYSTEM',
          data: { withdrawalId: id, url: '/customer/wallet' },
        },
      });
      return this.serialize(updated);
    });
  }

  async proof(user: AuthenticatedUser, id: string) {
    const row = await this.prisma.customerWithdrawal.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException();
    if (user.role === UserRole.CUSTOMER && row.userId !== user.id)
      throw new ForbiddenException();
    if (user.role !== UserRole.CUSTOMER) this.assertOperator(user);
    if (!row.proofPublicId || !row.proofFormat)
      throw new NotFoundException('Chưa có chứng từ');
    return {
      url: this.bills.getBillDownloadUrl(row.proofPublicId, row.proofFormat),
    };
  }
}
