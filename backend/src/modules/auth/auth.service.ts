import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from './jwt.service';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../core/database/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    if (user.isDeleted || !user.isActive) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa hoặc đã bị xóa khỏi hệ thống',
      );
    }

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async verifyToken(token: string) {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  async getMe(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Không tìm thấy định danh người dùng trong token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        isDeleted: true,
        stores: {
          where: { isDeleted: false },
          select: { id: true, name: true, slug: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user || user.isDeleted || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại, đã bị khóa hoặc bị xóa');
    }

    const stores = user.stores ?? [];

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      storeId: stores[0]?.id ?? null,
      stores,
    };
  }
}
