import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class InviteStoreCollaboratorDto {
  @IsOptional()
  @IsUUID('4', { message: 'Mã cửa hàng không hợp lệ' })
  storeId?: string;

  @IsEmail({}, { message: 'Email KOL/CTV không hợp lệ' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'Ghi chú không được vượt quá 255 ký tự' })
  note?: string;
}
