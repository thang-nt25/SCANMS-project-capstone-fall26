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
  Req,
  Ip,
  HttpStatus,
  HttpCode,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { ReferralLinksService } from './referral-links.service';
import { CreateReferralLinkDto } from './dto/create-referral-link.dto';
import { UpdateReferralLinkDto } from './dto/update-referral-link.dto';
import { BlockReferralLinkDto } from './dto/block-referral-link.dto';
import { QueryReferralLinksDto } from './dto/query-referral-links.dto';

// ==========================================
// 1. COLLABORATOR CONTROLLER
// ==========================================
@ApiTags('Collaborator - Referral Links (FR-10)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COLLABORATOR)
@Controller(['collaborator/referral-links', 'referral-links'])
export class CollaboratorReferralLinksController {
  constructor(private readonly service: ReferralLinksService) {}

  @Get('products')
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm được phép tạo link tiếp thị' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm kèm mức hoa hồng dự kiến' })
  async getEligibleProducts(
    @CurrentUser('id') collaboratorId: string,
    @Query('search') search?: string,
    @Query('storeId') storeId?: string,
  ) {
    return this.service.getEligibleProducts(collaboratorId, { search, storeId });
  }

  @Get()
  @ApiOperation({ summary: 'Xem danh sách link tiếp thị của KOL' })
  @ApiResponse({ status: 200, description: 'Danh sách link kèm phân trang và số liệu click/đơn' })
  async getMyLinks(
    @CurrentUser('id') collaboratorId: string,
    @Query() query: QueryReferralLinksDto,
  ) {
    return this.service.getCollaboratorLinks(collaboratorId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết 1 link tiếp thị' })
  @ApiParam({ name: 'id', description: 'ID của link tiếp thị' })
  async getLinkDetail(
    @CurrentUser('id') collaboratorId: string,
    @Param('id') id: string,
  ) {
    return this.service.getLinkById(id, collaboratorId);
  }

  @Get([':id/qr', 'by-code/:id/qr'])
  @Roles(UserRole.COLLABORATOR, UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Xem trước hoặc tải về ảnh mã QR Code động (FR-11)' })
  @ApiParam({ name: 'id', description: 'ID hoặc shortCode của link tiếp thị' })
  async getQrCode(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Query('format') format: string = 'png',
    @Query('size') size: string = '1024',
    @Query('download') download: string = 'false',
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    const isDownload = download === 'true' || download === '1';
    const parsedFormat = (format || 'png').toLowerCase();
    const parsedSize = parseInt(size, 10) || 1024;

    const qrResult = await this.service.generateQrCode(
      id,
      user,
      {
        format: parsedFormat as any,
        size: parsedSize,
        download: isDownload,
      },
      ip,
    );

    res.setHeader('Content-Type', qrResult.contentType);
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${qrResult.filename}"`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    return res.send(qrResult.buffer);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo link tiếp thị rút gọn mới' })
  @ApiResponse({ status: 201, description: 'Link tiếp thị được tạo thành công' })
  async createLink(
    @CurrentUser('id') collaboratorId: string,
    @Body() dto: CreateReferralLinkDto,
    @Ip() ip: string,
  ) {
    return this.service.createReferralLink(collaboratorId, dto, ip);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật nhãn, kênh và UTM của link' })
  async updateLink(
    @CurrentUser('id') collaboratorId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReferralLinkDto,
    @Ip() ip: string,
  ) {
    return this.service.updateLink(id, collaboratorId, dto, ip);
  }

  @Patch([':id/status', ':id/toggle-status'])
  @ApiOperation({ summary: 'Tạm ngừng hoặc kích hoạt lại link' })
  async toggleStatus(
    @CurrentUser('id') collaboratorId: string,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.service.toggleLinkStatus(id, collaboratorId, ip);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa mềm link tiếp thị' })
  async deleteLink(
    @CurrentUser('id') collaboratorId: string,
    @Param('id') id: string,
    @Ip() ip: string,
  ) {
    return this.service.deleteLink(id, collaboratorId, ip);
  }
}

// ==========================================
// 2. STORE MANAGER CONTROLLER
// ==========================================
@ApiTags('Store Manager - Referral Links (FR-10)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHOP_MANAGER, UserRole.SYSTEM_ADMIN)
@Controller('stores/:storeId/referral-links')
export class StoreReferralLinksController {
  constructor(private readonly service: ReferralLinksService) {}

  @Get()
  @ApiOperation({ summary: 'Chủ Shop xem các link đang tiếp thị sản phẩm của Shop' })
  async getStoreLinks(
    @Param('storeId') storeId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @Query() query: QueryReferralLinksDto,
  ) {
    return this.service.getStoreReferralLinks(storeId, userId, userRole, query);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Chủ Shop khóa link tiếp thị vi phạm (bắt buộc lý do)' })
  async blockLink(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @CurrentUser('id') shopOwnerId: string,
    @Body() dto: BlockReferralLinkDto,
    @Ip() ip: string,
  ) {
    return this.service.blockLinkByShop(id, storeId, shopOwnerId, dto.reason, ip);
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Chủ Shop mở khóa link tiếp thị' })
  async unblockLink(
    @Param('storeId') storeId: string,
    @Param('id') id: string,
    @CurrentUser('id') shopOwnerId: string,
    @Ip() ip: string,
  ) {
    return this.service.unblockLinkByShop(id, storeId, shopOwnerId, ip);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Chủ Shop xem hoặc tải ảnh mã QR của link tiếp thị' })
  async getStoreQrCode(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Query('format') format: string = 'png',
    @Query('size') size: string = '1024',
    @Query('download') download: string = 'false',
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    const isDownload = download === 'true' || download === '1';
    const qrResult = await this.service.generateQrCode(
      id,
      user,
      {
        format: (format || 'png').toLowerCase() as any,
        size: parseInt(size, 10) || 1024,
        download: isDownload,
      },
      ip,
    );

    res.setHeader('Content-Type', qrResult.contentType);
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${qrResult.filename}"`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    return res.send(qrResult.buffer);
  }
}

// ==========================================
// 3. ADMIN CONTROLLER
// ==========================================
@ApiTags('System Admin - Referral Links (FR-10)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
@Controller('admin/referral-links')
export class AdminReferralLinksController {
  constructor(private readonly service: ReferralLinksService) {}

  @Get()
  @ApiOperation({ summary: 'Quản trị viên tra cứu danh sách link tiếp thị' })
  async getAdminLinks(@Query() query: QueryReferralLinksDto) {
    return this.service.getAdminReferralLinks(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Quản trị viên xem chi tiết link tiếp thị' })
  async getAdminLinkDetail(@Param('id') id: string) {
    return this.service.getAdminLinkDetail(id);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Quản trị viên tra cứu hoặc tải ảnh mã QR của link tiếp thị' })
  async getAdminQrCode(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: UserRole },
    @Query('format') format: string = 'png',
    @Query('size') size: string = '1024',
    @Query('download') download: string = 'false',
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    const isDownload = download === 'true' || download === '1';
    const qrResult = await this.service.generateQrCode(
      id,
      user,
      {
        format: (format || 'png').toLowerCase() as any,
        size: parseInt(size, 10) || 1024,
        download: isDownload,
      },
      ip,
    );

    res.setHeader('Content-Type', qrResult.contentType);
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${qrResult.filename}"`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

    return res.send(qrResult.buffer);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Quản trị viên khóa link vi phạm (bắt buộc lý do)' })
  async blockLinkByAdmin(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: BlockReferralLinkDto,
    @Ip() ip: string,
  ) {
    return this.service.blockLinkByAdmin(id, adminId, dto.reason, ip);
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Quản trị viên mở khóa link tiếp thị' })
  async unblockLinkByAdmin(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Ip() ip: string,
  ) {
    return this.service.unblockLinkByAdmin(id, adminId, ip);
  }
}
