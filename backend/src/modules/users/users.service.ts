import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { isDeleted: false },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async getMe(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy định danh người dùng trong token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        stores: { where: { isDeleted: false } },
        collaboratorProfile: {
          include: { tier: true },
        },
        socialChannels: true,
        wallet: true,
      },
    });

    if (!user || user.isDeleted || !user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản không tồn tại, đã bị khóa hoặc bị xóa',
      );
    }

    const { passwordHash: _, ...safeUser } = user;
    return {
      ...safeUser,
      avatarUrl: user.avatarUrl || user.collaboratorProfile?.avatarUrl || null,
      storeId: user.stores?.[0]?.id || null,
    };
  }
}
