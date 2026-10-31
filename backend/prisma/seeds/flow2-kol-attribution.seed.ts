/**
 * FLOW 2 & 3 KOL ATTRIBUTION & LEDGER SEED
 * Strictly enforces mathematical consistency across:
 * - 11 Diverse KOLs across the 4 In-House Store Divisions
 * - Tier thresholds: Bronze (0đ), Silver (>=20M), Gold (>=50M), Diamond (>=100M)
 * - Dual Attribution: ~35% Coupon (AttributionMethod.COUPON) & ~65% Link (AttributionMethod.COOKIE)
 * - Remuneration Ledger: sum(commissions) == totalEarnedCommission == availableBalance + payouts
 * - 10% PIT Tax deduction on payouts via Napas 24/7
 */

import { PrismaClient, AttributionMethod, CouponStatus, DiscountType, ExclusiveDealStatus, PayoutStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';
import * as crypto from 'crypto';

const TIER_IDS = {
  BRONZE: 'b1bd22b5-ff0b-5ab8-813e-aa659c9e68c6',
  SILVER: 'a3c9b533-2b2a-5149-9302-2d61add4113a',
  GOLD: 'ab1d0ca3-b843-5c9d-80e2-e15057a3f54c',
  DIAMOND: 'd4f2fe0c-c2f8-5e66-b126-31383f972294',
};

export async function seedFlow2KolAttribution(prisma: PrismaClient) {
  console.log('🚀 Running seedFlow2KolAttribution...');

  const stores = await prisma.store.findMany({ select: { id: true, name: true, ownerId: true } });
  const soraStore = stores.find(s => s.name.includes('Sora'));
  const auraStore = stores.find(s => s.name.includes('Aura'));
  const greenBioStore = stores.find(s => s.name.includes('GreenBio'));
  const lumiereStore = stores.find(s => s.name.includes('Lumière'));

  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    select: { id: true, title: true, price: true, categoryName: true, storeId: true }
  });

  const soraProducts = products.filter(p => p.storeId === soraStore?.id);
  const auraProducts = products.filter(p => p.storeId === auraStore?.id);
  const greenBioProducts = products.filter(p => p.storeId === greenBioStore?.id);
  const lumiereProducts = products.filter(p => p.storeId === lumiereStore?.id);

  let customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    select: { id: true, fullName: true, email: true }
  });

  const KOL_SPECS = [
    {
      name: 'Dương Tuấn Anh',
      email: 'kol.diamond@scanms.vn',
      tierKey: 'DIAMOND' as const,
      store: lumiereStore!,
      targetProducts: lumiereProducts,
      couponCode: 'TUANANHTECH',
      couponDiscount: 10,
      dealRate: 16,
      gmvTarget: 112500000,
      ordersCount: 82,
      clicksCount: 950,
      earnedCommission: 14625000,
      payoutAmount: 10000000,
      availableBalance: 4625000,
    },
    {
      name: 'Bùi Minh Anh',
      email: 'kol.gold@scanms.vn',
      tierKey: 'GOLD' as const,
      store: auraStore!,
      targetProducts: auraProducts,
      couponCode: 'MINHANHFIT10',
      couponDiscount: 10,
      dealRate: 15,
      gmvTarget: 62400000,
      ordersCount: 68,
      clicksCount: 820,
      earnedCommission: 7488000,
      payoutAmount: 5000000,
      availableBalance: 2488000,
    },
    {
      name: 'Trần Mai Anh',
      email: 'kol.flow5@scanms.test',
      tierKey: 'GOLD' as const,
      store: greenBioStore!,
      targetProducts: greenBioProducts,
      couponCode: 'MAIANHHEALTHY',
      couponDiscount: 10,
      dealRate: 14,
      gmvTarget: 53800000,
      ordersCount: 58,
      clicksCount: 760,
      earnedCommission: 6456000,
      payoutAmount: 4000000,
      availableBalance: 2456000,
    },
    {
      name: 'Vũ Thanh Huyền',
      email: 'kol.silver@scanms.vn',
      tierKey: 'SILVER' as const,
      store: soraStore!,
      targetProducts: soraProducts,
      couponCode: 'HUYENBEAUTY10',
      couponDiscount: 10,
      dealRate: 14,
      gmvTarget: 28600000,
      ordersCount: 65,
      clicksCount: 740,
      earnedCommission: 3146000,
      payoutAmount: 2000000,
      availableBalance: 1146000,
    },
    {
      name: 'Hoàng Thảo Nhi',
      email: 'kol.thaonhi@scanms.vn',
      tierKey: 'SILVER' as const,
      store: soraStore!,
      targetProducts: soraProducts,
      couponCode: 'THAONHI16',
      couponDiscount: 10,
      dealRate: 16,
      gmvTarget: 24500000,
      ordersCount: 42,
      clicksCount: 580,
      earnedCommission: 2695000,
      payoutAmount: 1500000,
      availableBalance: 1195000,
    },
    {
      name: 'Trần Thảo My',
      email: 'kol.thaomy@scanms.vn',
      tierKey: 'SILVER' as const,
      store: auraStore!,
      targetProducts: auraProducts,
      couponCode: 'THAOMYLOOK',
      couponDiscount: 8,
      dealRate: 11,
      gmvTarget: 21800000,
      ordersCount: 35,
      clicksCount: 480,
      earnedCommission: 2398000,
      payoutAmount: 1500000,
      availableBalance: 898000,
    },
    {
      name: 'Nguyễn Quốc Huy',
      email: 'kol.quochuy@scanms.vn',
      tierKey: 'SILVER' as const,
      store: lumiereStore!,
      targetProducts: lumiereProducts,
      couponCode: 'QUOCHUYSMART',
      couponDiscount: 8,
      dealRate: 11,
      gmvTarget: 20400000,
      ordersCount: 28,
      clicksCount: 420,
      earnedCommission: 2244000,
      payoutAmount: 1500000,
      availableBalance: 744000,
    },
    {
      name: 'Lê Hoàng Yến Nhi',
      email: 'kol.bronze@scanms.vn',
      tierKey: 'BRONZE' as const,
      store: soraStore!,
      targetProducts: soraProducts,
      couponCode: 'YENNHISKIN',
      couponDiscount: 5,
      dealRate: 10,
      gmvTarget: 14200000,
      ordersCount: 32,
      clicksCount: 450,
      earnedCommission: 1420000,
      payoutAmount: 0,
      availableBalance: 1420000,
    },
    {
      name: 'Đặng Thùy Dung',
      email: 'kol.thuydung@scanms.vn',
      tierKey: 'BRONZE' as const,
      store: soraStore!,
      targetProducts: soraProducts,
      couponCode: 'THUYDUNGSKIN',
      couponDiscount: 5,
      dealRate: 10,
      gmvTarget: 9600000,
      ordersCount: 20,
      clicksCount: 310,
      earnedCommission: 960000,
      payoutAmount: 0,
      availableBalance: 960000,
    },
    {
      name: 'Phan Bảo Ngọc',
      email: 'kol.baongoc@scanms.vn',
      tierKey: 'BRONZE' as const,
      store: greenBioStore!,
      targetProducts: greenBioProducts,
      couponCode: 'BAONGOCGREEN',
      couponDiscount: 5,
      dealRate: 10,
      gmvTarget: 6800000,
      ordersCount: 18,
      clicksCount: 290,
      earnedCommission: 680000,
      payoutAmount: 0,
      availableBalance: 680000,
    },
    {
      name: 'Nguyễn Lan Hương',
      email: 'kol.lanhuong@scanms.vn',
      tierKey: 'BRONZE' as const,
      store: soraStore!,
      targetProducts: soraProducts,
      couponCode: 'LANHUONGGLOW',
      couponDiscount: 5,
      dealRate: 10,
      gmvTarget: 4200000,
      ordersCount: 12,
      clicksCount: 240,
      earnedCommission: 420000,
      payoutAmount: 0,
      availableBalance: 420000,
    },
  ];

  for (const spec of KOL_SPECS) {
    const user = await prisma.user.findFirst({ where: { email: spec.email } });
    if (!user) continue;

    const tierId = TIER_IDS[spec.tierKey];

    await prisma.collaboratorProfile.upsert({
      where: { userId: user.id },
      update: {
        kycStatus: 'VERIFIED',
        tierId: tierId,
        bankName: 'MBBANK',
        bankAccountNumber: '0987654' + user.id.replace(/-/g, '').substring(0, 4),
        bankAccountName: spec.name.toUpperCase(),
        totalEarnedCommission: spec.earnedCommission,
      },
      create: {
        userId: user.id,
        kycStatus: 'VERIFIED',
        tierId: tierId,
        bankName: 'MBBANK',
        bankAccountNumber: '0987654' + user.id.replace(/-/g, '').substring(0, 4),
        bankAccountName: spec.name.toUpperCase(),
        totalEarnedCommission: spec.earnedCommission,
      }
    });

    const coupon = await prisma.coupon.upsert({
      where: { codeNormalized: spec.couponCode.toUpperCase() },
      update: {
        collaboratorId: user.id,
        storeId: spec.store.id,
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: spec.couponDiscount,
      },
      create: {
        codeNormalized: spec.couponCode.toUpperCase(),
        displayCode: spec.couponCode.toUpperCase(),
        collaboratorId: user.id,
        storeId: spec.store.id,
        status: CouponStatus.ACTIVE,
        discountType: DiscountType.PERCENTAGE,
        discountValue: spec.couponDiscount,
      }
    });

    const refLink = await prisma.referralLink.upsert({
      where: { shortCode: `REF-${spec.couponCode.toUpperCase()}` },
      update: {
        collaboratorId: user.id,
        storeId: spec.store.id,
        productId: spec.targetProducts[0].id,
        destinationPath: `/products/${spec.targetProducts[0].id}`,
        status: 'ACTIVE',
      },
      create: {
        collaboratorId: user.id,
        storeId: spec.store.id,
        productId: spec.targetProducts[0].id,
        shortCode: `REF-${spec.couponCode.toUpperCase()}`,
        label: `Link tiếp thị ${spec.name}`,
        destinationPath: `/products/${spec.targetProducts[0].id}`,
        status: 'ACTIVE',
      }
    });

    let conv = await prisma.conversation.findFirst({
      where: { collaboratorId: user.id, storeId: spec.store.id }
    });
    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          collaboratorId: user.id,
          storeId: spec.store.id,
          lastMessageAt: new Date(),
        }
      });
    }

    if (spec.dealRate > 10 && spec.targetProducts.length > 0) {
      const targetProd = spec.targetProducts[0];
      await prisma.exclusiveDealProposal.deleteMany({
        where: { collaboratorId: user.id, storeId: spec.store.id, productId: targetProd.id }
      });
      await prisma.exclusiveDealProposal.create({
        data: {
          collaboratorId: user.id,
          storeId: spec.store.id,
          productId: targetProd.id,
          conversationId: conv.id,
          proposedCommissionRate: spec.dealRate,
          approvedCommissionRate: spec.dealRate,
          status: ExclusiveDealStatus.APPROVED,
          salesCommitment: `Cam kết đạt tối thiểu ${spec.ordersCount} đơn hàng qua kênh tiếp thị cá nhân`,
          targetOrders: spec.ordersCount,
          commitmentDays: 30,
          commitmentStartedAt: new Date(Date.now() - 25 * 86400000),
          commitmentEndsAt: new Date(Date.now() + 5 * 86400000),
        }
      });
    }

    const oldOrders = await prisma.order.findMany({
      where: { attributedCollaboratorId: user.id },
      select: { id: true }
    });
    const oldOrderIds = oldOrders.map(o => o.id);
    if (oldOrderIds.length > 0) {
      await prisma.commission.deleteMany({ where: { orderId: { in: oldOrderIds } } });
      await prisma.couponRedemption.deleteMany({ where: { orderId: { in: oldOrderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: oldOrderIds } } });
      await prisma.order.deleteMany({ where: { id: { in: oldOrderIds } } });
    }
    await prisma.clickTrafficLog.deleteMany({ where: { collaboratorId: user.id } });

    const clickLogs: any[] = [];
    for (let c = 0; c < spec.clicksCount; c++) {
      clickLogs.push({
        referralLinkId: refLink.id,
        collaboratorId: user.id,
        storeId: spec.store.id,
        ipAddress: `192.168.${(c % 250) + 1}.${(c % 200) + 1}`,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        referrer: 'https://tiktok.com/@creator',
        isValid: true,
        isUnique: true,
        createdAt: new Date(Date.now() - (spec.clicksCount - c) * 3600000 * 2),
      });
    }
    await prisma.clickTrafficLog.createMany({ data: clickLogs });

    const couponOrdersCount = Math.round(spec.ordersCount * 0.35);
    const avgOrderAmount = Math.round(spec.gmvTarget / spec.ordersCount);

    let remainingGmv = spec.gmvTarget;
    let accumulatedCommission = 0;

    for (let o = 0; o < spec.ordersCount; o++) {
      const isCoupon = o < couponOrdersCount;
      const isLast = o === spec.ordersCount - 1;
      const orderAmount = isLast ? remainingGmv : Math.round(avgOrderAmount * (0.9 + Math.random() * 0.2));
      remainingGmv -= orderAmount;

      const customer = customers[o % customers.length];
      const product = spec.targetProducts[o % spec.targetProducts.length] || spec.targetProducts[0];
      const orderDate = new Date(Date.now() - (spec.ordersCount - o) * 86400000 * 0.5);

      const order = await prisma.order.create({
        data: {
          storeId: spec.store.id,
          customerId: customer.id,
          externalOrderSn: `ORD-${spec.couponCode}-${String(o + 1).padStart(4, '0')}`,
          status: o % 2 === 0 ? 'DELIVERED' : 'COMPLETED',
          finalAmount: orderAmount,
          subtotalAmount: orderAmount,
          shippingFee: 0,
          discountAmount: isCoupon ? Math.round(orderAmount * (spec.couponDiscount / 100)) : 0,
          attributedCollaboratorId: user.id,
          attributionMethod: isCoupon ? AttributionMethod.COUPON : AttributionMethod.COOKIE,
          couponCodeSnapshot: isCoupon ? spec.couponCode : null,
          createdAt: orderDate,
          orderItems: {
            create: {
              productId: product.id,
              referralLinkId: isCoupon ? null : refLink.id,
              quantity: 1,
              unitPrice: orderAmount,
              appliedCommissionRate: spec.dealRate,
              calculatedCommissionAmount: Math.round(orderAmount * (spec.dealRate / 100)),
            }
          }
        }
      });

      const orderCommission = Math.round(orderAmount * (spec.dealRate / 100));
      accumulatedCommission += orderCommission;

      await prisma.commission.create({
        data: {
          orderId: order.id,
          collaboratorId: user.id,
          commissionAmount: orderCommission,
          status: 'APPROVED',
          eligibleAt: orderDate,
          availableAt: orderDate,
          approvedAt: orderDate,
        }
      });

      if (isCoupon) {
        await prisma.couponRedemption.create({
          data: {
            couponId: coupon.id,
            orderId: order.id,
            collaboratorId: user.id,
            storeId: spec.store.id,
            customerId: customer.id,
            discountAmount: Math.round(orderAmount * (spec.couponDiscount / 100)),
            shopFundedAmount: Math.round(orderAmount * (spec.couponDiscount / 100)),
            platformFundedAmount: 0,
            eligibleSubtotal: orderAmount,
            couponCodeSnapshot: spec.couponCode,
            discountTypeSnapshot: DiscountType.PERCENTAGE,
            discountValueSnapshot: spec.couponDiscount,
            status: 'USED',
          }
        });
      }
    }

    await prisma.collaboratorProfile.update({
      where: { userId: user.id },
      data: { totalEarnedCommission: accumulatedCommission }
    });

    const netAvailable = Math.max(0, accumulatedCommission - spec.payoutAmount);
    await prisma.wallet.upsert({
      where: { collaboratorId: user.id },
      update: { availableBalance: netAvailable, pendingBalance: 0 },
      create: { collaboratorId: user.id, availableBalance: netAvailable, pendingBalance: 0 }
    });

    if (spec.payoutAmount > 0) {
      await prisma.payoutRequest.deleteMany({ where: { collaboratorId: user.id } });
      const sha = crypto.createHash('sha256').update(user.id + spec.payoutAmount).digest('hex');
      await prisma.payoutRequest.create({
        data: {
          collaboratorId: user.id,
          storeId: spec.store.id,
          approvedById: spec.store.ownerId,
          amount: spec.payoutAmount,
          netAmount: Math.round(spec.payoutAmount * 0.9),
          taxAmount: Math.round(spec.payoutAmount * 0.1),
          status: PayoutStatus.APPROVED,
          bankName: 'MBBANK',
          bankAccountNumber: '9999' + user.id.replace(/-/g, '').substring(0, 8),
          bankAccountName: spec.name.toUpperCase(),
          bankRefCode: 'FT' + Date.now().toString().slice(-8) + user.id.substring(0, 4),
          proofImageUrl: `https://images.scanms.vn/receipts/napas_${user.id.substring(0, 8)}.png`,
          proofImagePublicId: `receipt_${user.id.replace(/-/g, '').substring(0, 16)}`,
          proofImageFormat: 'png',
          proofImageSha256: sha,
          processedAt: new Date(Date.now() - 3 * 86400000),
        }
      });
    }
  }

  console.log('✅ seedFlow2KolAttribution completed.');
}

if (require.main === module) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  seedFlow2KolAttribution(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
    });
}

