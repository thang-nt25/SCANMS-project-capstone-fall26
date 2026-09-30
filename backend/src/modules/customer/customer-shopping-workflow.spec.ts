import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { CustomerService } from './customer.service';

describe('Customer shopping rules', () => {
  function serviceWith(prisma: object) {
    return Object.assign(Object.create(CustomerService.prototype), { prisma }) as CustomerService;
  }

  it('uses the delivery date, not a later order update, for the 14-day window', async () => {
    const prisma = { $transaction: jest.fn() };
    const service = serviceWith(prisma);
    jest.spyOn(service, 'getOrderDetails').mockResolvedValue({
      status: OrderStatus.COMPLETED,
      deliveredAt: new Date(Date.now() - 15 * 86400000),
      completedAt: new Date(),
      updatedAt: new Date(),
      returnRequest: null,
    } as any);
    await expect(service.createReturnRequest('customer-1', 'order-1', {
      reason: 'DAMAGED', imageUrls: ['https://example.com/image.jpg'],
      unboxingVideoUrl: 'https://example.com/video.mp4',
    } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('stores the original status and customer identity when a return is requested', async () => {
    const tx = {
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      returnRequest: { create: jest.fn().mockResolvedValue({ id: 'request-1' }) },
      notification: { create: jest.fn() },
    };
    const prisma = { $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = serviceWith(prisma);
    jest.spyOn(service, 'getOrderDetails').mockResolvedValue({
      status: OrderStatus.COMPLETED,
      deliveredAt: new Date(Date.now() - 86400000),
      returnRequest: null,
      store: { ownerId: 'owner-1' }, externalOrderSn: 'S-001',
    } as any);
    await service.createReturnRequest('customer-1', 'order-1', {
      reason: 'DAMAGED', imageUrls: ['https://example.com/image.jpg'],
      unboxingVideoUrl: 'https://example.com/video.mp4',
    } as any);
    expect(tx.returnRequest.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      customerId: 'customer-1', originalOrderStatus: OrderStatus.COMPLETED,
    }) });
  });

  it('rejects a review unless the order is completed', async () => {
    const prisma = { productReview: { create: jest.fn() } };
    const service = serviceWith(prisma);
    jest.spyOn(service, 'getOrderDetails').mockResolvedValue({ status: OrderStatus.DELIVERED } as any);
    await expect(service.createVerifiedReview('customer-1', 'order-1', {
      productId: 'product-1', rating: 5, comment: 'Sản phẩm tốt',
    } as any)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productReview.create).not.toHaveBeenCalled();
  });

  it('replaces only the signed-in customer cart in PostgreSQL', async () => {
    const tx = {
      customerCartItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    const prisma = {
      product: { findMany: jest.fn().mockResolvedValue([{
        id: 'product-1', isActive: true, stockQuantity: 8, variants: [],
      }]) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = serviceWith(prisma);
    jest.spyOn(service, 'getCart').mockResolvedValue({ items: [], syncedAt: new Date().toISOString() });
    await service.syncCart('customer-1', { items: [{ productId: 'product-1', quantity: 2 }] } as any);
    expect(tx.customerCartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: 'customer-1' } });
    expect(tx.customerCartItem.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({
      userId: 'customer-1', productId: 'product-1', quantity: 2,
    })] });
  });
});
