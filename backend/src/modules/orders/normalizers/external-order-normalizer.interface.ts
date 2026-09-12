import { OrderStatus } from '@prisma/client';
import { ExternalOrderPlatform } from '../dto/order-webhook.dto';

export interface NormalizedExternalOrderItem {
  productId?: string;
  sku?: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface NormalizedExternalOrder {
  externalOrderId: string;
  internalOrderId?: string;
  platform: ExternalOrderPlatform;
  status: OrderStatus;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: string;
  items: NormalizedExternalOrderItem[];
  subtotalAmount?: number;
  discountAmount?: number;
  totalAmount?: number;
}

export interface ExternalOrderNormalizer {
  readonly platform: ExternalOrderPlatform;

  normalize(payload: Record<string, unknown>): NormalizedExternalOrder;
}
