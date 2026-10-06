import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { LiveStreamGateway } from './live-stream.gateway';
import { LiveGovernanceDto } from './dto/live-governance.dto';

@Injectable()
export class LiveGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: LiveStreamGateway,
  ) {}

  async get(userId: string, role: UserRole, id: string) {
    const session = await this.prisma.liveShoppingSession.findUnique({
      where: { id },
      include: { store: { select: { ownerId: true } } },
    });
    if (!session) throw new NotFoundException('Không tìm thấy phiên live.');
    if (!(
      role === UserRole.SYSTEM_ADMIN ||
      role === UserRole.SYSTEM_MANAGER ||
      (role === UserRole.COLLABORATOR && session.creatorId === userId) ||
      (role === UserRole.SHOP_MANAGER && session.store.ownerId === userId)
    ))
      throw new ForbiddenException('Bạn không được xem hồ sơ phiên này.');
    return {
      id,
      status: session.status,
      inviteStatus: session.inviteStatus,
      governance: session.governance,
    };
  }

  async act(
    userId: string,
    role: UserRole,
    id: string,
    dto: LiveGovernanceDto,
  ) {
    const message = dto.message?.trim();
    if (!message || message.length < 10)
      throw new BadRequestException(
        'Vui lòng ghi nội dung cụ thể, ít nhất 10 ký tự.',
      );
    if ((dto.evidence?.length || 0) > 10)
      throw new BadRequestException('Tối đa 10 liên kết bằng chứng.');
    let stopped = false;
    const result = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM live_shopping_sessions WHERE id = ${id}::uuid FOR UPDATE`;
        const session = await tx.liveShoppingSession.findUnique({
          where: { id },
          include: { store: true, coupon: true, products: true },
        });
        if (!session) throw new NotFoundException('Không tìm thấy phiên live.');
        const shop =
          role === UserRole.SHOP_MANAGER && session.store.ownerId === userId;
        const kol =
          role === UserRole.COLLABORATOR && session.creatorId === userId;
        const admin =
          role === UserRole.SYSTEM_ADMIN || role === UserRole.SYSTEM_MANAGER;
        const superAdmin = role === UserRole.SYSTEM_ADMIN;
        const requireRole = (allowed: boolean) => {
          if (!allowed)
            throw new ForbiddenException(
              'Bạn không có quyền thực hiện thao tác này.',
            );
        };
        requireRole(shop || kol || admin);
        const g: any = structuredClone(session.governance || {});
        const now = new Date();
        const at = now.toISOString();
        const active =
          ['LIVE', 'SCHEDULED', 'PAUSED'].includes(session.status) &&
          session.endsAt > now &&
          session.inviteStatus === 'ACCEPTED';
        const dispute = g.dispute;
        let recipients = [session.creatorId, session.store.ownerId];
        const staff = async (onlySuper = false) =>
          (
            await tx.user.findMany({
              where: {
                role: onlySuper
                  ? UserRole.SYSTEM_ADMIN
                  : { in: [UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER] },
                isActive: true,
                isDeleted: false,
              },
              select: { id: true },
            })
          ).map((u) => u.id);
        const stop = async (mode: string) => {
          await tx.$queryRaw`SELECT id FROM coupons WHERE live_session_id = ${id}::uuid FOR UPDATE`;
          const orders = await tx.order.findMany({
            where: {
              OR: [
                ...(session.coupon ? [{ couponId: session.coupon.id }] : []),
                {
                  rawPayload: {
                    path: ['liveSessionIds'],
                    array_contains: [id],
                  },
                },
              ],
            },
            select: {
              id: true,
              status: true,
              finalAmount: true,
              couponDiscountAmount: true,
              commissions: {
                where: { collaboratorId: session.creatorId },
                select: { commissionAmount: true, status: true },
              },
            },
          });
          g.stop = {
            mode,
            actorId: userId,
            role,
            at,
            reason: g.request?.reason || dto.reason,
            message,
          };
          g.preserveOrderTerms = true;
          g.snapshot = {
            at,
            title: session.title,
            scheduledStartsAt: session.startsAt.toISOString(),
            scheduledEndsAt: session.endsAt.toISOString(),
            commissionRate: String(session.commissionRate),
            description: session.description,
            products: session.products,
            coupon: session.coupon,
            orders,
            claims: await tx.liveSessionClaim.count({
              where: { sessionId: id },
            }),
            viewers: await tx.liveSessionViewer.count({
              where: { sessionId: id },
            }),
          };
          await tx.liveShoppingSession.update({
            where: { id },
            data: { status: 'ENDED' },
          });
          await tx.coupon.updateMany({
            where: { liveSessionId: id },
            data: { status: 'EXPIRED' },
          });
          await tx.notification.deleteMany({
            where: {
              type: 'LIVE_SESSION_BROADCAST',
              data: { path: ['sessionId'], equals: id },
            },
          });
          stopped = true;
          await tx.liveSessionViewer.updateMany({ where: { sessionId: id, leftAt: null }, data: { leftAt: now } });
        };
        switch (dto.action) {
          case 'REQUEST_END':
          case 'EMERGENCY_STOP':
            requireRole(shop);
            if (!active)
              throw new BadRequestException(
                'Phiên không còn hoạt động hoặc KOL chưa đồng ý.',
              );
            if (!dto.reason)
              throw new BadRequestException('Phải chọn lý do dừng phiên.');
            if (dto.action === 'REQUEST_END') {
              if (g.request?.status === 'PENDING')
                throw new BadRequestException(
                  'Đã có yêu cầu đang chờ KOL phản hồi.',
                );
              g.request = {
                status: 'PENDING',
                reason: dto.reason,
                message,
                actorId: userId,
                at,
              };
            } else {
              // An earlier request must not replace the emergency reason.
              g.request = {
                status: 'EMERGENCY',
                reason: dto.reason,
                message,
                actorId: userId,
                at,
              };
              await stop('EMERGENCY');
            }
            break;
          case 'ACCEPT_END':
          case 'REJECT_END':
            requireRole(kol);
            if (!active || g.request?.status !== 'PENDING')
              throw new BadRequestException(
                'Không có yêu cầu kết thúc còn hiệu lực.',
              );
            g.request.status =
              dto.action === 'ACCEPT_END' ? 'ACCEPTED' : 'REJECTED';
            g.request.response = { userId, message, at };
            if (dto.action === 'ACCEPT_END') await stop('AGREED');
            break;
          case 'COMPLAIN':
            requireRole(kol);
            if (!g.stop)
              throw new BadRequestException(
                'Chỉ khiếu nại việc dừng phiên đã được ghi nhận.',
              );
            if (dispute)
              throw new BadRequestException('Phiên đã có hồ sơ khiếu nại.');
            g.dispute = {
              status: 'OPEN',
              submittedAt: at,
              complainantId: userId,
              message,
              evidence: dto.evidence || [],
            };
            recipients.push(...(await staff()));
            break;
          case 'EXPLAIN':
            requireRole(shop);
            if (
              !dispute ||
              !['OPEN', 'ESCALATED', 'APPEALED'].includes(dispute.status)
            )
              throw new BadRequestException(
                'Không có tranh chấp đang chờ giải trình.',
              );
            dispute.explanation = {
              userId,
              message,
              evidence: dto.evidence || [],
              at,
            };
            recipients.push(...(await staff(dispute.status !== 'OPEN')));
            break;
          case 'ESCALATE':
            requireRole(admin);
            if (!dispute || dispute.status !== 'OPEN')
              throw new BadRequestException('Hồ sơ không thể chuyển cấp.');
            dispute.status = 'ESCALATED';
            dispute.escalation = { userId, message, at };
            recipients.push(...(await staff(true)));
            break;
          case 'APPEAL':
            requireRole(kol || shop);
            if (dispute?.status !== 'RESOLVED' || dispute.appeal)
              throw new BadRequestException(
                'Chỉ kháng nghị một lần sau quyết định ban đầu.',
              );
            dispute.status = 'APPEALED';
            dispute.appeal = {
              userId,
              message,
              evidence: dto.evidence || [],
              at,
            };
            recipients.push(...(await staff(true)));
            break;
          case 'DECIDE':
          case 'DECIDE_APPEAL': {
            requireRole(admin);
            const appeal = dto.action === 'DECIDE_APPEAL';
            if (
              !dispute ||
              (appeal
                ? !['APPEALED', 'ESCALATED'].includes(dispute.status)
                : dispute.status !== 'OPEN')
            )
              throw new BadRequestException('Trạng thái hồ sơ đã thay đổi.');
            if (appeal) requireRole(superAdmin);
            if (!dto.outcome)
              throw new BadRequestException('Phải chọn kết luận.');
            const sanction = dto.sanction || 'NONE';
            if (['RESTRICT', 'BLOCK', 'LIFT'].includes(sanction))
              requireRole(superAdmin);
            if (
              sanction !== 'NONE' &&
              sanction !== 'LIFT' &&
              dto.outcome !== 'SHOP_FAULT'
            )
              throw new BadRequestException(
                'Chỉ xử lý Shop khi kết luận Shop có lỗi.',
              );
            if (
              (dto.compensation || 0) > 0 &&
              (dto.outcome !== 'SHOP_FAULT' || !dispute.explanation)
            )
              throw new BadRequestException(
                'Bồi hoàn cần kết luận Shop có lỗi và giải trình để đối chiếu thỏa thuận.',
              );
            if (sanction === 'RESTRICT' && !dto.restrictionDays)
              throw new BadRequestException('Phải chọn số ngày hạn chế.');
            await tx.$queryRaw`SELECT id FROM stores WHERE id = ${session.storeId}::uuid FOR UPDATE`;
            if (sanction === 'RESTRICT') {
              const until = new Date(
                now.getTime() + dto.restrictionDays! * 86400000,
              );
              const store = await tx.store.findUniqueOrThrow({
                where: { id: session.storeId },
              });
              await tx.store.update({
                where: { id: session.storeId },
                data: {
                  liveRestrictionUntil:
                    store.liveRestrictionUntil &&
                    store.liveRestrictionUntil > until
                      ? store.liveRestrictionUntil
                      : until,
                },
              });
            }
            if (sanction === 'BLOCK')
              await tx.store.update({
                where: { id: session.storeId },
                data: { liveCooperationBlocked: true },
              });
            if (sanction === 'LIFT')
              await tx.store.update({
                where: { id: session.storeId },
                data: {
                  liveCooperationBlocked: false,
                  liveRestrictionUntil: null,
                },
              });
            const decision = {
              userId,
              role,
              at,
              message,
              outcome: dto.outcome,
              sanction,
              restrictionDays: dto.restrictionDays || 0,
              compensation: dto.compensation || 0,
              compensationStatus: dto.compensation
                ? 'PENDING_SETTLEMENT'
                : 'NONE',
            };
            if (appeal) dispute.finalDecision = decision;
            else dispute.decision = decision;
            dispute.status = appeal ? 'CLOSED' : 'RESOLVED';
            break;
          }
          default:
            throw new BadRequestException('Thao tác không hợp lệ.');
        }
        const event = {
          action: dto.action,
          actorId: userId,
          role,
          at,
          message,
          evidence: dto.evidence || [],
          reason: dto.reason || null,
        };
        g.timeline = [...(g.timeline || []), event];
        await tx.auditLog.create({
          data: {
            userId,
            action: `LIVE_${dto.action}`,
            details: {
              sessionId: id,
              storeId: session.storeId,
              event,
              decision: g.dispute?.finalDecision || g.dispute?.decision || null,
            } as Prisma.InputJsonValue,
          },
        });
        await tx.liveShoppingSession.update({
          where: { id },
          data: { governance: JSON.parse(JSON.stringify(g)) },
        });
        await tx.notification.createMany({
          data: [...new Set(recipients)]
            .filter((recipient) => recipient !== userId)
            .map((recipient) => ({
              userId: recipient,
              title: 'Cập nhật xử lý phiên livestream',
              message: `Phiên “${session.title}”: ${message}`,
              type: 'LIVE_GOVERNANCE',
              data: {
                sessionId: id,
                action: dto.action,
                disputeStatus: g.dispute?.status || null,
              },
            })),
        });
        return { governance: g, status: stopped ? 'ENDED' : session.status };
      },
      { timeout: 20000 },
    );
    this.gateway.notifyGovernanceChanged(id);
    if (stopped) await this.gateway.endSession(id);
    return result;
  }
}
