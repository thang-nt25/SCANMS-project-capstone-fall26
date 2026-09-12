import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemInputDto {
  @ApiProperty({ description: 'ID sản phẩm', example: 'uuid-product-id' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Số lượng mua', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Đơn giá tùy chọn (nếu có)',
    example: 413100,
  })
  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class CreateOrderDto {
  @ApiPropertyOptional({
    description: 'ID gian hàng (nếu không cung cấp sẽ lấy Store mặc định)',
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Slug gian hàng (VD: techstore-flagship)',
  })
  @IsOptional()
  @IsString()
  storeSlug?: string;

  @ApiProperty({ description: 'Họ tên người nhận', example: 'Hoàng Minh Tuấn' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({
    description: 'Số điện thoại người nhận',
    example: '0933888999',
  })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiProperty({
    description: 'Địa chỉ nhận hàng chi tiết',
    example: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
  })
  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @ApiPropertyOptional({
    description: 'Mã coupon ưu đãi của KOL (VD: THANGVIP10)',
    example: 'THANGVIP10',
  })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({
    description: 'Mã tracking rút gọn từ link tiếp thị (VD: anc-pro-thang)',
  })
  @IsOptional()
  @IsString()
  cookieRefCode?: string;

  @ApiPropertyOptional({
    description: 'Phương thức thanh toán (COD hoặc VIETQR)',
    example: 'COD',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Ghi chú giao hàng' })
  @IsOptional()
  @IsString()
  orderNotes?: string;

  @ApiProperty({
    description: 'Khóa chống gửi trùng lặp đơn hàng (UUID hoặc chuỗi định danh duy nhất - Bắt buộc)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString({ message: 'idempotencyKey phải là chuỗi định danh hợp lệ' })
  @IsNotEmpty({ message: 'Thiếu idempotencyKey cho phiên đặt hàng' })
  idempotencyKey: string;

  @ApiPropertyOptional({
    description: 'Đơn hàng có áp dụng giảm giá trực tiếp trên sản phẩm',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasProductDiscount?: boolean;

  @ApiPropertyOptional({
    description: 'Đơn hàng có áp dụng voucher khác của Shop',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasShopVoucher?: boolean;

  @ApiPropertyOptional({
    description: 'Đơn hàng có áp dụng voucher toàn sàn SCANMS',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasPlatformVoucher?: boolean;

  @ApiProperty({
    description: 'Danh sách sản phẩm trong đơn',
    type: [OrderItemInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}
