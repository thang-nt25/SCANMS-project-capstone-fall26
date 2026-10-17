import { Type } from 'class-transformer';
import { IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class RecordPlatformReimbursementDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  amount: number;

  @IsString() @MinLength(3) @MaxLength(100)
  bankReference: string;
}
