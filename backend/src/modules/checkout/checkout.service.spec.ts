import { CheckoutService } from './checkout.service';
import { ReferralLinksService } from '../referral-links/referral-links.service';
import { signAttributionToken } from '../referral-links/utils/short-code.generator';

describe('Checkout bonus reservations and immutable snapshots', () => {
  const campaignId = '11111111-1111-4111-8111-111111111111';
  const dto = { storeId: 'shop', customerName: 'Test', customerPhone: '0900000000',
    items: [{ productId: 'product', quantity: 1, unitPrice: 100000 }] };
  const token = signAttributionToken({ storeId: 'shop', productId: 'product', shortCode: 'test' }, 'test-secret');

  function fixture(reserved: number) {
    const tx = { $executeRaw: jest.fn().mockResolvedValue(reserved),
      order: { create: jest.fn().mockResolvedValue({ id: 'order' }) },
      orderItem: { create: jest.fn() } };
    const prisma = { store: { findUnique: jest.fn().mockResolvedValue({ id: 'shop' }) },
      order: { findUnique: jest.fn().mockResolvedValue({ id: 'order' }) },
      $transaction: jest.fn((fn: any) => fn(tx)) };
    const links = { verifyAttributionForOrder: jest.fn().mockResolvedValue({ isValid: true,
      collaboratorId: 'kol', referralLinkId: 'link', appliedCommissionRate: 14,
      campaignId, campaignBonus: 2 }), recordOrderAttribution: jest.fn() };
    const service = new CheckoutService(prisma as any, { get: () => 'test-secret' } as any, links as any);
    return { service, tx, links };
  }

  it('reserves only campaign bonus and records the reservation for cancellation/refund', async () => {
    const { service, tx } = fixture(1);
    await service.processCheckout(dto, token);
    expect(tx.$executeRaw).toHaveBeenCalledWith(expect.anything(), 2000, campaignId, 2000);
    expect(tx.order.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      rawPayload: { campaignBonusReservations: { [campaignId]: 2000 } },
    }) }));
    expect(tx.orderItem.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      appliedCommissionRate: 14, calculatedCommissionAmount: 14000, commissionSnapshotAt: expect.any(Date),
    }) }));
  });

  it('does not create an order when the atomic budget update loses a race or exceeds the cap', async () => {
    const { service, tx, links } = fixture(0);
    await expect(service.processCheckout(dto, token)).rejects.toThrow('Ngân sách');
    expect(tx.order.create).not.toHaveBeenCalled();
    expect(links.recordOrderAttribution).not.toHaveBeenCalled();
  });

  it('does not overwrite historical commission while attaching a referral link again', async () => {
    const tx = { order: { findUnique: jest.fn().mockResolvedValue({ id: 'order', referralLinkId: 'link' }), update: jest.fn() },
      referralLink: { findUnique: jest.fn().mockResolvedValue({ id: 'link', productId: 'product', product: { price: 250000 }, totalOrders: 1 }) },
      orderItem: { findMany: jest.fn().mockResolvedValue([{ id: 'item', commissionSnapshotAt: new Date(),
        appliedCommissionRate: 15, calculatedCommissionAmount: 37500 }]), update: jest.fn() } };
    const service = Object.assign(Object.create(ReferralLinksService.prototype), {
      prisma: { $transaction: (fn: any) => fn(tx) },
    }) as ReferralLinksService;
    await service.recordOrderAttribution({ orderId: 'order', referralLinkId: 'link', collaboratorId: 'kol', appliedCommissionRate: 10 });
    expect(tx.orderItem.update).toHaveBeenCalledWith({ where: { id: 'item' }, data: { referralLinkId: 'link' } });
  });
});
