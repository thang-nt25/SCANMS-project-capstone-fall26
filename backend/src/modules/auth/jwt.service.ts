import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
  constructor(private readonly configService: ConfigService) {}

  sign(payload: any, options?: jwt.SignOptions): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('Cấu hình JWT_SECRET bị thiếu trong hệ thống!');
    }
    const expiresIn = (this.configService.get<string>('JWT_EXPIRATION') ||
      '7d') as any;

    return jwt.sign(payload, secret, {
      expiresIn,
      ...options,
    });
  }

  verify<T = any>(token: string): T {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('Cấu hình JWT_SECRET bị thiếu trong hệ thống!');
    }

    return jwt.verify(token, secret) as T;
  }
}
