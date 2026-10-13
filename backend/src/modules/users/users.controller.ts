import { Controller, Get, Param, ParseUUIDPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách người dùng đang hoạt động',
  })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
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
  @ApiOperation({ summary: 'Lấy thông tin người dùng theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết người dùng' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }
}
