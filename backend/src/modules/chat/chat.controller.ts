import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  Request,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CreateConversationDto } from './dto/send-message.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MAX_CHAT_ATTACHMENT_BYTES } from './chat-attachment.utils';

@ApiTags('Chat')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService, private readonly chatGateway: ChatGateway) {}

  @Patch('conversations/:conversationId/read')
  async markRead(@Param('conversationId', ParseUUIDPipe) conversationId: string, @CurrentUser() user: any) {
    const result = await this.chatService.markRead(conversationId, user.id);
    if (result.count) this.chatGateway.broadcastToConversation(conversationId, 'messages_read', { conversationId, readerId: user.id });
    return result;
  }

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

  @Post('conversations/:conversationId/attachments')
  @ApiOperation({ summary: 'Tải ảnh, video hoặc tài liệu lên hội thoại chat' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_CHAT_ATTACHMENT_BYTES },
    }),
  )
  uploadAttachment(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.chatService.uploadAttachment(conversationId, userId, file);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({
    summary: 'Lấy lịch sử tin nhắn của một hội thoại (có phân trang cursor)',
  })
  @ApiParam({ name: 'conversationId', type: 'string', format: 'uuid' })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Số tin nhắn mỗi page (default 50)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'ID tin nhắn cuối cùng để load more',
  })
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
  @ApiQuery({ name: 'q', required: false, type: String })
  searchCollaborators(@Query('q') q?: string) {
    return this.chatService.searchCollaborators(q);
  }

  // KOL tìm kiếm Shop để bắt đầu chat
  @Get('search-stores')
  @ApiOperation({ summary: 'KOL tìm Shop theo tên' })
  @ApiQuery({ name: 'q', required: false, type: String })
  searchStores(@Query('q') q?: string) {
    return this.chatService.searchStores(q);
  }

  // Xóa cuộc trò chuyện
  @Delete('conversations/:conversationId')
  @ApiOperation({ summary: 'Xóa hoàn toàn cuộc trò chuyện và lịch sử chat' })
  @ApiParam({ name: 'conversationId', type: 'string', format: 'uuid' })
  deleteConversation(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.deleteConversation(conversationId, userId);
  }

  // Xóa lịch sử tin nhắn trong cuộc trò chuyện
  @Delete('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Xóa toàn bộ lịch sử tin nhắn trong cuộc trò chuyện' })
  @ApiParam({ name: 'conversationId', type: 'string', format: 'uuid' })
  clearMessages(
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.clearConversationMessages(conversationId, userId);
  }
}
