import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  IsOptional,
  MaxLength,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ManualOrderItemDto } from './create-manual-order.dto';
import { MAX_ORDER_ITEMS } from '../order-input.utils';

export class ManualOrderDiscountDto {
  @IsOptional()
  @IsUUID('4')
  storeId?: string;

  @IsString()
  @Matches(/\S/)
  @MaxLength(20)
  discountCode: string;

  @IsString()
  @MaxLength(20)
  customerPhone: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ORDER_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ManualOrderItemDto)
  items: ManualOrderItemDto[];
}
