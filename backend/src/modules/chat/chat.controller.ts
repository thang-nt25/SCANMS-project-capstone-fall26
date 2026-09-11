import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  Request,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/send-message.dto';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Tạo hoặc lấy hội thoại giữa Shop và KOL' })
  getOrCreate(@Body() dto: CreateConversationDto, @Request() req: any) {
    return this.chatService.getOrCreateConversation(dto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách hội thoại của user hiện tại' })
  getMyConversations(@Request() req: any) {
    return this.chatService.getConversationsByUser(req.user.sub);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn của một hội thoại (có phân trang cursor)' })
  @ApiParam({ name: 'conversationId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Số tin nhắn mỗi page (default 50)' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'ID tin nhắn cuối cùng để load more' })
  getMessages(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Request() req: any,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.chatService.getMessages(conversationId, req.user.sub, take, cursor);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Đếm tổng số tin nhắn chưa đọc của user hiện tại' })
  getUnreadCount(@Request() req: any) {
    return this.chatService.countUnread(req.user.sub);
  }
}
