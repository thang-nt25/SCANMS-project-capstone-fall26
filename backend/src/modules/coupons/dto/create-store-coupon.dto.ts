import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  Min,
  Max,
  IsDateString,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { DiscountType, CouponScope } from '@prisma/client';

export class CreateStoreCouponDto {
  @ApiProperty({
    description:
      'Mã voucher của shop (4-20 ký tự, chữ cái và số, không khoảng trắng, không được toàn số)',
    example: 'SHOPVIP20',
  })
  @IsNotEmpty({ message: 'Mã voucher không được để trống' })
  @IsString({ message: 'Mã voucher phải là chuỗi ký tự' })
  @MinLength(4, { message: 'Mã voucher phải có tối thiểu 4 ký tự' })
  @MaxLength(20, { message: 'Mã voucher không được vượt quá 20 ký tự' })
  @Matches(/^[A-Za-z0-9]+$/, {
    message:
      'Mã voucher chỉ được chứa chữ cái Latin (A-Z, a-z) và chữ số (0-9)',
  })
  @Matches(/^(?![0-9]+$)/, {
    message: 'Mã voucher không được chỉ toàn số, phải có ít nhất một chữ cái',
  })
  code: string;

  @ApiProperty({
    enum: DiscountType,
    description: 'Loại giảm giá (PERCENTAGE hoặc FIXED_AMOUNT)',
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType, {
    message: 'Loại giảm giá phải là PERCENTAGE hoặc FIXED_AMOUNT',
  })
  discountType: DiscountType;

  @ApiProperty({
    description:
      'Giá trị giảm (% nếu là PERCENTAGE, số tiền VNĐ nếu là FIXED_AMOUNT)',
    example: 15,
  })
  @IsNumber({}, { message: 'Giá trị giảm giá phải là số' })
  @IsPositive({ message: 'Giá trị giảm giá phải lớn hơn 0' })
  discountValue: number;

  @ApiPropertyOptional({
    description: 'Giá trị đơn hàng tối thiểu để được áp dụng mã (VNĐ)',
    example: 150000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Giá trị đơn tối thiểu phải là số' })
  @Min(0, { message: 'Giá trị đơn tối thiểu không được âm' })
  minimumOrderAmount?: number;

  @ApiPropertyOptional({
    description: 'Mức giảm tối đa (VNĐ) khi áp dụng giảm %',
    example: 50000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Mức giảm tối đa phải là số' })
  @IsPositive({ message: 'Mức giảm tối đa phải lớn hơn 0' })
  maximumDiscountAmount?: number;

  @ApiPropertyOptional({
    description:
      'Tổng số lượt sử dụng tối đa của mã (bỏ trống = không giới hạn)',
    example: 200,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tổng lượt dùng phải là số nguyên' })
  @IsPositive({ message: 'Tổng lượt dùng phải lớn hơn 0' })
  usageLimitTotal?: number;

  @ApiPropertyOptional({
    description: 'Số lượt sử dụng tối đa cho mỗi khách hàng (mặc định: 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Giới hạn mỗi khách hàng phải là số' })
  @Min(1, { message: 'Giới hạn mỗi khách hàng tối thiểu là 1' })
  usageLimitPerCustomer?: number;

  @ApiPropertyOptional({
    description: 'Tổng ngân sách tài trợ voucher của shop (VNĐ)',
    example: 3000000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tổng ngân sách phải là số' })
  @IsPositive({ message: 'Tổng ngân sách phải lớn hơn 0' })
  budgetTotal?: number;

  @ApiPropertyOptional({
    description: 'Thời điểm bắt đầu có hiệu lực (ISO 8601)',
    example: '2026-10-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Thời điểm bắt đầu phải đúng định dạng ISO 8601' },
  )
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm hết hạn (ISO 8601)',
    example: '2026-11-01T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'Thời điểm hết hạn phải đúng định dạng ISO 8601' },
  )
  expiresAt?: string;

  @ApiPropertyOptional({
    enum: CouponScope,
    description: 'Phạm vi áp dụng (STORE_WIDE hoặc PRODUCTS)',
    default: CouponScope.STORE_WIDE,
  })
  @IsOptional()
  @IsEnum(CouponScope, { message: 'Phạm vi áp dụng không hợp lệ' })
  scopeType?: CouponScope;

  @ApiPropertyOptional({
    description: 'Danh sách ID sản phẩm nếu phạm vi là PRODUCTS',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray({ message: 'productIds phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi productId phải là chuỗi' })
  productIds?: string[];

  @ApiPropertyOptional({
    description: 'Danh sách tên danh mục nếu phạm vi là CATEGORIES',
    example: ['Mỹ phẩm', 'Thời trang'],
  })
  @IsOptional()
  @IsArray({ message: 'categoryNames phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi tên danh mục phải là chuỗi' })
  categoryNames?: string[];

  @ApiPropertyOptional({
    description: 'Cho phép cộng dồn với giảm giá trực tiếp của sản phẩm',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  stackableWithProductDiscount?: boolean;

  @ApiPropertyOptional({
    description: 'Cho phép cộng dồn với voucher khuyến mãi khác của gian hàng',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  stackableWithShopVoucher?: boolean;

  @ApiPropertyOptional({
    description: 'Cho phép cộng dồn với voucher sàn SCANMS',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  stackableWithPlatformVoucher?: boolean;
}
