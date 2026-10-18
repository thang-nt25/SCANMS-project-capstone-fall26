import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { ReferralLinksModule } from '../referral-links/referral-links.module';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, ReferralLinksModule, OrdersModule, AuthModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
