import { Module } from '@nestjs/common';
import { SocialChannelsService } from './social-channels.service';
import { SocialChannelsController } from './social-channels.controller';
import { PrismaModule } from '../../core/database/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SocialChannelsController],
  providers: [SocialChannelsService],
  exports: [SocialChannelsService],
})
export class SocialChannelsModule {}
