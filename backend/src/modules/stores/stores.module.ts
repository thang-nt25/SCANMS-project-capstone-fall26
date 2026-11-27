import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { PrismaModule } from '../../core/database/prisma.module';
import { CacheModule } from '../../core/cache/cache.module';
import { StorePresenceService } from './store-presence.service';
import { SponsorshipController } from './sponsorship/sponsorship.controller';
import { SponsorshipService } from './sponsorship/sponsorship.service';
import { SponsorshipPayosService } from './sponsorship/sponsorship-payos.service';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [StoresController, SponsorshipController],
  providers: [StoresService, StorePresenceService, SponsorshipService, SponsorshipPayosService],
  exports: [StoresService, StorePresenceService, SponsorshipService, SponsorshipPayosService],
})
export class StoresModule {}
