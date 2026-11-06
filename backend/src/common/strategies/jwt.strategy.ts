import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface CachedUser {
  user: any;
  cachedAt: number;
}

const userCache = new Map<string, CachedUser>();
const USER_CACHE_TTL_MS = 30_000; // 30s in-memory TTL to eliminate redundant Supabase RTTs on parallel requests

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret =
      configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
    if (!secret || !secret.trim()) {
      throw new Error('FATAL: JWT_SECRET must be configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  static invalidateUser(userId: string) {
    userCache.delete(userId);
  }

  static clearCache() {
    userCache.clear();
  }

  async validate(payload: JwtPayload) {
    const now = Date.now();
    const cached = userCache.get(payload.sub);
    if (cached && now - cached.cachedAt < USER_CACHE_TTL_MS) {
      return cached.user;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        storeId: true,
        phoneNumber: true,
        isActive: true,
        isDeleted: true,
      },
    });

    if (!user || !user.isActive || user.isDeleted) {
      userCache.delete(payload.sub);
      throw new UnauthorizedException(
        'Tài khoản không tồn tại hoặc đã bị khóa',
      );
    }

    if (userCache.size > 2000) {
      const firstKey = userCache.keys().next().value;
      if (firstKey) userCache.delete(firstKey);
    }
    userCache.set(payload.sub, { user, cachedAt: now });

    return user;
  }
}
