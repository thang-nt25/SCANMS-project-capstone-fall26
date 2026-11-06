import { Prisma } from '@prisma/client';
import { ReturnService } from './return.service';

describe('Flow 4 partial return allocation', () => {
  const service = Object.create(ReturnService.prototype) as ReturnService;
  const refundAmount = (request: unknown) => (service as unknown as {
    returnAmount(value: unknown): Prisma.Decimal;
  }).returnAmount(request);

  it('refunds only the selected item share of the paid total, including allocated discounts and delivery', () => {
    const request = {
      items: [{ orderItemId: 'item-a', quantity: 1, unitPrice: new Prisma.Decimal(500000) }],
      order: {
        finalAmount: new Prisma.Decimal(900000), refundedAmount: new Prisma.Decimal(0),
        orderItems: [
          { id: 'item-a', quantity: 1, unitPrice: new Prisma.Decimal(500000) },
          { id: 'item-b', quantity: 1, unitPrice: new Prisma.Decimal(500000) },
        ],
      },
    };
    expect(refundAmount(request).toString()).toBe('450000');
    expect(refundAmount({ ...request, items: request.order.orderItems.map(item => ({
      orderItemId: item.id, quantity: item.quantity, unitPrice: item.unitPrice,
    })) }).toString()).toBe('900000');
  });
});
