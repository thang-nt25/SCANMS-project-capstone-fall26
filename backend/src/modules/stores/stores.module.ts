import { Module } from '@nestjs/common';
import { StoresService } from './stores.service';
import { StoresController } from './stores.controller';
import { PrismaModule } from '../../core/database/prisma.module';
import { SponsorshipController } from './sponsorship/sponsorship.controller';
import { SponsorshipService } from './sponsorship/sponsorship.service';

@Module({
  imports: [PrismaModule],
  controllers: [StoresController, SponsorshipController],
  providers: [StoresService, SponsorshipService],
  exports: [StoresService],
})
export class StoresModule {}
