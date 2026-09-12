import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './core/database/prisma.module';
import { CloudinaryModule } from './core/cloudinary/cloudinary.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CacheModule } from './core/cache/cache.module';
import { CommissionRulesModule } from './modules/commission-rules/commission-rules.module';
import { ReferralLinksModule } from './modules/referral-links/referral-links.module';
import { CheckoutModule } from './modules/checkout/checkout.module';

// Dev Modules (FR-01 ~ FR-08 & FR-25 ~ FR-32)
import { KycModule } from './modules/kyc/kyc.module';
import { SocialChannelsModule } from './modules/social-channels/social-channels.module';
import { TiersModule } from './modules/tiers/tiers.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { MediaModule } from './modules/media/media.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CouponsModule } from './modules/coupons/coupons.module';
// Quy's modules (FR-25 ~ FR-32)
import { ChatModule } from './modules/chat/chat.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { SamplesModule } from './modules/samples/samples.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { JwtStrategy } from './common/strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CacheModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
        if (!secret || !secret.trim()) {
          throw new Error('FATAL: JWT_SECRET must be configured');
        }
        return {
          secret,
          signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d' },
        };
      },
    }),
    PrismaModule,
    CloudinaryModule,
    UsersModule,
    AuthModule,
    CommissionRulesModule,
    ReferralLinksModule,
    CheckoutModule,
    KycModule,
    SocialChannelsModule,
    TiersModule,
    StoresModule,
    ProductsModule,
    MediaModule,
    OrdersModule,
    CouponsModule,
    // Quy's modules
    ChatModule,
    SamplesModule,
    CampaignsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})
export class AppModule {}
