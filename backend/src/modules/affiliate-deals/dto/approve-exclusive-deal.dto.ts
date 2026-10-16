import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ApproveExclusiveDealDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(20)
  discountPercent = 5;

  @Type(() => Number) @IsInt() @Min(0)
  minimumOrderAmount = 200000;

  @Type(() => Number) @IsInt() @Min(1)
  maximumDiscountAmount = 50000;

  @Type(() => Number) @IsInt() @Min(1)
  usageLimitTotal = 20;

  @Type(() => Number) @IsInt() @Min(1)
  budgetTotal = 1000000;

  @Type(() => Number) @IsInt() @Min(1) @Max(365)
  validDays = 30;
}
