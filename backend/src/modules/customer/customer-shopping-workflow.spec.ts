import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { CustomerService } from './customer.service';

describe('Customer shopping rules', () => {
  it('does not let a shared recipient contact review another account order', async () => {
    const prisma = { productReview: { create: jest.fn() } };
    const service = serviceWith(prisma);
    jest.spyOn(service, 'getOrderDetails').mockResolvedValue({ customerId: 'other-buyer', status: OrderStatus.COMPLETED } as any);
    await expect(service.createVerifiedReview('buyer', 'order', { productId: 'product', rating: 5, comment: 'Sản phẩm dùng rất tốt' })).rejects.toMatchObject({ status: 403 });
    expect(prisma.productReview.create).not.toHaveBeenCalled();
  });
  it('publishes a valid completed-order review without Shop approval', async () => {
    const prisma = { productReview: { create: jest.fn().mockResolvedValue({ id: 'review' }) } };
    const service = serviceWith(prisma);
    jest.spyOn(service, 'getOrderDetails').mockResolvedValue({
      status: OrderStatus.COMPLETED, customerName: 'Buyer', returnRequest: null,
      orderItems: [{ productId: 'product' }], productReviews: [],
    } as any);
    await service.createVerifiedReview('buyer', 'order', { productId: 'product', rating: 4, comment: '  Sản phẩm dùng rất tốt  ' });
    expect(prisma.productReview.create).toHaveBeenCalledWith({ data: expect.objectContaining({ orderId: 'order', productId: 'product', rating: 4, comment: 'Sản phẩm dùng rất tốt', isApproved: true, status: 'APPROVED' }) });
  });
  it.each(['PENDING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'RETURNED'])('rejects reviews before successful completion: %s', async status => {
    const prisma = { productReview: { create: jest.fn() } };
    const service = serviceWith(prisma);
    jest.spyOn(service, 'getOrderDetails').mockResolvedValue({ status } as any);
    await expect(service.createVerifiedReview('buyer', 'order', { productId: 'product', rating: 5, comment: 'Sản phẩm dùng rất tốt' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productReview.create).not.toHaveBeenCalled();
  });
  it.each(['foreign-product', 'duplicate', 'return'])('blocks ineligible completed-order review: %s', async reason => {
    const prisma = { productReview: { create: jest.fn() } };
    const service = serviceWith(prisma);
    jest.spyOn(service, 'getOrderDetails').mockResolvedValue({ status: OrderStatus.COMPLETED,
      returnRequest: reason === 'return' ? {} : null, orderItems: [{ productId: 'product' }],
      productReviews: reason === 'duplicate' ? [{ productId: 'product' }] : [],
    } as any);
    await expect(service.createVerifiedReview('buyer', 'order', { productId: reason === 'foreign-product' ? 'other' : 'product', rating: 5, comment: 'Sản phẩm dùng rất tốt' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productReview.create).not.toHaveBeenCalled();
  });
  function serviceWith(prisma: object) {
    return Object.assign(Object.create(CustomerService.prototype), {
      prisma,
      cacheService: { delPrefix: jest.fn().mockResolvedValue(undefined) },
    }) as CustomerService;
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
      orderItems: [{ id: 'line-1', quantity: 1, unitPrice: '100000.00' }],
    } as any);
    await expect(
      service.createReturnRequest('customer-1', 'order-1', {
        reason: 'DAMAGED',
        imageUrls: ['https://example.com/image.jpg'],
        unboxingVideoUrl: 'https://example.com/video.mp4',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('stores the original status and customer identity when a return is requested', async () => {
    const tx = {
      order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      returnRequest: {
        create: jest.fn().mockResolvedValue({ id: 'request-1' }),
      },
      returnEvent: { create: jest.fn() },
      notification: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = serviceWith(prisma);
    jest.spyOn(service, 'getOrderDetails').mockResolvedValue({
      status: OrderStatus.COMPLETED,
      deliveredAt: new Date(Date.now() - 86400000),
      returnRequest: null,
      store: { ownerId: 'owner-1' },
      externalOrderSn: 'S-001',
      orderItems: [{ id: 'line-1', quantity: 2, unitPrice: '100000.00' }],
    } as any);
    await service.createReturnRequest('customer-1', 'order-1', {
      reason: 'DAMAGED',
      imageUrls: ['https://example.com/image.jpg'],
      unboxingVideoUrl: 'https://example.com/video.mp4',
    } as any);
    expect(tx.returnRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'customer-1',
        originalOrderStatus: OrderStatus.COMPLETED,
        reason: 'DAMAGED',
        unboxingVideoUrl: 'https://example.com/video.mp4',
      }),
    });
    expect(tx.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'owner-1',
        title: 'Yêu cầu đổi trả mới',
        message: expect.stringContaining('S-001'),
        type: 'RETURN_REQUESTED',
        data: { orderId: 'order-1', returnRequestId: 'request-1' },
      },
    });
  });

  it('rejects a review unless the order is completed', async () => {
    const prisma = { productReview: { create: jest.fn() } };
    const service = serviceWith(prisma);
    jest
      .spyOn(service, 'getOrderDetails')
      .mockResolvedValue({ status: OrderStatus.DELIVERED } as any);
    await expect(
      service.createVerifiedReview('customer-1', 'order-1', {
        productId: 'product-1',
        rating: 5,
        comment: 'Sản phẩm tốt',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productReview.create).not.toHaveBeenCalled();
  });

  it('notifies the customer when they confirm receipt and complete the order', async () => {
    const notificationCreate = jest.fn();
    const completedOrder = {
      id: 'order-1',
      externalOrderSn: 'DH-2026-ABC123',
      customerId: 'customer-1',
      status: OrderStatus.COMPLETED,
    };
    const tx = {
      order: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(completedOrder),
      },
      notification: { create: notificationCreate },
    };
    const service = serviceWith({
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    });
    jest.spyOn(service, 'getOrderDetails').mockResolvedValue({
      id: 'order-1',
      externalOrderSn: 'DH-2026-ABC123',
      customerId: 'customer-1',
      status: OrderStatus.DELIVERED,
      returnRequest: null,
    } as any);

    await service.confirmReceipt('customer-1', 'order-1');

    expect(notificationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'customer-1',
        type: 'ORDER_COMPLETED',
        data: expect.objectContaining({ actionUrl: '/customer/orders' }),
      }),
    });
  });

  it('replaces only the signed-in customer cart in PostgreSQL', async () => {
    const tx = {
      customerCartItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    const prisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'product-1',
            isActive: true,
            moderationStatus: 'APPROVED',
            stockQuantity: 8,
            variants: [],
          },
        ]),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = serviceWith(prisma);
    jest
      .spyOn(service, 'getCart')
      .mockResolvedValue({ items: [], syncedAt: new Date().toISOString() });
    await service.syncCart('customer-1', {
      items: [{ productId: 'product-1', quantity: 2 }],
    });
    expect(tx.customerCartItem.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'customer-1' },
    });
    expect(tx.customerCartItem.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'customer-1',
          productId: 'product-1',
          quantity: 2,
        }),
      ],
    });
  });
});
