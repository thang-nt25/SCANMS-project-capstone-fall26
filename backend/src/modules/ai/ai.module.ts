import { Module } from '@nestjs/common';
import { AiRecommendationController } from './ai-recommendation.controller';
import { AiRecommendationService } from './ai-recommendation.service';
import { PrismaModule } from '../../core/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AiRecommendationController],
  providers: [AiRecommendationService],
  exports: [AiRecommendationService],
})
export class AiModule {}
