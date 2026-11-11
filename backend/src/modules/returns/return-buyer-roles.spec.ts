import { UserRole } from '@prisma/client';
import { ReturnService } from './return.service';

describe('Buyer return access across workspaces', () => {
  it.each([UserRole.CUSTOMER, UserRole.COLLABORATOR])(
    'scopes %s to their own requests and hides partner income',
    async (role) => {
      const prisma = {
        returnRequest: {
          findFirst: jest.fn(async () => ({ customerId: 'buyer' })),
        },
      };
      const service = new ReturnService(prisma as never, {} as never);
      const present = jest
        .spyOn(service as any, 'present')
        .mockImplementation((value) => value);
      await service.getOne('buyer', role, 'return');
      expect(prisma.returnRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'return', customerId: 'buyer' },
        }),
      );
      expect(present).toHaveBeenCalledWith({ customerId: 'buyer' }, false);
    },
  );
  it('does not let a Shop buyer process a return belonging to another Shop', () => {
    const service = new ReturnService({} as never, {} as never);
    expect(() =>
      (service as any).requireShop('buyer', UserRole.SHOP_MANAGER, {
        order: { store: { ownerId: 'different-shop', staffMembers: [] } },
      }),
    ).toThrow('Bạn không quản lý Shop');
  });
});
