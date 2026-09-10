import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google ID Token (JWT do Google Identity Services cấp)',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({
    description: 'Vai trò mong muốn khi đăng ký lần đầu qua Google: COLLABORATOR | SHOP_MANAGER',
    example: 'COLLABORATOR',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    description: 'Tên gian hàng nếu đăng ký làm SHOP_MANAGER',
    example: 'Sora Skin Official',
  })
  @IsOptional()
  @IsString()
  storeName?: string;
}
