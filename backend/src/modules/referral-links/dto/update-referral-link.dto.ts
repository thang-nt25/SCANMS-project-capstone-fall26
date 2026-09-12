import {
  IsOptional,
  IsString,
  MaxLength,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SocialPlatform } from '@prisma/client';

export class UpdateReferralLinkDto {
  @ApiPropertyOptional({
    description: 'Nhãn gợi nhớ cho link',
    example: 'Video review cập nhật',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  label?: string;

  @ApiPropertyOptional({
    description: 'Kênh truyền thông',
    enum: SocialPlatform,
  })
  @IsOptional()
  @IsEnum(SocialPlatform)
  channel?: SocialPlatform;

  @ApiPropertyOptional({
    description: 'Mã giảm giá riêng của KOL',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customCouponCode?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmSource?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmMedium?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmCampaign?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmContent?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm hết hạn của link',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
