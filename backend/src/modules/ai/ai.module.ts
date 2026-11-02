import { Module } from '@nestjs/common';
import { AiRecommendationController } from './ai-recommendation.controller';
import { AiRecommendationService } from './ai-recommendation.service';
import { AiFraudController } from './ai-fraud.controller';
import { AiFraudService } from './ai-fraud.service';
import { PrismaModule } from '../../core/database/prisma.module';
import { SemanticModule } from '../../core/semantic/semantic.module';

@Module({
  imports: [PrismaModule, SemanticModule],
  controllers: [AiRecommendationController, AiFraudController],
  providers: [AiRecommendationService, AiFraudService],
  exports: [AiRecommendationService, AiFraudService],
})
export class AiModule {}
