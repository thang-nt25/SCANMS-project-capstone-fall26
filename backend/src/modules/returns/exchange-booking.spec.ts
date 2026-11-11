import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { ReturnService } from './return.service';
import {
  ReturnRequestStatus,
  ReturnResolution,
  UserRole,
} from '@prisma/client';

const recipient = {
  name: 'Khách A',
  phone: '0912345678',
  address: '15 Đường Số 9, TP Hồ Chí Minh',
  wardName: 'Phường Linh Trung',
  provinceName: 'Hồ Chí Minh',
  weight: 500,
  length: 20,
  width: 15,
  height: 10,
};
const warehouse = {
  name: 'Kho Shop',
  phone: '0901234567',
  address: '12 Đường Số 8, TP Hồ Chí Minh',
  wardName: 'Phường Linh Trung',
  provinceName: 'Hồ Chí Minh',
};

function fixture() {
  const current: any = {
    id: 'a131e4a7-a648-4cbb-b7b2-7d0caef20c19',
    orderId: 'order-1',
    customerId: 'customer-1',
    status: ReturnRequestStatus.EXCHANGE_PENDING,
    resolution: ReturnResolution.EXCHANGE,
    events: [],
    shipments: [],
    order: {
      externalOrderSn: 'DH-1',
      status: 'RETURN_REQUESTED',
      orderItems: [],
      store: { id: 'store-1', ownerId: 'shop-1', returnWarehouse: warehouse },
    },
    items: [
      {
        quantity: 2,
        orderItem: {
          productId: 'product-1',
          variantId: 'variant-1',
          product: { title: 'Serum' },
        },
      },
    ],
  };
  const stock = { product: 8, variant: 8 };
  let tail = Promise.resolve();
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    returnRequest: {
      findUnique: jest.fn(async () => current),
      updateMany: jest.fn(async ({ where, data }) => {
        if (current.status !== where.status) return { count: 0 };
        Object.assign(current, data);
        return { count: 1 };
      }),
    },
    returnShipment: {
      create: jest.fn(async ({ data }) => {
        const row = { id: 'shipment-1', version: 1, ...data };
        current.shipments.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }) =>
        Object.assign(
          current.shipments.find((row) => row.id === where.id),
          data,
        ),
      ),
      delete: jest.fn(async ({ where }) => {
        current.shipments = current.shipments.filter(
          (row) => row.id !== where.id,
        );
      }),
      updateMany: jest.fn(async ({ where, data }) => {
        const rows = current.shipments.filter(
          (row) =>
            (where.id
              ? row.id === where.id
              : row.direction === where.direction) &&
            (where.version == null || row.version === where.version) &&
            (where.receivedAt !== null || !row.receivedAt),
        );
        for (const row of rows)
          Object.assign(row, data, {
            version: row.version + (data.version?.increment || 0),
          });
        return { count: rows.length };
      }),
    },
    returnEvent: {
      create: jest.fn(async ({ data }) => {
        current.events.push({
          id: `event-${current.events.length}`,
          ...structuredClone(data),
        });
      }),
    },
    notification: { create: jest.fn() },
    order: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  for (const [model, bucket] of [
    ['product', 'product'],
    ['productVariant', 'variant'],
  ])
    tx[model] = {
      updateMany: jest.fn(async ({ where, data }) => {
        if (stock[bucket] < where.stockQuantity.gte) return { count: 0 };
        stock[bucket] -= data.stockQuantity.decrement;
        return { count: 1 };
      }),
      update: jest.fn(async ({ data }) => {
        stock[bucket] += data.stockQuantity.increment;
      }),
    };
  const prisma: any = {
    returnRequest: { findFirst: jest.fn(async () => current) },
    returnShipment: {
      findFirst: jest.fn(async () => ({
        ...current.shipments[0],
        returnRequest: current,
      })),
    },
    $transaction: jest.fn((work) => {
      const result = tail.then(async () => {
        const before = structuredClone({ current, stock });
        try {
          return await work(tx);
        } catch (error) {
          Object.assign(current, before.current);
          Object.assign(stock, before.stock);
          throw error;
        }
      });
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    }),
  };
  const gateway: any = {
    mode: jest.fn(() => 'mock'),
    status: jest.fn(async () => 'delivered'),
    book: jest.fn(async () => ({
      provider: 'MOCK',
      carrierName: 'SCANMS Demo',
      trackingNumber: 'SIMX12345',
      providerStatus: 'ready_to_pick',
      feeAmount: 21001,
    })),
  };
  const cache = { delPrefix: jest.fn().mockResolvedValue(undefined) };
  const service: any = new ReturnService(
    prisma,
    {} as never,
    gateway,
    undefined,
    cache as never,
  );
  service.getOne = jest.fn(async () => current);
  return { service, current, stock, tx, gateway, cache };
}

describe('Shop books replacement shipment on the original return case', () => {
  it('sends Shop to customer, reserves stock and records the carrier fee without a new sale', async () => {
    const { service, current, stock, gateway, cache } = fixture();
    await service.bookExchangeShipment(
      'shop-1',
      UserRole.SHOP_MANAGER,
      current.id,
      recipient,
    );
    expect(stock).toEqual({ product: 6, variant: 6 });
    expect(current.status).toBe('EXCHANGE_SHIPPED');
    expect(current.order.status).toBe('RETURN_REQUESTED');
    expect(current.shipments).toHaveLength(1);
    expect(current.shipments[0]).toMatchObject({
      direction: 'SHOP_TO_CUSTOMER',
      trackingNumber: 'SIMX12345',
      feeAmount: 21001,
    });
    expect(gateway.book).toHaveBeenCalledWith(
      expect.objectContaining({
        clientOrderCode: `SC-X-${current.id.replace(/-/g, '')}`,
        pickup: expect.objectContaining({
          name: warehouse.name,
          address: warehouse.address,
          weight: recipient.weight,
        }),
        warehouse: expect.objectContaining({
          name: recipient.name,
          address: recipient.address,
        }),
      }),
    );
    expect(current.events).toContainEqual(
      expect.objectContaining({ type: 'EXCHANGE_INCOME_PRESERVED' }),
    );
    expect(cache.delPrefix).toHaveBeenCalledWith('orders:store:store-1:');
  });

  it('repeated booking cannot reserve or decrement stock twice', async () => {
    const { service, current, stock, gateway } = fixture();
    await service.bookExchangeShipment(
      'shop-1',
      UserRole.SHOP_MANAGER,
      current.id,
      recipient,
    );
    await service.bookExchangeShipment(
      'shop-1',
      UserRole.SHOP_MANAGER,
      current.id,
      recipient,
    );
    expect(stock).toEqual({ product: 6, variant: 6 });
    expect(gateway.book).toHaveBeenCalledTimes(1);
  });

  it('never contacts the carrier if stock is insufficient', async () => {
    const { service, current, stock, gateway } = fixture();
    stock.variant = 1;
    await expect(
      service.bookExchangeShipment(
        'shop-1',
        UserRole.SHOP_MANAGER,
        current.id,
        recipient,
      ),
    ).rejects.toThrow('không đủ tồn kho');
    expect(current.shipments).toHaveLength(0);
    expect(stock.product).toBe(8);
    expect(gateway.book).not.toHaveBeenCalled();
  });

  it('rejects overlapping create calls while the first carrier request is in flight', async () => {
    const { service, current, stock, gateway } = fixture();
    let ready!: () => void;
    let finish!: (value: unknown) => void;
    const entered = new Promise<void>((resolve) => {
      ready = resolve;
    });
    gateway.book.mockImplementationOnce(() => {
      ready();
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const first = service.bookExchangeShipment(
      'shop-1',
      UserRole.SHOP_MANAGER,
      current.id,
      recipient,
    );
    await entered;
    await expect(
      service.bookExchangeShipment(
        'shop-1',
        UserRole.SHOP_MANAGER,
        current.id,
        recipient,
      ),
    ).rejects.toThrow('đang được tạo');
    finish({
      provider: 'MOCK',
      carrierName: 'SCANMS Demo',
      trackingNumber: 'SIMX12345',
      providerStatus: 'ready_to_pick',
      feeAmount: null,
    });
    await first;
    expect(stock.variant).toBe(6);
    expect(gateway.book).toHaveBeenCalledTimes(1);
  });

  it('does not let customers or other shops dispatch the replacement', async () => {
    for (const [user, role] of [
      ['customer-1', UserRole.CUSTOMER],
      ['other-shop', UserRole.SHOP_MANAGER],
    ] as const) {
      const { service, current, gateway } = fixture();
      await expect(
        service.bookExchangeShipment(user, role, current.id, recipient),
      ).rejects.toThrow(ForbiddenException);
      expect(gateway.book).not.toHaveBeenCalled();
    }
  });

  it('preserves a reservation after timeout and retries the exact same carrier client code', async () => {
    const { service, current, stock, gateway } = fixture();
    gateway.book.mockRejectedValueOnce(new BadGatewayException('Timeout'));
    await expect(
      service.bookExchangeShipment(
        'shop-1',
        UserRole.SHOP_MANAGER,
        current.id,
        recipient,
      ),
    ).rejects.toThrow('Timeout');
    expect(current.status).toBe('EXCHANGE_PENDING');
    expect(stock.variant).toBe(6);
    expect(current.shipments[0].providerStatus).toBe('booking_retry');
    // JSONB may reorder keys. This must not make an identical input look different.
    const saved = current.events.find(
      (event) => event.type === 'EXCHANGE_BOOKING_REQUESTED',
    ).data;
    saved.recipient = Object.fromEntries(
      Object.entries(saved.recipient).reverse(),
    );
    await expect(
      service.bookExchangeShipment(
        'shop-1',
        UserRole.SHOP_MANAGER,
        current.id,
        { ...recipient, address: 'Một địa chỉ khác cần được xác nhận' },
      ),
    ).rejects.toThrow('giữ nguyên');
    await service.bookExchangeShipment(
      'shop-1',
      UserRole.SHOP_MANAGER,
      current.id,
      recipient,
    );
    expect(stock.variant).toBe(6);
    expect(current.shipments).toHaveLength(1);
    expect(gateway.book.mock.calls[0][0].clientOrderCode).toBe(
      gateway.book.mock.calls[1][0].clientOrderCode,
    );
  });

  it('releases reserved inventory only when the carrier definitively rejects creation', async () => {
    const { service, current, stock, gateway } = fixture();
    gateway.book.mockRejectedValueOnce(
      new BadGatewayException({
        message: 'Địa chỉ chưa hợp lệ',
        code: 'GHN_CREATE_REJECTED',
      }),
    );
    await expect(
      service.bookExchangeShipment(
        'shop-1',
        UserRole.SHOP_MANAGER,
        current.id,
        recipient,
      ),
    ).rejects.toThrow('Địa chỉ');
    expect(stock).toEqual({ product: 8, variant: 8 });
    expect(current.status).toBe('EXCHANGE_PENDING');
    expect(current.shipments).toHaveLength(0);
    await service.bookExchangeShipment(
      'shop-1',
      UserRole.SHOP_MANAGER,
      current.id,
      recipient,
    );
    expect(stock.variant).toBe(6);
  });

  it('does not release a timed-out reservation merely because recovery returns an auth error', async () => {
    const { service, current, stock, gateway } = fixture();
    gateway.book.mockRejectedValueOnce(new BadGatewayException('Timeout'));
    await expect(
      service.bookExchangeShipment(
        'shop-1',
        UserRole.SHOP_MANAGER,
        current.id,
        recipient,
      ),
    ).rejects.toThrow();
    gateway.book.mockRejectedValueOnce(
      new BadGatewayException({
        message: 'Token expired',
        code: 'GHN_CREATE_REJECTED',
      }),
    );
    await expect(
      service.bookExchangeShipment(
        'shop-1',
        UserRole.SHOP_MANAGER,
        current.id,
        recipient,
      ),
    ).rejects.toThrow('Token expired');
    expect(stock.variant).toBe(6);
    expect(current.shipments[0].providerStatus).toBe('booking_retry');
    await service.bookExchangeShipment(
      'shop-1',
      UserRole.SHOP_MANAGER,
      current.id,
      recipient,
    );
    expect(stock.variant).toBe(6);
  });

  it('keeps the reservation if final persistence fails after carrier creation', async () => {
    const { service, current, stock, tx, gateway } = fixture();
    tx.returnRequest.updateMany.mockRejectedValueOnce(
      new Error('DB unavailable'),
    );
    await expect(
      service.bookExchangeShipment(
        'shop-1',
        UserRole.SHOP_MANAGER,
        current.id,
        recipient,
      ),
    ).rejects.toThrow('DB unavailable');
    expect(stock.variant).toBe(6);
    expect(current.shipments[0].providerStatus).toBe('booking');
    current.shipments[0].bookedAt = new Date(Date.now() - 31000);
    await service.bookExchangeShipment(
      'shop-1',
      UserRole.SHOP_MANAGER,
      current.id,
      recipient,
    );
    expect(stock.variant).toBe(6);
    expect(gateway.book.mock.calls[0][0].clientOrderCode).toBe(
      gateway.book.mock.calls[1][0].clientOrderCode,
    );
  });

  it('carrier delivery leaves the case open until the customer acknowledges receipt', async () => {
    const { service, current } = fixture();
    await service.bookExchangeShipment(
      'shop-1',
      UserRole.SHOP_MANAGER,
      current.id,
      recipient,
    );
    await expect(
      service.confirmExchangeReceipt(
        'customer-1',
        UserRole.CUSTOMER,
        current.id,
      ),
    ).rejects.toThrow('chưa báo giao thành công');
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    try {
      await service.simulateExchangeShipment(
        'shop-1',
        UserRole.SHOP_MANAGER,
        current.id,
        'delivered',
      );
    } finally {
      process.env.NODE_ENV = before;
    }
    expect(current.status).toBe('EXCHANGE_SHIPPED');
    expect(current.shipments[0].receivedAt).toBeUndefined();
    await service.confirmExchangeReceipt(
      'customer-1',
      UserRole.CUSTOMER,
      current.id,
    );
    expect(current.status).toBe('AWAITING_CUSTOMER_CONFIRMATION');
    await service.confirmCompletion(
      'customer-1',
      UserRole.CUSTOMER,
      current.id,
    );
    expect(current.status).toBe('COMPLETED');
  });
});
