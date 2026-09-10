import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '../../modules/auth/jwt.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException(
        'Yêu cầu xác thực tài khoản qua Bearer token',
      );
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException(
        'Định dạng token không hợp lệ (phải là Bearer <token>)',
      );
    }

    const token = parts[1];
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Payload của token không hợp lệ');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại trong hệ thống');
    }

    if (user.isDeleted || !user.isActive) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa hoặc đã bị xóa khỏi hệ thống',
      );
    }

    request.user = user;
    return true;
  }
}
