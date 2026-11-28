import { StoreCollaboratorsService } from '../store-collaborators.service';
import { UserRole } from '@prisma/client';

describe('Store cooperation requests', () => {
  let prisma: any;
  let service: StoreCollaboratorsService;
  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ role: 'SHOP_MANAGER' }),
      },
      store: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'store', ownerId: 'owner' }),
      },
      storeCollaborator: {
        findUnique: jest.fn(),
        create: jest
          .fn()
          .mockResolvedValue({ status: 'PENDING', requestedByKol: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new StoreCollaboratorsService(prisma);
  });
  it('creates a KOL request pending shop approval', async () => {
    await service.requestCooperation('kol', 'store');
    expect(prisma.storeCollaborator.create).toHaveBeenCalledWith({
      data: {
        storeId: 'store',
        collaboratorId: 'kol',
        requestedByKol: true,
        status: 'PENDING',
        note: null,
      },
    });
  });
  it('does not replace an approved relationship or duplicate pending request', async () => {
    for (const status of ['APPROVED', 'PENDING']) {
      prisma.storeCollaborator.findUnique.mockResolvedValue({
        status,
        requestedByKol: true,
      });
      await service.requestCooperation('kol', 'store');
    }
    expect(prisma.storeCollaborator.create).not.toHaveBeenCalled();
    expect(prisma.storeCollaborator.updateMany).not.toHaveBeenCalled();
  });

  it('stores the KOC cooperation plan without changing its approval direction', async () => {
    await service.requestCooperation(
      'kol',
      'store',
      '  Review hai video mỗi tháng.  ',
    );
    expect(prisma.storeCollaborator.create).toHaveBeenCalledWith({
      data: {
        storeId: 'store',
        collaboratorId: 'kol',
        requestedByKol: true,
        status: 'PENDING',
        note: 'Review hai video mỗi tháng.',
      },
    });
  });

  it('does not overwrite a KOC request created concurrently with a Shop invitation', async () => {
    prisma.user.findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'kol', email: 'kol@example.test' });
    prisma.storeCollaborator.findUnique.mockResolvedValue(null);
    prisma.storeCollaborator.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      service.invite('owner', { email: 'kol@example.test' }),
    ).rejects.toThrow('yêu cầu hợp tác mới');
    expect(prisma.storeCollaborator.updateMany).not.toHaveBeenCalled();
  });

  it('does not overwrite a rejection which another party has already reopened', async () => {
    prisma.user.findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'kol', email: 'kol@example.test' });
    prisma.storeCollaborator.findUnique.mockResolvedValue({
      id: 'request',
      status: 'REJECTED',
    });
    prisma.storeCollaborator.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.invite('owner', { email: 'kol@example.test' }),
    ).rejects.toThrow('đã thay đổi');
    expect(prisma.storeCollaborator.create).not.toHaveBeenCalled();
  });
  it('does not reverse a shop invitation into a KOL request', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({
      status: 'PENDING',
      requestedByKol: false,
    });
    await expect(service.requestCooperation('kol', 'store')).rejects.toThrow(
      'Shop đã mời',
    );
  });
  it('prevents KOL from approving their own request', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({
      collaboratorId: 'kol',
      requestedByKol: true,
      status: 'PENDING',
    });
    await expect(service.respond('kol', 'req', true)).rejects.toThrow(
      'Shop duyệt',
    );
    expect(prisma.storeCollaborator.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a different shop owner', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({ storeId: 'store' });
    prisma.store.findFirst.mockResolvedValue(null);
    await expect(
      service.reviewRequest('other-owner', 'req', true),
    ).rejects.toThrow();
    expect(prisma.storeCollaborator.updateMany).not.toHaveBeenCalled();
  });
  it('shop decision is restricted to a pending KOL request', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({ storeId: 'store' });
    await service.reviewRequest('owner', 'req', true);
    expect(prisma.storeCollaborator.updateMany).toHaveBeenCalledWith({
      where: { id: 'req', requestedByKol: true, status: 'PENDING' },
      data: { status: 'APPROVED', approvedAt: expect.any(Date) },
    });
  });
  it('cannot overwrite an already processed decision', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({ storeId: 'store' });
    prisma.storeCollaborator.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.reviewRequest('owner', 'req', false)).rejects.toThrow(
      'đã xử lý',
    );
  });

  it('accepts an assigned manager and scopes the decision to the requested store', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({ storeId: 'store' });
    await service.reviewRequest('staff', 'req', true);
    expect(prisma.store.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'store',
          OR: expect.arrayContaining([
            {
              staffMembers: {
                some: {
                  id: 'staff',
                  role: 'SHOP_MANAGER',
                  isActive: true,
                  isDeleted: false,
                },
              },
            },
          ]),
        }),
      }),
    );
    expect(prisma.storeCollaborator.updateMany).toHaveBeenCalledTimes(1);
  });

  it('does not allow customers or collaborators to review a shop request', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({ storeId: 'store' });
    for (const role of ['CUSTOMER', 'COLLABORATOR']) {
      prisma.user.findUnique.mockResolvedValue({ role });
      await expect(service.reviewRequest('user', 'req', true)).rejects.toThrow(
        'không có quyền',
      );
    }
    expect(prisma.storeCollaborator.updateMany).not.toHaveBeenCalled();
  });

  it('does not fall back to a different store when an admin supplies a missing store', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'SYSTEM_ADMIN' });
    prisma.storeCollaborator.findUnique.mockResolvedValue({
      storeId: 'missing',
    });
    prisma.store.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ id: 'unrelated-store' });
    await expect(service.reviewRequest('admin', 'req', true)).rejects.toThrow(
      'Không tìm thấy',
    );
    expect(prisma.store.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.storeCollaborator.updateMany).not.toHaveBeenCalled();
  });

  it('allows re-inviting and re-requesting after TERMINATED while blocking BLOCKED', async () => {
    const cache = { del: jest.fn(), get: jest.fn(), set: jest.fn() };
    prisma.user.findFirst = jest
      .fn()
      .mockResolvedValue({ id: 'kol', fullName: 'KOL', email: 'kol@example.test' });
    prisma.notification = { create: jest.fn() };
    const cachedService = new StoreCollaboratorsService(prisma, cache as any);

    prisma.storeCollaborator.findUnique
      .mockResolvedValueOnce({ id: 'rel-1', status: 'TERMINATED' })
      .mockResolvedValueOnce({ id: 'rel-1', status: 'PENDING', requestedByKol: false });
    await cachedService.invite('owner', { email: 'kol@example.test', note: 'Mời lại' });
    expect(prisma.storeCollaborator.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'rel-1',
          status: { in: ['REJECTED', 'TERMINATED'] },
        }),
        data: expect.objectContaining({
          status: 'PENDING',
          requestedByKol: false,
          terminatedAt: null,
        }),
      }),
    );
    expect(cache.del).toHaveBeenCalledWith('store:team:store');

    prisma.storeCollaborator.findUnique.mockResolvedValue({
      id: 'rel-2',
      status: 'BLOCKED',
    });
    await expect(
      cachedService.invite('owner', { email: 'kol@example.test' }),
    ).rejects.toThrow('khóa');
    await expect(
      cachedService.requestCooperation('kol', 'store'),
    ).rejects.toThrow('khóa');

    prisma.storeCollaborator.findUnique
      .mockResolvedValueOnce({ id: 'rel-3', status: 'TERMINATED' })
      .mockResolvedValueOnce({
        id: 'rel-3',
        status: 'PENDING',
        requestedByKol: true,
      });
    await cachedService.requestCooperation('kol', 'store', 'Xin hợp tác lại');
    expect(prisma.storeCollaborator.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'rel-3', status: { in: ['REJECTED', 'TERMINATED'] } },
        data: expect.objectContaining({
          requestedByKol: true,
          status: 'PENDING',
        }),
      }),
    );
  });

  it('blocks terminating when deals, pending KPIs, vouchers, or open samples exist, and permits clean termination with reason', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({
      id: 'rel-approved',
      storeId: 'store',
      collaboratorId: 'kol',
      status: 'APPROVED',
    });
    prisma.storeCollaborator.update = jest.fn().mockResolvedValue({ id: 'rel-approved', status: 'TERMINATED' });
    prisma.exclusiveDealProposal = { count: jest.fn().mockResolvedValue(1) };
    prisma.commission = { count: jest.fn().mockResolvedValue(2) };
    prisma.coupon = { findMany: jest.fn().mockResolvedValue([{ id: 'c1', displayCode: 'NHI10', status: 'ACTIVE' }]) };
    prisma.sampleProductRequest = { count: jest.fn().mockResolvedValue(1) };
    prisma.notification = { create: jest.fn() };

    const eligBlocked = await service.getTerminationEligibility('owner', 'SHOP_MANAGER' as any, 'kol', 'store');
    expect(eligBlocked.canTerminate).toBe(false);
    expect(eligBlocked.blockers.map((b: any) => b.key)).toEqual(['DEAL', 'KPI', 'VOUCHER', 'SAMPLE']);
    await expect(
      service.terminateCooperation('owner', 'SHOP_MANAGER' as any, 'kol', 'store', 'Ngừng hợp tác thử nghiệm'),
    ).rejects.toThrow('ràng buộc');
    expect(prisma.storeCollaborator.update).not.toHaveBeenCalled();

    prisma.exclusiveDealProposal.count.mockResolvedValue(0);
    prisma.commission.count.mockResolvedValue(0);
    prisma.coupon.findMany.mockResolvedValue([]);
    prisma.sampleProductRequest.count.mockResolvedValue(0);

    const eligClean = await service.getTerminationEligibility('owner', 'SHOP_MANAGER' as any, 'kol', 'store');
    expect(eligClean.canTerminate).toBe(true);

    const res = await service.terminateCooperation(
      'owner',
      'SHOP_MANAGER' as any,
      'kol',
      'store',
      'Hai bên đồng thuận kết thúc chiến dịch',
    );
    expect(res.success).toBe(true);
    expect(prisma.storeCollaborator.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'TERMINATED',
          terminateReason: 'Hai bên đồng thuận kết thúc chiến dịch',
        }),
      }),
    );
  });

  it('lists only the records counted as blockers for the selected shop and KOC', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({
      id: 'rel', storeId: 'store', collaboratorId: 'kol', status: 'APPROVED',
    });
    prisma.exclusiveDealProposal = {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([
        { id: 'deal-one', status: 'PENDING', initiatedById: 'owner' },
        { id: 'deal-two', status: 'PENDING_ADMIN_APPROVAL', initiatedById: null },
      ]),
    };
    prisma.commission = { count: jest.fn().mockResolvedValue(21), findMany: jest.fn().mockResolvedValue(Array.from({ length: 21 }, (_, id) => ({ id }))) };
    prisma.coupon = { findMany: jest.fn().mockResolvedValue([{ id: 'voucher', displayCode: 'NHIQA2311', status: 'ACTIVE' }]) };
    prisma.sampleProductRequest = { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([{ id: 'sample' }]) };

    const { counts } = await service.getTerminationEligibility('owner', UserRole.SHOP_MANAGER, 'rel', 'store');
    expect(counts).toEqual({ openDealsCount: 2, pendingKpiCount: 21, activeVouchersCount: 1, openSamplesCount: 1 });
    const getDetails = (kind: string, page = 1) =>
      service.getTerminationBlockerDetails('owner', UserRole.SHOP_MANAGER, 'rel', kind, 'store', page);
    await expect(getDetails('DEAL')).resolves.toMatchObject({
      hasMore: false,
      items: [{ id: 'deal-one', waitingFor: 'KOL' }, { id: 'deal-two', waitingFor: 'ADMIN' }],
    });
    const kpi = await getDetails('KPI');
    expect(kpi.items).toHaveLength(20);
    expect(kpi.hasMore).toBe(true);
    await getDetails('KPI', 2);
    await getDetails('VOUCHER');
    await getDetails('SAMPLE');
    for (const model of [prisma.exclusiveDealProposal, prisma.commission, prisma.sampleProductRequest]) {
      expect(model.findMany.mock.calls[0][0].where).toEqual(model.count.mock.calls[0][0].where);
    }
    expect(prisma.coupon.findMany.mock.calls[1][0].where).toEqual(prisma.coupon.findMany.mock.calls[0][0].where);
    expect(prisma.commission.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 20, take: 21 }));
  });

  it('rejects blocker details for other stores and roles before querying the blockers', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({
      id: 'rel', storeId: 'store', collaboratorId: 'kol', status: 'APPROVED',
    });
    prisma.exclusiveDealProposal = { findMany: jest.fn() };
    await expect(service.getTerminationBlockerDetails('kol', UserRole.COLLABORATOR, 'rel', 'DEAL', 'store')).rejects.toMatchObject({ status: 403 });
    await expect(service.getTerminationBlockerDetails('owner', UserRole.SHOP_MANAGER, 'rel', 'DEAL', 'other-store')).rejects.toMatchObject({ status: 404 });
    prisma.store.findFirst.mockResolvedValue(null);
    await expect(service.getTerminationBlockerDetails('other-owner', UserRole.SHOP_MANAGER, 'rel', 'DEAL', 'store')).rejects.toMatchObject({ status: 404 });
    expect(prisma.exclusiveDealProposal.findMany).not.toHaveBeenCalled();
  });
});
