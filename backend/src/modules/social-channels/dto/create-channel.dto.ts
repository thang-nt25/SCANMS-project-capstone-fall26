import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SocialPlatform } from '@prisma/client';

export class CreateChannelDto {
  @ApiProperty({
    enum: SocialPlatform,
    example: SocialPlatform.TIKTOK,
    description:
      'Nền tảng mạng xã hội: TIKTOK, YOUTUBE, FACEBOOK, INSTAGRAM, THREADS...',
  })
  @IsEnum(SocialPlatform, { message: 'Nền tảng mạng xã hội không hợp lệ' })
  @IsNotEmpty({ message: 'Vui lòng chọn nền tảng mạng xã hội' })
  platformName: SocialPlatform;

  @ApiPropertyOptional({
    example: '@thang_techreview',
    description: 'Tên hiển thị hoặc Handle kênh',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  channelName?: string;

  @ApiProperty({
    example: 'https://tiktok.com/@thang_techreview',
    description: 'URL liên kết đến kênh',
  })
  @IsString({ message: 'Đường dẫn liên kết kênh không hợp lệ' })
  @IsUrl({ protocols: ['https'], require_protocol: true }, { message: 'Nhập liên kết kênh HTTPS hợp lệ' })
  @MaxLength(2000)
  @IsNotEmpty({ message: 'Vui lòng nhập đường dẫn kênh mạng xã hội' })
  channelUrl: string;

  @ApiPropertyOptional({
    example: 85000,
    description: 'Số lượng follower hiện tại',
  })
  @IsOptional()
  @IsInt({ message: 'Số lượng follower phải là số nguyên' })
  @Min(0, { message: 'Số lượng follower không được âm' })
  @Max(2147483647)
  followerCount?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Đặt làm kênh đại diện chính',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
