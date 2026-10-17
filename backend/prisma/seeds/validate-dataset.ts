import { PayoutTaxService } from '../../src/modules/payouts/payout-tax.service';
import { Prisma } from '@prisma/client';
import {
  amount,
  assertSeed,
  commissionAmount,
  DAY_MS,
  jsonObject,
} from './seed.helpers';
import type { SeedDataset, SeedTable } from './seed.types';
import { priceVoucherLines } from '../../src/modules/coupons/voucher-pricing';
import { seedCommissionBreakdown } from './commission.seed';

const equalMoney = (left: number, right: number): boolean =>
  new Prisma.Decimal(left)
    .toDecimalPlaces(2)
    .equals(new Prisma.Decimal(right).toDecimalPlaces(2));

export function validateDataset(data: SeedDataset): void {
  assertSeed(
    data.stores.length === 15 && data.products.length === 30,
    'expected 15 shops and 30 products',
  );
  assertSeed(
    data.profiles.length === 20 &&
      data.users.filter((u) => u.role === 'CUSTOMER').length === 30,
    'expected 20 creators and 30 customers',
  );
  assertSeed(data.orders.length === 60, 'each customer must have two orders');
  assertSeed(
    data.liveSessions.filter((row) => row.status === 'LIVE').length === 2 &&
      data.liveSessions.filter((row) => row.status === 'ENDED').length === 3,
    'expected two live and three ended sessions',
  );
  for (const key of Object.keys(data) as SeedTable[]) {
    if (key === 'liveViewers') continue;
    if (key === 'savedCoupons' || key === 'stackedRedemptions') {
      const identities =
        key === 'savedCoupons'
          ? data.savedCoupons.map((row) => `${row.userId}:${row.couponId}`)
          : data.stackedRedemptions.map(
              (row) => `${row.orderId}:${row.couponId}`,
            );
      assertSeed(
        new Set(identities).size === identities.length,
        `duplicate composite key in ${key}`,
      );
      continue;
    }
    const rows = data[key] as { id?: string }[];
    assertSeed(
      rows.every((row) => typeof row.id === 'string') &&
        new Set(rows.map((row) => row.id)).size === rows.length,
      `duplicate/missing ID in ${key}`,
    );
  }
  const users = new Map(data.users.map((row) => [row.id, row]));
  const stores = new Map(data.stores.map((row) => [row.id, row]));
  const products = new Map(data.products.map((row) => [row.id, row]));
  const variants = new Map(data.variants.map((row) => [row.id, row]));
  const orders = new Map(data.orders.map((row) => [row.id, row]));
  const coupons = new Map(data.coupons.map((row) => [row.id, row]));
  const sampleCounts = new Map<string, number>();
  const date = (value: Date | string | null | undefined): number =>
    value ? new Date(value).getTime() : NaN;

  for (const session of data.liveSessions) {
    const productsInSession = data.liveProducts.filter(
      (row) => row.sessionId === session.id,
    );
    const pinnedId = jsonObject(session.governance).pinnedProductId;
    assertSeed(
      typeof pinnedId === 'string' &&
        productsInSession.some((row) => row.productId === pinnedId),
      'live pin must belong to its session',
    );
    assertSeed(
      productsInSession.every(
        (row) =>
          products.get(row.productId)?.storeId === session.storeId &&
          variants.get(row.variantId!)?.productId === row.productId,
      ),
      'live product/variant must belong to its shop',
    );
    assertSeed(
      date(session.startsAt) < date(session.endsAt),
      'invalid live time window',
    );
    assertSeed(
      [2, 3].includes(amount(session.commissionRate)),
      'live commission must store bonus 2 or 3, not total rate',
    );
    if (session.status === 'LIVE')
      assertSeed(
        !data.liveViewers.some((row) => row.sessionId === session.id),
        'active seed live must not fabricate current viewers',
      );
  }

  data.tiers.forEach((tier, index) =>
    assertSeed(
      data.profiles.filter((profile) => profile.tierId === tier.id).length ===
        [5, 7, 5, 3][index],
      `tier distribution for ${tier.name}`,
    ),
  );
  for (const store of data.stores) {
    assertSeed(
      users.get(store.ownerId)?.role === 'SHOP_MANAGER',
      'shop owner must have merchant role',
    );
    assertSeed(
      amount(store.defaultCommissionRate) === 10,
      'shop base commission must be 10%',
    );
    assertSeed(
      data.products.filter((row) => row.storeId === store.id).length === 2,
      'each shop needs two products',
    );
    const onboarding = jsonObject(store.onboardingData);
    const warehouse = jsonObject(store.returnWarehouse);
    assertSeed(
      store.isVerified &&
        store.onboardingStatus === 'VERIFIED' &&
        store.logoUrl &&
        store.policyReturn &&
        store.policyWarranty &&
        onboarding.businessType === 'ENTERPRISE' &&
        onboarding.contactPhone &&
        onboarding.warehouseAddress &&
        onboarding.payoutBankAccountNumber &&
        ['MB', 'Vietcombank'].includes(String(onboarding.payoutBankName)) &&
        warehouse.address &&
        warehouse.provinceName &&
        warehouse.districtName &&
        warehouse.wardName,
      'shop legal/warehouse/policy/bank fixture incomplete',
    );
  }
  for (const profile of data.profiles) {
    const channels = data.socialChannels.filter(
      (row) => row.collaboratorId === profile.userId,
    );
    assertSeed(
      users.get(profile.userId)?.role === 'COLLABORATOR' &&
        profile.avatarUrl &&
        profile.kycStatus === 'VERIFIED' &&
        profile.bankAccountNumber &&
        channels.length >= 1 &&
        channels.length <= 2 &&
        channels.filter((row) => row.isPrimary).length === 1 &&
        channels.every(
          (row) =>
            (row.followerCount ?? 0) >= 15_000 &&
            (row.followerCount ?? 0) <= 450_000,
        ),
      'creator profile/channel/bank fixture incomplete',
    );
  }
  for (const customer of data.users.filter((row) => row.role === 'CUSTOMER')) {
    const purchases = data.orders.filter(
      (row) => row.customerId === customer.id,
    );
    assertSeed(
      purchases.length >= 1 && purchases.length <= 2,
      'customer order distribution mismatch',
    );
  }
  for (const user of data.users.filter((row) =>
    ['CUSTOMER', 'COLLABORATOR'].includes(row.role!),
  )) {
    const addresses = data.addresses.filter((row) => row.userId === user.id);
    assertSeed(
      addresses.filter((row) => row.isDefault).length === 1,
      'exactly one default address per user',
    );
    assertSeed(
      addresses.every(
        (row) =>
          row.provinceCode &&
          row.districtCode &&
          row.wardCode &&
          row.detailAddress,
      ),
      'three-level address missing',
    );
    assertSeed(
      /^0[9378]\d{8}$/.test(user.phoneNumber ?? ''),
      'invalid Vietnamese demo phone format',
    );
  }
  for (const product of data.products) {
    const productVariants = data.variants.filter(
      (row) => row.productId === product.id,
    );
    assertSeed(
      stores.has(product.storeId) && productVariants.length === 4,
      'product shop/variants missing',
    );
    assertSeed(
      productVariants.reduce(
        (sum, row) => sum + (row.stockQuantity ?? 0),
        0,
      ) === product.stockQuantity,
      'product stock does not equal variant stock',
    );
    assertSeed(
      product.stockQuantity >= 50 &&
        product.stockQuantity <= 500 &&
        amount(product.customCommissionRate) === 10,
      'invalid product stock/base rate',
    );
    assertSeed(
      product.sampleQuota! >= 5 && product.sampleQuota! <= 20,
      'invalid sample quota',
    );
    const reviews = data.reviews.filter((row) => row.productId === product.id);
    assertSeed(
      reviews.length >= 2 && reviews.length <= 4,
      'each product needs 2-4 verified reviews',
    );
  }
  for (const order of data.orders) {
    assertSeed(
      stores.has(order.storeId) &&
        users.get(order.customerId!)?.role === 'CUSTOMER',
      'order ownership missing',
    );
    const items = data.orderItems.filter((row) => row.orderId === order.id);
    const primary = data.redemptions.find((row) => row.orderId === order.id);
    const stacked = data.stackedRedemptions.filter(
      (row) => row.orderId === order.id,
    );
    assertSeed(
      stacked.filter((row) => row.benefitType === 'GOODS').length <= 1 &&
        stacked.filter((row) => row.benefitType === 'SHIPPING').length <= 1,
      'only one platform goods and one shipping voucher per order',
    );
    const platformGoods = stacked
      .filter((row) => row.benefitType === 'GOODS')
      .reduce((sum, row) => sum + amount(row.discountAmount), 0);
    const shippingDiscount = stacked
      .filter((row) => row.benefitType === 'SHIPPING')
      .reduce((sum, row) => sum + amount(row.discountAmount), 0);
    const goodsDiscount = amount(primary?.discountAmount) + platformGoods;
    assertSeed(
      equalMoney(amount(order.couponDiscountAmount), goodsDiscount) &&
        equalMoney(
          amount(order.discountAmount),
          goodsDiscount + shippingDiscount,
        ) &&
        shippingDiscount <= amount(order.shippingFee),
      'goods/shipping voucher totals mismatch',
    );
    const payload = jsonObject(order.rawPayload);
    assertSeed(
      Number.isFinite(amount(order.shippingFee)) &&
        amount(order.shippingFee) >= 0 &&
        (payload.shippingFeeSource === 'GHN_SANDBOX_EXPORT' ||
          (payload.shippingFeeSource === 'SYNTHETIC_DEMO' &&
            payload.ghnIsReal === false &&
            payload.ghnTotalFee === null)),
      'shipping fee/source must not fabricate a GHN quote',
    );
    const pricing = priceVoucherLines(
      items.map((row) => row.quantity * amount(row.unitPrice)),
      items.map(() => true),
      amount(primary?.discountAmount),
      platformGoods,
    );
    const subtotal = items.reduce(
      (sum, row) => sum + row.quantity * amount(row.unitPrice),
      0,
    );
    assertSeed(
      equalMoney(subtotal, amount(order.subtotalAmount)),
      'order subtotal mismatch',
    );
    assertSeed(
      amount(order.discountAmount) >= 0 &&
        amount(order.discountAmount) <= subtotal,
      'invalid order discount',
    );
    assertSeed(
      equalMoney(
        amount(order.finalAmount),
        subtotal - amount(order.discountAmount) + amount(order.shippingFee),
      ),
      'order total mismatch',
    );
    for (const [itemIndex, item] of items.entries()) {
      assertSeed(
        products.get(item.productId)?.storeId === order.storeId &&
          variants.get(item.variantId!)?.productId === item.productId,
        'cross-shop order item or stale variant',
      );
      const rate = amount(item.appliedCommissionRate);
      const netSubtotal = pricing[itemIndex].netGoods;
      const snapshots = payload.commissionBreakdown as Record<
        string,
        unknown
      >[];
      const snapshot = snapshots?.find(
        (row) => row.productId === item.productId,
      );
      const expected = seedCommissionBreakdown(data, {
        productId: item.productId,
        collaboratorId: order.attributedCollaboratorId!,
        storeId: order.storeId,
        referralLinkId: order.referralLinkId!,
        liveSessionId:
          typeof snapshot?.liveSessionId === 'string'
            ? snapshot.liveSessionId
            : undefined,
        at: new Date(order.createdAt!),
      });
      assertSeed(
        rate === expected.rate &&
          snapshot?.rate === rate &&
          equalMoney(Number(snapshot?.netGoods), netSubtotal),
        'additive commission snapshot mismatch',
      );
      assertSeed(
        rate >= 0 &&
          rate <= 25 &&
          equalMoney(
            amount(item.calculatedCommissionAmount),
            commissionAmount(netSubtotal, rate),
          ),
        'commission must use net merchandise value and respect cap',
      );
    }
    if (order.status === 'COMPLETED')
      assertSeed(
        date(order.completedAt) - date(order.deliveredAt) >= 14 * DAY_MS,
        'escrow released before 14 days',
      );
    const payment = data.payments.find((row) => row.orderId === order.id);
    assertSeed(
      payment && equalMoney(amount(payment.amount), amount(order.finalAmount)),
      'payment/order amount mismatch',
    );
    if (order.couponId)
      assertSeed(
        coupons.get(order.couponId)?.storeId === order.storeId,
        'cross-shop coupon',
      );
  }
  for (const review of data.reviews) {
    const order = orders.get(review.orderId!);
    assertSeed(
      order?.status === 'COMPLETED' &&
        data.orderItems.some(
          (row) =>
            row.orderId === review.orderId &&
            row.productId === review.productId,
        ),
      'review requires a completed order containing product',
    );
    assertSeed(
      date(review.createdAt) >= date(order.completedAt),
      'review predates completed purchase',
    );
    assertSeed(
      review.rating === 5 &&
        Boolean(review.comment?.trim()) &&
        Array.isArray(review.images) &&
        review.images.length > 0,
      'review must include five stars, text and feedback image',
    );
  }
  for (const commission of data.commissions) {
    const order = orders.get(commission.orderId)!;
    const total = data.orderItems
      .filter((row) => row.orderId === order.id)
      .reduce((sum, row) => sum + amount(row.calculatedCommissionAmount), 0);
    assertSeed(
      equalMoney(total, amount(commission.commissionAmount)),
      'commission snapshot mismatch',
    );
    if (commission.status === 'APPROVED')
      assertSeed(
        order.status === 'COMPLETED' &&
          date(commission.approvedAt) >= date(commission.availableAt),
        'premature commission approval',
      );
  }
  for (const coupon of data.coupons) {
    const redemptions = [
      ...data.redemptions,
      ...data.stackedRedemptions,
    ].filter((row) => row.couponId === coupon.id);
    assertSeed(
      !coupon.stackableWithShopVoucher ||
        (coupon.fundingSource === 'PLATFORM_FUNDED' &&
          coupon.benefitType === 'GOODS'),
      'two shop merchandise vouchers cannot stack',
    );
    assertSeed(
      (coupon.usageCount ?? 0) === redemptions.length,
      'coupon usage mismatch',
    );
    assertSeed(
      equalMoney(
        amount(coupon.budgetUsed),
        redemptions.reduce((sum, row) => sum + amount(row.discountAmount), 0),
      ),
      'coupon budget mismatch',
    );
    assertSeed(
      amount(coupon.budgetUsed) <= amount(coupon.budgetTotal),
      'coupon overspends its budget',
    );
  }
  for (const campaign of data.campaigns) {
    const reserved = data.orders.reduce(
      (sum, order) =>
        sum +
        Number(
          jsonObject(jsonObject(order.rawPayload).campaignBonusReservations)[
            campaign.id!
          ] ?? 0,
        ),
      0,
    );
    assertSeed(
      equalMoney(amount(campaign.bonusBudgetUsed), reserved) &&
        amount(campaign.bonusBudgetUsed) <= amount(campaign.bonusBudgetTotal),
      'campaign bonus budget mismatch',
    );
  }
  for (const row of data.stackedRedemptions) {
    const coupon = coupons.get(row.couponId);
    const order = orders.get(row.orderId);
    assertSeed(
      coupon &&
        order &&
        coupon.storeId === order.storeId &&
        coupon.benefitType === row.benefitType &&
        coupon.fundingSource === 'PLATFORM_FUNDED' &&
        amount(row.shopFundedAmount) === 0 &&
        equalMoney(
          amount(row.discountAmount),
          amount(row.platformFundedAmount),
        ) &&
        row.status === (order.status === 'PENDING' ? 'RESERVED' : 'USED'),
      'invalid stacked voucher ownership/funding/status',
    );
  }
  for (const row of data.savedCoupons)
    assertSeed(
      users.get(row.userId)?.role === 'CUSTOMER' && coupons.has(row.couponId),
      'invalid saved coupon ownership',
    );
  for (const sample of data.samples) {
    const address = data.addresses.find(
      (row) => row.userId === sample.collaboratorId && row.isDefault,
    );
    assertSeed(
      sample.ghnProvinceId === Number(address?.provinceCode) &&
        sample.ghnDistrictId === Number(address?.districtCode) &&
        sample.ghnWardCode === address?.wardCode,
      'sample GHN address snapshot mismatch',
    );
    assertSeed(
      variants.get(sample.productVariantId!)?.productId === sample.productId,
      'sample variant/product mismatch',
    );
    if (sample.receivedAt)
      assertSeed(
        date(sample.deadlineAt) - date(sample.receivedAt) === 14 * DAY_MS,
        'sample SLA must start on receipt',
      );
    else
      assertSeed(
        sample.deadlineAt == null && sample.videoSubmittedAt == null,
        'sample deadline/video before receipt',
      );
    if (sample.videoSubmittedAt)
      assertSeed(
        date(sample.videoSubmittedAt) >= date(sample.receivedAt) &&
          date(sample.videoSubmittedAt) <= date(sample.deadlineAt),
        'sample video is outside receipt/SLA window',
      );
    if (sample.status !== 'PENDING')
      sampleCounts.set(
        sample.productId,
        (sampleCounts.get(sample.productId) ?? 0) + 1,
      );
  }
  for (const charge of data.sampleShippingCharges) {
    const sample = data.samples.find(
      (row) => row.id === charge.sampleRequestId,
    );
    assertSeed(
      sample &&
        sample.status !== 'PENDING' &&
        charge.trackingNumber === sample.trackingNumber &&
        charge.storeId === products.get(sample.productId)?.storeId &&
        charge.environment === 'TEST' &&
        charge.payer === 'SHOP' &&
        charge.codAmount === 0 &&
        charge.amount == null &&
        charge.status === 'PENDING_CONFIRMATION',
      'sample freight must remain unconfirmed, shop-paid and test-only',
    );
  }
  assertSeed(
    data.sampleShippingCharges.length ===
      data.samples.filter((row) => row.status !== 'PENDING').length,
    'sample shipping charge count mismatch',
  );
  for (const product of data.products)
    assertSeed(
      product.sampleGrantedCount === (sampleCounts.get(product.id!) ?? 0) &&
        product.sampleGrantedCount <= product.sampleQuota!,
      'sample quota counter mismatch',
    );
  for (const request of data.returns) {
    const order = orders.get(request.orderId)!;
    assertSeed(
      order.customerId === request.customerId &&
        order.status === 'RETURN_REQUESTED',
      'return ownership/status mismatch',
    );
    assertSeed(
      date(request.submittedAt) <= date(request.deadlineAt) &&
        request.unboxingVideoUrl,
      'return requires video and filing within deadline',
    );
  }
  for (const message of data.messages) {
    const conversation = data.conversations.find(
      (row) => row.id === message.conversationId,
    )!;
    const ownerId = stores.get(conversation.storeId)?.ownerId;
    assertSeed(
      message.senderId === ownerId ||
        message.senderId === conversation.customerId ||
        message.senderId === conversation.collaboratorId,
      'chat sender outside conversation',
    );
    const notification = data.notifications.find(
      (row) => row.id === message.id && row.type === 'CHAT_MESSAGE',
    );
    const recipientId =
      message.senderId === ownerId
        ? conversation.customerId || conversation.collaboratorId
        : ownerId;
    const payload = jsonObject(notification?.data);
    assertSeed(
      notification?.userId === recipientId &&
        notification?.isRead === (message.isRead ?? false) &&
        payload.messageId === message.id &&
        payload.conversationId === conversation.id &&
        payload.senderId === message.senderId &&
        payload.storeId === conversation.storeId,
      'chat notification identity/recipient/read-state mismatch',
    );
  }
  for (const notification of data.notifications)
    assertSeed(users.has(notification.userId), 'notification user missing');
  for (const link of data.referralLinks)
    assertSeed(
      products.get(link.productId)?.storeId === link.storeId &&
        users.get(link.collaboratorId)?.role === 'COLLABORATOR',
      'invalid referral ownership',
    );
  for (const payout of data.payouts) {
    const tax = new PayoutTaxService().calculateTax(
      new Prisma.Decimal(amount(payout.amount)),
    );
    assertSeed(
      equalMoney(amount(payout.taxAmount), tax.taxAmount.toNumber()) &&
        equalMoney(amount(payout.netAmount), tax.netAmount.toNumber()),
      'payout tax/net mismatch',
    );
  }
  const balances = new Map<string, number>();
  const storeBalances = new Map<string, number>();
  // Creation order inside the fixture encodes tie-breaking for same-timestamp entries.
  for (const entry of data.ledgers) {
    const key = `${entry.walletId}:${entry.balanceBucket}`;
    const before = balances.get(key) ?? 0;
    const after = new Prisma.Decimal(before)
      .plus(amount(entry.amount))
      .toNumber();
    assertSeed(
      equalMoney(amount(entry.balanceBefore), before) &&
        equalMoney(amount(entry.balanceAfter), after) &&
        after >= 0,
      'broken wallet ledger chain',
    );
    balances.set(key, after);
    if (entry.storeId) {
      const storeKey = `${key}:${entry.storeId}`;
      const storeBefore = storeBalances.get(storeKey) ?? 0;
      const storeAfter = storeBefore + amount(entry.amount);
      assertSeed(
        equalMoney(amount(entry.storeBalanceBefore), storeBefore) &&
          equalMoney(amount(entry.storeBalanceAfter), storeAfter) &&
          storeAfter >= 0,
        'broken store ledger chain',
      );
      storeBalances.set(storeKey, storeAfter);
    }
  }
  for (const wallet of data.wallets) {
    assertSeed(
      equalMoney(
        amount(wallet.availableBalance),
        balances.get(`${wallet.id!}:AVAILABLE`) ?? 0,
      ) &&
        equalMoney(
          amount(wallet.pendingBalance),
          balances.get(`${wallet.id!}:PENDING`) ?? 0,
        ),
      'wallet balance does not reconcile',
    );
  }
  for (const wallet of data.storeWallets)
    assertSeed(
      equalMoney(
        amount(wallet.availableBalance),
        storeBalances.get(`${wallet.walletId}:AVAILABLE:${wallet.storeId}`) ??
          0,
      ) &&
        equalMoney(
          amount(wallet.pendingBalance),
          storeBalances.get(`${wallet.walletId}:PENDING:${wallet.storeId}`) ??
            0,
        ),
      'store wallet does not reconcile',
    );

  for (const evidence of data.orders.map((row) =>
    jsonObject(jsonObject(row.rawPayload).seed),
  ))
    assertSeed(
      evidence.source === 'SYNTHETIC' ||
        evidence.source === 'GHN_SANDBOX_EXPORT',
      'missing transaction provenance',
    );
}
