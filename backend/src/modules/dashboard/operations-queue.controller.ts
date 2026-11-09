import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OperationsQueueService } from './operations-queue.service';

@ApiTags('Dashboard operations')
@ApiBearerAuth()
@Controller('dashboard/operations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
export class OperationsQueueController {
  constructor(private readonly queue: OperationsQueueService) {}

  @Get('queue-summary')
  @ApiOperation({ summary: 'Số hồ sơ chờ xử lý của nhân sự vận hành sàn' })
  summary(@CurrentUser('role') role: UserRole) {
    return this.queue.summary(role);
  }
}
