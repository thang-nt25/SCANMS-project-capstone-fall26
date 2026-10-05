import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/database/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { WalletsModule } from '../wallets/wallets.module';
import { LiveSessionsController } from './live-sessions.controller';
import { LiveSessionsService } from './live-sessions.service';

@Module({
  imports: [PrismaModule, OrdersModule, WalletsModule],
  controllers: [LiveSessionsController],
  providers: [LiveSessionsService],
  exports: [LiveSessionsService],
})
export class LiveSessionsModule {}
