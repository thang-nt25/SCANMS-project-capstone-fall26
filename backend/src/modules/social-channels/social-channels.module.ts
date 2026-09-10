import { Module } from '@nestjs/common';
import { SocialChannelsService } from './social-channels.service';
import { SocialChannelsController } from './social-channels.controller';
import { PrismaService } from '../../core/database/prisma.service';

@Module({
  controllers: [SocialChannelsController],
  providers: [SocialChannelsService, PrismaService],
  exports: [SocialChannelsService],
})
export class SocialChannelsModule {}
