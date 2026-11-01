import type { OrderStatus, Prisma } from '@prisma/client';
import type { SeedContext, SeedDataset } from './seed.types';
import {
  ADMIN_ID,
  amount,
  assertSeed,
  commissionAmount,
  DATASET_VERSION,
  daysFrom,
  seedId,
} from './seed.helpers';
import { addressFor, fullAddress } from './data/addresses.data';
import { RETURN_POLICY, SHOPS, WARRANTY_POLICY } from './data/catalog.data';
import { priceVoucherLines } from '../../src/modules/coupons/voucher-pricing';
import { requireShippingFee } from '../../src/modules/shipping/shipping-fee';
import { seedCommissionBreakdown } from './commission.seed';

const SECONDARY_STATUSES: readonly OrderStatus[] = [
  'PENDING',
  'SHIPPING',
  'DELIVERED',
  'COMPLETED',
  'RETURN_REQUESTED',
];

export function buildOrders(data: SeedDataset, context: SeedContext): void {
  const customers = data.users.filter((user) => user.role === 'CUSTOMER');
  customers.forEach((customer, customerIndex) => {
    for (let purchase = 0; purchase < 2; purchase++) {
      const key = `customer-${customerIndex + 1}-order-${purchase + 1}`;
      const id = seedId(`order:${key}`);
      const storeIndex =
        purchase === 0
          ? customerIndex % SHOPS.length
          : (customerIndex + 1) % SHOPS.length;
      const storeId = seedId(`store:${storeIndex}`);
      // Secondary purchases exercise the additional creators (indices 16..19, including Diamond tier).
      const creatorIndex =
        purchase === 1 && customerIndex === 3 ? 0 :
        purchase === 1 ? storeIndex + 16 : storeIndex;
      const collaboratorId = seedId(`creator:${creatorIndex}`);
      const status =
        purchase === 0
          ? 'COMPLETED'
          : SECONDARY_STATUSES[customerIndex % SECONDARY_STATUSES.length];
      const completed = status === 'COMPLETED';
      const delivered =
        completed || status === 'DELIVERED' || status === 'RETURN_REQUESTED';
      const historicalLive =
        purchase === 0
          ? data.liveSessions.find(
              (row) => row.storeId === storeId && row.status === 'ENDED',
            )
          : undefined;
      const createdAt = historicalLive
        ? new Date(new Date(historicalLive.startsAt).getTime() + 15 * 60_000)
        : daysFrom(context, purchase === 0 ? -43 : completed ? -23 : -4);
      const deliveredAt = delivered
        ? historicalLive
        ? new Date(createdAt.getTime() + 2 * 86_400_000)
        : daysFrom(context, purchase === 0 ? -40 : completed ? -20 : -2)
        : null;
      const completedAt = completed
        ? new Date(deliveredAt!.getTime() + 14 * 86_400_000)
        : null;
      const pair =
        purchase === 0
          ? ([[0, 1], [1, 2], [2, 0]] as const)[
              Math.floor(customerIndex / 4) % 3
            ]
          : null;
      const products =
        purchase === 0
          ? [
              data.products[storeIndex * 3 + pair![0]],
              data.products[storeIndex * 3 + pair![1]],
            ]
          : [data.products[storeIndex * 3 + (customerIndex % 3)]];
      // Four bulk purchases fund two legitimate demo payouts of 2m VND with 10% PIT.
      const quantity = purchase === 0 && customerIndex < 4 ? 30 : 1;
      const subtotalAmount = products.reduce(
        (total, product) => total + amount(product.price) * quantity,
        0,
      );
      const coupon =
        purchase === 1 && subtotalAmount >= 100_000
          ? data.coupons.find(
              (row) =>
                row.id ===
                seedId(`kol-coupon:${creatorIndex}`),
            )
          : undefined;
      const shopDiscount = coupon
        ? coupon.discountType === 'PERCENTAGE'
          ? Math.min(
              (subtotalAmount * amount(coupon.discountValue)) / 100,
              amount(coupon.maximumDiscountAmount),
            )
          : amount(coupon.discountValue)
        : 0;
      const shippingEvidence = context.shipping.find(
        (row) => row.orderKey === key,
      );
      if (shippingEvidence)
        assertSeed(
          (shippingEvidence.status === 'transporting' &&
            status === 'SHIPPING') ||
            (shippingEvidence.status === 'delivered' && delivered),
          `sandbox shipment status does not match order ${key}`,
        );
      // Synthetic historical freight is explicitly marked, never a quote from GHN.
      // Missing evidence is NOT interpreted as free shipping. Actual zero evidence remains valid.
      const shippingFee = requireShippingFee(
        shippingEvidence?.fee ?? 24_000 + (storeIndex % 4) * 3_000,
      );
      const stacked: Array<{
        voucher: (typeof data.coupons)[number];
        benefitType: 'GOODS' | 'SHIPPING';
        discount: number;
      }> = [];
      const platformGoods = 0;
      const discountAmount = shopDiscount;
      const linePricing = priceVoucherLines(
        products.map((row) => amount(row.price) * quantity),
        products.map(() => true),
        shopDiscount,
        platformGoods,
      );
      const referralLinkId = seedId(`campaign-link:${creatorIndex}`);
      const finalAmount = subtotalAmount - discountAmount + shippingFee;
      const paid = status !== 'PENDING';
      const trackingNumber =
        status !== 'PENDING'
          ? (shippingEvidence?.orderCode ??
            `DEMO-GHN-${String(customerIndex + 1).padStart(2, '0')}-${purchase + 1}`)
          : null;
      const order: Prisma.OrderCreateManyInput = {
        id,
        storeId,
        externalOrderSn: `SEED-DH-${String(customerIndex + 1).padStart(2, '0')}-${purchase + 1}`,
        idempotencyKey: `${DATASET_VERSION}:${key}`,
        customerId: customer.id!,
        customerName: customer.fullName,
        customerPhone: customer.phoneNumber,
        customerEmail: customer.email,
        shippingAddress: fullAddress(addressFor(customerIndex)),
        subtotalAmount,
        discountAmount,
        shippingFee,
        finalAmount,
        status,
        deliveredAt,
        completedAt,
        attributedCollaboratorId: collaboratorId,
        attributionMethod: 'COOKIE',
        attributedAt: createdAt,
        referralLinkId,
        couponId: coupon?.id,
        couponCodeSnapshot: coupon?.displayCode,
        couponDiscountAmount: shopDiscount + platformGoods,
        policyAcceptedAt: createdAt,
        policySnapshot: {
          storeId,
          storeName: SHOPS[storeIndex].name,
          accepted: true,
          returnPolicy: RETURN_POLICY,
          returnPolicySource: 'SHOP',
          warrantyPolicy: WARRANTY_POLICY,
          shippingPolicy: 'Phí hiển thị theo cấu hình tại thời điểm đặt hàng.',
        },
        rawPayload: {
          paymentMethod: paid ? 'WALLET' : 'PAYOS',
          paymentStatus: paid ? 'PAID' : 'WAITING_PAYMENT',
          trackingNumber,
          ghnOrderCode: trackingNumber,
          carrier: 'GHN',
          shippingCarrier: 'GHN',
          ghnIsReal: Boolean(shippingEvidence),
          ghnTotalFee: shippingEvidence ? shippingFee : null,
          shippingFeeSource: shippingEvidence
            ? 'GHN_SANDBOX_EXPORT'
            : 'SYNTHETIC_DEMO',
          ghnEnvironment: 'TEST',
          campaignBonusReservations: {},
          commissionBreakdown: [],
          stackedVouchers: stacked.map(
            ({ voucher, benefitType, discount }) => ({
              code: voucher.displayCode,
              benefitType,
              discount,
              shopFunded: 0,
              platformFunded: discount,
            }),
          ),
          ghnShippedAt: paid
            ? new Date(createdAt.getTime() + 86_400_000).toISOString()
            : null,
          seed: {
            dataset: DATASET_VERSION,
            source: shippingEvidence ? 'GHN_SANDBOX_EXPORT' : 'SYNTHETIC',
            orderKey: key,
            shippingEvidence: shippingEvidence
              ? {
                  capturedAt: shippingEvidence.capturedAt,
                  evidenceFile: shippingEvidence.evidenceFile,
                }
              : null,
          },
        },
        createdAt,
      };
      data.orders.push(order);

      let commissionTotal = 0;
      const commissionBreakdown: Prisma.InputJsonObject[] = [];
      const campaignBonusReservations: Record<string, number> = {};
      products.forEach((product, itemIndex) => {
        const productIndex = data.products.indexOf(product);
        const itemId = seedId(`order-item:${key}:${itemIndex}`);
        const unitPrice = amount(product.price);
        const netItemSubtotal = linePricing[itemIndex].netGoods;
        const remunerationBase = unitPrice * quantity;
        const breakdown = seedCommissionBreakdown(data, {
          collaboratorId,
          productId: product.id!,
          storeId,
          referralLinkId,
          liveSessionId: historicalLive?.id,
          at: createdAt,
        });
        const itemCommission = commissionAmount(
          remunerationBase,
          breakdown.rate,
        );
        commissionBreakdown.push({
          productId: product.id!,
          netGoods: netItemSubtotal,
          remunerationBase,
          ...breakdown,
          liveSessionId: historicalLive?.id ?? null,
        });
        if (breakdown.campaignId) {
          const reserved = commissionAmount(
            remunerationBase,
            breakdown.campaign,
          );
          campaignBonusReservations[breakdown.campaignId] =
            (campaignBonusReservations[breakdown.campaignId] ?? 0) + reserved;
        }
        commissionTotal += itemCommission;
        data.orderItems.push({
          id: itemId,
          orderId: id,
          productId: product.id!,
          variantId: seedId(`variant:${productIndex}:0`),
          referralLinkId,
          quantity,
          unitPrice,
          appliedCommissionRate: breakdown.rate,
          regularCommissionRate: breakdown.live
            ? breakdown.rate - breakdown.live
            : null,
          regularCommissionAmount: breakdown.live
            ? commissionAmount(remunerationBase, breakdown.rate - breakdown.live)
            : null,
          calculatedCommissionAmount: itemCommission,
          commissionSnapshotAt: createdAt,
          createdAt,
        });
        const productReviewCount = data.reviews.filter(
          (row) => row.productId === product.id,
        ).length;
        if (completed && productReviewCount < 3)
          data.reviews.push({
            id: seedId(`review:${key}:${itemIndex}`),
            productId: product.id!,
            orderId: id,
            customerName: customer.fullName,
            rating: (customerIndex + itemIndex) % 4 === 0 ? 4 : 5,
            comment: [
              'Đóng gói cẩn thận, mình đã nhận đúng phân loại đã đặt.',
              'Sản phẩm được niêm phong, Shop tư vấn rõ ràng.',
              'Giao đủ số lượng, thông tin sản phẩm dễ theo dõi.',
            ][customerIndex % 3],
            images: [product.imageUrl!],
            reviewImageUrl: product.imageUrl,
            status: 'APPROVED',
            isApproved: true,
            reviewedBy: ADMIN_ID,
            reviewedAt: new Date(completedAt!.getTime() + 3_600_000),
            createdAt: new Date(completedAt!.getTime() + 1_800_000),
          });
      });
      order.rawPayload = {
        ...(order.rawPayload as Prisma.InputJsonObject),
        commissionBreakdown,
        campaignBonusReservations,
      };
      for (const [campaignId, reserved] of Object.entries(
        campaignBonusReservations,
      )) {
        const campaign = data.campaigns.find((row) => row.id === campaignId)!;
        campaign.bonusBudgetUsed = amount(campaign.bonusBudgetUsed) + reserved;
        assertSeed(
          amount(campaign.bonusBudgetUsed) <= amount(campaign.bonusBudgetTotal),
          'campaign bonus budget exceeded',
        );
      }
      for (const { voucher, benefitType, discount } of stacked) {
        data.stackedRedemptions.push({
          orderId: id,
          couponId: voucher.id!,
          customerPhone: customer.phoneNumber,
          benefitType,
          status: paid ? 'USED' : 'RESERVED',
          discountAmount: discount,
          shopFundedAmount: 0,
          platformFundedAmount: discount,
          createdAt,
        });
        voucher.usageCount = (voucher.usageCount ?? 0) + 1;
        voucher.budgetUsed = amount(voucher.budgetUsed) + discount;
      }
      if (purchase === 1 && coupon)
        data.savedCoupons.push({
          userId: customer.id!,
          couponId: coupon.id!,
          savedAt: createdAt,
        });

      if (paid)
        data.commissions.push({
          id: seedId(`commission:${key}`),
          orderId: id,
          collaboratorId,
          commissionAmount: commissionTotal,
          status: completed ? 'APPROVED' : 'PENDING',
          eligibleAt: deliveredAt ?? createdAt,
          availableAt: deliveredAt
            ? new Date(deliveredAt.getTime() + 14 * 86_400_000)
            : daysFrom(context, 30),
          approvedAt: completedAt,
          storeWalletTracked: true,
          createdAt,
        });

      data.payments.push({
        id: seedId(`payment:${key}`),
        orderId: id,
        transactionId: `DEMO-PAY-${customerIndex + 1}-${purchase + 1}`,
        amount: finalAmount,
        currency: 'VND',
        paymentMethod: paid ? 'WALLET' : 'PAYOS',
        status: paid ? 'SUCCESS' : 'PENDING',
        createdAt,
      });
      if (coupon) {
        data.redemptions.push({
          id: seedId(`redemption:${key}`),
          couponId: coupon.id!,
          orderId: id,
          collaboratorId: coupon.collaboratorId,
          storeId,
          customerId: customer.id,
          customerPhone: customer.phoneNumber,
          status: paid ? 'USED' : 'RESERVED',
          discountAmount: shopDiscount,
          shopFundedAmount: shopDiscount,
          platformFundedAmount: 0,
          eligibleSubtotal: subtotalAmount,
          couponCodeSnapshot: coupon.displayCode,
          discountTypeSnapshot: coupon.discountType!,
          discountValueSnapshot: coupon.discountValue ?? 0,
          createdAt,
        });
        coupon.usageCount = (coupon.usageCount ?? 0) + 1;
        coupon.budgetUsed = amount(coupon.budgetUsed) + shopDiscount;
      }

      if (status === 'RETURN_REQUESTED') {
        const returnId = seedId(`return:${key}`);
        const approved = customerIndex % 2 === 0;
        const submittedAt = daysFrom(context, -1);
        const address = fullAddress(addressFor(storeIndex));
        data.returns.push({
          id: returnId,
          orderId: id,
          customerId: customer.id!,
          reason: 'DAMAGED',
          details:
            'Hộp sản phẩm bị móp khi nhận. Khách gửi ảnh và video mở hộp để Shop kiểm tra.',
          imageUrls: [products[0].imageUrl!],
          unboxingVideoUrl: new URL(
            '/assets/sample-video.mp4',
            context.frontendUrl,
          ).toString(),
          status: approved ? 'SHOP_APPROVED' : 'REQUESTED',
          originalOrderStatus: 'DELIVERED',
          deadlineAt: new Date(deliveredAt!.getTime() + 14 * 86_400_000),
          shopResponse: approved
            ? 'Shop đã tiếp nhận; vui lòng đặt lịch lấy hàng trên hồ sơ đổi trả.'
            : null,
          shopRespondedAt: approved ? daysFrom(context, -0.5) : null,
          shipByAt: approved ? daysFrom(context, 7) : null,
          returnAddress: approved ? address : null,
          returnInstructions: approved
            ? 'Giữ nguyên phụ kiện và đóng gói đầy đủ. Đặt lịch lấy hàng để gửi về kho của Shop.'
            : null,
          submittedAt,
        });
        data.returnItems.push({
          id: seedId(`return-item:${key}`),
          returnRequestId: returnId,
          orderItemId: seedId(`order-item:${key}:0`),
          quantity: 1,
          unitPrice: products[0].price,
        });
        data.returnEvents.push({
          id: seedId(`return-event:${key}`),
          returnRequestId: returnId,
          actorId: customer.id,
          type: 'REQUESTED',
          data: { source: 'SYNTHETIC_CAPSTONE' },
          createdAt: submittedAt,
        });
        if (approved)
          data.returnEvents.push({
            id: seedId(`return-approved-event:${key}`),
            returnRequestId: returnId,
            actorId: seedId(`shop-owner:${storeIndex}`),
            type: 'SHOP_APPROVED',
            createdAt: daysFrom(context, -0.5),
          });
      }
      data.notifications.push({
        id: seedId(`order-notification:${key}`),
        userId: customer.id!,
        title: completed ? 'Đơn hàng đã hoàn tất' : 'Cập nhật đơn hàng',
        message: `Đơn ${order.externalOrderSn} đã được cập nhật.`,
        type: completed
          ? 'ORDER_COMPLETED'
          : status === 'SHIPPING'
            ? 'ORDER_SHIPPED'
            : status === 'DELIVERED'
              ? 'ORDER_DELIVERED'
              : status === 'RETURN_REQUESTED'
                ? 'RETURN_REQUESTED'
                : 'ORDER_CREATED',
        data: {
          orderId: id,
          externalOrderSn: order.externalOrderSn,
          status,
          actionUrl:
            status === 'RETURN_REQUESTED'
              ? `/customer/returns/${seedId(`return:${key}`)}`
              : `/customer/orders?orderId=${id}`,
        },
        createdAt: completedAt ?? daysFrom(context, -0.5),
        isRead: completed,
      });
    }
  });
  for (const link of data.referralLinks)
    link.totalOrders = data.orders.filter(
      (item) => item.referralLinkId === link.id,
    ).length;
}
