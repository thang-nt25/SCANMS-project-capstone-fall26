/* Read-only source review companion. Writes random fixtures only to an explicit
 * disposable loopback *_test database; never loads .env or deletes ledger rows.
 * Findings are observations, not regression assertions that business logic is correct.
 */
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Test } = require('@nestjs/testing');
const { ConfigModule, ConfigService } = require('@nestjs/config');
const { JwtModule, JwtService } = require('@nestjs/jwt');
const { PassportModule } = require('@nestjs/passport');
const { ValidationPipe } = require('@nestjs/common');
const { Prisma } = require('@prisma/client');
const { Workbook } = require('exceljs');
const load = (path) => require('../dist/src/' + path);
const { PrismaModule } = load('core/database/prisma.module');
const { PrismaService } = load('core/database/prisma.service');
const { CacheService } = load('core/cache/cache.service');
const { JwtStrategy } = load('common/strategies/jwt.strategy');
const { HttpExceptionFilter } = load('common/filters/http-exception.filter');
const { TransformInterceptor } = load(
  'common/interceptors/transform.interceptor',
);
const { OrdersController } = load('modules/orders/orders.controller');
const { OrdersService } = load('modules/orders/orders.service');
const { ManualOrdersService } = load('modules/orders/manual-orders.service');
const { ExcelOrderImportService } = load(
  'modules/orders/excel-order-import.service',
);
const { OrderWebhookNormalizerService } = load(
  'modules/orders/normalizers/order-webhook-normalizer.service',
);
const { CouponsService } = load('modules/coupons/coupons.service');
const { WalletsModule } = load('modules/wallets/wallets.module');
const { WalletsService } = load('modules/wallets/wallets.service');
const { PayoutsModule } = load('modules/payouts/payouts.module');
const { PayoutBillService } = load('modules/payouts/payout-bill.service');
const { PayoutSettingsService } = load(
  'modules/payouts/payout-settings.service',
);
const { CommissionsService } = load('modules/commissions/commissions.service');
const { CommissionCalculatorService } = load(
  'modules/commissions/commission-calculator.service',
);
const { CommissionRulesService } = load(
  'modules/commission-rules/commission-rules.service',
);

async function main() {
  const databaseUrl = process.env.WITHDRAWAL_TEST_DATABASE_URL;
  assert.ok(databaseUrl, 'Set WITHDRAWAL_TEST_DATABASE_URL explicitly');
  const target = new URL(databaseUrl);
  assert.ok(
    ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) &&
      target.pathname.endsWith('_test'),
    'Only disposable local *_test databases',
  );
  const jwtSecret = 'qa-local-only-not-a-production-secret';
  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [
          () => ({
            DATABASE_URL: databaseUrl,
            DB_POOL_MAX: '4',
            JWT_SECRET: jwtSecret,
            MIN_PAYOUT_AMOUNT: '200000',
            CLOUDINARY_URL: 'cloudinary://qa-key:qa-secret@qa-cloud',
            PAYOUT_VIETQR_BANKS: JSON.stringify([
              { bin: '970436', code: 'VCB', name: 'QA Bank' },
            ]),
          }),
        ],
      }),
      JwtModule.register({ secret: jwtSecret }),
      PassportModule,
      PrismaModule,
      WalletsModule,
      PayoutsModule,
    ],
    controllers: [OrdersController],
    providers: [
      OrdersService,
      ManualOrdersService,
      ExcelOrderImportService,
      OrderWebhookNormalizerService,
      JwtStrategy,
      { provide: CouponsService, useValue: {} },
      { provide: CacheService, useValue: {} },
    ],
  })
    .overrideProvider(PayoutBillService)
    .useValue({
      maxBillBytes: 5242880,
      validateBill: (file) =>
        new PayoutBillService(
          new PayoutSettingsService(new ConfigService()),
        ).validateBill(file),
      uploadBill: () => {
        throw new Error('Real uploads deliberately disabled during QA');
      },
    })
    .compile();
  const app = module.createNestApplication({ logger: false });
  app.setGlobalPrefix('api');
  app.enableCors({ origin: 'http://127.0.0.1:5183', credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(process.env.QA_KEEP_SERVER ? 5184 : 0, '127.0.0.1');
  const base = await app.getUrl();
  const db = app.get(PrismaService);
  const engine = new CommissionsService(
    db,
    new CommissionCalculatorService(),
    app.get(WalletsService),
  );
  const observations = [];
  const observe = (id, data) => {
    observations.push({ id, ...data });
    console.log(JSON.stringify({ id, ...data }));
  };
  const call = async (path, body, token) => {
    const response = await fetch(base + '/api' + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    const owner = await db.user.create({
      data: {
        email: randomUUID() + '@example.test',
        passwordHash: 'qa-only',
        role: 'SHOP_MANAGER',
        fullName: 'QA owner',
      },
    });
    const kol = await db.user.create({
      data: {
        email: randomUUID() + '@example.test',
        passwordHash: 'qa-only',
        role: 'COLLABORATOR',
        fullName: 'QA KOL',
      },
    });
    const store = await db.store.create({
      data: {
        ownerId: owner.id,
        name: 'QA shop',
        slug: randomUUID(),
        defaultCommissionRate: '10',
      },
    });
    const product = await db.product.create({
      data: {
        storeId: store.id,
        sku: 'QA-' + randomUUID(),
        title: 'QA product',
        price: '1000000',
      },
    });
    const makeOrder = async (extra = {}) =>
      db.order.create({
        data: {
          storeId: store.id,
          externalOrderSn: 'QA-' + randomUUID(),
          customerName: 'QA customer',
          customerPhone: '0901234567',
          shippingAddress: 'QA private address',
          subtotalAmount: '1000000',
          discountAmount: '0',
          finalAmount: '1000000',
          status: 'DELIVERED',
          orderItems: {
            create: {
              productId: product.id,
              quantity: 1,
              unitPrice: '1000000',
              appliedCommissionRate: '10',
              calculatedCommissionAmount: '100000',
            },
          },
          ...extra,
        },
      });
    const delivered = await makeOrder();
    const partial = await call('/orders/track?phone=0');
    observe('QA-01', {
      status: partial.status,
      partialPhoneReturnsPrivateAddress: partial.body.data?.orders.some(
        (o) =>
          o.id === delivered.id && o.shippingAddress === 'QA private address',
      ),
    });
    const anon = await call('/orders/' + delivered.id + '/review', {
      productId: product.id,
      rating: 1,
      comment: 'Anonymous forged review',
      customerName: 'Not the buyer',
    });
    observe('QA-02', {
      status: anon.status,
      approved: anon.body.data?.review.isApproved,
    });
    const raceOrder = await makeOrder();
    const concurrent = await Promise.all(
      Array.from({ length: 8 }, () =>
        call('/orders/' + raceOrder.id + '/review', {
          productId: product.id,
          rating: 5,
          comment: 'Concurrent QA review',
        }),
      ),
    );
    observe('QA-03', {
      statuses: concurrent.map((r) => r.status),
      reviewCount: await db.productReview.count({
        where: { orderId: raceOrder.id, productId: product.id },
      }),
    });
    const barrierOrder = await makeOrder();
    let releaseReads;
    let reads = 0;
    const readBarrier = new Promise((resolve) => {
      releaseReads = resolve;
    });
    const synchronized = new Proxy(db, {
      get(target, key) {
        if (key !== 'productReview') return Reflect.get(target, key);
        const delegate = target.productReview;
        return new Proxy(delegate, {
          get(inner, method) {
            if (method === 'findFirst')
              return async (args) => {
                const result = await delegate.findFirst(args);
                if (args.where.orderId === barrierOrder.id) {
                  if (++reads === 2) releaseReads();
                  await readBarrier;
                }
                return result;
              };
            const value = Reflect.get(inner, method);
            return typeof value === 'function' ? value.bind(inner) : value;
          },
        });
      },
    });
    const raceService = new OrdersService(
      synchronized,
      app.get(OrderWebhookNormalizerService),
      {},
      {},
      new ConfigService(),
      app.get(WalletsService),
    );
    await Promise.all(
      [1, 2].map(() =>
        raceService.addOrderReview(barrierOrder.id, {
          productId: product.id,
          rating: 5,
          comment: 'Synchronized real database race',
        }),
      ),
    );
    observe('QA-03B', {
      synchronizedConcurrentReads: true,
      reviewCount: await db.productReview.count({
        where: { orderId: barrierOrder.id, productId: product.id },
      }),
    });
    const invalid = await call('/orders/not-a-uuid/review', {
      productId: product.id,
      rating: 5,
      comment: 'QA invalid id',
    });
    observe('QA-04', {
      status: invalid.status,
      leaksPrismaInternals: String(invalid.body.message).includes('Invalid `'),
    });
    const whitespaceOrder = await makeOrder();
    const whitespace = await call('/orders/' + whitespaceOrder.id + '/review', {
      productId: product.id,
      rating: 5,
      comment: '   ',
    });
    observe('QA-05', {
      status: whitespace.status,
      savedWhitespace: whitespace.body.data?.review.comment === '   ',
    });
    const extended = await call(
      '/orders/' + (await makeOrder()).id + '/review',
      { productId: product.id, rating: 5, comment: 'x'.repeat(600) },
    );
    observe('QA-06', {
      status: extended.status,
      savedCommentLength: extended.body.data?.review.comment.length,
    });
    const hookId = 'QA-' + randomUUID();
    const hook = {
      source: 'shopify',
      storeId: store.id,
      payload: {
        id: hookId,
        currency: 'VND',
        financial_status: 'paid',
        line_items: [
          {
            sku: product.sku,
            title: 'External QA title',
            quantity: 1,
            price: '1000000',
          },
        ],
        customer: { first_name: 'QA', phone: '0901234567' },
        shipping_address: {
          address1: 'QA road',
          city: 'QA city',
          province: 'QA province',
          country: 'VN',
        },
        subtotal_price: '1000000',
        total_price: '1000000',
      },
    };
    const firstHook = await call('/orders/webhook', hook);
    observe('QA-07', {
      status: firstHook.status,
      createdWithoutAuthentication: firstHook.body.data?.created,
    });
    hook.payload.fulfillment_status = 'fulfilled';
    const repeated = await call('/orders/webhook', hook);
    observe('QA-08', {
      status: repeated.status,
      savedStatus: repeated.body.data?.order.status,
      idempotent: repeated.body.data?.idempotent,
    });
    const refunded = await call('/orders/webhook', {
      ...hook,
      payload: {
        ...hook.payload,
        id: 'QA-' + randomUUID(),
        financial_status: 'refunded',
      },
    });
    observe('QA-09', {
      status: refunded.status,
      refundedFulfilledStatus: refunded.body.data?.order.status,
      address: refunded.body.data?.order.shippingAddress,
    });
    const dollars = await call('/orders/webhook', {
      ...hook,
      payload: {
        ...hook.payload,
        id: 'QA-' + randomUUID(),
        currency: 'USD',
        line_items: [
          { sku: product.sku, title: 'QA USD', quantity: 1, price: '19.99' },
        ],
        subtotal_price: '19.99',
        total_price: '19.99',
      },
    });
    observe('QA-10', {
      status: dollars.status,
      savedFinalAmount: dollars.body.data?.order.finalAmount,
      acceptedCurrency: 'USD',
    });
    const inconsistency = await call('/orders/webhook', {
      ...hook,
      payload: {
        ...hook.payload,
        id: 'QA-' + randomUUID(),
        subtotal_price: '1000000',
        total_discounts: '500000',
        total_price: '1000000',
      },
    });
    observe('QA-11', {
      status: inconsistency.status,
      subtotal: inconsistency.body.data?.order.subtotalAmount,
      discount: inconsistency.body.data?.order.discountAmount,
      final: inconsistency.body.data?.order.finalAmount,
    });
    const jwt = app
      .get(JwtService)
      .sign({ sub: owner.id, role: 'SHOP_MANAGER' });
    const badPhone = await call(
      '/orders/manual',
      {
        customerName: 'QA customer',
        customerPhone: 'abc',
        shippingAddress: 'QA address',
        items: [{ productId: product.id, quantity: 1 }],
      },
      jwt,
    );
    observe('QA-12', {
      status: badPhone.status,
      savedPhone: badPhone.body.data?.order.customerPhone,
    });
    const bool = await call(
      '/orders/manual',
      {
        customerName: 'QA customer',
        customerPhone: '0901234567',
        shippingAddress: 'QA address',
        items: [{ productId: product.id, quantity: true, unitPrice: true }],
      },
      jwt,
    );
    observe('QA-13', {
      status: bool.status,
      savedQuantity: bool.body.data?.order.orderItems[0].quantity,
      savedPrice: bool.body.data?.order.orderItems[0].unitPrice,
    });
    const huge = await call(
      '/orders/manual',
      {
        customerName: 'QA customer',
        customerPhone: '0901234567',
        shippingAddress: 'QA address',
        items: [{ productId: product.id, quantity: 1, unitPrice: 1e16 }],
      },
      jwt,
    );
    observe('QA-14', {
      status: huge.status,
      leaksPrismaInternals: String(huge.body.message).includes('Invalid `'),
    });
    const excel = new Workbook();
    const sheet = excel.addWorksheet('Orders');
    sheet.addRow([
      'order_code',
      'customer_name',
      'customer_phone',
      'shipping_address',
      'sku',
      'quantity',
      'unit_price',
    ]);
    sheet.addRow([
      'QA-' + randomUUID(),
      'QA customer',
      '0901234567',
      'QA address',
      product.sku,
      1,
      '1,5',
    ]);
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(await excel.xlsx.writeBuffer())], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'qa.xlsx',
    );
    const excelResponse = await fetch(base + '/api/orders/import-excel', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jwt },
      body: form,
    });
    const excelBody = await excelResponse.json();
    const importedId = excelBody.data?.importedOrders[0]?.orderId;
    const imported = importedId
      ? await db.orderItem.findFirst({ where: { orderId: importedId } })
      : null;
    observe('QA-15', {
      status: excelResponse.status,
      rawPrice: '1,5',
      savedPrice: imported?.unitPrice.toFixed(2),
    });
    const discounted = await makeOrder({
      attributedCollaboratorId: kol.id,
      discountAmount: '500000',
      finalAmount: '500000',
      orderItems: {
        create: {
          productId: product.id,
          quantity: 1,
          unitPrice: '1000000',
          appliedCommissionRate: '10',
          calculatedCommissionAmount: '50000',
        },
      },
    });
    await engine.createPendingCommission(discounted.id);
    const commission = await db.commission.findFirst({
      where: { orderId: discounted.id },
    });
    observe('QA-16', {
      orderNet: '500000.00',
      rate: '10%',
      snapshotBefore: '50000.00',
      commission: commission.commissionAmount.toFixed(2),
    });
    const snapshot = await makeOrder({ attributedCollaboratorId: kol.id });
    await db.product.update({
      where: { id: product.id },
      data: { customCommissionRate: '50' },
    });
    await engine.createPendingCommission(snapshot.id);
    const mutated = await db.commission.findFirst({
      where: { orderId: snapshot.id },
    });
    observe('QA-17', {
      snapshotBefore: '100000.00',
      rateAtPurchase: '10%',
      rateAfterPurchase: '50%',
      commission: mutated.commissionAmount.toFixed(2),
    });
    await db.product.update({
      where: { id: product.id },
      data: { customCommissionRate: '10' },
    });
    const refundService = new CommissionRulesService(
      db,
      app.get(WalletsService),
    );
    const refundedApprovedOrder = await makeOrder({
      attributedCollaboratorId: kol.id,
      completedAt: new Date(),
    });
    await engine.createPendingCommission(refundedApprovedOrder.id);
    const approvedCommission = await db.commission.findFirst({
      where: { orderId: refundedApprovedOrder.id },
    });
    await engine.approveMatureCommission(
      approvedCommission.id,
      new Date(Date.now() + 15 * 86400000),
    );
    const beforeRefund = await db.wallet.findUnique({
      where: { collaboratorId: kol.id },
    });
    await refundService.handleRefundAdjustment(
      store.id,
      refundedApprovedOrder.id,
      '1000000',
      'QA approved full refund',
      owner.id,
    );
    const reverseResult = await engine.reverseCommission(approvedCommission.id);
    const afterRefund = await db.wallet.findUnique({
      where: { collaboratorId: kol.id },
    });
    const refundedOrderState = await db.order.findUnique({
      where: { id: refundedApprovedOrder.id },
    });
    observe('QA-18', {
      fullRefund: '1000000.00',
      availableBefore: beforeRefund.availableBalance.toFixed(2),
      availableAfter: afterRefund.availableBalance.toFixed(2),
      orderStatus: refundedOrderState.status,
      cronClawback: reverseResult,
    });
    const partialOrder = await makeOrder({
      attributedCollaboratorId: kol.id,
      completedAt: new Date(),
    });
    await engine.createPendingCommission(partialOrder.id);
    await refundService.handleRefundAdjustment(
      store.id,
      partialOrder.id,
      '200000',
      'QA partial 1',
      owner.id,
    );
    await refundService.handleRefundAdjustment(
      store.id,
      partialOrder.id,
      '200000',
      'QA partial 2',
      owner.id,
    );
    const partialCommission = await db.commission.findFirst({
      where: { orderId: partialOrder.id },
    });
    observe('QA-19', {
      originalCommission: '100000.00',
      refundedFraction: '40%',
      expectedRemaining: '60000.00',
      actualRemaining: partialCommission.commissionAmount.toFixed(2),
    });
    const oldDelivery = new Date(Date.now() - 20 * 86400000);
    const lateOrder = await makeOrder({
      attributedCollaboratorId: kol.id,
      completedAt: oldDelivery,
    });
    await engine.createPendingCommission(lateOrder.id);
    const lateCommission = await db.commission.findFirst({
      where: { orderId: lateOrder.id },
    });
    observe('QA-20', {
      completedAt: oldDelivery.toISOString(),
      eligibleAt: lateCommission.eligibleAt.toISOString(),
      availableAt: lateCommission.availableAt.toISOString(),
      alreadyCompleted20Days: true,
      matureNow: lateCommission.availableAt <= new Date(),
    });
    if (process.env.QA_KEEP_SERVER) {
      await db.collaboratorProfile.create({
        data: {
          userId: kol.id,
          kycStatus: 'VERIFIED',
          bankName: 'QA Bank',
          bankAccountNumber: '00123456789',
          bankAccountName: 'QA KOL',
        },
      });
      await db.$transaction((tx) =>
        app
          .get(WalletsService)
          .creditAvailableBalance(
            tx,
            kol.id,
            new Prisma.Decimal('4000000'),
            { id: randomUUID(), type: 'MONTHLY_BONUS' },
            store.id,
          ),
      );
    }
    console.log(
      JSON.stringify({
        summary: 'QA observations completed',
        count: observations.length,
        apiUrl: base,
        storeId: store.id,
        productId: product.id,
        productSku: product.sku,
        ownerId: owner.id,
        kolId: kol.id,
        deliveredOrderId: delivered.id,
      }),
    );
    if (process.env.QA_KEEP_SERVER) {
      await new Promise((resolve) => {
        process.once('SIGINT', resolve);
        process.once('SIGTERM', resolve);
      });
    }
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  console.error('QA probe failed:', error.name, error.message);
  process.exitCode = 1;
});
