import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class TerminateExclusiveDealDto {
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsBoolean()
  escalateDispute?: boolean;
}
