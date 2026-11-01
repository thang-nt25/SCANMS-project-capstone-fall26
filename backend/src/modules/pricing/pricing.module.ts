import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { ProductsModule } from '../products/products.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
