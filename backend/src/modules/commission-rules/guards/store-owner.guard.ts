import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtService } from '../../auth/jwt.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/database/prisma.service';

@Injectable()
export class StoreOwnerGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let user = request.user;

    // 1. Trích xuất và xác thực người dùng qua JWT Bearer token nếu chưa có trong request
    if (!user) {
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

      const foundUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!foundUser) {
        throw new UnauthorizedException('Người dùng không tồn tại');
      }

      user = foundUser;
      request.user = user;
    }

    // 2. Kiểm tra trạng thái tài khoản
    if (user.isDeleted || user.isActive === false) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa hoặc đã bị xóa khỏi hệ thống',
      );
    }

    // 3. Kiểm tra cửa hàng
    const storeId = request.params.storeId;
    if (!storeId) {
      throw new NotFoundException('Thiếu định danh cửa hàng (storeId)');
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store || store.isDeleted) {
      throw new NotFoundException('Cửa hàng không tồn tại hoặc đã bị xóa');
    }

    // 4. Phân quyền chặt chẽ (RBAC) theo mục 8 đặc tả:
    // SYSTEM_ADMIN chỉ có quyền xem (Read-only: GET), tuyệt đối không được ghi/sửa/xóa chính sách của Shop
    if (user.role === UserRole.SYSTEM_ADMIN) {
      if (request.method === 'GET') {
        return true;
      }
      throw new ForbiddenException(
        'SYSTEM_ADMIN chỉ có quyền xem (Read-only), không được phép chỉnh sửa hoặc cấu hình mốc thưởng của cửa hàng',
      );
    }

    if (user.role !== UserRole.SHOP_MANAGER) {
      throw new ForbiddenException(
        'Chỉ chủ cửa hàng (SHOP_MANAGER) mới có quyền quản lý mốc thưởng doanh số',
      );
    }

    // SHOP_MANAGER chỉ được quản lý Shop mà mình sở hữu
    if (store.ownerId !== user.id) {
      throw new ForbiddenException(
        'Bạn không có quyền quản lý cấu hình mốc thưởng của cửa hàng này',
      );
    }

    return true;
  }
}
