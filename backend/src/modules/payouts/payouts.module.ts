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
import { PayoutApprovalController } from './payout-approval.controller';
import { AdminPayoutsController } from './admin-payouts.controller';
import { FinanceReportController } from './finance-report.controller';
import { FinanceReportService } from './finance-report.service';
import { PayoutEmailScheduler } from './payout-email.scheduler';
import { AuthModule } from '../auth/auth.module';
import { CustomerWithdrawalsService } from './customer-withdrawals.service';
import { CustomerWithdrawalsController, AdminCustomerWithdrawalsController } from './customer-withdrawals.controller';

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
    AuthModule,
    CloudinaryModule,
    PayoutSettingsModule,
    MulterModule.registerAsync({
      imports: [PayoutSettingsModule],
      inject: [PayoutSettingsService],
      useFactory: (settings: PayoutSettingsService) => ({
        limits: {
          fileSize: Math.min(settings.maxBillBytes, 5 * 1024 * 1024),
          files: 1,
          fields: 4,
          fieldSize: 2048,
        },
      }),
    }),
  ],
  controllers: [
    CustomerWithdrawalsController,
    AdminCustomerWithdrawalsController,
    PayoutsController,
    MerchantPayoutsController,
    AdminPayoutsController,
    FinanceReportController,
  ],
  providers: [
    CustomerWithdrawalsService,
    PayoutsService,
    FinanceReportService,
    PayoutEmailScheduler,
    PayoutTaxService,
    PayoutBillService,
    MerchantPayoutsService,
    PayoutBatchesService,
  ],
})
export class PayoutsModule {}
