import { LiveGovernanceService } from './live-governance.service';
import { UserRole } from '@prisma/client';

describe('Live governance and dispute permissions', () => {
  let service: LiveGovernanceService;
  let session: any;
  let tx: any;
  let gateway: any;
  const shop = UserRole.SHOP_MANAGER;
  const kol = UserRole.COLLABORATOR;
  const manager = UserRole.SYSTEM_MANAGER;
  const admin = UserRole.SYSTEM_ADMIN;
  const act = (user: string, role: UserRole, action: string, extra: any = {}) =>
    service.act(user, role, 'session', {
      action,
      message: 'Nội dung đối chiếu đầy đủ',
      ...extra,
    });

  beforeEach(() => {
    session = {
      id: 'session',
      storeId: 'store',
      creatorId: 'kol',
      title: 'Live',
      status: 'LIVE',
      inviteStatus: 'ACCEPTED',
      startsAt: new Date(Date.now() - 60000),
      endsAt: new Date(Date.now() + 3600000),
      commissionRate: 10,
      description: 'Thỏa thuận đã xác nhận',
      products: [],
      coupon: { id: 'coupon', displayCode: 'LIVE10' },
      store: { ownerId: 'shop', liveRestrictionUntil: null },
      governance: {},
    };
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      liveShoppingSession: {
        findUnique: jest.fn(async () => structuredClone(session)),
        update: jest.fn(async ({ data }) => {
          Object.assign(session, data);
          return session;
        }),
      },
      order: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            {
              id: 'order',
              status: 'PENDING',
              finalAmount: '100000',
              couponDiscountAmount: '10000',
            },
          ]),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      coupon: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      liveSessionClaim: { count: jest.fn().mockResolvedValue(2) },
      liveSessionViewer: { count: jest.fn().mockResolvedValue(8), updateMany: jest.fn().mockResolvedValue({ count: 8 }) },
      notification: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        deleteMany: jest.fn(),
      },
      auditLog: { create: jest.fn() },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'staff' }]) },
      store: {
        update: jest.fn(),
        findUniqueOrThrow: jest.fn(async () => session.store),
      },
    };
    gateway = { endSession: jest.fn(), notifyGovernanceChanged: jest.fn() };
    service = new LiveGovernanceService(
      {
        $transaction: (callback: any) => callback(tx),
        liveShoppingSession: tx.liveShoppingSession,
      } as any,
      gateway,
    );
  });

  it('requesting an end preserves broadcasting until the KOL accepts', async () => {
    await act('shop', shop, 'REQUEST_END', { reason: 'OUT_OF_STOCK' });
    expect(session.status).toBe('LIVE');
    expect(session.governance.request.status).toBe('PENDING');
    expect(gateway.endSession).not.toHaveBeenCalled();
    await act('kol', kol, 'REJECT_END');
    expect(session.status).toBe('LIVE');
    expect(session.governance.request.status).toBe('REJECTED');
  });

  it('accepting ends the stream and snapshots existing terms without mutating orders', async () => {
    await act('shop', shop, 'REQUEST_END', { reason: 'TECHNICAL' });
    await act('kol', kol, 'ACCEPT_END');
    expect(session.status).toBe('ENDED');
    expect(session.governance.preserveOrderTerms).toBe(true);
    expect(session.governance.snapshot.orders[0].finalAmount).toBe('100000');
    expect(session.governance.snapshot.description).toBe(
      'Thỏa thuận đã xác nhận',
    );
    expect(tx.order.update).not.toHaveBeenCalled();
    expect(tx.order.updateMany).not.toHaveBeenCalled();
    expect(gateway.endSession).toHaveBeenCalledWith('session');
  });

  it('emergency requires a reason and notifies the assigned KOL', async () => {
    await expect(act('shop', shop, 'EMERGENCY_STOP')).rejects.toThrow(
      'chọn lý do',
    );
    await act('shop', shop, 'EMERGENCY_STOP', { reason: 'OTHER' });
    expect(session.status).toBe('ENDED');
    expect(tx.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: 'kol' }),
        ]),
      }),
    );
  });

  it('rejects another shop or KOL and forbids public dossier access', async () => {
    await expect(
      act('other-shop', shop, 'EMERGENCY_STOP', { reason: 'OTHER' }),
    ).rejects.toThrow('quyền');
    await expect(act('other-kol', kol, 'ACCEPT_END')).rejects.toThrow('quyền');
    await expect(
      service.get('customer', UserRole.CUSTOMER, 'session'),
    ).rejects.toThrow('không được xem');
  });

  it('records a full complaint, explanation, decision and final appeal, with original decision retained', async () => {
    await act('shop', shop, 'EMERGENCY_STOP', { reason: 'OTHER' });
    await act('kol', kol, 'COMPLAIN', {
      evidence: ['https://example.com/proof.jpg'],
    });
    await expect(act('kol', kol, 'COMPLAIN')).rejects.toThrow('đã có hồ sơ');
    await act('shop', shop, 'EXPLAIN');
    await act('staff', manager, 'DECIDE', {
      outcome: 'SHOP_FAULT',
      sanction: 'WARNING',
    });
    expect(session.governance.dispute.status).toBe('RESOLVED');
    await act('kol', kol, 'APPEAL');
    await expect(
      act('staff', manager, 'DECIDE_APPEAL', { outcome: 'SHOP_FAULT' }),
    ).rejects.toThrow('quyền');
    await act('super', admin, 'DECIDE_APPEAL', {
      outcome: 'SHOP_FAULT',
      sanction: 'RESTRICT',
      restrictionDays: 7,
    });
    expect(session.governance.dispute.status).toBe('CLOSED');
    expect(session.governance.dispute.decision.sanction).toBe('WARNING');
    expect(session.governance.dispute.finalDecision.sanction).toBe('RESTRICT');
    expect(tx.store.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { liveRestrictionUntil: expect.any(Date) },
      }),
    );
    expect(session.governance.timeline).toHaveLength(6);
    await expect(act('shop', shop, 'APPEAL')).rejects.toThrow('Chỉ kháng nghị');
  });

  it('only Super Admin can impose blocking or lift an existing restriction', async () => {
    session.governance = { dispute: { status: 'OPEN' } };
    await expect(
      act('staff', manager, 'DECIDE', {
        outcome: 'SHOP_FAULT',
        sanction: 'BLOCK',
      }),
    ).rejects.toThrow('quyền');
    await act('super', admin, 'DECIDE', {
      outcome: 'SHOP_FAULT',
      sanction: 'BLOCK',
    });
    expect(tx.store.update).toHaveBeenCalledWith({
      where: { id: 'store' },
      data: { liveCooperationBlocked: true },
    });
  });

  it('does not allow sanctions without fault or compensation without a shop explanation', async () => {
    session.governance = { dispute: { status: 'OPEN' } };
    await expect(
      act('staff', manager, 'DECIDE', {
        outcome: 'NO_FAULT',
        sanction: 'WARNING',
      }),
    ).rejects.toThrow('Shop có lỗi');
    await expect(
      act('staff', manager, 'DECIDE', {
        outcome: 'SHOP_FAULT',
        compensation: 100000,
      }),
    ).rejects.toThrow('giải trình');
    session.governance.dispute.explanation = { message: 'Giải trình' };
    await act('staff', manager, 'DECIDE', {
      outcome: 'SHOP_FAULT',
      compensation: 100000,
    });
    expect(session.governance.dispute.decision.compensationStatus).toBe(
      'PENDING_SETTLEMENT',
    );
  });

  it('escalation prevents Operations from deciding a severe case', async () => {
    session.governance = { dispute: { status: 'OPEN' } };
    await act('staff', manager, 'ESCALATE');
    await expect(
      act('staff', manager, 'DECIDE', { outcome: 'SHOP_FAULT' }),
    ).rejects.toThrow('Trạng thái');
    await act('super', admin, 'DECIDE_APPEAL', { outcome: 'NO_FAULT' });
    expect(session.governance.dispute.status).toBe('CLOSED');
  });
});
