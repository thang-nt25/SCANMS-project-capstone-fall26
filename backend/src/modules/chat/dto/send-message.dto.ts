import { IsString, IsUUID, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
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
  @ApiPropertyOptional({ description: 'ID cửa hàng (tùy chọn nếu Shop gọi)', example: 'uuid-here' })
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({ description: 'ID KOL/CTV (tùy chọn nếu KOL gọi)', example: 'uuid-here' })
  @IsOptional()
  @IsUUID()
  collaboratorId?: string;
}
