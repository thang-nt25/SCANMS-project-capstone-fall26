import { Module } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../core/database/prisma.module';
import { WithdrawalPolicyService } from './withdrawal-policy.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [WalletsService, WithdrawalPolicyService],
  exports: [WalletsService, WithdrawalPolicyService],
})
export class WalletsModule {}
