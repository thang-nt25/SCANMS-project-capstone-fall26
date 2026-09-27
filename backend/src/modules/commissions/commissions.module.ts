import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { CommissionCalculatorService } from './commission-calculator.service';
import { CommissionSchedulerService } from './commission-scheduler.service';
import { CommissionsService } from './commissions.service';
import { CommissionsController } from './commissions.controller';

@Module({
  imports: [PrismaModule, WalletsModule],
  controllers: [CommissionsController],
  providers: [
    CommissionCalculatorService,
    CommissionsService,
    CommissionSchedulerService,
  ],
  exports: [CommissionsService],
})
export class CommissionsModule {}
