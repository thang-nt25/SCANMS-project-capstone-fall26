import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../../core/database/prisma.module';
import { OrderWebhookNormalizerService } from './normalizers/order-webhook-normalizer.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderWebhookNormalizerService],
  exports: [OrdersService],
})
export class OrdersModule {}
