import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { PrismaModule } from '../../core/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController, LeaderboardController],
  providers: [DashboardService, LeaderboardService],
  exports: [DashboardService, LeaderboardService],
})
export class DashboardModule {}
