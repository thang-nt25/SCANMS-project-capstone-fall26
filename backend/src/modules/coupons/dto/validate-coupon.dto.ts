import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemValidateDto {
  @ApiProperty({
    description: 'ID sản phẩm trong giỏ hàng',
    example: 'prod-uuid-1',
  })
  @IsNotEmpty()
  @IsUUID('4', { message: 'productId phải là UUID hợp lệ' })
  productId: string;

  @ApiProperty({
    description: 'Số lượng mua',
    example: 2,
    default: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Số lượng sản phẩm tối thiểu là 1' })
  quantity: number;
}

export class ValidateCouponDto {
  @ApiProperty({
    description: 'Mã giảm giá do khách nhập tại Checkout',
    example: 'THANGVIP10',
  })
  @IsNotEmpty({ message: 'Mã coupon không được để trống' })
  @IsString({ message: 'Mã coupon phải là chuỗi ký tự' })
  code: string;

  @ApiPropertyOptional({
    description: 'ID gian hàng (nếu khách mua tại trang store cụ thể)',
    example: 'store-uuid-1',
  })
  @IsOptional()
  @IsUUID('4', { message: 'storeId phải là UUID hợp lệ' })
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Số điện thoại của khách hàng (dùng để kiểm tra quota trên khách)',
    example: '0987654321',
  })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({
    description: 'Đơn hàng có sản phẩm đang được giảm giá trực tiếp',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasProductDiscount?: boolean;

  @ApiPropertyOptional({
    description: 'Đơn hàng có voucher khác của Shop',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasShopVoucher?: boolean;

  @ApiPropertyOptional({
    description: 'Đơn hàng có voucher toàn sàn SCANMS',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasPlatformVoucher?: boolean;

  @ApiProperty({
    description: 'Danh sách sản phẩm trong giỏ hàng',
    type: [CartItemValidateDto],
  })
  @IsArray({ message: 'items phải là mảng sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => CartItemValidateDto)
  items: CartItemValidateDto[];
}
