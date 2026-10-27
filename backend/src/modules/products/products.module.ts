import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PublicProductsController } from './public-products.controller';
import { PrismaModule } from '../../core/database/prisma.module';
import { ReviewEvidenceService } from './review-evidence.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService, ReviewEvidenceService],
  exports: [ProductsService],
})
export class ProductsModule {}
