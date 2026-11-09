import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { PrismaModule } from '../../core/database/prisma.module';
import { OperationsQueueService } from './operations-queue.service';
import { OperationsQueueController } from './operations-queue.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    DashboardController,
    LeaderboardController,
    OperationsQueueController,
  ],
  providers: [DashboardService, LeaderboardService, OperationsQueueService],
  exports: [DashboardService, LeaderboardService],
})
export class DashboardModule {}
