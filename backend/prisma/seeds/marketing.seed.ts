import type { SeedContext, SeedDataset } from './seed.types';
import { ADMIN_ID, daysFrom, seedId } from './seed.helpers';
import { CREATOR_NAMES } from './data/people.data';
import { SHOPS } from './data/catalog.data';

export function buildMarketing(data: SeedDataset, context: SeedContext): void {
  const createdAt = daysFrom(context, -49);
  SHOPS.forEach((shop, index) => {
    const storeId = seedId(`store:${index}`);
    const campaignId = seedId(`campaign:${index}`);
    data.campaigns.push({
      id: campaignId,
      storeId,
      name: `${shop.name} — Tuần lễ trải nghiệm`,
      bonusCommissionRate: 1,
      bonusBudgetTotal: 5_000_000,
      bonusBudgetUsed: 0,
      isActive: true,
      startDate: createdAt,
      endDate: daysFrom(context, 14),
      createdAt,
    });
    for (let slot = 0; slot < 2; slot++)
      data.campaignProducts.push({
        id: seedId(`campaign-product:${index}:${slot}`),
        campaignId,
        productId: seedId(`product:${index * 3 + slot}`),
        createdAt,
      });
    data.coupons.push({
      id: seedId(`shop-coupon:${index}`),
      storeId,
      collaboratorId: seedId(`shop-owner:${index}`),
      codeNormalized: `SHOP${String(index + 1).padStart(2, '0')}SAVE`,
      displayCode: `SHOP${String(index + 1).padStart(2, '0')}SAVE`,
      status: 'ACTIVE',
      discountType: 'FIXED_AMOUNT',
      discountValue: 15_000,
      minimumOrderAmount: 100_000,
      maximumDiscountAmount: 15_000,
      usageLimitTotal: 200,
      usageLimitPerCustomer: 2,
      budgetTotal: 3_000_000,
      budgetUsed: 0,
      startsAt: createdAt,
      expiresAt: daysFrom(context, 60),
      scopeType: 'STORE_WIDE',
      fundingSource: 'SHOP_FUNDED',
      shopFundingRate: 100,
      platformFundingRate: 0,
      stackableWithShopVoucher: false,
      stackableWithProductDiscount: false,
      approvedBy: seedId(`shop-owner:${index}`),
      approvedAt: createdAt,
      createdAt,
    });
    // Platform coupons are issued by Admin and scoped to one Shop by the real schema.
    for (const benefitType of ['GOODS', 'SHIPPING'] as const) {
      const code = `SAN${String(index + 1).padStart(2, '0')}${benefitType === 'GOODS' ? 'SAVE' : 'SHIP'}`;
      data.coupons.push({
        id: seedId(`platform-${benefitType}:${index}`),
        storeId,
        collaboratorId: ADMIN_ID,
        codeNormalized: code,
        displayCode: code,
        status: 'ACTIVE',
        benefitType,
        discountType: 'FIXED_AMOUNT',
        discountValue: benefitType === 'GOODS' ? 10_000 : 15_000,
        maximumDiscountAmount: benefitType === 'GOODS' ? 10_000 : 15_000,
        minimumOrderAmount: 100_000,
        usageLimitTotal: 200,
        usageLimitPerCustomer: 2,
        budgetTotal: 3_000_000,
        budgetUsed: 0,
        usageCount: 0,
        fundingSource: 'PLATFORM_FUNDED',
        shopFundingRate: 0,
        platformFundingRate: 100,
        scopeType: 'STORE_WIDE',
        stackableWithProductDiscount: true,
        stackableWithShopVoucher: benefitType === 'GOODS',
        stackableWithPlatformVoucher: true,
        startsAt: createdAt,
        expiresAt: daysFrom(context, 60),
        approvedBy: ADMIN_ID,
        approvedAt: createdAt,
        createdAt,
      });
    }
  });

  CREATOR_NAMES.forEach((name, creatorIndex) => {
    const storeIndex = creatorIndex % SHOPS.length;
    const storeId = seedId(`store:${storeIndex}`);
    const collaboratorId = seedId(`creator:${creatorIndex}`);
    const conversationId = seedId(`kol-conversation:${creatorIndex}`);
    data.collaborations.push({
      id: seedId(`collaboration:${creatorIndex}`),
      storeId,
      collaboratorId,
      status: 'APPROVED',
      approvedAt: createdAt,
      note: 'Hợp tác trong bộ dữ liệu Capstone.',
      createdAt,
    });
    data.campaignParticipants.push({
      id: seedId(`campaign-participant:${creatorIndex}`),
      campaignId: seedId(`campaign:${storeIndex}`),
      collaboratorId,
      status: 'ACCEPTED',
      joinedAt: createdAt,
      createdAt,
    });
    data.conversations.push({
      id: conversationId,
      storeId,
      collaboratorId,
      lastMessageAt: daysFrom(context, -1),
      createdAt,
    });
    const couponId = seedId(`kol-coupon:${creatorIndex}`);
    const code = `KOL${String(creatorIndex + 1).padStart(2, '0')}SAVE`;
    data.coupons.push({
      id: couponId,
      storeId,
      collaboratorId,
      codeNormalized: code,
      displayCode: code,
      status: 'ACTIVE',
      discountType: 'PERCENTAGE',
      discountValue: 5,
      minimumOrderAmount: 100_000,
      maximumDiscountAmount: 30_000,
      usageLimitTotal: 100,
      usageLimitPerCustomer: 2,
      budgetTotal: 3_000_000,
      budgetUsed: 0,
      startsAt: createdAt,
      expiresAt: daysFrom(context, 60),
      scopeType: 'PRODUCTS',
      fundingSource: 'SHOP_FUNDED',
      shopFundingRate: 100,
      platformFundingRate: 0,
      stackableWithProductDiscount: true,
      stackableWithShopVoucher: false,
      approvedBy: seedId(`shop-owner:${storeIndex}`),
      approvedAt: createdAt,
      createdAt,
    });
    for (let slot = 0; slot < 2; slot++) {
      const productIndex = storeIndex * 3 + slot;
      const productId = seedId(`product:${productIndex}`);
      data.couponProducts.push({
        id: seedId(`coupon-product:${creatorIndex}:${slot}`),
        couponId,
        productId,
        createdAt,
      });
      data.referralLinks.push({
        id: seedId(`link:${creatorIndex}:${productIndex}`),
        storeId,
        collaboratorId,
        productId,
        shortCode: `seed-k${creatorIndex + 1}-p${productIndex + 1}`,
        destinationPath: `/products/${productId}`,
        channel: creatorIndex % 2 === 0 ? 'TIKTOK' : 'YOUTUBE',
        customCouponCode: code,
        status: 'ACTIVE',
        createdAt,
      });
    }
    const product = data.products[storeIndex * 3];
    const proposalId = seedId(`deal:${creatorIndex}`);
    // VIP deal still stores base + bonus (12); checkout extracts +2 via exclusiveDealBonus.
    data.deals.push({
      id: proposalId,
      storeId,
      collaboratorId,
      productId: product.id!,
      conversationId,
      proposedCommissionRate: 12,
      approvedCommissionRate: 12,
      salesCommitment:
        'Đề xuất cộng 2 điểm phần trăm trên mức nền 10%; cam kết một video trải nghiệm sau khi nhận mẫu.',
      status: 'APPROVED',
      reviewerId: seedId(`shop-owner:${storeIndex}`),
      shopResponse:
        'Duyệt VIP +2% (lưu mức nền + VIP là 12%). Tier, chiến dịch và Live được tính riêng khi đặt hàng.',
      reviewedAt: daysFrom(context, -48),
      createdAt: createdAt,
    });
    data.referralLinks.push({
      id: seedId(`campaign-link:${creatorIndex}`),
      storeId,
      collaboratorId,
      productId: product.id!,
      campaignId: seedId(`campaign:${storeIndex}`),
      shortCode: `seed-campaign-k${creatorIndex + 1}`,
      destinationPath: `/products/${product.id!}`,
      status: 'ACTIVE',
      createdAt,
    });
    data.referralLinks.push({
      id: seedId(`deal-link:${creatorIndex}`),
      storeId,
      collaboratorId,
      productId: product.id!,
      exclusiveDealId: proposalId,
      shortCode: `seed-deal-k${creatorIndex + 1}`,
      destinationPath: `/products/${product.id!}`,
      status: 'ACTIVE',
      createdAt: daysFrom(context, -19),
    });
    data.messages.push(
      {
        id: seedId(`deal-message:${creatorIndex}`),
        conversationId,
        senderId: collaboratorId,
        messageText: JSON.stringify({
          type: 'EXCLUSIVE_DEAL_PROPOSAL',
          proposalId,
          productId: product.id,
          productTitle: product.title,
          productImage: product.imageUrl,
          storeId,
          storeName: SHOPS[storeIndex].name,
          publicCommissionRate: 10,
          proposedCommissionRate: 12,
          salesCommitment:
            'Cam kết quay video trải nghiệm. Đề xuất cộng 2% trên mức nền 10%.',
          status: 'APPROVED',
          createdAt: createdAt.toISOString(),
        }),
        isRead: true,
        createdAt,
      },
      {
        id: seedId(`deal-reply:${creatorIndex}`),
        conversationId,
        senderId: seedId(`shop-owner:${storeIndex}`),
        messageText: `Chào ${name}, Shop đã duyệt đề xuất. Bạn có thể dùng mã ${code} để giới thiệu sản phẩm.`,
        isRead: creatorIndex % 3 !== 0,
        createdAt: daysFrom(context, -1),
      },
    );
  });

  for (let index = 0; index < 5; index++) {
    const storeIndex = index % SHOPS.length;
    const sessionId = seedId(`live:${index}`);
    const active = index < 2;
    const startsAt = daysFrom(context, active ? -1 / 48 : -40 - index);
    const endsAt = new Date(startsAt.getTime() + 2 * 3_600_000);
    data.liveSessions.push({
      id: sessionId,
      storeId: seedId(`store:${storeIndex}`),
      creatorId: seedId(`creator:${index}`),
      createdBy: seedId(`shop-owner:${storeIndex}`),
      title: `${SHOPS[storeIndex].name} — Chia sẻ trải nghiệm cùng KOC`,
      coverImageUrl: data.products[storeIndex * 3].imageUrl,
      description:
        'Phòng minh họa Capstone; KOC cần mở phát sóng để có tín hiệu video trực tiếp.',
      platform: 'SCANMS',
      liveUrl: new URL(`/live/${sessionId}`, context.frontendUrl).toString(),
      status: active ? 'LIVE' : 'ENDED',
      inviteStatus: 'ACCEPTED',
      respondedAt: new Date(startsAt.getTime() - 3_600_000),
      startsAt,
      endsAt,
      commissionRate: 2,
      governance: {
        seedSource: 'SYNTHETIC_CAPSTONE',
        intendedBonusPercentage: 2,
        pinnedProductId: seedId(`product:${storeIndex * 3}`),
      },
      createdAt: new Date(startsAt.getTime() - 86_400_000),
    });
    for (let slot = 0; slot < 2; slot++) {
      const pIdx = storeIndex * 3 + slot;
      data.liveProducts.push({
        id: seedId(`live-product:${index}:${slot}`),
        sessionId,
        productId: seedId(`product:${pIdx}`),
        variantId: seedId(`variant:${pIdx}:0`),
        createdAt: startsAt,
      });
    }
    // Historical attendance is stored as rows; active rooms start at zero real viewers.
    if (!active)
      for (let viewer = 0; viewer < 5 + index; viewer++)
        data.liveViewers.push({
          sessionId,
          clientId: `seed-viewer-${viewer}`,
          firstSeenAt: startsAt,
          lastSeenAt: new Date(endsAt.getTime() - 60_000),
          leftAt: endsAt,
        });
    data.coupons.push({
      id: seedId(`live-coupon:${index}`),
      storeId: seedId(`store:${index}`),
      collaboratorId: seedId(`creator:${index}`),
      liveSessionId: sessionId,
      codeNormalized: `LIVE${index + 1}SAVE`,
      displayCode: `LIVE${index + 1}SAVE`,
      status: active ? 'ACTIVE' : 'EXPIRED',
      discountType: 'FIXED_AMOUNT',
      discountValue: 15_000,
      minimumOrderAmount: 100_000,
      maximumDiscountAmount: 15_000,
      scopeType: 'STORE_WIDE',
      fundingSource: 'SHOP_FUNDED',
      shopFundingRate: 100,
      platformFundingRate: 0,
      usageLimitTotal: 50,
      usageLimitPerCustomer: 1,
      budgetTotal: 750_000,
      startsAt,
      expiresAt: endsAt,
      approvedBy: seedId(`shop-owner:${index}`),
      approvedAt: new Date(startsAt.getTime() - 3_600_000),
      stackableWithShopVoucher: false,
      createdAt: daysFrom(context, -10),
    });
  }

  data.users
    .filter((user) => user.role === 'CUSTOMER')
    .forEach((customer, index) => {
      const storeIndex = index % SHOPS.length;
      const conversationId = seedId(`customer-conversation:${index}`);
      const product = data.products[storeIndex * 3];
      const sentAt = daysFrom(context, -0.5);
      data.conversations.push({
        id: conversationId,
        storeId: product.storeId,
        customerId: customer.id!,
        lastMessageAt: sentAt,
        createdAt: daysFrom(context, -1),
      });
      data.messages.push(
        {
          id: seedId(`customer-message:${index}`),
          conversationId,
          senderId: customer.id!,
          messageText: JSON.stringify({
            type: 'PRODUCT_INQUIRY',
            productId: product.id,
            productTitle: product.title,
            productImage: product.imageUrl,
            productPrice: product.price,
            productSku: product.sku,
            message: 'Shop tư vấn giúp mình phân loại phù hợp nhé.',
          }),
          isRead: true,
          createdAt: daysFrom(context, -1),
        },
        {
          id: seedId(`shop-reply:${index}`),
          conversationId,
          senderId: seedId(`shop-owner:${storeIndex}`),
          messageText:
            'Chào bạn, Shop có sẵn các phân loại. Bạn chọn dung tích và quy cách đóng gói trong trang sản phẩm nhé.',
          isRead: index % 2 === 0,
          createdAt: sentAt,
        },
      );
      data.follows.push({
        id: seedId(`follow:${index}`),
        userId: customer.id!,
        storeId: product.storeId,
        createdAt,
      });
    });

  // Sponsored placements use Quy's deployment configuration, not invented Prisma columns.
}
