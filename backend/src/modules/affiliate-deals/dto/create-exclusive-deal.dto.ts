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
} from 'class-validator';

export class CreateExclusiveDealDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsIn([11, 12, 13], { message: 'Chỉ chọn thưởng Deal +1%, +2% hoặc +3% trên nền 10%.' })
  proposedCommissionRate: number;

  @IsBoolean()
  @Equals(true, { message: 'KOL phải cam kết thực hiện video review cho sản phẩm.' })
  videoReviewCommitment: boolean;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  salesCommitment: string;
}
