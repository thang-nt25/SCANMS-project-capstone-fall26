import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../../core/database/prisma.module';
import { OrderWebhookNormalizerService } from './normalizers/order-webhook-normalizer.service';
import { ManualOrdersService } from './manual-orders.service';
import { ExcelOrderImportService } from './excel-order-import.service';
import { CouponsModule } from '../coupons/coupons.module';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [PrismaModule, CouponsModule, WalletsModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderWebhookNormalizerService,
    ManualOrdersService,
    ExcelOrderImportService,
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
