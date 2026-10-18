import { Module } from '@nestjs/common';
import { SamplesService } from './samples.service';
import { SamplesController } from './samples.controller';
import { MediaModule } from '../media/media.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [MediaModule, ShippingModule],
  controllers: [SamplesController],
  providers: [SamplesService],
  exports: [SamplesService],
})
export class SamplesModule {}
