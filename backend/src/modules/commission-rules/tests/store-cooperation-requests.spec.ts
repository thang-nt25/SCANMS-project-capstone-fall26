import { StoreCollaboratorsService } from '../store-collaborators.service';

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
});
