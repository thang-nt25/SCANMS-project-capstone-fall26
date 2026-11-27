import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const GOOGLE_AUTH_INTENTS = ['login', 'register'] as const;

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google ID Token (JWT do Google Identity Services cấp)',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @ApiPropertyOptional({ enum: GOOGLE_AUTH_INTENTS })
  @IsOptional()
  @IsIn(GOOGLE_AUTH_INTENTS)
  intent?: (typeof GOOGLE_AUTH_INTENTS)[number];

  @ApiPropertyOptional({
    description:
      'Trường tương thích client cũ; đăng nhập không cấp quyền. Tài khoản Google mới luôn là CUSTOMER.',
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
