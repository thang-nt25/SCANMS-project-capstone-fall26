import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ProductCouponQueryDto {
  @IsUUID('all') productId: string;
  @IsOptional() @IsUUID('all') variantId?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(9999) quantity = 1;
}
