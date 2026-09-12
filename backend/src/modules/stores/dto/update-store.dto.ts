import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreDto {
  @ApiPropertyOptional({
    example: 'Tech Store Vietnam',
    description: 'Tên gian hàng',
  })
  @IsOptional()
  @IsString({ message: 'Tên cửa hàng không hợp lệ' })
  name?: string;

  @ApiPropertyOptional({
    example:
      'Chuyên cung cấp thiết bị âm thanh và phụ kiện công nghệ chính hãng',
    description: 'Mô tả cửa hàng',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
    description: 'URL ảnh logo cửa hàng',
  })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: 'https://techstore.vn',
    description: 'Website chính thức',
  })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Tỷ lệ % hoa hồng mặc định toàn shop',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tỷ lệ hoa hồng mặc định phải là số' })
  @Min(0, { message: 'Hoa hồng tối thiểu là 0%' })
  @Max(100, { message: 'Hoa hồng tối đa là 100%' })
  defaultCommissionRate?: number;

  @ApiPropertyOptional({
    example: 30,
    description: 'Thời hạn lưu cookie Last-Click (ngày)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Thời gian lưu cookie phải là số ngày nguyên' })
  @Min(1, { message: 'Thời gian lưu cookie tối thiểu là 1 ngày' })
  @Max(365, { message: 'Thời gian lưu cookie tối đa là 365 ngày' })
  attributionWindowDays?: number;

  @ApiPropertyOptional({
    example: 200000,
    description: 'Hạn mức rút tối thiểu (VNĐ)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Hạn mức rút tiền tối thiểu phải là số' })
  @Min(50000, { message: 'Hạn mức rút tối thiểu không được dưới 50.000 VNĐ' })
  minPayoutAmount?: number;
}
