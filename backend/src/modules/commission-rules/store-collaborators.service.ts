import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StoreCollaboratorStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { InviteStoreCollaboratorDto } from './dto/invite-store-collaborator.dto';
import { managedStoreWhere } from '../../common/policies/store-access.policy';

@Injectable()
export class StoreCollaboratorsService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (existing) {
      const changed = await this.prisma.storeCollaborator.updateMany({
        where: { id: existing.id, status: 'REJECTED' },
        data: {
          requestedByKol: true,
          status: 'PENDING',
          approvedAt: null,
          note: note?.trim() || null,
        },
      });
      if (!changed.count)
        throw new BadRequestException(
          'Trạng thái hợp tác đã thay đổi. Vui lòng tải lại.',
        );
      return this.prisma.storeCollaborator.findUnique({
        where: { id: existing.id },
      });
    }
    try {
      return await this.prisma.storeCollaborator.create({
        data: {
          storeId,
          collaboratorId,
          requestedByKol: true,
          status: 'PENDING',
          note: note?.trim() || null,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002')
        throw new BadRequestException('Yêu cầu đã được tạo. Vui lòng tải lại.');
      throw error;
    }
  }

  async reviewRequest(ownerId: string, id: string, accept: boolean) {
    const request = await this.prisma.storeCollaborator.findUnique({
      where: { id },
    });
    if (!request) throw new NotFoundException('Yêu cầu không tồn tại');
    await this.getOwnedStore(ownerId, request.storeId);
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
    const [members, pendingMembers] = await Promise.all([
      this.prisma.storeCollaborator.findMany({
        where: { storeId: store.id, status: StoreCollaboratorStatus.APPROVED },
      include: {
        collaborator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            collaboratorProfile: {
              select: {
                avatarUrl: true,
                totalFollowers: true,
                kycStatus: true,
                totalEarnedCommission: true,
                totalOrdersReferred: true,
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
                followerCount: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      }),
      this.prisma.storeCollaborator.findMany({
        where: { storeId: store.id, status: StoreCollaboratorStatus.PENDING },
        include: {
          collaborator: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              collaboratorProfile: {
                select: {
                  avatarUrl: true,
                  totalFollowers: true,
                  kycStatus: true,
                  tier: true,
                },
              },
              socialChannels: {
                where: { isPrimary: true },
                take: 1,
                select: {
                  platformName: true,
                  channelName: true,
                  followerCount: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const collabIds = members.map((m) => m.collaboratorId);

    const ordersAgg = await this.prisma.order.groupBy({
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
    });

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

    const completedSamples = await this.prisma.sampleProductRequest.findMany({
      where: {
        product: { storeId: store.id },
        collaboratorId: { in: collabIds },
        status: 'COMPLETED',
      },
      select: { collaboratorId: true },
    });
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
        stats: {
          totalRevenue,
          totalOrders,
          completedVideosCount,
        },
      };
    });

    return {
      store: { id: store.id, name: store.name },
      members: enrichedMembers,
      pendingRequests: pendingMembers,
      pendingCount: pendingMembers.length,
    };
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

    // A concurrent KOC request/approval must not be overwritten by an upsert.
    const pendingData = {
      status: StoreCollaboratorStatus.PENDING,
      approvedAt: null,
      note: dto.note?.trim() || null,
      requestedByKol: false,
    };
    let invitation;
    if (existing) {
      const updated = await this.prisma.storeCollaborator.updateMany({
        where: { id: existing.id, status: StoreCollaboratorStatus.REJECTED },
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
    return {
      message: 'Đã gửi lời mời đến KOL/CTV',
      invitation,
      collaborator,
      store,
    };
  }

  async getMyInvitations(collaboratorId: string) {
    return this.prisma.storeCollaborator.findMany({
      where: { collaboratorId },
      include: { store: { select: { id: true, name: true, logoUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respond(collaboratorId: string, invitationId: string, accept: boolean) {
    const invitation = await this.prisma.storeCollaborator.findUnique({
      where: { id: invitationId },
      include: { store: { select: { id: true, name: true } } },
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
    return this.prisma.storeCollaborator.findUnique({
      where: { id: invitationId },
      include: { store: { select: { id: true, name: true, logoUrl: true } } },
    });
  }
}
