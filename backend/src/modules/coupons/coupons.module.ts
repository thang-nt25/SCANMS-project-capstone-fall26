import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { CouponsService } from './coupons.service';
import {
  PublicCouponsController,
  CollaboratorCouponsController,
  StoreCouponsController,
  AdminCouponsController,
} from './coupons.controller';

@Module({
  imports: [PrismaModule],
  controllers: [
    PublicCouponsController,
    CollaboratorCouponsController,
    StoreCouponsController,
    AdminCouponsController,
  ],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
