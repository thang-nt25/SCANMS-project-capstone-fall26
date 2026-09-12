import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { ReferralLinksModule } from '../referral-links/referral-links.module';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';

@Module({
  imports: [PrismaModule, ReferralLinksModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
