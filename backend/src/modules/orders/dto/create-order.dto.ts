import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsBoolean,
  IsEnum,
  IsEmail,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PaymentMethod {
  COD = 'COD',
  VIETQR = 'VIETQR',
}

export class OrderItemInputDto {
  @ApiProperty({ description: 'ID sản phẩm', example: 'uuid-product-id' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'ID phân loại sản phẩm (variant/SKU nếu có)',
    example: 'uuid-variant-id',
  })
  @IsOptional()
  @IsUUID('all', { message: 'variantId phải là UUID hợp lệ' })
  variantId?: string;

  @ApiProperty({ description: 'Số lượng mua', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Bị bỏ qua bởi backend (giá luôn được chốt an toàn từ database)',
  })
  @IsOptional()
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

  @ApiPropertyOptional({
    description: 'Email nhận xác nhận đơn hàng và đường dẫn tra cứu',
    example: 'khachhang@gmail.com',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim()
      ? value.trim().toLowerCase()
      : undefined,
  )
  @IsEmail({}, { message: 'Email nhận thông tin đơn hàng không hợp lệ' })
  @MaxLength(254)
  customerEmail?: string;

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
    enum: PaymentMethod,
    example: PaymentMethod.COD,
    default: PaymentMethod.COD,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán phải là COD hoặc VIETQR',
  })
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Ghi chú giao hàng' })
  @IsOptional()
  @IsString()
  orderNotes?: string;

  @ApiProperty({
    description:
      'Khóa chống gửi trùng lặp đơn hàng (UUID hoặc chuỗi định danh duy nhất - Bắt buộc)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString({ message: 'idempotencyKey phải là chuỗi định danh hợp lệ' })
  @IsNotEmpty({ message: 'Thiếu idempotencyKey cho phiên đặt hàng' })
  idempotencyKey: string;

  @ApiProperty({
    description: 'Danh sách sản phẩm trong đơn',
    type: [OrderItemInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}
