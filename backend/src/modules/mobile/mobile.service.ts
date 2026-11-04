import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { managedStoreWhere } from '../../common/policies/store-access.policy';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { productVariantFields } from '../products/product-variant-fields';

export const MOBILE_CAPABILITIES = {
  CUSTOMER: [
    'catalog',
    'orders',
    'chat',
    'cart',
    'addresses',
    'profile',
    'notifications',
    'wishlist',
    'returns',
    'wallet',
    'coupons',
    'identity',
    'storefront',
  ],
  COLLABORATOR: [
    'catalog',
    'cooperation',
    'deals',
    'chat',
    'dashboard',
    'addresses',
    'profile',
    'notifications',
    'samples',
    'marketing',
    'wallet',
    'kyc',
    'social',
    'coupons',
    'campaigns',
    'bonuses',
    'storefront',
  ],
  SHOP_MANAGER: [
    'products',
    'orders',
    'cooperation',
    'deals',
    'chat',
    'ai',
    'dashboard',
    'profile',
    'notifications',
    'returns',
    'samples',
    'wallet',
    'payouts',
    'pricing',
    'kyc',
    'reviews',
    'shop',
    'coupons',
    'manual-orders',
    'campaigns',
    'bonuses',
    'product-edit',
    'referral-oversight',
  ],
  SYSTEM_MANAGER: [
    'referral-oversight',
    'moderation',
    'orders',
    'dashboard',
    'profile',
    'notifications',
    'returns',
    'samples',
    'payouts',
    'pricing',
    'kyc',
    'reviews',
    'audit',
    'coupons',
    'manual-orders',
    'campaigns',
    'fraud',
  ],
  SYSTEM_ADMIN: [
    'referral-oversight',
    'moderation',
    'exceptions',
    'users',
    'orders',
    'dashboard',
    'profile',
    'notifications',
    'returns',
    'samples',
    'payouts',
    'pricing',
    'kyc',
    'reviews',
    'staff',
    'audit',
    'coupons',
    'manual-orders',
    'campaigns',
    'fraud',
  ],
} as const satisfies Record<UserRole, readonly string[]>;

/** Additive client bootstrap. Existing business endpoints retain all authorization/state checks. */
@Injectable()
export class MobileService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(actor: AuthenticatedUser) {
    // Derive assignment from live membership instead of trusting a client/JWT storeId.
    const managedStores =
      actor.role === UserRole.SHOP_MANAGER
        ? await this.prisma.store.findMany({
            where: managedStoreWhere(actor.id),
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              categoryName: true,
            },
            orderBy: { name: 'asc' },
          })
        : [];
    return {
      contractVersion: 1,
      serverTime: new Date().toISOString(),
      actor: {
        id: actor.id,
        email: actor.email,
        fullName: actor.fullName || actor.email,
        role: actor.role,
      },
      managedStores: managedStores.map((store) => ({
        ...store,
        variantFields: productVariantFields(store.categoryName).map(
          ([key, label]) => ({ key, label }),
        ),
      })),
      capabilities: MOBILE_CAPABILITIES[actor.role],
      sessionPolicy: 'REAUTHENTICATE_ON_EXPIRY' as const,
      integrations: { payments: 'DEFERRED', livestream: 'DEFERRED' },
    };
  }
}
