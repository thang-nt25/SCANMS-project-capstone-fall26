import {
  IsUUID,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialPlatform } from '@prisma/client';

export class CreateReferralLinkDto {
  @ApiProperty({
    description: 'ID của sản phẩm cần tiếp thị (UUID)',
    example: 'b54934c3-0762-40b4-868e-e7f66dac1684',
  })
  @IsUUID('4', { message: 'productId phải là định dạng UUID v4 hợp lệ' })
  productId: string;

  @ApiPropertyOptional({
    description: 'ID chiến dịch nếu có',
    example: 'd9b3a0c5-5d9c-4f5b-9d4a-3b5f6a7b8c9d',
  })
  @IsOptional()
  @IsUUID('4', { message: 'campaignId phải là định dạng UUID v4 hợp lệ' })
  campaignId?: string;

  @ApiProperty({
    description: 'Nhãn gợi nhớ cho link (bắt buộc, VD: Video review TikTok tháng 9)',
    example: 'Video review TikTok tháng 9',
    maxLength: 150,
  })
  @IsNotEmpty({ message: 'Nhãn gợi nhớ (label) là bắt buộc khi chọn mô hình nhiều link' })
  @IsString({ message: 'label phải là chuỗi ký tự' })
  @MaxLength(150, { message: 'label không được vượt quá 150 ký tự' })
  label: string;

  @ApiProperty({
    description: 'Kênh truyền thông quảng bá (bắt buộc)',
    enum: SocialPlatform,
    example: SocialPlatform.TIKTOK,
  })
  @IsNotEmpty({ message: 'Kênh quảng bá (channel) là bắt buộc' })
  @IsEnum(SocialPlatform, { message: 'channel không thuộc danh sách nền tảng hợp lệ' })
  channel: SocialPlatform;

  @ApiPropertyOptional({
    description: 'Mã giảm giá riêng của KOL gắn kèm link',
    example: 'KOLTHANG10',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  customCouponCode?: string;

  @ApiPropertyOptional({
    description: 'Nguồn traffic UTM (utm_source)',
    example: 'tiktok',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmSource?: string;

  @ApiPropertyOptional({
    description: 'Hình thức traffic UTM (utm_medium)',
    example: 'creator',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmMedium?: string;

  @ApiPropertyOptional({
    description: 'Chiến dịch UTM (utm_campaign)',
    example: 'sunscreen_sep',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmCampaign?: string;

  @ApiPropertyOptional({
    description: 'Nội dung UTM (utm_content)',
    example: 'review_01',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  utmContent?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm hết hạn của link (ISO 8601)',
    example: '2026-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'expiresAt phải là chuỗi ngày giờ ISO 8601' })
  expiresAt?: string;
}
