import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SponsoredPlacementFunding, UserRole } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';
import {
  RequestSponsorshipDto,
  ReviewSponsorshipDto,
  SponsorshipListDto,
} from './sponsorship.dto';
import { hasSponsorshipCapacity } from './sponsorship-capacity';
import { sponsorshipQuote } from './sponsorship-pricing';
export { hasSponsorshipCapacity } from './sponsorship-capacity';

const include = {
  store: { select: { id: true, name: true, logoUrl: true } },
} as const;
const admin = (role: UserRole) =>
  role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER;

export function sponsorshipHasExpired(row: { status: string; endsAt: Date }, now = new Date()) {
  return ['REQUESTED', 'APPROVED'].includes(row.status) && row.endsAt <= now;
}

export function validateSponsorshipWindow(
  startsAt: Date,
  endsAt: Date,
  now = Date.now(),
): void {
  const duration = endsAt.getTime() - startsAt.getTime();
  if (
    !Number.isFinite(duration) ||
    endsAt.getTime() <= now ||
    duration < 3600000 ||
    duration > 31 * 86400000
  ) {
    throw new BadRequestException(
      'Lịch hiển thị phải còn hiệu lực và kéo dài từ 1 giờ đến 31 ngày.',
    );
  }
}

@Injectable()
export class SponsorshipService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, role: UserRole, query: SponsorshipListDto) {
    if (!admin(role) && role !== UserRole.SHOP_MANAGER)
      throw new ForbiddenException('Không có quyền truy cập tài trợ.');
    const now = new Date();
    const lifecycle: Prisma.SponsoredPlacementWhereInput = query.status === 'EXPIRED'
      ? { status: { in: ['REQUESTED', 'APPROVED'] }, endsAt: { lte: now } }
      : query.status ? { status: query.status,
          ...(['REQUESTED', 'APPROVED'].includes(query.status) ? { endsAt: { gt: now } } : {}) } : {};
    const where: Prisma.SponsoredPlacementWhereInput = {
      ...(admin(role) ? {} : { store: { ownerId: userId } }),
      ...lifecycle,
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.sponsoredPlacement.count({ where }),
      this.prisma.sponsoredPlacement.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * 20,
        take: 20,
      }),
    ]);
    return {
      total,
      page: query.page,
      totalPages: Math.ceil(total / 20),
      items: items.map(row => ({ ...row, status: sponsorshipHasExpired(row, now) ? 'EXPIRED' : row.status })),
    };
  }

  async request(userId: string, dto: RequestSponsorshipDto) {
    if (dto.headline.trim().length < 5)
      throw new BadRequestException(
        'Tiêu đề cần tối thiểu 5 ký tự có nội dung.',
      );
    const startsAt = new Date(dto.startsAt),
      endsAt = new Date(dto.endsAt);
    validateSponsorshipWindow(startsAt, endsAt);
    const quote = sponsorshipQuote(startsAt, endsAt);
    if (dto.quotedAmount !== quote.amount)
      throw new BadRequestException('Phí quảng cáo đã thay đổi hoặc không đúng lịch chạy. Vui lòng tải lại bảng phí.');
    try {
      return await this.prisma.$transaction(async (tx) => {
        const store = await tx.store.findFirst({
          where: {
            ownerId: userId,
            isActive: true,
            isDeleted: false,
            isVerified: true,
            onboardingStatus: 'VERIFIED',
            owner: { isActive: true },
          },
          select: { id: true },
        });
        if (!store)
          throw new ForbiddenException(
            'Chỉ gian hàng đã xác minh mới được đăng ký tài trợ.',
          );
        await tx.$queryRaw`SELECT id FROM stores WHERE id = ${store.id}::uuid FOR UPDATE`;
        const existing = await tx.sponsoredPlacement.findUnique({
          where: { requestKey: dto.requestKey },
        });
        if (existing) {
          if (
            existing.requestedById !== userId ||
            existing.storeId !== store.id ||
            existing.headline !== dto.headline.trim() ||
            existing.startsAt.getTime() !== startsAt.getTime() ||
            existing.endsAt.getTime() !== endsAt.getTime()
            || Number(existing.amount) !== quote.amount
          ) {
            throw new ConflictException(
              'Khóa gửi yêu cầu đã được dùng cho nội dung khác.',
            );
          }
          return existing;
        }
        if (dto.renewsPlacementId) {
          const previous = await tx.sponsoredPlacement.findFirst({
            where: { id: dto.renewsPlacementId, storeId: store.id },
          });
          if (!previous || !sponsorshipHasExpired(previous))
            throw new BadRequestException('Chỉ có thể gia hạn gói đã hết hạn của Shop.');
          if (startsAt.getTime() < Date.now())
            throw new BadRequestException('Lịch gia hạn phải bắt đầu từ thời điểm hiện tại trở đi.');
        }
        const overlap = await tx.sponsoredPlacement.findFirst({
          where: {
            storeId: store.id,
            OR: [
              { status: 'REQUESTED' },
              { status: 'APPROVED', fundingType: 'PAID', amount: { gt: 0 } },
            ],
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        });
        if (overlap)
          throw new ConflictException(
            'Shop đã có lịch hoặc yêu cầu tài trợ trùng khoảng thời gian.',
          );
        const row = await tx.sponsoredPlacement.create({
          data: {
            storeId: store.id,
            requestedById: userId,
            requestKey: dto.requestKey,
            headline: dto.headline.trim(),
            startsAt,
            endsAt,
            amount: quote.amount,
            fundingType: 'PAID',
          },
        });
        await tx.auditLog.create({
          data: {
            userId,
            action: dto.renewsPlacementId ? 'SPONSORSHIP_RENEWAL_REQUESTED' : 'SPONSORSHIP_REQUESTED',
            details: { placementId: row.id, storeId: store.id, ...(dto.renewsPlacementId ? { renewsPlacementId: dto.renewsPlacementId } : {}) },
          },
        });
        return row;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Yêu cầu đã được gửi. Hãy tải lại danh sách.',
        );
      throw error;
    }
  }

  async review(
    id: string,
    userId: string,
    role: UserRole,
    dto: ReviewSponsorshipDto,
  ) {
    if (!admin(role))
      throw new ForbiddenException('Chỉ quản trị sàn được duyệt tài trợ.');
    if (!['APPROVE', 'REJECT'].includes(dto.decision))
      throw new BadRequestException('Kết quả xét duyệt không hợp lệ.');
    const note = dto.note.trim();
    if (note.length < 5)
      throw new BadRequestException('Cần ghi rõ căn cứ duyệt hoặc từ chối.');
    if (dto.decision === 'APPROVE') {
      if (dto.fundingType === SponsoredPlacementFunding.PAID) {
        if (
          !Number.isInteger(dto.amount) ||
          !dto.amount ||
          dto.amount < 1 ||
          (dto.paymentReference?.trim().length ?? 0) < 6 ||
          !dto.paymentProofUrl?.startsWith('https://')
        )
          throw new BadRequestException(
            'Gói có thu phí cần số tiền, mã đối soát và chứng từ đã kiểm tra.',
          );
      } else {
        throw new BadRequestException(
          'Vị trí quảng cáo chỉ dành cho gói trả phí đã được đối soát.',
        );
      }
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Serialize approvals across all shops so the six public positions cannot be oversold.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(1731091, 0)`;
        const row = await tx.sponsoredPlacement.findUnique({
          where: { id },
          include: {
            store: {
              select: {
                isActive: true,
                isDeleted: true,
                isVerified: true,
                onboardingStatus: true,
                owner: { select: { isActive: true } },
              },
            },
          },
        });
        if (!row)
          throw new NotFoundException('Không tìm thấy yêu cầu tài trợ.');
        if (row.status !== 'REQUESTED')
          throw new ConflictException('Yêu cầu đã được xử lý.');
        if (dto.decision === 'APPROVE') {
          validateSponsorshipWindow(row.startsAt, row.endsAt);
          const expectedAmount = row.amount == null
            ? sponsorshipQuote(row.startsAt, row.endsAt).amount
            : Number(row.amount);
          if (dto.amount !== expectedAmount)
            throw new BadRequestException(`Phí cần đối soát là ${expectedAmount.toLocaleString('vi-VN')} ₫. Số tiền xác minh phải khớp phí đăng ký.`);
          if (
            !row.store.isActive ||
            row.store.isDeleted ||
            !row.store.isVerified ||
            row.store.onboardingStatus !== 'VERIFIED' ||
            !row.store.owner.isActive
          )
            throw new ConflictException(
              'Gian hàng không còn đủ điều kiện hiển thị.',
            );
          const booked = await tx.sponsoredPlacement.findMany({
            where: {
              status: 'APPROVED',
              fundingType: 'PAID',
              amount: { gt: 0 },
              startsAt: { lt: row.endsAt },
              endsAt: { gt: row.startsAt },
            },
            select: { storeId: true, startsAt: true, endsAt: true },
          });
          if (
            booked.some((item) => item.storeId === row.storeId) ||
            !hasSponsorshipCapacity(booked, row)
          )
            throw new ConflictException(
              'Lịch hiển thị đã đầy hoặc bị trùng. Hãy chọn khoảng thời gian khác.',
            );
        }
        const changed = await tx.sponsoredPlacement.updateMany({
          where: { id, status: 'REQUESTED' },
          data: {
            status: dto.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            reviewedById: userId,
            reviewedAt: new Date(),
            reviewNote: note,
            ...(dto.decision === 'APPROVE'
              ? {
                  fundingType: dto.fundingType,
                  amount: dto.amount,
                  paymentReference:
                    dto.fundingType === 'PAID'
                      ? dto.paymentReference!.trim()
                      : null,
                  paymentProofUrl:
                    dto.fundingType === 'PAID' ? dto.paymentProofUrl : null,
                }
              : {}),
          },
        });
        if (!changed.count)
          throw new ConflictException('Yêu cầu vừa được xử lý bởi người khác.');
        await tx.auditLog.create({
          data: {
            userId,
            action: 'SPONSORSHIP_REVIEWED',
            details: {
              placementId: id,
              decision: dto.decision,
              fundingType: dto.fundingType ?? null,
            },
          },
        });
        await tx.notification.create({
          data: {
            userId: row.requestedById,
            type: 'SPONSORSHIP_REVIEWED',
            title: 'Kết quả đăng ký gian hàng tài trợ',
            message: `${dto.decision === 'APPROVE' ? 'Đã duyệt' : 'Từ chối'}: ${note}`,
            data: { placementId: id, route: '/merchant/settings' },
          },
        });
        return tx.sponsoredPlacement.findUniqueOrThrow({
          where: { id },
          include,
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'Mã đối soát đã được sử dụng cho một gói khác.',
        );
      throw error;
    }
  }

  async cancel(id: string, userId: string, role: UserRole, note: string) {
    if (!admin(role) && role !== UserRole.SHOP_MANAGER)
      throw new ForbiddenException('Không có quyền hủy tài trợ.');
    if (note.trim().length < 5)
      throw new BadRequestException('Cần nhập lý do hủy.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1731091, 0)`;
      const row = await tx.sponsoredPlacement.findFirst({
        where: { id, ...(admin(role) ? {} : { store: { ownerId: userId } }) },
      });
      if (!row)
        throw new NotFoundException('Không tìm thấy gói tài trợ của bạn.');
      if (!['REQUESTED', 'APPROVED'].includes(row.status))
        throw new ConflictException('Không thể hủy gói ở trạng thái hiện tại.');
      if (sponsorshipHasExpired(row))
        throw new ConflictException('Gói đã hết hạn, không cần hủy. Hãy đăng ký gia hạn nếu muốn tiếp tục quảng cáo.');
      const changed = await tx.sponsoredPlacement.updateMany({
        where: { id, status: row.status },
        data: { status: 'CANCELLED' },
      });
      if (!changed.count)
        throw new ConflictException('Gói vừa đổi trạng thái.');
      await tx.auditLog.create({
        data: {
          userId,
          action: 'SPONSORSHIP_CANCELLED',
          details: {
            placementId: id,
            note: note.trim(),
            automaticallyRefunded: false,
          },
        },
      });
      return {
        id,
        status: 'CANCELLED',
        message: 'Đã dừng hiển thị. Thao tác này không tự hoàn phí.',
      };
    });
  }
}
