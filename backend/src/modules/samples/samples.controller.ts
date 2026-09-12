import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SampleRequestStatus } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SamplesService } from './samples.service';
import {
  CreateSampleRequestDto,
  ShipSampleRequestDto,
} from './dto/sample-request.dto';

@ApiTags('Sample Requests (FR-26)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sample-requests')
export class SamplesController {
  constructor(private readonly samplesService: SamplesService) {}

  // ---- KOL endpoints ----

  @Post()
  @Roles('COLLABORATOR')
  @ApiOperation({ summary: '[KOL] Tạo yêu cầu xin sản phẩm mẫu dùng thử' })
  createRequest(@Body() dto: CreateSampleRequestDto, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.createRequest(userId, dto);
  }

  @Get('my')
  @Roles('COLLABORATOR')
  @ApiOperation({ summary: '[KOL] Lấy danh sách yêu cầu xin mẫu của tôi' })
  getMyRequests(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.getMyRequests(userId);
  }

  // ---- Shop endpoints ----

  @Get('shop')
  @Roles('SHOP_MANAGER')
  @ApiOperation({ summary: '[Shop] Lấy tất cả yêu cầu xin mẫu của cửa hàng' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SampleRequestStatus,
    description: 'Lọc theo trạng thái',
  })
  getShopRequests(
    @Request() req: any,
    @Query('status') status?: SampleRequestStatus,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.getRequestsForShop(userId, status);
  }

  @Get('shop/stats')
  @Roles('SHOP_MANAGER')
  @ApiOperation({ summary: '[Shop] Thống kê số lượng yêu cầu theo trạng thái' })
  getShopStats(@Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.getShopStats(userId);
  }

  @Patch(':id/approve')
  @Roles('SHOP_MANAGER')
  @ApiOperation({ summary: '[Shop] Duyệt yêu cầu xin mẫu' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  approveRequest(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.approveRequest(id, userId);
  }

  @Patch(':id/reject')
  @Roles('SHOP_MANAGER')
  @ApiOperation({ summary: '[Shop] Từ chối yêu cầu xin mẫu' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  rejectRequest(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.rejectRequest(id, userId);
  }

  @Patch(':id/ship')
  @Roles('SHOP_MANAGER')
  @ApiOperation({
    summary: '[Shop] Nhập mã vận đơn GHTK/GHN và chuyển trạng thái SHIPPED',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  shipRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShipSampleRequestDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.shipRequest(id, userId, dto);
  }

  // ---- Shared ----

  @Get(':id')
  @ApiOperation({ summary: '[KOL/Shop] Xem chi tiết một yêu cầu' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  getById(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    const userId = req.user?.id || req.user?.sub;
    return this.samplesService.getRequestById(id, userId, req.user?.role);
  }
}
