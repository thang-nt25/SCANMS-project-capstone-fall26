import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtService {
  constructor(private readonly configService: ConfigService) {}

  sign(payload: any, options?: jwt.SignOptions): string {
    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      'scanms_super_secret_jwt_token_key_2026_fa26se032';
    const expiresIn =
      (this.configService.get<string>('JWT_EXPIRATION') || '7d') as any;

    return jwt.sign(payload, secret, {
      expiresIn,
      ...options,
    });
  }

  verify<T = any>(token: string): T {
    const secret =
      this.configService.get<string>('JWT_SECRET') ||
      'scanms_super_secret_jwt_token_key_2026_fa26se032';

    return jwt.verify(token, secret) as T;
  }
}
