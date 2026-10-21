import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderConfirmationDeliveryService } from './order-confirmation-delivery.service';
import { PrismaModule } from '../../core/database/prisma.module';
import { OrderWebhookNormalizerService } from './normalizers/order-webhook-normalizer.service';
import { ManualOrdersService } from './manual-orders.service';
import { ExcelOrderImportService } from './excel-order-import.service';
import { CouponsModule } from '../coupons/coupons.module';
import { WalletsModule } from '../wallets/wallets.module';
import { ReviewMediaService } from './review-media.service';
import { CloudinaryModule } from '../../core/cloudinary/cloudinary.module';

import { CheckoutMetricsService } from './checkout-metrics.service';

import { AuthModule } from '../auth/auth.module';
import { PayosPaymentService } from './payos-payment.service';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [
    PrismaModule,
    CouponsModule,
    WalletsModule,
    CloudinaryModule,
    AuthModule,
    ShippingModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderConfirmationDeliveryService,
    OrderWebhookNormalizerService,
    ManualOrdersService,
    ExcelOrderImportService,
    ReviewMediaService,
    CheckoutMetricsService,
    PayosPaymentService,
  ],
  exports: [OrdersService, CheckoutMetricsService, PayosPaymentService],
})
export class OrdersModule {}
