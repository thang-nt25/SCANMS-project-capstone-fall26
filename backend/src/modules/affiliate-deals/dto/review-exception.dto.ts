import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';
export class ReviewExceptionDto {
  @IsBoolean() approve!: boolean;
  @IsString() @MinLength(10) @MaxLength(1000) note!: string;
}
