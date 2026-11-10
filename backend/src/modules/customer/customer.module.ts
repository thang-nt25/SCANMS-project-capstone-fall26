import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerIdentityService } from './customer-identity.service';
import { PrismaModule } from '../../core/database/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, AuthModule, OrdersModule],
  controllers: [CustomerController],
  providers: [CustomerService, CustomerIdentityService],
  exports: [CustomerService],
})
export class CustomerModule {}
