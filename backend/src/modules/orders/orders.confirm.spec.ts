import { OrdersService } from './orders.service';
import { OrderStatus, UserRole } from '@prisma/client';

describe('shop confirmation', () => {
  const setup = (raw: any = {}, status: OrderStatus = OrderStatus.PENDING) => {
    const tx = {
      $queryRaw: jest.fn(),
      user: { findUnique: jest.fn().mockResolvedValue({ storeId: 'store' }) },
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: 'order', storeId: 'store', store: { ownerId: 'owner' }, status, rawPayload: raw }),
        update: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    const service = Object.create(OrdersService.prototype);
    service.prisma = { $transaction: (cb: any) => cb(tx) };
    const cache = { delPrefix: jest.fn().mockResolvedValue(undefined) };
    service.cacheService = cache;
    return { service: service as OrdersService, tx, cache };
  };
  it('allows the assigned manager and persists confirmation without shipping', async () => {
    const { service, tx } = setup({ paymentMethod: 'COD' });
    await service.confirmOrder('order', 'assigned', UserRole.SHOP_MANAGER);
    expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: { rawPayload: expect.objectContaining({ shopConfirmedBy: 'assigned', shopConfirmedAt: expect.any(String) }) } }));
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it('is idempotent', async () => {
    const { service, tx } = setup({ shopConfirmedAt: 'saved' });
    await service.confirmOrder('order', 'owner', UserRole.SHOP_MANAGER);
    expect(tx.order.update).not.toHaveBeenCalled();
  });
  it('invalidates cached lists after commit and returns the persisted timestamp', async () => {
    const { service, tx, cache } = setup({ paymentMethod: 'COD' });
    let committed = false;
    (service as any).prisma.$transaction = async (callback: any) => {
      const result = await callback(tx);
      committed = true;
      return result;
    };
    cache.delPrefix.mockImplementation(async () => { expect(committed).toBe(true); });
    const result = await service.confirmOrder('order', 'owner', UserRole.SHOP_MANAGER);
    expect(cache.delPrefix).toHaveBeenCalledWith('orders:store:');
    expect(result.shopConfirmedAt).toBe(tx.order.update.mock.calls[0][0].data.rawPayload.shopConfirmedAt);
  });
  it('rejects another store manager', async () => {
    const { service, tx } = setup();
    tx.user.findUnique.mockResolvedValue({ storeId: 'other' });
    await expect(service.confirmOrder('order', 'other', UserRole.SHOP_MANAGER)).rejects.toThrow('quyền');
  });
  it('rejects unpaid online orders', async () => {
    const { service } = setup({ paymentMethod: 'PAYOS', paymentStatus: 'UNPAID' });
    await expect(service.confirmOrder('order', 'owner', UserRole.SHOP_MANAGER)).rejects.toThrow('thanh toán');
  });
  it('rejects cancelled orders', async () => {
    const { service } = setup({}, OrderStatus.CANCELLED);
    await expect(service.confirmOrder('order', 'owner', UserRole.SHOP_MANAGER)).rejects.toThrow('chờ xử lý');
  });
});
