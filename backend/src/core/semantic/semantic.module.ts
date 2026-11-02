import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SemanticEmbeddingService } from './semantic-embedding.service';

@Module({
  imports: [ConfigModule],
  providers: [SemanticEmbeddingService],
  exports: [SemanticEmbeddingService],
})
export class SemanticModule {}
