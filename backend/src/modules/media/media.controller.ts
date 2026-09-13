import {
  Controller,
  Get,
  Post,
  Patch,
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
import { SubmitKolVideoDto } from './dto/submit-kol-video.dto';
import { ReviewMediaDto } from './dto/review-media.dto';
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.COLLABORATOR,
    UserRole.SHOP_MANAGER,
    UserRole.SYSTEM_MANAGER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lấy danh sách tài nguyên truyền thông (Lọc theo IMAGE, VIDEO, COPYWRITE_TEXT hoặc productId)',
  })
  async findAll(
    @Query() query: QueryMediaDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.mediaService.findAll(query, { id: userId, role });
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Chủ Shop tải lên tài nguyên media hoặc kịch bản mẫu SEO',
  })
  async create(
    @CurrentUser('id') ownerId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreateMediaDto,
  ) {
    return this.mediaService.create(ownerId, role, dto);
  }

  @Post('kol-submission')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COLLABORATOR, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'KOL nộp video review sản phẩm (Chờ Shop kiểm duyệt)',
  })
  async submitKolVideo(
    @CurrentUser('id') kolId: string,
    @Body() dto: SubmitKolVideoDto,
  ) {
    return this.mediaService.submitKolVideo(kolId, dto);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Chủ Shop hoặc Admin duyệt/từ chối/ẩn video review của KOL',
  })
  async reviewMedia(
    @CurrentUser('id') reviewerId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
    @Body() dto: ReviewMediaDto,
  ) {
    return this.mediaService.reviewMedia(reviewerId, role, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.COLLABORATOR, UserRole.SHOP_MANAGER, UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'KOL, Chủ Shop hoặc Quản trị viên xóa tài nguyên media' })
  async delete(
    @CurrentUser('id') ownerId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') id: string,
  ) {
    return this.mediaService.softDelete(ownerId, role, id);
  }
}
