import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';
import { ReferralLinksModule } from '../referral-links/referral-links.module';
import { AffiliateDealsController } from './affiliate-deals.controller';
import { AffiliateDealsService } from './affiliate-deals.service';

@Module({
  imports: [PrismaModule, AuthModule, ChatModule, ReferralLinksModule],
  controllers: [AffiliateDealsController],
  providers: [AffiliateDealsService],
  exports: [AffiliateDealsService],
})
export class AffiliateDealsModule {}
