import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateInternalStaffDto,
  ToggleUserStatusDto,
} from './dto/create-internal-staff.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, { type: argon2.argon2id });
    } catch {
      return bcrypt.hash(password, 10);
    }
  }

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

  async findStaff() {
    const rawStaff = await this.prisma.user.findMany({
      where: {
        isDeleted: false,
        role: {
          in: [
            UserRole.SHOP_MANAGER,
            UserRole.SYSTEM_MANAGER,
            UserRole.SYSTEM_ADMIN,
          ],
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        isActive: true,
        createdAt: true,
        storeId: true,
        managedStore: {
          select: {
            id: true,
            name: true,
            slug: true,
            isVerified: true,
            isActive: true,
          },
        },
        stores: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            slug: true,
            isVerified: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rawStaff.map((staff) => {
      const assignedStore = staff.managedStore || staff.stores?.[0] || null;
      return {
        id: staff.id,
        email: staff.email,
        fullName: staff.fullName,
        role: staff.role,
        phoneNumber: staff.phoneNumber,
        isActive: staff.isActive,
        createdAt: staff.createdAt,
        stores: assignedStore ? [assignedStore] : staff.stores,
      };
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

  async findOneWithStore(id: string) {
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
        stores: {
          where: { isDeleted: false },
          select: {
            id: true,
            name: true,
            slug: true,
            isVerified: true,
            isActive: true,
          },
        },
      },
    });
  }

  async createInternalStaff(dto: CreateInternalStaffDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException(
        `Email ${email} đã được đăng ký trong hệ thống`,
      );
    }

    if (dto.role === UserRole.SHOP_MANAGER && dto.storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
      });
      if (!store || store.isDeleted) {
        throw new NotFoundException('Cửa hàng trực thuộc không tồn tại');
      }
    }

    const passwordHash = await this.hashPassword(dto.password);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName.trim(),
        phoneNumber: dto.phoneNumber?.trim() || null,
        passwordHash,
        role: dto.role,
        storeId: dto.role === UserRole.SHOP_MANAGER && dto.storeId ? dto.storeId : null,
        isActive: true,
      },
    });

    if (dto.role === UserRole.SHOP_MANAGER && dto.storeId) {
      const store = await this.prisma.store.findUnique({
        where: { id: dto.storeId },
      });
      if (store && !store.ownerId) {
        await this.prisma.store.update({
          where: { id: dto.storeId },
          data: { ownerId: newUser.id },
        });
      }
    }

    return this.findOneWithStore(newUser.id);
  }

  async toggleUserStatus(id: string, dto?: ToggleUserStatusDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.isDeleted) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const nextActive =
      typeof dto?.isActive === 'boolean' ? dto.isActive : !existing.isActive;

    return this.prisma.user.update({
      where: { id },
      data: { isActive: nextActive },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });
  }

  async getMe(userId: string) {
    if (!userId) {
      throw new UnauthorizedException(
        'Không tìm thấy định danh người dùng trong token',
      );
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
      storeId: user.storeId || user.stores?.[0]?.id || null,
    };
  }
}
