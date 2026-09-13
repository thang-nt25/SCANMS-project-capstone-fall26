import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayMaxSize,
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
  Max,
  ValidateNested,
  ValidateIf,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { MAX_ORDER_AMOUNT, MAX_ORDER_ITEMS } from '../order-input.utils';

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
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Max(2147483647)
  @Min(1, { message: 'Số lượng phải lớn hơn 0' })
  quantity: number;

  @ApiPropertyOptional({
    example: 150000,
    description: 'Đơn giá; nếu bỏ trống sẽ lấy giá hiện tại của sản phẩm',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Đơn giá phải là số hợp lệ' })
  @Max(MAX_ORDER_AMOUNT)
  @Min(0.01, { message: 'Đơn giá phải lớn hơn 0' })
  unitPrice?: number;
}

export class ManualOrderCustomerDto {
  @IsString()
  @Matches(/\S/)
  @MaxLength(150)
  name: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(700)
  address: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  province: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(100)
  district: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ward?: string;
}

export enum ManualPaymentMethod {
  COD = 'COD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  E_WALLET = 'E_WALLET',
}

export class CreateManualOrderDto {
  @ApiPropertyOptional({ type: ManualOrderCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ManualOrderCustomerDto)
  customer?: ManualOrderCustomerDto;

  @ValidateIf(
    (dto: CreateManualOrderDto) =>
      Boolean(dto.customer) || dto.paymentMethod !== undefined,
  )
  @IsEnum(ManualPaymentMethod)
  paymentMethod?: ManualPaymentMethod;

  @ValidateIf(
    (dto: CreateManualOrderDto) =>
      Boolean(dto.customer) || dto.shippingFee !== undefined,
  )
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  shippingFee?: number;

  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(20)
  discountCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_ORDER_AMOUNT)
  totalAmount?: number;
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

  @ApiPropertyOptional({
    description: 'UUID của thao tác tạo đơn, giữ nguyên khi retry',
  })
  @IsOptional()
  @IsUUID('4')
  requestId?: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @ValidateIf(
    (dto: CreateManualOrderDto) =>
      !dto.customer || dto.customerName !== undefined,
  )
  @IsString()
  @IsNotEmpty({ message: 'Tên khách hàng không được để trống' })
  @Matches(/\S/, { message: 'Tên khách hàng không được chỉ chứa khoảng trắng' })
  @MaxLength(150)
  customerName: string;

  @ApiProperty({ example: '0901234567' })
  @ValidateIf(
    (dto: CreateManualOrderDto) =>
      !dto.customer || dto.customerPhone !== undefined,
  )
  @IsString()
  @IsNotEmpty({ message: 'Số điện thoại không được để trống' })
  @Matches(/\S/, { message: 'Số điện thoại không được chỉ chứa khoảng trắng' })
  @MaxLength(20)
  customerPhone: string;

  @ApiProperty({ example: 'Quận 1, TP.HCM' })
  @ValidateIf(
    (dto: CreateManualOrderDto) =>
      !dto.customer || dto.shippingAddress !== undefined,
  )
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
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Tiền giảm giá phải là số hợp lệ' },
  )
  @Min(0, { message: 'Tiền giảm giá không được âm' })
  discountAmount?: number;

  @ApiProperty({ type: [ManualOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Đơn hàng phải có ít nhất một sản phẩm' })
  @ArrayMaxSize(MAX_ORDER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ManualOrderItemDto)
  items: ManualOrderItemDto[];
}
