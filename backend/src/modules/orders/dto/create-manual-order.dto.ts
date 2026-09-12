import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class ManualOrderItemDto {
  @ApiPropertyOptional({ description: 'ID sản phẩm nội bộ' })
  @IsOptional()
  @IsUUID('4', { message: 'productId phải là UUID hợp lệ' })
  productId?: string;

  @ApiPropertyOptional({ example: 'SERUM-B5', description: 'SKU sản phẩm' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Đơn giá; nếu bỏ trống sẽ lấy giá hiện tại của sản phẩm',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Đơn giá phải là số hợp lệ' })
  @Min(0, { message: 'Đơn giá không được âm' })
  unitPrice?: number;
}

export class CreateManualOrderDto {
  @ApiPropertyOptional({
    description:
      'ID cửa hàng; Shop Manager có thể bỏ trống để dùng cửa hàng của mình',
  })
  @IsOptional()
  @IsUUID('4', { message: 'storeId phải là UUID hợp lệ' })
  storeId?: string;

  @ApiPropertyOptional({
    example: 'MANUAL-20260912-001',
    description: 'Mã đơn thủ công; hệ thống tự sinh nếu bỏ trống',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  externalOrderSn?: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty({ message: 'Tên khách hàng không được để trống' })
  @Matches(/\S/, { message: 'Tên khách hàng không được chỉ chứa khoảng trắng' })
  @MaxLength(150)
  customerName: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Matches(/\S/, { message: 'Số điện thoại không được chỉ chứa khoảng trắng' })
  @MaxLength(20)
  customerPhone: string;

  @ApiProperty({ example: 'Quận 1, TP.HCM' })
  @IsString()
  @IsNotEmpty({ message: 'Địa chỉ giao hàng không được để trống' })
  @Matches(/\S/, { message: 'Địa chỉ không được chỉ chứa khoảng trắng' })
  @MaxLength(1000)
  shippingAddress: string;

  @ApiPropertyOptional({ enum: OrderStatus, default: OrderStatus.PENDING })
  @IsOptional()
  @IsEnum(OrderStatus, { message: 'Trạng thái đơn hàng không hợp lệ' })
  status?: OrderStatus;

  @ApiPropertyOptional({ example: 20000, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Tiền giảm giá phải là số hợp lệ' },
  )
  @Min(0, { message: 'Tiền giảm giá không được âm' })
  discountAmount?: number;

  @ApiProperty({ type: [ManualOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất một sản phẩm' })
  @ValidateNested({ each: true })
  @Type(() => ManualOrderItemDto)
  items: ManualOrderItemDto[];
}
