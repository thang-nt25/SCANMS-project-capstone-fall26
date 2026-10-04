import { Module } from '@nestjs/common';
import { GhnService } from './ghn.service';
import { ShippingController } from './shipping.controller';
import { PrismaModule } from '../../core/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShippingController],
  providers: [GhnService],
  exports: [GhnService],
})
export class ShippingModule {}
