import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  IsObject,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProductVariantInputDto {
  @IsOptional()
  @IsUUID('4')
  id?: string;

  @IsString()
  @MaxLength(100)
  sku: string;

  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsInt()
  @Min(0)
  stockQuantity: number;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}

export class SyncProductVariantsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants: ProductVariantInputDto[];
}
