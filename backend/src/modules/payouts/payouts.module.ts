import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { PayoutTaxService } from './payout-tax.service';

@Module({
  imports: [PrismaModule, WalletsModule],
  controllers: [PayoutsController],
  providers: [PayoutsService, PayoutTaxService],
})
export class PayoutsModule {}
