import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ArrayUnique,
} from 'class-validator';
import { ExclusiveDealScope } from '@prisma/client';

export class CreateShopDealOfferDto {
  @IsUUID()
  collaboratorId: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  productIds?: string[];

  @IsOptional()
  @IsEnum(ExclusiveDealScope)
  scopeType?: ExclusiveDealScope;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(11, { message: 'Mức thù lao độc quyền phải từ 11% trở lên.' })
  @Max(25, { message: 'Mức thù lao tối đa là 25% (trần toàn hệ thống).' })
  proposedCommissionRate: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  targetOrders: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(366)
  commitmentDays: number;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  salesCommitment: string;
}
