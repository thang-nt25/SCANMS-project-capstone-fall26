import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { MailService } from './mail.service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { PrismaModule } from '../../core/database/prisma.module';
import { PrismaService } from '../../core/database/prisma.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'scanms_super_secret_jwt_token_key_2026_fa26se032',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') || '7d') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, MailService, JwtStrategy, PrismaService],
  exports: [AuthService, MailService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
