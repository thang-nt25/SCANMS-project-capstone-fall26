import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class VariantFloorDto {
  @IsUUID() variantId!: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000000000)
  floorPrice!: number;
}
export class SetFloorPriceDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000000000)
  floorPrice!: number;
  @IsString() @MinLength(10) @MaxLength(1000) reason!: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => VariantFloorDto)
  variants?: VariantFloorDto[];
}
export class CreatePricePromotionDto {
  @IsUUID() productId!: string;
  @IsOptional() @IsUUID() variantId?: string;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000000000)
  proposedPrice!: number;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(1000000000000)
  budgetTotal!: number;
  @Type(() => Date) @IsDate() startsAt!: Date;
  @Type(() => Date) @IsDate() endsAt!: Date;
  @IsString() @MinLength(10) @MaxLength(1000) reason!: string;
}
export class ReviewPricePromotionDto {
  @IsBoolean() approve!: boolean;
  @IsString() @MinLength(10) @MaxLength(1000) note!: string;
}
