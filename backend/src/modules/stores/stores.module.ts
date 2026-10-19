import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { PrismaModule } from '../../core/database/prisma.module';
import { CacheModule } from '../../core/cache/cache.module';
import { StorePresenceService } from './store-presence.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [StoresController],
  providers: [StoresService, StorePresenceService],
  exports: [StoresService],
})
export class StoresModule {}
