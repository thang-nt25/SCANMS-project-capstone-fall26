import { ReturnReason, ReturnResolution } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
  ValidateIf,
} from 'class-validator';

class ReturnOrderItemDto {
  @IsUUID()
  orderItemId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateReturnRequestDto {
  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @IsOptional()
  @IsEnum(ReturnResolution)
  preferredResolution?: ReturnResolution;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnOrderItemDto)
  items?: ReturnOrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Cần ít nhất 1 ảnh bằng chứng sản phẩm' })
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUrl({ protocols: ['https'], require_protocol: true }, { each: true })
  imageUrls: string[];

  @ValidateIf((dto: CreateReturnRequestDto) => dto.reason === ReturnReason.DAMAGED || dto.unboxingVideoUrl != null)
  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  unboxingVideoUrl?: string;
}
