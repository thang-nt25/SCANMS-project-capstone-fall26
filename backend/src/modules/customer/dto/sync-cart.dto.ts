import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class SyncCustomerCartItemDto {
  @IsUUID('4')
  productId: string;

  @IsOptional()
  @IsUUID('4')
  variantId?: string;

  @IsInt()
  @Min(1)
  @Max(999)
  quantity: number;
}

export class SyncCustomerCartDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SyncCustomerCartItemDto)
  items: SyncCustomerCartItemDto[];
}
