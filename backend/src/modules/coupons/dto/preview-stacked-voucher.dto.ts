import { CouponBenefitType } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class PreviewStackedVoucherDto {
  @IsString() code: string;
  @IsUUID() storeId: string;
  @IsEnum(CouponBenefitType) benefitType: CouponBenefitType;
  @IsNumber() @Min(0) goodsSubtotal: number;
  @IsNumber() @Min(0) shippingFee: number;
  @IsNumber() @Min(0) shopDiscount: number;
  @IsOptional() @IsString() customerPhone?: string;
  @IsOptional() @IsString() shopCouponCode?: string;
}
