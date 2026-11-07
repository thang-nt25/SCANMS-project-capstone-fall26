import { OrderStatus } from '@prisma/client';

export const COMMISSION_HOLD_DAYS = 14;
export const COMMISSION_PROCESSING_BATCH_SIZE = 100;

export const COMMISSION_ELIGIBLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

export const COMMISSION_REVERSAL_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.RETURNED,
];
