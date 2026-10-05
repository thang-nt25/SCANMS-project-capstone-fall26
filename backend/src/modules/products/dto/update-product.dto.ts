import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  ArrayMaxSize,
  IsInt,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional({
    example: 'TECH-ANC-01',
    description: 'Mã SKU duy nhất của sản phẩm',
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    example: 'Tai nghe Bluetooth Chống Ồn ANC Pro X',
    description: 'Tên sản phẩm',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: 'Điện tử',
    description: 'Tên danh mục sản phẩm',
  })
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

  @ApiPropertyOptional({ description: 'Thành phần sản phẩm hoặc mỹ phẩm' })
  @IsOptional()
  @IsString()
  ingredients?: string;

  @ApiPropertyOptional({ description: 'Quốc gia hoặc nơi sản xuất/xuất xứ' })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiPropertyOptional({ description: 'Thông tin nhãn mác, cảnh báo và hướng dẫn trên bao bì' })
  @IsOptional()
  @IsString()
  labelInfo?: string;

  @ApiPropertyOptional({ description: 'Đường dẫn tài liệu chứng minh xuất xứ sản phẩm', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false }, { each: true })
  originProofLinks?: string[];

  @ApiPropertyOptional({ description: 'Ảnh chứng từ/xuất xứ sản phẩm đã tải lên', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false }, { each: true })
  originProofImages?: string[];

  @ApiPropertyOptional({ description: 'Đường dẫn chứng minh nhãn mác và thông tin công bố', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false }, { each: true })
  labelProofLinks?: string[];

  @ApiPropertyOptional({ description: 'Ảnh nhãn mác, cảnh báo và hướng dẫn sử dụng đã tải lên', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false }, { each: true })
  labelProofImages?: string[];

  @ApiPropertyOptional({
    example:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    description: 'URL ảnh đại diện sản phẩm',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Danh sách tối đa 4 URL ảnh phụ chi tiết của sản phẩm',
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách ảnh phụ phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi đường dẫn ảnh phụ phải là chuỗi hợp lệ' })
  subImages?: string[];

  @ApiPropertyOptional({
    example: 459000,
    description: 'Giá bán thực tế (VNĐ)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Giá bán phải là một số' })
  @Min(0, { message: 'Giá bán không được âm' })
  price?: number;

  @ApiPropertyOptional({
    example: 650000,
    description: 'Giá gốc niêm yết (VNĐ)',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Giá gốc niêm yết phải là một số' })
  @Min(0, { message: 'Giá gốc không được âm' })
  originalPrice?: number;

  @ApiPropertyOptional({
    example: 12.5,
    description: 'Tỷ lệ % hoa hồng riêng cho sản phẩm này',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tỷ lệ hoa hồng riêng (%) phải là số' })
  @Min(0, { message: 'Hoa hồng tối thiểu là 0%' })
  @Max(100, { message: 'Hoa hồng tối đa là 100%' })
  customCommissionRate?: number;

  @ApiPropertyOptional({ example: 100, description: 'Số lượng tồn kho' })
  @IsOptional()
  @IsNumber({}, { message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Tồn kho không được âm' })
  stockQuantity?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Trạng thái kinh doanh sản phẩm',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Cho phép KOL tạo link tiếp thị liên kết cho sản phẩm',
  })
  @IsOptional()
  @IsBoolean()
  isAffiliateEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Cho phép KOL đăng ký nhận sản phẩm mẫu' })
  @IsOptional()
  @IsBoolean()
  sampleEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Số lượng mẫu tối đa Shop cấp cho sản phẩm' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sampleQuota?: number;
}
