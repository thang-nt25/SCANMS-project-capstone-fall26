import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  Min,
  Max,
  IsDateString,
  IsArray,
  IsString,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import {
  DiscountType,
  CouponScope,
  CouponFundingSource,
} from '@prisma/client';

export class ApproveCouponDto {
  @ApiProperty({
    enum: DiscountType,
    description: 'Loại giảm giá (PERCENTAGE hoặc FIXED_AMOUNT)',
    example: DiscountType.PERCENTAGE,
  })
  @IsEnum(DiscountType, { message: 'Loại giảm giá phải là PERCENTAGE hoặc FIXED_AMOUNT' })
  discountType: DiscountType;

  @ApiProperty({
    description: 'Giá trị giảm (% nếu là PERCENTAGE, số tiền nếu là FIXED_AMOUNT)',
    example: 10,
  })
  @IsNumber({}, { message: 'Giá trị giảm giá phải là số' })
  @IsPositive({ message: 'Giá trị giảm giá phải lớn hơn 0' })
  discountValue: number;

  @ApiPropertyOptional({
    description: 'Giá trị đơn hàng tối thiểu để được áp dụng mã',
    example: 200000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Giá trị đơn tối thiểu phải là số' })
  @Min(0, { message: 'Giá trị đơn tối thiểu không được âm' })
  minimumOrderAmount?: number;

  @ApiPropertyOptional({
    description: 'Mức giảm tối đa (áp dụng cho coupon phần trăm)',
    example: 100000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Mức giảm tối đa phải là số' })
  @IsPositive({ message: 'Mức giảm tối đa phải lớn hơn 0' })
  maximumDiscountAmount?: number;

  @ApiPropertyOptional({
    description: 'Tổng số lượt sử dụng tối đa của mã',
    example: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tổng lượt dùng phải là số nguyên' })
  @IsPositive({ message: 'Tổng lượt dùng phải lớn hơn 0' })
  usageLimitTotal?: number;

  @ApiPropertyOptional({
    description: 'Số lượt sử dụng tối đa cho mỗi khách hàng (mặc định 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Giới hạn mỗi khách hàng phải là số' })
  @Min(1, { message: 'Giới hạn mỗi khách hàng tối thiểu là 1' })
  usageLimitPerCustomer?: number;

  @ApiPropertyOptional({
    description: 'Tổng ngân sách giảm giá Shop cấp cho coupon này (VNĐ)',
    example: 5000000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tổng ngân sách phải là số' })
  @IsPositive({ message: 'Tổng ngân sách phải lớn hơn 0' })
  budgetTotal?: number;

  @ApiPropertyOptional({
    description: 'Thời điểm bắt đầu có hiệu lực (ISO 8601)',
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Thời điểm bắt đầu phải đúng định dạng ISO 8601' })
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'Thời điểm hết hạn (ISO 8601)',
    example: '2026-10-01T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Thời điểm hết hạn phải đúng định dạng ISO 8601' })
  expiresAt?: string;

  @ApiPropertyOptional({
    enum: CouponScope,
    description: 'Phạm vi áp dụng (STORE_WIDE, PRODUCTS, CATEGORIES, CAMPAIGN)',
    default: CouponScope.STORE_WIDE,
  })
  @IsOptional()
  @IsEnum(CouponScope, { message: 'Phạm vi áp dụng không hợp lệ' })
  scopeType?: CouponScope;

  @ApiPropertyOptional({
    description: 'Danh sách productId nếu phạm vi là PRODUCTS',
    example: ['uuid-1', 'uuid-2'],
  })
  @IsOptional()
  @IsArray({ message: 'productIds phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi productId phải là chuỗi' })
  productIds?: string[];

  @ApiPropertyOptional({
    description: 'Danh sách tên danh mục nếu phạm vi là CATEGORIES',
    example: ['Chăm sóc da', 'Trang điểm'],
  })
  @IsOptional()
  @IsArray({ message: 'categoryNames phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi tên danh mục phải là chuỗi' })
  categoryNames?: string[];

  @ApiPropertyOptional({
    enum: CouponFundingSource,
    description:
      'Nguồn chịu chi phí giảm giá (Shop chỉ được chọn SHOP_FUNDED; CO_FUNDED hoặc PLATFORM_FUNDED phải do Admin cấu hình)',
    default: CouponFundingSource.SHOP_FUNDED,
  })
  @IsOptional()
  @IsEnum(CouponFundingSource, { message: 'Nguồn tài trợ không hợp lệ' })
  fundingSource?: CouponFundingSource;

  @ApiPropertyOptional({
    description:
      'Tỷ lệ tài trợ từ Shop (%) khi chọn CO_FUNDED (0 - 100, Admin chỉ định)',
    example: 100,
    default: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tỷ lệ tài trợ từ Shop phải là số' })
  @Min(0, { message: 'Tỷ lệ tài trợ tối thiểu 0%' })
  @Max(100, { message: 'Tỷ lệ tài trợ tối đa 100%' })
  shopFundingRate?: number;

  @ApiPropertyOptional({
    description: 'Tỷ lệ tài trợ từ Sàn SCANMS (%) khi chọn CO_FUNDED (0 - 100)',
    example: 50,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Tỷ lệ tài trợ từ Sàn phải là số' })
  @Min(0, { message: 'Tỷ lệ tài trợ tối thiểu 0%' })
  @Max(100, { message: 'Tỷ lệ tài trợ tối đa 100%' })
  platformFundingRate?: number;

  @ApiPropertyOptional({
    description: 'Cho phép cộng dồn với giảm giá sản phẩm thông thường',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  stackableWithProductDiscount?: boolean;

  @ApiPropertyOptional({
    description: 'Cho phép cộng dồn với voucher khuyến mãi khác của Shop',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  stackableWithShopVoucher?: boolean;

  @ApiPropertyOptional({
    description: 'Cho phép cộng dồn với voucher sàn SCANMS',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  stackableWithPlatformVoucher?: boolean;
}
