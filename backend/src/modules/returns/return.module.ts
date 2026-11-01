import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { CloudinaryModule } from '../../core/cloudinary/cloudinary.module';
import {
  ReturnController,
  ReturnDisputeAdminController,
  ReturnGhnWebhookController,
} from './return.controller';
import { ReturnDeadlineJob } from './return-deadline.job';
import { ReturnService } from './return.service';
import { PickupGateway } from './pickup.gateway';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

import { WalletsModule } from '../wallets/wallets.module';
import { CommissionRulesModule } from '../commission-rules/commission-rules.module';

@Module({
  imports: [PrismaModule, CloudinaryModule, WalletsModule, CommissionRulesModule],
  controllers: [
    ReturnController,
    ReturnDisputeAdminController,
    ReturnGhnWebhookController,
  ],
  providers: [
    ReturnService,
    PickupGateway,
    ReturnDeadlineJob,
    RolesGuard,
    JwtAuthGuard,
  ],
  exports: [ReturnService],
})
export class ReturnModule {}
