import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  IsUUID,
  IsInt,
  ArrayMaxSize,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductVariantInputDto } from './sync-product-variants.dto';

export class CreateProductDto {
  @ApiProperty({
    description: 'Ít nhất một SKU phân loại được tạo cùng sản phẩm',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Sản phẩm cần có ít nhất một phân loại SKU' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];
  @ApiPropertyOptional({
    description: 'Cửa hàng nhận sản phẩm khi Chủ Shop quản lý nhiều gian hàng',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Mã cửa hàng không hợp lệ' })
  storeId?: string;

  @ApiProperty({
    example: 'TECH-ANC-01',
    description: 'Mã SKU duy nhất của sản phẩm',
  })
  @IsString({ message: 'Mã SKU không hợp lệ' })
  @IsNotEmpty({ message: 'Mã SKU không được để trống' })
  sku: string;

  @ApiProperty({
    example: 'Tai nghe Bluetooth Chống Ồn ANC Pro X',
    description: 'Tên sản phẩm',
  })
  @IsString({ message: 'Tên sản phẩm không hợp lệ' })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  title: string;

  @ApiProperty({
    example: 'Điện tử',
    description: 'Tên danh mục sản phẩm đã chuẩn hóa',
  })
  @IsString()
  @IsNotEmpty({ message: 'Danh mục sản phẩm không được để trống' })
  categoryName: string;

  @ApiProperty({
    example: 'Chống ồn chủ động Hybrid ANC 45dB, Pin 40 giờ liên tục',
    description: 'Mô tả chi tiết sản phẩm',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mô tả chi tiết sản phẩm không được để trống' })
  description: string;

  @ApiProperty({ description: 'Thành phần sản phẩm hoặc mỹ phẩm' })
  @IsString()
  @IsNotEmpty({ message: 'Thành phần sản phẩm không được để trống' })
  ingredients: string;

  @ApiProperty({ description: 'Quốc gia hoặc nơi sản xuất/xuất xứ' })
  @IsString()
  @IsNotEmpty({ message: 'Xuất xứ sản phẩm không được để trống' })
  origin: string;

  @ApiProperty({
    description: 'Thông tin nhãn mác, cảnh báo và hướng dẫn trên bao bì',
  })
  @IsString()
  @IsNotEmpty({ message: 'Thông tin nhãn mác không được để trống' })
  labelInfo: string;

  @ApiPropertyOptional({
    description: 'Đường dẫn tài liệu chứng minh xuất xứ sản phẩm',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    { each: true },
  )
  originProofLinks?: string[];

  @ApiPropertyOptional({
    description: 'Ảnh chứng từ/xuất xứ sản phẩm đã tải lên',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    { each: true },
  )
  originProofImages?: string[];

  @ApiPropertyOptional({
    description: 'Đường dẫn chứng minh nhãn mác và thông tin công bố',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    { each: true },
  )
  labelProofLinks?: string[];

  @ApiPropertyOptional({
    description: 'Ảnh nhãn mác, cảnh báo và hướng dẫn sử dụng đã tải lên',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl(
    {
      protocols: ['http', 'https'],
      require_protocol: true,
      require_tld: false,
    },
    { each: true },
  )
  labelProofImages?: string[];

  @ApiProperty({
    example:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    description: 'URL ảnh đại diện sản phẩm',
  })
  @IsString()
  @IsNotEmpty({ message: 'Ảnh chính sản phẩm không được để trống' })
  imageUrl: string;

  @ApiPropertyOptional({
    example: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
      'https://images.unsplash.com/photo-1556228722-d0b7194f837e?w=500',
    ],
    description: 'Danh sách tối đa 4 URL ảnh phụ chi tiết của sản phẩm',
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách ảnh phụ phải là một mảng' })
  @ArrayMaxSize(4, { message: 'Sản phẩm chỉ được có tối đa 4 ảnh phụ' })
  @IsString({
    each: true,
    message: 'Mỗi đường dẫn ảnh phụ phải là chuỗi hợp lệ',
  })
  subImages?: string[];

  @ApiProperty({ example: 499000, description: 'Giá bán thực tế (VNĐ)' })
  @IsNumber({}, { message: 'Giá bán phải là một số' })
  @Min(1, { message: 'Giá bán phải lớn hơn 0' })
  price: number;

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

  @ApiProperty({ example: 100, description: 'Số lượng tồn kho' })
  @IsNumber({}, { message: 'Số lượng tồn kho phải là số' })
  @IsInt({ message: 'Số lượng tồn kho phải là số nguyên' })
  @Min(0, { message: 'Tồn kho không được âm' })
  stockQuantity: number;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: 'Cho phép KOL tạo link tiếp thị liên kết cho sản phẩm',
  })
  @IsOptional()
  @IsBoolean()
  isAffiliateEnabled?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Cho phép KOL đăng ký nhận sản phẩm mẫu',
  })
  @IsOptional()
  @IsBoolean()
  sampleEnabled?: boolean;

  @ApiPropertyOptional({
    default: 0,
    description: 'Số lượng mẫu tối đa Shop cấp cho sản phẩm',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sampleQuota?: number;
}
