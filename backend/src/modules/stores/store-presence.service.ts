import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CacheService } from '../../core/cache/cache.service';

const ONLINE_WINDOW_MS = 75_000;
const HISTORY_TTL_SECONDS = 30 * 24 * 60 * 60;

@Injectable()
export class StorePresenceService {
  constructor(private readonly prisma: PrismaService, private readonly cache: CacheService) {}

  async heartbeat(ownerId: string) {
    // Ownership comes from the authenticated session, never a client-provided store ID.
    const store = await this.prisma.store.findFirst({
      where: { ownerId, isDeleted: false, isActive: true, owner: { isActive: true, deletedAt: null } },
      select: { id: true },
    });
    if (!store) return { recorded: false };
    await this.cache.set(`store-presence:owner:${ownerId}`, new Date().toISOString(), HISTORY_TTL_SECONDS);
    return { recorded: true };
  }

  async getPublicPresence(storeId: string) {
    const store = await this.prisma.store.findFirst({
      where: { id: storeId, isDeleted: false, isActive: true, isVerified: true,
        onboardingStatus: 'VERIFIED', owner: { isActive: true, deletedAt: null } },
      select: { ownerId: true },
    });
    if (!store) throw new NotFoundException('Không tìm thấy Shop');
    const value = await this.cache.get<string>(`store-presence:owner:${store.ownerId}`);
    const timestamp = typeof value === 'string' ? Date.parse(value) : NaN;
    const now = Date.now();
    const known = Number.isFinite(timestamp) && timestamp <= now;
    return {
      isOnline: known && now - timestamp < ONLINE_WINDOW_MS,
      lastActiveAt: known ? value : null,
      checkedAt: new Date(now).toISOString(),
    };
  }
}
