import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, ValidateNested } from 'class-validator';
import { UpdateProductDto } from './update-product.dto';
import { ProductVariantInputDto } from './sync-product-variants.dto';

export class UpdateProductEditorDto extends UpdateProductDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants: ProductVariantInputDto[];
}
