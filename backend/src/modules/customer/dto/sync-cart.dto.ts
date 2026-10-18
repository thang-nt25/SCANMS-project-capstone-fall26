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
  // PostgreSQL uses v4 IDs; deterministic Capstone fixtures use valid v5 IDs.
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
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
