import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  StoreCollaboratorStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService } from '../../core/cache/cache.service';
import { InviteStoreCollaboratorDto } from './dto/invite-store-collaborator.dto';
import { managedStoreWhere } from '../../common/policies/store-access.policy';

const CLOSED_COOPERATION_STATUSES: StoreCollaboratorStatus[] = [
  StoreCollaboratorStatus.REJECTED,
  StoreCollaboratorStatus.TERMINATED,
  StoreCollaboratorStatus.BLOCKED,
];

@Injectable()
export class StoreCollaboratorsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly cacheService?: CacheService,
  ) {}

  private async invalidateStoreTeamCache(storeId: string) {
    if (this.cacheService) {
      try {
        await this.cacheService.del(`store:team:${storeId}`);
      } catch {
        // Safe fallback
      }
    }
  }

  private async notifyCooperation(
    userId: string | undefined | null,
    title: string,
    message: string,
    type: string,
    data: Prisma.InputJsonObject,
  ) {
    if (
      !userId ||
      typeof this.prisma.notification?.create !== 'function'
    ) {
      return;
    }
    try {
      await this.prisma.notification.create({
        data: {
          userId,
          title: title.slice(0, 255),
          message,
          type,
          data,
        },
      });
      await this.cacheService?.del?.(`notif:unread:${userId}`);
    } catch {
      // Never block cooperation decisions if notification delivery fails.
    }
  }

  /**
   * Xác định các cặp (storeId, collaboratorId) từng phát sinh tin nhắn, deal, mẫu hoặc đơn hàng
   * để frontend quyết định có giữ lại lịch sử ở hộp thư hoạt động sau khi từ chối/chấm dứt hay không.
   */
  private async findCooperationHistoryKeys(
    storeIds: string[],
    collaboratorIds: string[],
  ): Promise<Set<string>> {
    const history = new Set<string>();
    const uniqueStores = [...new Set(storeIds.filter(Boolean))];
    const uniqueCollabs = [...new Set(collaboratorIds.filter(Boolean))];
    if (!uniqueStores.length || !uniqueCollabs.length) return history;

    const tasks: Array<Promise<void>> = [];

    if (typeof this.prisma.conversation?.findMany === 'function') {
      tasks.push(
        this.prisma.conversation
          .findMany({
            where: {
              storeId: { in: uniqueStores },
              collaboratorId: { in: uniqueCollabs },
              chatMessages: { some: {} },
            },
            select: { storeId: true, collaboratorId: true },
          })
          .then((rows) => {
            for (const row of rows) {
              if (row.collaboratorId) {
                history.add(`${row.storeId}:${row.collaboratorId}`);
              }
            }
          })
          .catch(() => {}),
      );
    }

    if (typeof this.prisma.exclusiveDealProposal?.findMany === 'function') {
      tasks.push(
        this.prisma.exclusiveDealProposal
          .findMany({
            where: {
              storeId: { in: uniqueStores },
              collaboratorId: { in: uniqueCollabs },
            },
            select: { storeId: true, collaboratorId: true },
            distinct: ['storeId', 'collaboratorId'],
          })
          .then((rows) => {
            for (const row of rows) {
              history.add(`${row.storeId}:${row.collaboratorId}`);
            }
          })
          .catch(() => {}),
      );
    }

    if (typeof this.prisma.sampleProductRequest?.findMany === 'function') {
      tasks.push(
        this.prisma.sampleProductRequest
          .findMany({
            where: {
              collaboratorId: { in: uniqueCollabs },
              product: { storeId: { in: uniqueStores } },
            },
            select: {
              collaboratorId: true,
              product: { select: { storeId: true } },
            },
          })
          .then((rows) => {
            for (const row of rows) {
              if (row.product?.storeId) {
                history.add(`${row.product.storeId}:${row.collaboratorId}`);
              }
            }
          })
          .catch(() => {}),
      );
    }

    if (typeof this.prisma.order?.findMany === 'function') {
      tasks.push(
        this.prisma.order
          .findMany({
            where: {
              storeId: { in: uniqueStores },
              attributedCollaboratorId: { in: uniqueCollabs },
            },
            select: { storeId: true, attributedCollaboratorId: true },
            distinct: ['storeId', 'attributedCollaboratorId'],
          })
          .then((rows) => {
            for (const row of rows) {
              if (row.attributedCollaboratorId) {
                history.add(`${row.storeId}:${row.attributedCollaboratorId}`);
              }
            }
          })
          .catch(() => {}),
      );
    }

    await Promise.all(tasks);
    return history;
  }

  async getPartnerPerformance(ownerId: string, collaboratorId: string, range: string, storeId?: string) {
    if (!['7d', '30d', 'month', 'all'].includes(range)) throw new BadRequestException('Khoảng thời gian không hợp lệ');
    const store = await this.getOwnedStore(ownerId, storeId);
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(now);
    const month = parts.find(part => part.type === 'month')!.value;
    const year = parts.find(part => part.type === 'year')!.value;
    const start = range === 'all' ? undefined : range === 'month'
      ? new Date(`${year}-${month}-01T00:00:00+07:00`)
      : new Date(now.getTime() - Number(range === '7d' ? 7 : 30) * 86400000);
    const createdAt = { ...(start ? { gte: start } : {}), lte: now };
    const where = { storeId: store.id, attributedCollaboratorId: collaboratorId, createdAt };
    const successful = { ...where, status: { in: [OrderStatus.DELIVERED, OrderStatus.COMPLETED] } };
    const [totalOrders, completedOrders, revenue, commission, clicks, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: successful }),
      this.prisma.order.aggregate({ where: successful, _sum: { finalAmount: true } }),
      this.prisma.commission.aggregate({ where: { collaboratorId, order: { storeId: store.id, createdAt }, status: { in: ['APPROVED', 'PAID'] } }, _sum: { commissionAmount: true } }),
      this.prisma.clickTrafficLog.count({ where: { referralLink: { storeId: store.id, collaboratorId }, createdAt } }),
      this.prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20,
        select: { id: true, externalOrderSn: true, createdAt: true, finalAmount: true, status: true,
          orderItems: { select: { product: { select: { title: true } } } },
          commissions: { where: { collaboratorId, status: { in: ['APPROVED', 'PAID'] } }, select: { commissionAmount: true } } } }),
    ]);
    return { range, totalOrders, completedOrders, revenue: Number(revenue._sum.finalAmount || 0),
      commission: Number(commission._sum.commissionAmount || 0), clicks,
      conversionRate: clicks ? totalOrders / clicks * 100 : null,
      completionRate: totalOrders ? completedOrders / totalOrders * 100 : null,
      orders: orders.map(order => ({ id: order.id, code: order.externalOrderSn, createdAt: order.createdAt,
        amount: Number(order.finalAmount), status: order.status, products: order.orderItems.map(item => item.product.title),
        commission: order.commissions.reduce((sum, item) => sum + Number(item.commissionAmount), 0) })) };
  }

  async requestCooperation(
    collaboratorId: string,
    storeId: string,
    note?: string,
  ) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, isDeleted: false, isActive: true },
    });
    if (!store) throw new NotFoundException('Gian hàng không hoạt động');
    const existing = await this.prisma.storeCollaborator.findUnique({
      where: { storeId_collaboratorId: { storeId, collaboratorId } },
    });
    if (
      existing?.status === 'APPROVED' ||
      (existing?.status === 'PENDING' && existing.requestedByKol)
    )
      return existing;
    if (existing?.status === 'PENDING')
      throw new BadRequestException(
        'Shop đã mời bạn. Hãy chấp nhận lời mời của Shop.',
      );
    if (existing?.status === 'BLOCKED') {
      throw new ForbiddenException(
        'Cửa hàng đã khóa quyền hợp tác đối với tài khoản này.',
      );
    }

    const trimmedNote = note?.trim() || null;
    let saved: any;
    if (existing) {
      const changed = await this.prisma.storeCollaborator.updateMany({
        where: {
          id: existing.id,
          status: {
            in: [
              StoreCollaboratorStatus.REJECTED,
              StoreCollaboratorStatus.TERMINATED,
            ],
          },
        },
        data: {
          requestedByKol: true,
          status: StoreCollaboratorStatus.PENDING,
          approvedAt: null,
          terminatedAt: null,
          terminatedById: null,
          terminateReason: null,
          note: trimmedNote,
        },
      });
      if (!changed.count)
        throw new BadRequestException(
          'Trạng thái hợp tác đã thay đổi. Vui lòng tải lại.',
        );
      saved = await this.prisma.storeCollaborator.findUnique({
        where: { id: existing.id },
      });
    } else {
      try {
        saved = await this.prisma.storeCollaborator.create({
          data: {
            storeId,
            collaboratorId,
            requestedByKol: true,
            status: StoreCollaboratorStatus.PENDING,
            note: trimmedNote,
          },
        });
      } catch (error: any) {
        if (error?.code === 'P2002')
          throw new BadRequestException('Yêu cầu đã được tạo. Vui lòng tải lại.');
        throw error;
      }
    }

    await this.invalidateStoreTeamCache(storeId);
    let kolName = 'Cộng tác viên';
    if (typeof this.prisma.user?.findUnique === 'function') {
      try {
        const kol = await this.prisma.user.findUnique({
          where: { id: collaboratorId },
          select: { fullName: true },
        });
        if (kol?.fullName) kolName = kol.fullName;
      } catch {
        // Fallback label
      }
    }
    await this.notifyCooperation(
      store.ownerId,
      `Đề nghị hợp tác mới cho ${store.name}`,
      trimmedNote
        ? `${kolName} gửi yêu cầu hợp tác: "${trimmedNote}"`
        : `${kolName} vừa gửi yêu cầu hợp tác với gian hàng ${store.name}.`,
      'STORE_COOPERATION_REQUEST',
      {
        storeId,
        collaboratorId,
        cooperationId: saved?.id,
        actionUrl: `/merchant/kol-hub?kol=${encodeURIComponent(collaboratorId)}&tab=messages`,
      },
    );
    return saved;
  }

  async reviewRequest(ownerId: string, id: string, accept: boolean) {
    const request = await this.prisma.storeCollaborator.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
    const store = await this.getOwnedStore(ownerId, request.storeId);
    const changed = await this.prisma.storeCollaborator.updateMany({
      where: { id, requestedByKol: true, status: 'PENDING' },
      data: {
        status: accept ? 'APPROVED' : 'REJECTED',
        approvedAt: accept ? new Date() : null,
      },
    });
    if (!changed.count)
      throw new BadRequestException(
        'Yêu cầu đã xử lý hoặc không phải yêu cầu do KOL gửi',
      );
    await this.invalidateStoreTeamCache(request.storeId);
    await this.notifyCooperation(
      request.collaboratorId,
      accept
        ? `${store.name} đã duyệt yêu cầu hợp tác`
        : `${store.name} chưa chấp thuận yêu cầu hợp tác`,
      accept
        ? `Bạn đã chính thức kết nối hợp tác cùng ${store.name}. Có thể bắt đầu đề xuất Deal và nhận mã ưu đãi.`
        : `Gian hàng ${store.name} hiện đã từ chối yêu cầu hợp tác của bạn.`,
      accept ? 'STORE_COOPERATION_APPROVED' : 'STORE_COOPERATION_REJECTED',
      {
        storeId: request.storeId,
        cooperationId: id,
        actionUrl: `/collaborator/collaboration?shop=${encodeURIComponent(request.storeId)}`,
      },
    );
    return this.prisma.storeCollaborator.findUnique({ where: { id } });
  }

  private async getOwnedStore(ownerId: string, storeId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: ownerId },
      select: { role: true },
    });

    if (
      user?.role === UserRole.SYSTEM_ADMIN ||
      user?.role === UserRole.SYSTEM_MANAGER
    ) {
      const store = await this.prisma.store.findFirst({
        where: { id: storeId, isDeleted: false },
        orderBy: { createdAt: 'asc' },
      });
      // An explicit missing store must never silently select a different one.
      if (!store) throw new NotFoundException('Không tìm thấy cửa hàng');
      return store;
    }

    if (user?.role !== UserRole.SHOP_MANAGER) {
      throw new ForbiddenException('Bạn không có quyền quản lý cửa hàng');
    }
    const store = await this.prisma.store.findFirst({
      where: { ...managedStoreWhere(ownerId), id: storeId },
      orderBy: { createdAt: 'asc' },
    });
    if (!store) throw new NotFoundException('Tài khoản chưa có cửa hàng');
    return store;
  }

  async getShopTeam(ownerId: string, storeId?: string) {
    const store = await this.getOwnedStore(ownerId, storeId);
    const cacheKey = `store:team:${store.id}`;
    if (this.cacheService) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return cached;
    }
    const partnerUserSelect = {
      id: true,
      fullName: true,
      email: true,
      phoneNumber: true,
      collaboratorProfile: {
        select: {
          avatarUrl: true,
          totalFollowers: true,
          kycStatus: true,
          tier: {
            select: {
              id: true,
              name: true,
              minRevenueThreshold: true,
              extraBonusPercentage: true,
            },
          },
        },
      },
      socialChannels: {
        where: { isPrimary: true },
        take: 1,
        select: {
          platformName: true,
          channelName: true,
          channelUrl: true,
          followerCount: true,
        },
      },
    };
    const [members, pendingMembers, rawClosedMembers] = await Promise.all([
      this.prisma.storeCollaborator.findMany({
        where: { storeId: store.id, status: StoreCollaboratorStatus.APPROVED },
        include: {
          collaborator: {
            select: {
              ...partnerUserSelect,
              collaboratorProfile: {
                select: {
                  ...partnerUserSelect.collaboratorProfile.select,
                  totalEarnedCommission: true,
                  totalOrdersReferred: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.storeCollaborator.findMany({
        where: { storeId: store.id, status: StoreCollaboratorStatus.PENDING },
        include: { collaborator: { select: partnerUserSelect } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.storeCollaborator.findMany({
        where: {
          storeId: store.id,
          status: { in: CLOSED_COOPERATION_STATUSES },
        },
        include: { collaborator: { select: partnerUserSelect } },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const closedMembers = (rawClosedMembers || []).filter(
      (item: any) =>
        item.status &&
        CLOSED_COOPERATION_STATUSES.includes(item.status),
    );
    const collabIds = members.map((m) => m.collaboratorId);
    const allRelationCollabIds = [
      ...collabIds,
      ...pendingMembers.map((m) => m.collaboratorId),
      ...closedMembers.map((m) => m.collaboratorId),
    ];

    const [ordersAgg, completedSamples, historyKeys] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['attributedCollaboratorId'],
        where: {
          storeId: store.id,
          attributedCollaboratorId: { in: collabIds },
          status: { in: ['DELIVERED', 'COMPLETED'] },
        },
        _sum: {
          finalAmount: true,
          refundedAmount: true,
        },
        _count: {
          id: true,
        },
      }),
      this.prisma.sampleProductRequest.findMany({
        where: {
          product: { storeId: store.id },
          collaboratorId: { in: collabIds },
          status: 'COMPLETED',
        },
        select: { collaboratorId: true },
      }),
      this.findCooperationHistoryKeys([store.id], allRelationCollabIds),
    ]);

    const orderStatsMap = new Map<
      string,
      { totalRevenue: number; totalOrders: number }
    >();
    for (const agg of ordersAgg) {
      if (agg.attributedCollaboratorId) {
        orderStatsMap.set(agg.attributedCollaboratorId, {
          totalRevenue: Math.max(
            0,
            Number(agg._sum.finalAmount || 0) -
              Number(agg._sum.refundedAmount || 0),
          ),
          totalOrders: agg._count.id || 0,
        });
      }
    }

    const completedSamplesMap = new Map<string, number>();
    for (const s of completedSamples) {
      completedSamplesMap.set(
        s.collaboratorId,
        (completedSamplesMap.get(s.collaboratorId) || 0) + 1,
      );
    }

    const enrichedMembers = members.map((m) => {
      const stats = orderStatsMap.get(m.collaboratorId);
      // Profile counters cover every Store. Never infer this Store's sales
      // from earned commissions or import another Store's order count.
      const totalRevenue = stats?.totalRevenue ?? 0;
      const totalOrders = stats?.totalOrders ?? 0;
      const completedVideosCount =
        completedSamplesMap.get(m.collaboratorId) || 0;
      return {
        ...m,
        hasHistory: historyKeys.has(`${store.id}:${m.collaboratorId}`),
        stats: {
          totalRevenue,
          totalOrders,
          completedVideosCount,
        },
      };
    });

    const enrichedPending = pendingMembers.map((m) => ({
      ...m,
      hasHistory: historyKeys.has(`${store.id}:${m.collaboratorId}`),
    }));

    const enrichedClosed = closedMembers.map((m) => ({
      ...m,
      hasHistory: historyKeys.has(`${store.id}:${m.collaboratorId}`),
    }));

    const teamResult = {
      store: { id: store.id, name: store.name },
      members: enrichedMembers,
      pendingRequests: enrichedPending,
      pendingCount: enrichedPending.length,
      closedRelations: enrichedClosed,
    };
    if (this.cacheService) {
      await this.cacheService.set(cacheKey, teamResult, 60);
    }
    return teamResult;
  }

  async invite(ownerId: string, dto: InviteStoreCollaboratorDto) {
    const store = await this.getOwnedStore(ownerId, dto.storeId);
    const email = dto.email.trim().toLowerCase();
    const collaborator = await this.prisma.user.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        role: UserRole.COLLABORATOR,
        isActive: true,
        isDeleted: false,
      },
      select: { id: true, fullName: true, email: true },
    });
    if (!collaborator) {
      throw new NotFoundException(
        'Không tìm thấy tài khoản KOL/CTV đang hoạt động với email này',
      );
    }

    const existing = await this.prisma.storeCollaborator.findUnique({
      where: {
        storeId_collaboratorId: {
          storeId: store.id,
          collaboratorId: collaborator.id,
        },
      },
    });
    if (existing?.status === StoreCollaboratorStatus.APPROVED) {
      throw new BadRequestException('KOL/CTV này đã thuộc đội ngũ của Shop');
    }
    if (existing?.status === StoreCollaboratorStatus.PENDING) {
      throw new BadRequestException('Lời mời đang chờ KOL/CTV phản hồi');
    }
    if (existing?.status === StoreCollaboratorStatus.BLOCKED) {
      throw new BadRequestException(
        'KOL/CTV đang bị khóa hợp tác bởi cửa hàng này',
      );
    }

    // A concurrent KOC request/approval must not be overwritten by an upsert.
    const trimmedNote = dto.note?.trim() || null;
    const pendingData = {
      status: StoreCollaboratorStatus.PENDING,
      approvedAt: null,
      terminatedAt: null,
      terminatedById: null,
      terminateReason: null,
      note: trimmedNote,
      requestedByKol: false,
    };
    let invitation;
    if (existing) {
      const updated = await this.prisma.storeCollaborator.updateMany({
        where: {
          id: existing.id,
          status: {
            in: [
              StoreCollaboratorStatus.REJECTED,
              StoreCollaboratorStatus.TERMINATED,
            ],
          },
        },
        data: pendingData,
      });
      if (!updated.count)
        throw new BadRequestException(
          'Trạng thái hợp tác đã thay đổi. Vui lòng tải lại.',
        );
      invitation = await this.prisma.storeCollaborator.findUnique({
        where: { id: existing.id },
      });
    } else {
      try {
        invitation = await this.prisma.storeCollaborator.create({
          data: {
            storeId: store.id,
            collaboratorId: collaborator.id,
            ...pendingData,
          },
        });
      } catch (error: any) {
        if (error?.code === 'P2002')
          throw new BadRequestException(
            'Đã có yêu cầu hợp tác mới. Vui lòng tải lại trước khi gửi lời mời.',
          );
        throw error;
      }
    }

    await this.invalidateStoreTeamCache(store.id);
    await this.notifyCooperation(
      collaborator.id,
      `Lời mời hợp tác từ ${store.name}`,
      trimmedNote
        ? `${store.name} gửi lời mời hợp tác: "${trimmedNote}"`
        : `${store.name} mời bạn trở thành đối tác tiếp thị trên SCANMS.`,
      'STORE_COOPERATION_INVITE',
      {
        storeId: store.id,
        cooperationId: invitation?.id,
        actionUrl: `/collaborator/collaboration?shop=${encodeURIComponent(store.id)}`,
      },
    );

    return {
      message: 'Đã gửi lời mời đến KOL/CTV',
      invitation,
      collaborator,
      store,
    };
  }

  async getMyInvitations(collaboratorId: string) {
    const rows = await this.prisma.storeCollaborator.findMany({
      where: { collaboratorId },
      include: { store: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });
    const historyKeys = await this.findCooperationHistoryKeys(
      rows.map((r) => r.storeId),
      [collaboratorId],
    );
    return rows.map((row) => ({
      ...row,
      hasHistory: historyKeys.has(`${row.storeId}:${collaboratorId}`),
    }));
  }

  async respond(collaboratorId: string, invitationId: string, accept: boolean) {
    const invitation = await this.prisma.storeCollaborator.findUnique({
      where: { id: invitationId },
      include: {
        store: { select: { id: true, name: true, ownerId: true } },
        collaborator: { select: { id: true, fullName: true } },
      },
    });
    if (!invitation) throw new NotFoundException('Lời mời không tồn tại');
    if (invitation.collaboratorId !== collaboratorId) {
      throw new ForbiddenException('Bạn không có quyền xử lý lời mời này');
    }
    if (invitation.requestedByKol)
      throw new ForbiddenException('Yêu cầu này phải do Shop duyệt');
    if (invitation.status !== StoreCollaboratorStatus.PENDING) {
      throw new BadRequestException('Lời mời này đã được xử lý');
    }
    const status = accept
      ? StoreCollaboratorStatus.APPROVED
      : StoreCollaboratorStatus.REJECTED;
    const changed = await this.prisma.storeCollaborator.updateMany({
      where: { id: invitationId, status: 'PENDING', requestedByKol: false },
      data: { status, approvedAt: accept ? new Date() : null },
    });
    if (!changed.count)
      throw new BadRequestException('Lời mời này đã được xử lý');

    await this.invalidateStoreTeamCache(invitation.storeId);
    const kolName = invitation.collaborator?.fullName || 'Cộng tác viên';
    await this.notifyCooperation(
      invitation.store?.ownerId,
      accept
        ? `${kolName} đã chấp nhận lời mời hợp tác`
        : `${kolName} đã từ chối lời mời hợp tác`,
      accept
        ? `${kolName} đã đồng ý hợp tác cùng ${invitation.store?.name || 'cửa hàng'}. Bạn có thể gửi Đề xuất Deal độc quyền ngay.`
        : `${kolName} vừa từ chối lời mời hợp tác của cửa hàng.`,
      accept ? 'STORE_COOPERATION_ACCEPTED' : 'STORE_COOPERATION_REJECTED',
      {
        storeId: invitation.storeId,
        collaboratorId,
        cooperationId: invitationId,
        actionUrl: `/merchant/kol-hub?kol=${encodeURIComponent(collaboratorId)}&tab=messages`,
      },
    );

    return this.prisma.storeCollaborator.findUnique({
      where: { id: invitationId },
      include: { store: { select: { id: true, name: true, logoUrl: true } } },
    });
  }

  private async resolveCooperationTarget(
    actorId: string,
    role: UserRole,
    idOrCollaboratorId: string,
    storeId?: string,
  ) {
    let record = await this.prisma.storeCollaborator.findUnique({
      where: { id: idOrCollaboratorId },
    });
    if (!record && storeId) {
      record = await this.prisma.storeCollaborator.findUnique({
        where: {
          storeId_collaboratorId: {
            storeId,
            collaboratorId: idOrCollaboratorId,
          },
        },
      });
    }
    if (!record && !storeId && role !== UserRole.COLLABORATOR) {
      const store = await this.getOwnedStore(actorId).catch(() => null);
      if (store) {
        record = await this.prisma.storeCollaborator.findUnique({
          where: {
            storeId_collaboratorId: {
              storeId: store.id,
              collaboratorId: idOrCollaboratorId,
            },
          },
        });
      }
    }
    if (!record) {
      throw new NotFoundException('Không tìm thấy bản ghi hợp tác đối tác');
    }

    let storeInfo: { id: string; name?: string; ownerId?: string } | null = null;
    if (role === UserRole.COLLABORATOR) {
      if (record.collaboratorId !== actorId) {
        throw new ForbiddenException('Bạn không có quyền thao tác thỏa thuận này');
      }
      storeInfo = await this.prisma.store.findUnique({
        where: { id: record.storeId },
        select: { id: true, name: true, ownerId: true },
      });
    } else {
      storeInfo = await this.getOwnedStore(actorId, record.storeId);
    }
    return { record, storeInfo };
  }

  private async evaluateTerminationBlockers(storeId: string, collaboratorId: string) {
    const [openDealsCount, pendingKpiCount, activeVouchers, openSamplesCount] =
      await Promise.all([
        typeof this.prisma.exclusiveDealProposal?.count === 'function'
          ? this.prisma.exclusiveDealProposal.count({
              where: {
                storeId,
                collaboratorId,
                closedAt: null,
                status: {
                  in: ['PENDING', 'PENDING_ADMIN_APPROVAL', 'APPROVED'],
                },
              },
            })
          : 0,
        typeof (this.prisma as any).commission?.count === 'function'
          ? (this.prisma as any).commission.count({
              where: {
                collaboratorId,
                dealBonusStatus: 'PENDING_KPI',
                order: { storeId },
              },
            })
          : 0,
        typeof this.prisma.coupon?.findMany === 'function'
          ? this.prisma.coupon.findMany({
              where: {
                storeId,
                collaboratorId,
                status: {
                  in: [
                    'PENDING_APPROVAL',
                    'PENDING_ADMIN_APPROVAL',
                    'PENDING_BLOCK_APPROVAL',
                    'ACTIVE',
                    'PAUSED',
                  ],
                },
              },
              select: { id: true, displayCode: true, status: true },
            })
          : [],
        typeof this.prisma.sampleProductRequest?.count === 'function'
          ? this.prisma.sampleProductRequest.count({
              where: {
                collaboratorId,
                product: { storeId },
                status: {
                  in: [
                    'PENDING',
                    'APPROVED',
                    'SHIPPED',
                    'RECEIVED',
                    'VIDEO_SUBMITTED',
                    'REVISION_REQUIRED',
                    'OVERDUE',
                    'APPEALED',
                    'DELIVERY_ISSUE',
                  ],
                },
              },
            })
          : 0,
      ]);

    const blockers: Array<{
      key: 'DEAL' | 'KPI' | 'VOUCHER' | 'SAMPLE';
      label: string;
      count: number;
      detail: string;
    }> = [];

    if (openDealsCount > 0) {
      blockers.push({
        key: 'DEAL',
        label: 'Deal độc quyền đang hiệu lực / chờ duyệt',
        count: openDealsCount,
        detail: `Còn ${openDealsCount} Deal độc quyền chưa kết thúc hoặc đang chờ duyệt.`,
      });
    }
    if (pendingKpiCount > 0) {
      blockers.push({
        key: 'KPI',
        label: 'Hoa hồng KPI đang chờ đối soát',
        count: pendingKpiCount,
        detail: `Còn ${pendingKpiCount} đơn có khoản thưởng KPI đang tạm giữ chờ quyết toán.`,
      });
    }
    if (activeVouchers.length > 0) {
      const codes = activeVouchers.map((v: any) => v.displayCode).filter(Boolean).slice(0, 3);
      blockers.push({
        key: 'VOUCHER',
        label: 'Mã ưu đãi KOC đang tồn tại',
        count: activeVouchers.length,
        detail: `Còn ${activeVouchers.length} mã ưu đãi KOC chưa ngừng/hết hạn${codes.length ? ` (${codes.join(', ')})` : ''}.`,
      });
    }
    if (openSamplesCount > 0) {
      blockers.push({
        key: 'SAMPLE',
        label: 'Đơn hàng mẫu SLA 14 ngày chưa khép lại',
        count: openSamplesCount,
        detail: `Còn ${openSamplesCount} yêu cầu/đơn hàng mẫu đang xử lý hoặc chưa hoàn tất review.`,
      });
    }

    return {
      canTerminate: blockers.length === 0,
      blockers,
      counts: {
        openDealsCount,
        pendingKpiCount,
        activeVouchersCount: activeVouchers.length,
        openSamplesCount,
      },
    };
  }

  async getTerminationEligibility(
    actorId: string,
    role: UserRole,
    idOrCollaboratorId: string,
    storeId?: string,
  ) {
    const { record } = await this.resolveCooperationTarget(
      actorId,
      role,
      idOrCollaboratorId,
      storeId,
    );
    const evaluation = await this.evaluateTerminationBlockers(
      record.storeId,
      record.collaboratorId,
    );
    const canTerminate =
      record.status === StoreCollaboratorStatus.APPROVED &&
      evaluation.canTerminate;
    return {
      ...evaluation,
      canTerminate,
      status: record.status,
      recordId: record.id,
      storeId: record.storeId,
      collaboratorId: record.collaboratorId,
    };
  }

  async terminateCooperation(
    actorId: string,
    role: UserRole,
    idOrCollaboratorId: string,
    storeId?: string,
    reason?: string,
  ) {
    const { record, storeInfo } = await this.resolveCooperationTarget(
      actorId,
      role,
      idOrCollaboratorId,
      storeId,
    );
    if (record.status !== StoreCollaboratorStatus.APPROVED) {
      throw new BadRequestException(
        'Chỉ có thể chấm dứt khi hai bên đang ở trạng thái Đang hợp tác.',
      );
    }

    const evaluation = await this.evaluateTerminationBlockers(
      record.storeId,
      record.collaboratorId,
    );
    if (!evaluation.canTerminate) {
      const summary = evaluation.blockers.map((b) => b.detail).join(' ');
      throw new BadRequestException({
        message: `Không thể chấm dứt hợp tác lúc này vì còn ràng buộc đang hiệu lực: ${summary}`,
        code: 'COOPERATION_TERMINATION_BLOCKED',
        blockers: evaluation.blockers,
        counts: evaluation.counts,
      });
    }

    const trimmedReason = reason?.trim() || null;
    if (trimmedReason !== null && trimmedReason.length < 5) {
      throw new BadRequestException(
        'Lý do chấm dứt hợp tác cần ít nhất 5 ký tự.',
      );
    }

    await this.prisma.storeCollaborator.update({
      where: { id: record.id },
      data: {
        status: StoreCollaboratorStatus.TERMINATED,
        terminatedAt: new Date(),
        terminatedById: actorId,
        terminateReason: trimmedReason,
      },
    });

    await this.invalidateStoreTeamCache(record.storeId);
    const notifyTarget =
      role === UserRole.COLLABORATOR
        ? storeInfo?.ownerId
        : record.collaboratorId;
    await this.notifyCooperation(
      notifyTarget,
      'Quan hệ hợp tác đã chấm dứt',
      role === UserRole.COLLABORATOR
        ? `Cộng tác viên đã chấm dứt hợp tác cùng ${storeInfo?.name || 'cửa hàng'}${trimmedReason ? ` (Lý do: ${trimmedReason})` : ''}.`
        : `${storeInfo?.name || 'Gian hàng'} đã chấm dứt quan hệ hợp tác tiếp thị với bạn${trimmedReason ? ` (Lý do: ${trimmedReason})` : ''}.`,
      'STORE_COOPERATION_TERMINATED',
      {
        storeId: record.storeId,
        collaboratorId: record.collaboratorId,
        cooperationId: record.id,
        actionUrl:
          role === UserRole.COLLABORATOR
            ? `/merchant/kol-hub?kol=${encodeURIComponent(record.collaboratorId)}&tab=messages`
            : `/collaborator/collaboration?shop=${encodeURIComponent(record.storeId)}`,
      },
    );

    return {
      success: true,
      message: 'Đã chấm dứt quan hệ hợp tác đối tác thành công',
      terminatedId: record.id,
      storeId: record.storeId,
      collaboratorId: record.collaboratorId,
      terminateReason: trimmedReason,
    };
  }
}
