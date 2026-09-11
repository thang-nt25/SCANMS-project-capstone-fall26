import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiPropertyOptional({ description: 'Cửa hàng nhận sản phẩm khi Chủ Shop quản lý nhiều gian hàng' })
  @IsOptional()
  @IsUUID('4', { message: 'Mã cửa hàng không hợp lệ' })
  storeId?: string;

  @ApiProperty({ example: 'TECH-ANC-01', description: 'Mã SKU duy nhất của sản phẩm' })
  @IsString({ message: 'Mã SKU không hợp lệ' })
  @IsNotEmpty({ message: 'Mã SKU không được để trống' })
  sku: string;

  @ApiProperty({ example: 'Tai nghe Bluetooth Chống Ồn ANC Pro X', description: 'Tên sản phẩm' })
  @IsString({ message: 'Tên sản phẩm không hợp lệ' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  title: string;

  @ApiPropertyOptional({ example: 'Điện tử', description: 'Tên danh mục sản phẩm' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional({
    example: 'Chống ồn chủ động Hybrid ANC 45dB, Pin 40 giờ liên tục',
    description: 'Mô tả chi tiết sản phẩm',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    description: 'URL ảnh đại diện sản phẩm',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 499000, description: 'Giá bán thực tế (VNĐ)' })
  @IsNumber({}, { message: 'Giá bán phải là một số' })
  @Min(0, { message: 'Giá bán không được âm' })
  price: number;

  @ApiPropertyOptional({ example: 650000, description: 'Giá gốc niêm yết (VNĐ)' })
  @IsOptional()
  @IsNumber({}, { message: 'Giá gốc niêm yết phải là một số' })
  @Min(0, { message: 'Giá gốc không được âm' })
  originalPrice?: number;

  @ApiPropertyOptional({ example: 12.5, description: 'Tỷ lệ % hoa hồng riêng cho sản phẩm này' })
  @IsOptional()
  @IsNumber({}, { message: 'Tỷ lệ hoa hồng riêng (%) phải là số' })
  @Min(0, { message: 'Hoa hồng tối thiểu là 0%' })
  @Max(100, { message: 'Hoa hồng tối đa là 100%' })
  customCommissionRate?: number;

  @ApiPropertyOptional({ example: 100, description: 'Số lượng tồn kho' })
  @IsOptional()
  @IsNumber({}, { message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Tồn kho không được âm' })
  stockQuantity?: number = 0;
}
