import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../../core/database/prisma.module';
import { OrderWebhookNormalizerService } from './normalizers/order-webhook-normalizer.service';
import { ManualOrdersService } from './manual-orders.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderWebhookNormalizerService,
    ManualOrdersService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
