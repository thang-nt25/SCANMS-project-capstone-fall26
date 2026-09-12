import {
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { AccessMethod } from '@prisma/client';

export class QueryTrackingEventsDto {
  @ApiPropertyOptional({ description: 'Lọc theo ID cửa hàng' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID liên kết tiếp thị' })
  @IsOptional()
  @IsUUID()
  referralLinkId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo ID KOL / CTV' })
  @IsOptional()
  @IsUUID()
  collaboratorId?: string;

  @ApiPropertyOptional({ description: 'Lọc click hợp lệ hay vi phạm' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isValid?: boolean;

  @ApiPropertyOptional({ description: 'Phương thức truy cập: LINK hoặc QR' })
  @IsOptional()
  @IsEnum(AccessMethod)
  accessMethod?: AccessMethod;

  @ApiPropertyOptional({ description: 'Từ ngày (ISO)' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (ISO)' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: 'Trang hiện tại (Mặc định 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi / trang (Mặc định 20)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AttributionAdjustmentDto {
  @ApiProperty({ description: 'ID của KOL mới được gán cho đơn hàng' })
  @IsUUID()
  @IsNotEmpty()
  newCollaboratorId: string;

  @ApiProperty({ description: 'Lý do điều chỉnh (Bắt buộc cho audit & giải quyết khiếu nại)' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Đường dẫn bằng chứng đối soát (nếu có)' })
  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}
