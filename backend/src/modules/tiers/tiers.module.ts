import { Module } from '@nestjs/common';
import { TiersService } from './tiers.service';
import { TiersController } from './tiers.controller';
import { PrismaService } from '../../core/database/prisma.service';

@Module({
  controllers: [TiersController],
  providers: [TiersService, PrismaService],
  exports: [TiersService],
})
export class TiersModule {}
