import { ConflictException } from '@nestjs/common';
import { ReturnRequestStatus } from '@prisma/client';
import { assertReturnTransition } from './return-state.machine';

describe('return state machine', () => {
  it('accepts the customer-shipment transition after Shop approval', () => {
    expect(() =>
      assertReturnTransition(
        ReturnRequestStatus.SHOP_APPROVED,
        ReturnRequestStatus.RETURN_SHIPPED,
      ),
    ).not.toThrow();
  });

  it('rejects skipping shipment and inspection to a refund', () => {
    expect(() =>
      assertReturnTransition(
        ReturnRequestStatus.SHOP_APPROVED,
        ReturnRequestStatus.REFUND_PENDING,
      ),
    ).toThrow(ConflictException);
  });

  it('rejects a second completion', () => {
    expect(() =>
      assertReturnTransition(
        ReturnRequestStatus.COMPLETED,
        ReturnRequestStatus.COMPLETED,
      ),
    ).toThrow(ConflictException);
  });

  it('allows an overdue inspection to be disputed by the service', () => {
    expect(() =>
      assertReturnTransition(
        ReturnRequestStatus.RETURN_RECEIVED,
        ReturnRequestStatus.DISPUTED,
      ),
    ).not.toThrow();
  });
});
