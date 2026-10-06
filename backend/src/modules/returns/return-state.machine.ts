import { ConflictException } from '@nestjs/common';
import { ReturnRequestStatus } from '@prisma/client';

// Legacy states remain valid because existing requests and the current Shop UI use them.
const allowed: Partial<
  Record<ReturnRequestStatus, readonly ReturnRequestStatus[]>
> = {
  REQUESTED: ['SHOP_APPROVED', 'SHOP_REJECTED'],
  SHOP_APPROVED: ['PICKUP_BOOKED', 'RETURN_SHIPPED', 'EXPIRED'],
  PICKUP_BOOKED: ['RETURN_SHIPPED', 'RETURN_RECEIVED', 'DISPUTED'],
  RETURN_SHIPPED: ['RETURN_RECEIVED'],
  RETURN_RECEIVED: ['INSPECTING', 'DISPUTED'],
  INSPECTING: [
    'INSPECTION_REJECTED',
    'REFUND_PENDING',
    'EXCHANGE_PENDING',
    'DISPUTED',
  ],
  REFUND_PENDING: ['REFUND_PROCESSING', 'REFUND_FAILED'],
  REFUND_PROCESSING: ['REFUND_FAILED', 'AWAITING_CUSTOMER_CONFIRMATION'],
  REFUND_FAILED: ['REFUND_PROCESSING', 'DISPUTED'],
  EXCHANGE_PENDING: ['EXCHANGE_SHIPPED'],
  EXCHANGE_SHIPPED: ['AWAITING_CUSTOMER_CONFIRMATION', 'COMPLETED'],
  AWAITING_CUSTOMER_CONFIRMATION: ['COMPLETED'],
  SHOP_REJECTED: ['DISPUTED'],
  EXPIRED: ['DISPUTED'],
  INSPECTION_REJECTED: ['DISPUTED'],
  DISPUTED: ['REFUND_PENDING', 'EXCHANGE_PENDING', 'CLOSED'],
};

export function assertReturnTransition(
  from: ReturnRequestStatus,
  to: ReturnRequestStatus,
) {
  if (!allowed[from]?.includes(to)) {
    throw new ConflictException(
      `Không thể chuyển hồ sơ đổi trả từ ${from} sang ${to}`,
    );
  }
}
