import { OrdersService } from './orders.service';
import { OrderStatus, UserRole } from '@prisma/client';

describe('shop confirmation', () => {
  const setup = (raw: any = {}, status = OrderStatus.PENDING) => {
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
    return { service: service as OrdersService, tx };
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
