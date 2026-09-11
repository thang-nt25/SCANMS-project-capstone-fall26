import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    CacheModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'scanms-secret-key',
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any },
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
    ChatModule,
    SamplesModule,
    CampaignsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})
export class AppModule {}
