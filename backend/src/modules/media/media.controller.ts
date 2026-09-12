import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Media Hub Assets')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({
    summary:
      'Lấy danh sách tài nguyên truyền thông (Lọc theo IMAGE, VIDEO, COPYWRITE_TEXT hoặc productId)',
  })
  async findAll(@Query() query: QueryMediaDto) {
    return this.mediaService.findAll(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Chủ Shop tải lên tài nguyên media hoặc kịch bản mẫu SEO',
  })
  async create(
    @CurrentUser('id') ownerId: string,
    @Body() dto: CreateMediaDto,
  ) {
    return this.mediaService.create(ownerId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chủ Shop xóa tài nguyên media' })
  async delete(@CurrentUser('id') ownerId: string, @Param('id') id: string) {
    return this.mediaService.softDelete(ownerId, id);
  }
}
