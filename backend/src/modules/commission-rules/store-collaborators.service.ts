import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StoreCollaboratorStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { InviteStoreCollaboratorDto } from './dto/invite-store-collaborator.dto';

@Injectable()
export class StoreCollaboratorsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedStore(ownerId: string, storeId?: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, ownerId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
    });
    if (!store) throw new NotFoundException('Tài khoản chưa có cửa hàng');
    return store;
  }

  async getShopTeam(ownerId: string, storeId?: string) {
    const store = await this.getOwnedStore(ownerId, storeId);
    const members = await this.prisma.storeCollaborator.findMany({
      where: { storeId: store.id },
      include: {
        collaborator: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            collaboratorProfile: { select: { totalFollowers: true, kycStatus: true } },
            socialChannels: {
              where: { isPrimary: true },
              take: 1,
              select: { platformName: true, channelName: true, followerCount: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { store: { id: store.id, name: store.name }, members };
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
      throw new NotFoundException('Không tìm thấy tài khoản KOL/CTV đang hoạt động với email này');
    }

    const existing = await this.prisma.storeCollaborator.findUnique({
      where: { storeId_collaboratorId: { storeId: store.id, collaboratorId: collaborator.id } },
    });
    if (existing?.status === StoreCollaboratorStatus.APPROVED) {
      throw new BadRequestException('KOL/CTV này đã thuộc đội ngũ của Shop');
    }
    if (existing?.status === StoreCollaboratorStatus.PENDING) {
      throw new BadRequestException('Lời mời đang chờ KOL/CTV phản hồi');
    }

    const invitation = await this.prisma.storeCollaborator.upsert({
      where: { storeId_collaboratorId: { storeId: store.id, collaboratorId: collaborator.id } },
      create: {
        storeId: store.id,
        collaboratorId: collaborator.id,
        status: StoreCollaboratorStatus.PENDING,
        note: dto.note?.trim() || null,
      },
      update: {
        status: StoreCollaboratorStatus.PENDING,
        approvedAt: null,
        note: dto.note?.trim() || null,
      },
    });
    return { message: 'Đã gửi lời mời đến KOL/CTV', invitation, collaborator, store };
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
    if (invitation.status !== StoreCollaboratorStatus.PENDING) {
      throw new BadRequestException('Lời mời này đã được xử lý');
    }
    const status = accept
      ? StoreCollaboratorStatus.APPROVED
      : StoreCollaboratorStatus.REJECTED;
    return this.prisma.storeCollaborator.update({
      where: { id: invitationId },
      data: { status, approvedAt: accept ? new Date() : null },
      include: { store: { select: { id: true, name: true, logoUrl: true } } },
    });
  }
}
