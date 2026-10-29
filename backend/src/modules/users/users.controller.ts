import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  CreateInternalStaffDto,
  ToggleUserStatusDto,
} from './dto/create-internal-staff.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách người dùng đang hoạt động',
  })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('staff')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SYSTEM_MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách nhân sự nội bộ (Shop Manager, System Manager, Admin)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách nhân sự nội bộ và Cửa hàng phụ trách',
  })
  async findStaff() {
    return this.usersService.findStaff();
  }

  @Post('internal-staff')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo tài khoản nhân sự nội bộ (Shop Manager hoặc System Manager)',
  })
  @ApiResponse({
    status: 201,
    description: 'Tài khoản nhân sự nội bộ được tạo thành công',
  })
  async createInternalStaff(@Body() dto: CreateInternalStaffDto) {
    return this.usersService.createInternalStaff(dto);
  }

  @Patch(':id/toggle-status')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khóa hoặc mở khóa tài khoản người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái tài khoản đã được cập nhật',
  })
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleUserStatusDto,
  ) {
    return this.usersService.toggleUserStatus(id, dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin người dùng hiện tại' })
  @ApiResponse({
    status: 200,
    description: 'Thông tin tài khoản đang đăng nhập',
  })
  async getMe(@CurrentUser('id') currentUserId?: string, @Req() req?: any) {
    const userId = currentUserId || req?.user?.sub || req?.user?.id;
    return this.usersService.getMe(userId);
  }

  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin người dùng theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết người dùng' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }
}
