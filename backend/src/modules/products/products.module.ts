import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PublicProductsController } from './public-products.controller';
import { PrismaModule } from '../../core/database/prisma.module';
import { ProductSemanticMatcher } from './product-semantic-matcher.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, PublicProductsController],
  providers: [ProductsService, ProductSemanticMatcher],
  exports: [ProductsService],
})
export class ProductsModule {}
