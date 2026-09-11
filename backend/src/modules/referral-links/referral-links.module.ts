import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReferralLinksService } from './referral-links.service';
import {
  CollaboratorReferralLinksController,
  StoreReferralLinksController,
  AdminReferralLinksController,
} from './referral-links.controller';
import { RedirectController } from './redirect.controller';

import { ClickQueueService } from './click-queue.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    CollaboratorReferralLinksController,
    StoreReferralLinksController,
    AdminReferralLinksController,
    RedirectController,
  ],
  providers: [ReferralLinksService, ClickQueueService, JwtAuthGuard],
  exports: [ReferralLinksService, ClickQueueService],
})
export class ReferralLinksModule {}
