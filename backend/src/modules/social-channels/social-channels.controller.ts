import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SocialChannelsService } from './social-channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Social Channels')
@ApiBearerAuth()
@Controller('social-channels')
@UseGuards(JwtAuthGuard)
export class SocialChannelsController {
  constructor(private readonly channelsService: SocialChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách kênh mạng xã hội của KOL' })
  async getMyChannels(@CurrentUser('id') userId: string) {
    return this.channelsService.getMyChannels(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm kênh mạng xã hội mới (TikTok, FB, YouTube...)' })
  async addChannel(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.addChannel(userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa một kênh mạng xã hội' })
  async deleteChannel(
    @CurrentUser('id') userId: string,
    @Param('id') channelId: string,
  ) {
    return this.channelsService.deleteChannel(userId, channelId);
  }

  @Patch(':id/primary')
  @ApiOperation({ summary: 'Đặt kênh này làm kênh đại diện chính' })
  async setPrimary(
    @CurrentUser('id') userId: string,
    @Param('id') channelId: string,
  ) {
    return this.channelsService.setPrimary(userId, channelId);
  }
}
