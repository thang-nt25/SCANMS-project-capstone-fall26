import { BadRequestException, Injectable } from '@nestjs/common';
import { ExternalOrderPlatform } from '../dto/order-webhook.dto';
import {
  ExternalOrderNormalizer,
  NormalizedExternalOrder,
} from './external-order-normalizer.interface';
import { ShopeeOrderNormalizer } from './shopee-order.normalizer';
import { ShopifyOrderNormalizer } from './shopify-order.normalizer';
import { TikTokOrderNormalizer } from './tiktok-order.normalizer';

@Injectable()
export class OrderWebhookNormalizerService {
  private readonly normalizers: Map<
    ExternalOrderPlatform,
    ExternalOrderNormalizer
  >;

  constructor() {
    const normalizers: ExternalOrderNormalizer[] = [
      new ShopeeOrderNormalizer(),
      new TikTokOrderNormalizer(),
      new ShopifyOrderNormalizer(),
    ];

    this.normalizers = new Map(
      normalizers.map((normalizer) => [normalizer.platform, normalizer]),
    );
  }

  normalize(
    platform: ExternalOrderPlatform,
    payload: Record<string, unknown>,
  ): NormalizedExternalOrder {
    const normalizer = this.normalizers.get(platform);
    if (!normalizer) {
      throw new BadRequestException(
        `Nguồn webhook không được hỗ trợ: ${platform}`,
      );
    }

    return normalizer.normalize(payload);
  }
}
