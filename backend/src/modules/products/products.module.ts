import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PublicProductsController } from './public-products.controller';
import { PrismaModule } from '../../core/database/prisma.module';
import { ReviewEvidenceService } from './review-evidence.service';
import { ProductSemanticMatcher } from './product-semantic-matcher.service';
import { SemanticModule } from '../../core/semantic/semantic.module';
import { ProductReportsController } from './product-reports.controller';
import { ProductReportsService } from './product-reports.service';

@Module({
  imports: [PrismaModule, SemanticModule],
  controllers: [ProductsController, PublicProductsController, ProductReportsController],
  providers: [ProductsService, ReviewEvidenceService, ProductSemanticMatcher, ProductReportsService],
  exports: [ProductsService],
})
export class ProductsModule {}
