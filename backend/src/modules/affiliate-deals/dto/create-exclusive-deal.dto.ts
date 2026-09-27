import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateExclusiveDealDto {
  @IsUUID()
  productId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  proposedCommissionRate: number;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  salesCommitment: string;
}
