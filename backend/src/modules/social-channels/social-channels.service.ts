import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';

@Injectable()
export class SocialChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách kênh mạng xã hội của KOL
   */
  async getMyChannels(collaboratorId: string) {
    return this.prisma.collaboratorSocialChannel.findMany({
      where: { collaboratorId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Thêm mới một kênh mạng xã hội
   */
  async addChannel(collaboratorId: string, dto: CreateChannelDto) {
    // Nếu đặt kênh này là primary, bỏ cờ primary của các kênh cũ
    if (dto.isPrimary) {
      await this.prisma.collaboratorSocialChannel.updateMany({
        where: { collaboratorId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const channel = await this.prisma.collaboratorSocialChannel.create({
      data: {
        collaboratorId,
        platformName: dto.platformName,
        channelName: dto.channelName?.trim() || null,
        channelUrl: dto.channelUrl.trim(),
        followerCount: dto.followerCount || 0,
        isPrimary: dto.isPrimary || false,
      },
    });

    // Cập nhật tổng số follower trong collaboratorProfile
    await this.recalculateTotalFollowers(collaboratorId);

    return {
      message: 'Thêm kênh mạng xã hội thành công',
      channel,
    };
  }

  /**
   * Xóa kênh mạng xã hội
   */
  async deleteChannel(collaboratorId: string, channelId: string) {
    const channel = await this.prisma.collaboratorSocialChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Kênh mạng xã hội không tồn tại');
    }

    if (channel.collaboratorId !== collaboratorId) {
      throw new ForbiddenException('Bạn không có quyền xóa kênh này');
    }

    await this.prisma.collaboratorSocialChannel.delete({
      where: { id: channelId },
    });

    await this.recalculateTotalFollowers(collaboratorId);

    return { message: 'Đã xóa kênh mạng xã hội thành công' };
  }

  /**
   * Đặt làm kênh đại diện chính (Primary)
   */
  async setPrimary(collaboratorId: string, channelId: string) {
    const channel = await this.prisma.collaboratorSocialChannel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      throw new NotFoundException('Kênh mạng xã hội không tồn tại');
    }

    if (channel.collaboratorId !== collaboratorId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa kênh này');
    }

    // Bỏ primary các kênh khác
    await this.prisma.collaboratorSocialChannel.updateMany({
      where: { collaboratorId, isPrimary: true },
      data: { isPrimary: false },
    });

    const updated = await this.prisma.collaboratorSocialChannel.update({
      where: { id: channelId },
      data: { isPrimary: true },
    });

    return {
      message: 'Đã đặt làm kênh chính thành công',
      channel: updated,
    };
  }

  private async recalculateTotalFollowers(collaboratorId: string) {
    const sum = await this.prisma.collaboratorSocialChannel.aggregate({
      where: { collaboratorId },
      _sum: { followerCount: true },
    });

    await this.prisma.collaboratorProfile.updateMany({
      where: { userId: collaboratorId },
      data: { totalFollowers: sum._sum.followerCount || 0 },
    });
  }
}
