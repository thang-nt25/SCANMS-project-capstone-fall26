import { Prisma, UserRole } from '@prisma/client';

/** Store ownership and internal assignment grant the same management scope. */
export function managedStoreWhere(userId: string): Prisma.StoreWhereInput {
  return {
    isDeleted: false,
    OR: [
      {
        ownerId: userId,
        owner: {
          role: UserRole.SHOP_MANAGER,
          isActive: true,
          isDeleted: false,
        },
      },
      {
        staffMembers: {
          some: {
            id: userId,
            role: UserRole.SHOP_MANAGER,
            isActive: true,
            isDeleted: false,
          },
        },
      },
    ],
  };
}
