import {
  Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe,
  ParseUUIDPipe, Patch, Post, Query, Res, UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductReportReason, ProductReportStatus, UserRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MAX_PRODUCT_REPORT_VIDEO_BYTES, ProductReportsService } from './product-reports.service';

class SubmitProductReportDto {
  @IsEnum(ProductReportReason)
  reason: ProductReportReason;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

const decisions = {
  ESCALATED: ProductReportStatus.ESCALATED,
  DISMISSED: ProductReportStatus.DISMISSED,
  CORRECTION_REQUESTED: ProductReportStatus.CORRECTION_REQUESTED,
  HIDDEN: ProductReportStatus.HIDDEN,
};

class ResolveProductReportDto {
  @IsEnum(decisions)
  decision: Exclude<ProductReportStatus, 'PENDING'>;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  note: string;
}

@Controller('product-reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductReportsController {
  constructor(private readonly reports: ProductReportsService) {}

  @Post('products/:productId')
  @Roles(UserRole.CUSTOMER, UserRole.COLLABORATOR)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'evidence', maxCount: 1 }, { name: 'evidenceVideo', maxCount: 1 }], {
    limits: { files: 2, fileSize: MAX_PRODUCT_REPORT_VIDEO_BYTES, fields: 3, fieldSize: 8 * 1024 },
  }))
  submit(
    @CurrentUser('id') userId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: SubmitProductReportDto,
    @UploadedFiles() attachments?: { evidence?: Express.Multer.File[]; evidenceVideo?: Express.Multer.File[] },
  ) {
    return this.reports.submit(userId, productId, dto, attachments?.evidence?.[0], attachments?.evidenceVideo?.[0]);
  }

  @Get()
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  list(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('report', new ParseUUIDPipe({ optional: true })) report?: string,
    @Query('product', new ParseUUIDPipe({ optional: true })) product?: string,
  ) {
    return this.reports.list(status, page, report, product);
  }

  @Get(':reportId/evidence')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  async evidence(@Param('reportId', ParseUUIDPipe) id: string, @Res() response: Response) {
    const { evidence, evidenceMime } = await this.reports.evidence(id);
    response.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    response.type(evidenceMime).send(evidence);
  }

  @Get(':reportId/evidence/video')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  async videoEvidence(@Param('reportId', ParseUUIDPipe) id: string, @Res() response: Response) {
    const video = await this.reports.videoEvidence(id);
    response.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    response.type('video/mp4').send(video);
  }

  @Patch(':reportId')
  @Roles(UserRole.SYSTEM_MANAGER, UserRole.SYSTEM_ADMIN)
  resolve(
    @Param('reportId', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: ResolveProductReportDto,
  ) {
    return this.reports.resolve(id, userId, role, dto.decision, dto.note);
  }
}
