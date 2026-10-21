import { StoreCollaboratorsService } from '../store-collaborators.service';

describe('Store cooperation requests', () => {
  let prisma: any;
  let service: StoreCollaboratorsService;
  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ role: 'SHOP_MANAGER' }) },
      store: { findFirst: jest.fn().mockResolvedValue({ id: 'store', ownerId: 'owner' }) },
      storeCollaborator: {
        findUnique: jest.fn(), create: jest.fn().mockResolvedValue({ status: 'PENDING', requestedByKol: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    service = new StoreCollaboratorsService(prisma);
  });
  it('creates a KOL request pending shop approval', async () => {
    await service.requestCooperation('kol', 'store');
    expect(prisma.storeCollaborator.create).toHaveBeenCalledWith({ data: { storeId: 'store', collaboratorId: 'kol', requestedByKol: true, status: 'PENDING' } });
  });
  it('does not replace an approved relationship or duplicate pending request', async () => {
    for (const status of ['APPROVED', 'PENDING']) {
      prisma.storeCollaborator.findUnique.mockResolvedValue({ status, requestedByKol: true });
      await service.requestCooperation('kol', 'store');
    }
    expect(prisma.storeCollaborator.create).not.toHaveBeenCalled();
    expect(prisma.storeCollaborator.updateMany).not.toHaveBeenCalled();
  });
  it('does not reverse a shop invitation into a KOL request', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({ status: 'PENDING', requestedByKol: false });
    await expect(service.requestCooperation('kol', 'store')).rejects.toThrow('Shop đã mời');
  });
  it('prevents KOL from approving their own request', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({ collaboratorId: 'kol', requestedByKol: true, status: 'PENDING' });
    await expect(service.respond('kol', 'req', true)).rejects.toThrow('Shop duyệt');
    expect(prisma.storeCollaborator.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a different shop owner', async () => {
    prisma.storeCollaborator.findUnique.mockResolvedValue({ storeId: 'store' });
    prisma.store.findFirst.mockResolvedValue(null);
    await expect(service.reviewRequest('other-owner', 'req', true)).rejects.toThrow();
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
    await expect(service.reviewRequest('owner', 'req', false)).rejects.toThrow('đã xử lý');
  });
});
