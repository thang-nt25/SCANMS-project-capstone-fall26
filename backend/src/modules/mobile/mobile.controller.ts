import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { MobileService } from './mobile.service';

@ApiTags('Mobile integration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('mobile')
export class MobileController {
  constructor(private readonly mobile: MobileService) {}

  @Get('bootstrap')
  @ApiOperation({
    summary: 'Phiên mobile, role và gian hàng được phân công hiện hành',
  })
  bootstrap(@CurrentUser() actor: AuthenticatedUser) {
    return this.mobile.bootstrap(actor);
  }
}
