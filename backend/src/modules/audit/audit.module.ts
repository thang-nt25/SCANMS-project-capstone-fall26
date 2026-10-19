import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../core/database/prisma.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  imports: [PrismaModule],
  controllers: [AuditController],
  providers: [AuditService, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
  exports: [AuditService],
})
export class AuditModule {}
