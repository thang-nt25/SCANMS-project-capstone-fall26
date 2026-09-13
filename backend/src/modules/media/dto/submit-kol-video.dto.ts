import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitKolVideoDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID sản phẩm review',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp productId' })
  productId: string;

  @ApiProperty({
    example: 'Review trải nghiệm Serum Vitamin C sau 14 ngày sử dụng',
    description: 'Tiêu đề video review',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề video' })
  title: string;

  @ApiProperty({
    example: 'https://www.tiktok.com/@kol/video/1234567890',
    description: 'Đường dẫn video review (phải thuộc allowlist nền tảng hợp lệ)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng cung cấp URL video' })
  videoUrl: string;

  @ApiPropertyOptional({
    example: 'https://cdn.scanms.vn/posters/poster-1.jpg',
    description: 'Ảnh bìa poster của video (tùy chọn)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  posterUrl?: string;

  @ApiPropertyOptional({
    example: 'Video chia sẻ cảm nhận thực tế về chất lượng kem chống nắng',
    description: 'Mô tả hoặc kịch bản/phụ đề video',
  })
  @IsOptional()
  @IsString()
  caption?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID chiến dịch nếu video nộp cho một chiến dịch cụ thể',
  })
  @IsOptional()
  @IsUUID('4', { message: 'campaignId phải là định dạng UUID hợp lệ' })
  campaignId?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Yêu cầu kiểm tra quyền tham gia chiến dịch (mặc định false cho video thông thường)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'requiresCampaignParticipation phải là kiểu boolean' })
  requiresCampaignParticipation?: boolean;
}

