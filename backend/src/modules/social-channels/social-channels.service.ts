import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

const PLATFORM_HOSTS: Partial<Record<SocialPlatform, string[]>> = {
  TIKTOK: ['tiktok.com'], FACEBOOK: ['facebook.com', 'fb.com'], YOUTUBE: ['youtube.com', 'youtu.be'],
  INSTAGRAM: ['instagram.com'], THREADS: ['threads.net', 'threads.com'], ZALO: ['zalo.me', 'zaloapp.com'],
  TELEGRAM: ['t.me', 'telegram.me'], SHOPEE_VIDEO: ['shopee.vn'], LEMON8: ['lemon8-app.com'],
};

@Injectable()
export class SocialChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeUrl(value: string, platform: SocialPlatform) {
    let url: URL;
    try { url = new URL(value.trim()); } catch { throw new BadRequestException('Nhập liên kết kênh HTTPS hợp lệ.'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.hostname.includes('.') || /^(localhost|127\.|0\.|10\.|192\.168\.)/.test(url.hostname)) {
      throw new BadRequestException('Nhập liên kết kênh HTTPS công khai hợp lệ.');
    }
    const hosts = PLATFORM_HOSTS[platform];
    if (hosts && !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      throw new BadRequestException('Liên kết không thuộc nền tảng đã chọn.');
    }
    url.hostname = url.hostname.replace(/^(www|m)\./, '');
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_') || ['fbclid', 'igsh', 'si'].includes(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    if (['TIKTOK', 'INSTAGRAM', 'FACEBOOK', 'THREADS'].includes(platform)) url.pathname = url.pathname.toLowerCase();
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';
    return url.toString().replace(/\/$/, '');
  }

  private async write<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try { return await this.prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
      catch (error) {
        if ((error as { code?: string }).code !== 'P2034') throw error;
        if (attempt >= 2) throw new ConflictException('Dữ liệu kênh vừa thay đổi. Vui lòng tải lại và thử lại.');
      }
    }
  }

  private async recalculate(tx: Prisma.TransactionClient, collaboratorId: string) {
    const sum = await tx.collaboratorSocialChannel.aggregate({ where: { collaboratorId }, _sum: { followerCount: true } });
    await tx.collaboratorProfile.updateMany({ where: { userId: collaboratorId }, data: { totalFollowers: sum._sum.followerCount || 0 } });
  }

  private async requireOwned(tx: Prisma.TransactionClient, collaboratorId: string, id: string) {
    const channel = await tx.collaboratorSocialChannel.findUnique({ where: { id } });
    if (!channel) throw new NotFoundException('Kênh mạng xã hội không tồn tại.');
    if (channel.collaboratorId !== collaboratorId) throw new ForbiddenException('Bạn không có quyền chỉnh sửa kênh này.');
    return channel;
  }

  private async ensureUnique(tx: Prisma.TransactionClient, collaboratorId: string, url: string, platform: SocialPlatform, excludeId?: string) {
    const existing = await tx.collaboratorSocialChannel.findMany({ where: { collaboratorId } });
    const duplicate = existing.some(channel => {
      if (channel.id === excludeId) return false;
      try { return this.normalizeUrl(channel.channelUrl, platform) === url; } catch { return false; }
    });
    if (duplicate) throw new ConflictException('Kênh này đã có trong danh sách của bạn.');
    return existing;
  }

  async getMyChannels(collaboratorId: string) {
    const [channels, updates] = await Promise.all([
      this.prisma.collaboratorSocialChannel.findMany({ where: { collaboratorId }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }] }),
      this.prisma.auditLog.findMany({ where: { userId: collaboratorId, action: 'SOCIAL_CHANNEL_UPDATED' }, orderBy: { createdAt: 'desc' }, select: { details: true, createdAt: true } }),
    ]);
    const timestamps = new Map<string, Date>();
    for (const log of updates) {
      const id = (log.details as { channelId?: string } | null)?.channelId;
      if (id && !timestamps.has(id)) timestamps.set(id, log.createdAt);
    }
    // Channel verification is separate from KYC; there is no per-channel review record yet.
    return channels.map(channel => ({ ...channel, verificationStatus: 'SELF_DECLARED', updatedAt: timestamps.get(channel.id) || null }));
  }

  async addChannel(collaboratorId: string, dto: CreateChannelDto) {
    const url = this.normalizeUrl(dto.channelUrl, dto.platformName);
    return this.write(async tx => {
      const existing = await this.ensureUnique(tx, collaboratorId, url, dto.platformName);
      const isPrimary = dto.isPrimary || !existing.some(channel => channel.isPrimary);
      if (isPrimary) await tx.collaboratorSocialChannel.updateMany({ where: { collaboratorId, isPrimary: true }, data: { isPrimary: false } });
      const channel = await tx.collaboratorSocialChannel.create({ data: { collaboratorId, platformName: dto.platformName, channelName: dto.channelName?.trim() || null, channelUrl: url, followerCount: dto.followerCount || 0, isPrimary } });
      await this.recalculate(tx, collaboratorId);
      return { message: 'Đã thêm kênh.', channel };
    });
  }

  async updateChannel(collaboratorId: string, id: string, dto: UpdateChannelDto) {
    return this.write(async tx => {
      const current = await this.requireOwned(tx, collaboratorId, id);
      const platform = dto.platformName || current.platformName;
      const url = this.normalizeUrl(dto.channelUrl || current.channelUrl, platform);
      await this.ensureUnique(tx, collaboratorId, url, platform, id);
      if (current.isPrimary && dto.isPrimary === false) throw new BadRequestException('Hãy đặt một kênh khác làm kênh chính trước.');
      if (dto.isPrimary) await tx.collaboratorSocialChannel.updateMany({ where: { collaboratorId, isPrimary: true }, data: { isPrimary: false } });
      const channel = await tx.collaboratorSocialChannel.update({ where: { id }, data: {
        platformName: platform, channelUrl: url,
        ...(dto.channelName !== undefined ? { channelName: dto.channelName?.trim() || null } : {}),
        ...(dto.followerCount != null ? { followerCount: dto.followerCount } : {}),
        ...(dto.isPrimary != null ? { isPrimary: dto.isPrimary } : {}),
      } });
      await this.recalculate(tx, collaboratorId);
      await tx.auditLog.create({ data: { userId: collaboratorId, action: 'SOCIAL_CHANNEL_UPDATED', details: { channelId: id, platformName: platform } } });
      return { message: 'Đã cập nhật kênh.', channel };
    });
  }

  async deleteChannel(collaboratorId: string, channelId: string) {
    return this.write(async tx => {
      const channel = await this.requireOwned(tx, collaboratorId, channelId);
      if (channel.isPrimary) throw new BadRequestException('Hãy đặt một kênh khác làm kênh chính trước khi xóa.');
      await tx.collaboratorSocialChannel.delete({ where: { id: channelId } });
      await this.recalculate(tx, collaboratorId);
      return { message: 'Đã xóa kênh.' };
    });
  }

  async setPrimary(collaboratorId: string, channelId: string) {
    return this.write(async tx => {
      await this.requireOwned(tx, collaboratorId, channelId);
      await tx.collaboratorSocialChannel.updateMany({ where: { collaboratorId, isPrimary: true }, data: { isPrimary: false } });
      const channel = await tx.collaboratorSocialChannel.update({ where: { id: channelId }, data: { isPrimary: true } });
      return { message: 'Đã đặt làm kênh chính.', channel };
    });
  }
}
