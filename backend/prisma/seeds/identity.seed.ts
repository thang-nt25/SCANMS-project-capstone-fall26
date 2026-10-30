import type { SeedContext, SeedDataset } from './seed.types';
import { ADMIN_ID, assetUrl, daysFrom, seedId } from './seed.helpers';
import { addressFor } from './data/addresses.data';
import { SHOPS } from './data/catalog.data';
import {
  CREATOR_NAMES,
  CUSTOMER_NAMES,
  demoPhone,
  tierIndexForCreator,
  TIERS,
} from './data/people.data';
import { CREATOR_REFERENCES, creatorReferenceMetadata } from './data/creator-references.data';

export function buildIdentities(data: SeedDataset, context: SeedContext): void {
  const createdAt = daysFrom(context, -60);
  data.users.push({
    id: ADMIN_ID,
    email: 'admin@seed.scanms.test',
    role: 'SYSTEM_ADMIN',
    fullName: 'Quản trị SCANMS Demo',
    passwordHash: context.passwordHash,
    createdAt,
  });
  data.users.push({
    id: seedId('system-manager:0'),
    email: 'manager@seed.scanms.test',
    role: 'SYSTEM_MANAGER',
    fullName: 'Chuyên viên Vận hành SCANMS',
    passwordHash: context.passwordHash,
    createdAt,
  });
  TIERS.forEach((tier, index) =>
    data.tiers.push({
      id: seedId(`tier:${index}`),
      name: tier.name,
      minRevenueThreshold: tier.threshold,
      extraBonusPercentage: tier.bonus,
      createdAt,
    }),
  );

  const addAddress = (
    userId: string,
    name: string,
    phone: string,
    index: number,
  ) => {
    data.addresses.push({
      id: seedId(`address:${userId}`),
      userId,
      fullName: name,
      phoneNumber: phone,
      ...addressFor(index),
      isDefault: true,
      createdAt,
    });
  };

  SHOPS.forEach((shop, index) => {
    const userId = seedId(`shop-owner:${index}`);
    const phone = demoPhone(0, index);
    data.users.push({
      id: userId,
      email: `shop${String(index + 1).padStart(2, '0')}@seed.scanms.test`,
      role: 'SHOP_MANAGER',
      fullName: `Đại diện ${shop.name}`,
      phoneNumber: phone,
      passwordHash: context.passwordHash,
      createdAt,
    });
    addAddress(userId, `Kho ${shop.name}`, phone, index);
  });

  // Seed co-manager for Sora Skin demonstrating multi-staff assignment via storeId
  const coManagerId = seedId('shop-staff:sora:0');
  data.users.push({
    id: coManagerId,
    email: 'sora.staff@seed.scanms.test',
    role: 'SHOP_MANAGER',
    fullName: 'Trần Phó Quản Lý (Sora Skin)',
    phoneNumber: '0901234599',
    storeId: seedId('store:0'),
    passwordHash: context.passwordHash,
    createdAt,
  });

  CREATOR_NAMES.forEach((name, index) => {
    const userId = seedId(`creator:${index}`);
    const phone = demoPhone(1, index);
    const avatar = assetUrl(
      context,
      'seed/creators/reference.svg',
    );
    const followerCount = 15_000 + index * 20_000;
    data.users.push({
      id: userId,
      email: `kol${String(index + 1).padStart(2, '0')}@seed.scanms.test`,
      role: 'COLLABORATOR',
      fullName: `${CREATOR_REFERENCES[index].name} · TEST`,
      phoneNumber: phone,
      avatarUrl: avatar,
      passwordHash: context.passwordHash,
      createdAt,
    });
    data.profiles.push({
      id: seedId(`profile:${index}`),
      userId,
      tierId: seedId(`tier:${tierIndexForCreator(index)}`),
      avatarUrl: avatar,
      bio: `Hồ sơ TEST tham khảo ${CREATOR_REFERENCES[index].name}; không phải tài khoản hoặc đối tác được creator thật xác nhận. Follower, tier, KYC, ngân hàng và giao dịch chỉ là fixture.`,
      socialLinksJson: { seedReference: creatorReferenceMetadata(index) },
      idCardNumber: `999${String(index + 1).padStart(9, '0')}`,
      taxCode: `999${String(index + 1).padStart(7, '0')}`,
      bankName: index % 2 === 0 ? 'MB' : 'Vietcombank',
      bankAccountNumber: `999900${String(index + 1).padStart(6, '0')}`,
      bankAccountName: name,
      totalFollowers: followerCount,
      kycStatus: 'VERIFIED',
      createdAt,
    });
    // A public reference link does not verify ownership of the test account.
    data.socialChannels.push({
      id: seedId(`social:${index}`),
      collaboratorId: userId,
      platformName: 'YOUTUBE',
      channelName: `${CREATOR_REFERENCES[index].name} (tham khảo)`,
      channelUrl: CREATOR_REFERENCES[index].channelUrl,
      followerCount,
      isPrimary: true,
      createdAt,
    });
    addAddress(userId, name, phone, index);
  });

  CUSTOMER_NAMES.forEach((name, index) => {
    const userId = seedId(`customer:${index}`);
    const phone = demoPhone(2 + (index % 2), index);
    data.users.push({
      id: userId,
      email: `customer${String(index + 1).padStart(2, '0')}@seed.scanms.test`,
      role: 'CUSTOMER',
      fullName: name,
      phoneNumber: phone,
      passwordHash: context.passwordHash,
      createdAt,
    });
    addAddress(userId, name, phone, index);
  });
}
