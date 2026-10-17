import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponBenefitType, DiscountType } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsPositive, IsString, IsUUID, Matches, Max, Min } from 'class-validator';

export class CreatePlatformCouponDto {
  @ApiProperty() @IsUUID() storeId: string;
  @ApiProperty() @IsString() @Matches(/^[A-Za-z][A-Za-z0-9]{3,19}$/) code: string;
  @ApiProperty({ enum: CouponBenefitType }) @IsEnum(CouponBenefitType) benefitType: CouponBenefitType;
  @ApiProperty({ enum: DiscountType }) @IsEnum(DiscountType) discountType: DiscountType;
  @ApiProperty() @IsPositive() discountValue: number;
  @ApiPropertyOptional() @IsOptional() @Min(0) minimumOrderAmount?: number;
  @ApiPropertyOptional() @IsOptional() @IsPositive() maximumDiscountAmount?: number;
  @ApiProperty() @IsPositive() budgetTotal: number;
  @ApiProperty() @IsInt() @IsPositive() usageLimitTotal: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) usageLimitPerCustomer?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() expiresAt?: string;
}
