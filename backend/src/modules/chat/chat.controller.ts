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
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Tạo hoặc lấy hội thoại giữa Shop và KOL' })
  getOrCreate(@Body() dto: CreateConversationDto, @CurrentUser() user: any) {
    return this.chatService.getOrCreateConversation(dto, user.id);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy danh sách hội thoại của user hiện tại' })
  getMyConversations(@CurrentUser() user: any) {
    return this.chatService.getConversationsByUser(user.id);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Lấy lịch sử tin nhắn của một hội thoại (có phân trang cursor)' })
  @ApiParam({ name: 'conversationId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'take', required: false, type: Number, description: 'Số tin nhắn mỗi page (default 50)' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'ID tin nhắn cuối cùng để load more' })
  getMessages(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @CurrentUser() user: any,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number,
    @Query('cursor') cursor?: string,
  ) {
    return this.chatService.getMessages(conversationId, user.id, take, cursor);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Đếm tổng số tin nhắn chưa đọc của user hiện tại' })
  getUnreadCount(@CurrentUser() user: any) {
    return this.chatService.countUnread(user.id);
  }

  // Shop tìm kiếm KOL/CTV để bắt đầu chat
  @Get('search-collaborators')
  @ApiOperation({ summary: 'Shop tìm KOL/CTV theo tên hoặc email' })
  @ApiQuery({ name: 'q', required: true, type: String })
  searchCollaborators(@Query('q') q: string) {
    return this.chatService.searchCollaborators(q);
  }

  // KOL tìm kiếm Shop để bắt đầu chat
  @Get('search-stores')
  @ApiOperation({ summary: 'KOL tìm Shop theo tên' })
  @ApiQuery({ name: 'q', required: true, type: String })
  searchStores(@Query('q') q: string) {
    return this.chatService.searchStores(q);
  }
}
