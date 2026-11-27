import { IsOptional, IsString, MaxLength } from 'class-validator';

export class TerminateStoreCooperationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
