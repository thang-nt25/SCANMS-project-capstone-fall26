import {
  IsString,
  IsUUID,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'ID cuộc hội thoại', example: 'uuid-here' })
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: 'Nội dung tin nhắn', example: 'Xin chào!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  messageText: string;

  @ApiPropertyOptional({ description: 'URL ảnh/file đính kèm' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;
}

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'ID cửa hàng (tùy chọn nếu Shop gọi)',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({
    description: 'ID KOL/CTV (tùy chọn nếu KOL gọi)',
    example: 'uuid-here',
  })
  @IsOptional()
  @IsUUID()
  collaboratorId?: string;

  @ApiPropertyOptional({
    description: 'ID khách hàng khi Shop mở hội thoại hỗ trợ',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Mở hội thoại với tư cách người mua hàng',
  })
  @IsOptional()
  @IsBoolean()
  asCustomer?: boolean;
}
