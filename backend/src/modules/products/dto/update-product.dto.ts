import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Giá bán phải là một số' })
  @Min(0, { message: 'Giá bán không được âm' })
  price?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Giá gốc niêm yết phải là một số' })
  @Min(0, { message: 'Giá gốc không được âm' })
  originalPrice?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Tỷ lệ hoa hồng riêng (%) phải là số' })
  @Min(0, { message: 'Hoa hồng tối thiểu là 0%' })
  @Max(100, { message: 'Hoa hồng tối đa là 100%' })
  customCommissionRate?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Tồn kho không được âm' })
  stockQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
