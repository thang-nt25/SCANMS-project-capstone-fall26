import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsUUID,
  IsIn,
  IsBoolean,
  Equals,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsEnum,
  IsArray,
  ArrayUnique,
  ArrayMaxSize,
} from 'class-validator';
import { ExclusiveDealScope } from '@prisma/client';

export class CreateExclusiveDealDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  targetOrders?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000000000000)
  targetRevenue!: number;

  @IsOptional()
  @IsEnum(ExclusiveDealScope)
  scopeType?: ExclusiveDealScope;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  productIds?: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(366)
  commitmentDays?: number;
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(10)
  @Max(25)
  proposedCommissionRate: number;

  @IsBoolean()
  @Equals(true, {
    message: 'KOL phải cam kết thực hiện video review cho sản phẩm.',
  })
  videoReviewCommitment: boolean;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  salesCommitment: string;
}
