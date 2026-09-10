import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController } from './kyc.controller';
import { PrismaService } from '../../core/database/prisma.service';

@Module({
  controllers: [KycController],
  providers: [KycService, PrismaService],
  exports: [KycService],
})
export class KycModule {}
