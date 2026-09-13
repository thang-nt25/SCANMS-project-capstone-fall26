import {
  IsEnum,
  IsObject,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum LandingAnalyticsEvent {
  PAGE_VIEW = 'page_view',
  VIDEO_START = 'video_start',
  VIDEO_PROGRESS = 'video_progress',
  VIDEO_COMPLETE = 'video_complete',
  CTA_CLICK = 'cta_click',
  CHECKOUT_START = 'checkout_start',
  ORDER_COMPLETE = 'order_complete',
}

export class TrackAnalyticsEventDto {
  @ApiProperty({ description: 'UUID duy nhất để chống ghi sự kiện trùng lặp' })
  @IsUUID('4', { message: 'eventId phải là UUID v4 hợp lệ' })
  eventId: string;

  @ApiProperty({
    example: 'page_view',
    description: 'Tên sự kiện: page_view, video_start, video_complete, cta_click, checkout_start, order_complete',
  })
  @IsEnum(LandingAnalyticsEvent, { message: 'Tên sự kiện analytics không hợp lệ' })
  event: LandingAnalyticsEvent;

  @ApiPropertyOptional({ example: 'prod-uuid-1', description: 'ID sản phẩm' })
  @IsOptional()
  @IsUUID('4', { message: 'productId phải là UUID v4 hợp lệ' })
  productId?: string;

  @ApiPropertyOptional({ example: 'sora-skin', description: 'Mã hoặc slug gian hàng' })
  @IsOptional()
  @IsUUID('4', { message: 'storeId phải là UUID v4 hợp lệ' })
  storeId?: string;

  @ApiPropertyOptional({ description: 'Dữ liệu ngữ cảnh đi kèm (video ID, URL, source...)' })
  @IsOptional()
  @IsObject({ message: 'metadata phải là object hợp lệ' })
  metadata?: Record<string, any>;
}
