import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestStoreCooperationDto {
  @IsUUID()
  storeId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
