import { IsUUID } from 'class-validator';

export class RequestStoreCooperationDto {
  @IsUUID()
  storeId!: string;
}
