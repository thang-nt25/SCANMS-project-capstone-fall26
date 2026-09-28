import { ReturnReason } from '@prisma/client';
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
} from 'class-validator';

export class CreateReturnRequestDto {
  @IsEnum(ReturnReason)
  reason: ReturnReason;

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

  @IsString()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  unboxingVideoUrl: string;
}
