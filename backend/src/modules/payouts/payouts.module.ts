import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { WalletsModule } from '../wallets/wallets.module';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { PayoutTaxService } from './payout-tax.service';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from '../../core/cloudinary/cloudinary.module';
import { PayoutSettingsService } from './payout-settings.service';
import { PayoutBillService } from './payout-bill.service';
import { MerchantPayoutsService } from './merchant-payouts.service';
import { PayoutBatchesService } from './payout-batches.service';
import { MerchantPayoutsController } from './merchant-payouts.controller';

@Module({
  imports: [ConfigModule],
  providers: [PayoutSettingsService],
  exports: [PayoutSettingsService],
})
class PayoutSettingsModule {}

@Module({
  imports: [
    PrismaModule,
    WalletsModule,
    CloudinaryModule,
    PayoutSettingsModule,
    MulterModule.registerAsync({
      imports: [PayoutSettingsModule],
      inject: [PayoutSettingsService],
      useFactory: (settings: PayoutSettingsService) => ({
        limits: {
          fileSize: settings.maxBillBytes,
          files: 1,
          fields: 1,
          fieldSize: 1024,
        },
      }),
    }),
  ],
  controllers: [PayoutsController, MerchantPayoutsController],
  providers: [
    PayoutsService,
    PayoutTaxService,
    PayoutBillService,
    MerchantPayoutsService,
    PayoutBatchesService,
  ],
})
export class PayoutsModule {}
