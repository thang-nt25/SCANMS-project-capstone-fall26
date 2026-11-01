import { Prisma, UserRole } from '@prisma/client';

/** Scope shop operations to the owner or a currently assigned, active manager.
 * Read the assignment from the database, never from a long-lived JWT/cache.
 */
export function managedStoreWhere(userId: string): Prisma.StoreWhereInput {
  const manager: Prisma.UserWhereInput = {
    id: userId,
    role: UserRole.SHOP_MANAGER,
    isActive: true,
    isDeleted: false,
  };
  return {
    isDeleted: false,
    deletedAt: null,
    OR: [
      { owner: { is: { id: userId, isActive: true, isDeleted: false } } },
      { staffMembers: { some: manager } },
    ],
  };
}
