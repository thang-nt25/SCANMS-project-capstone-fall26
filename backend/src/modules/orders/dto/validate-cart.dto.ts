import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateCartItemDto {
  @ApiProperty({ description: 'ID sản phẩm', example: 'uuid-product-id' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'ID phân loại sản phẩm (variant/SKU)',
    example: 'uuid-variant-id',
  })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiProperty({ description: 'Số lượng đặt', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Đơn giá lưu trữ tạm thời phía client để đối chiếu biến động giá',
    example: 150000,
  })
  @IsOptional()
  @IsNumber()
  clientPrice?: number;
}

export class ValidateCartDto {
  @ApiProperty({
    description: 'Danh sách sản phẩm trong giỏ hàng cần kiểm tra',
    type: [ValidateCartItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ValidateCartItemDto)
  items: ValidateCartItemDto[];

  @ApiPropertyOptional({
    description: 'Mã coupon ưu đãi (nếu có)',
    example: 'THANGVIP10',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại khách hàng (để kiểm tra giới hạn coupon)',
    example: '0901234567',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;
}
