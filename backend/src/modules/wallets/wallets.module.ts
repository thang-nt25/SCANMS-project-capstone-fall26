import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../core/database/prisma.module';
import { WithdrawalPolicyService } from './withdrawal-policy.service';
import { WalletSummaryService } from './wallet-summary.service';
import { WalletsController } from './wallets.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [WalletsController],
  providers: [WalletsService, WithdrawalPolicyService, WalletSummaryService],
  exports: [WalletsService, WithdrawalPolicyService],
})
export class WalletsModule {}
