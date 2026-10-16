import type { SeedContext, SeedDataset } from './seed.types';
import { daysFrom, seedId } from './seed.helpers';
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
      startDate: daysFrom(context, -3),
      endDate: daysFrom(context, 14),
      createdAt,
    });
    for (let slot = 0; slot < 2; slot++)
      data.campaignProducts.push({
        id: seedId(`campaign-product:${index}:${slot}`),
        campaignId,
        productId: seedId(`product:${index * 2 + slot}`),
        createdAt,
      });
    data.coupons.push({
      id: seedId(`shop-coupon:${index}`),
      storeId,
      collaboratorId: seedId(`creator:${index}`),
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
      joinedAt: daysFrom(context, -3),
      createdAt: daysFrom(context, -3),
    });
    data.conversations.push({
      id: conversationId,
      storeId,
      collaboratorId,
      lastMessageAt: daysFrom(context, -1),
      createdAt: daysFrom(context, -20),
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
      stackableWithShopVoucher: false,
      approvedBy: seedId(`shop-owner:${storeIndex}`),
      approvedAt: createdAt,
      createdAt,
    });
    for (let slot = 0; slot < 2; slot++) {
      const productIndex = storeIndex * 2 + slot;
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
    const product = data.products[storeIndex * 2];
    const proposalId = seedId(`deal:${creatorIndex}`);
    // Current dev stores an agreed final rate, so +2% is persisted as 12%.
    // Do not write "2" into this field until the additive engine changes its contract.
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
      shopResponse: 'Đồng ý mức tổng 12% theo hợp đồng hiện tại của hệ thống.',
      reviewedAt: daysFrom(context, -19),
      createdAt: daysFrom(context, -20),
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
          createdAt: daysFrom(context, -20).toISOString(),
        }),
        isRead: true,
        createdAt: daysFrom(context, -20),
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
    const sessionId = seedId(`live:${index}`);
    const active = index < 2;
    const startsAt = daysFrom(context, active ? -1 / 48 : -index - 1);
    const endsAt = new Date(startsAt.getTime() + 2 * 3_600_000);
    data.liveSessions.push({
      id: sessionId,
      storeId: seedId(`store:${index}`),
      creatorId: seedId(`creator:${index}`),
      createdBy: seedId(`shop-owner:${index}`),
      title: `${SHOPS[index].name} — Chia sẻ trải nghiệm cùng KOC`,
      coverImageUrl: data.products[index * 2].imageUrl,
      description:
        'Phòng minh họa Capstone; KOC cần mở phát sóng để có tín hiệu video trực tiếp.',
      platform: 'SCANMS',
      liveUrl: new URL(`/live/${sessionId}`, context.frontendUrl).toString(),
      status: active ? 'LIVE' : 'ENDED',
      inviteStatus: 'ACCEPTED',
      respondedAt: new Date(startsAt.getTime() - 3_600_000),
      startsAt,
      endsAt,
      commissionRate: 12,
      governance: {
        seedSource: 'SYNTHETIC_CAPSTONE',
        intendedBonusPercentage: 2,
      },
      createdAt: daysFrom(context, -10),
    });
    for (let slot = 0; slot < 2; slot++)
      data.liveProducts.push({
        id: seedId(`live-product:${index}:${slot}`),
        sessionId,
        productId: seedId(`product:${index * 2 + slot}`),
        variantId: seedId(`variant:${index * 2 + slot}:0`),
        createdAt: startsAt,
      });
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
      const storeIndex = Math.floor(index / 2);
      const conversationId = seedId(`customer-conversation:${index}`);
      const product = data.products[storeIndex * 2];
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
      if (index % 2 === 1)
        data.notifications.push({
          id: seedId(`chat-notification:${index}`),
          userId: customer.id!,
          title: 'Shop đã trả lời',
          message: `${SHOPS[storeIndex].name} vừa gửi tin nhắn cho bạn.`,
          type: 'CHAT_MESSAGE',
          data: {
            conversationId,
            shopId: product.storeId,
            actionUrl: `/chat?asCustomer=1&conversationId=${conversationId}`,
          },
          createdAt: sentAt,
        });
    });

  // No fake sponsored-placement records: dev has no schema/API contract for that feature.
}
