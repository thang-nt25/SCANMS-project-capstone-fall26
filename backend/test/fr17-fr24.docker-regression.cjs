// Explicit opt-in regression runner. Never loads .env or deletes financial history.
require('reflect-metadata');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const { ConfigService } = require('@nestjs/config');
const { Prisma } = require('@prisma/client');
const load = (path) => require('../dist/src/' + path);
const { PrismaService } = load('core/database/prisma.service');
const { FinancialLedgerService } = load(
  'modules/wallets/financial-ledger.service',
);
const { WalletsService } = load('modules/wallets/wallets.service');
const { CommissionsService } = load('modules/commissions/commissions.service');
const { CommissionCalculatorService } = load(
  'modules/commissions/commission-calculator.service',
);
const { CommissionRulesService } = load(
  'modules/commission-rules/commission-rules.service',
);
const { Workbook } = require('exceljs');
const databaseUrl = new URL(process.env.DATABASE_URL);
assert.equal(process.env.QA_DOCKER, '1', 'Explicit Docker QA opt-in required');
assert.ok(
  ['postgres-db', '127.0.0.1', 'localhost'].includes(databaseUrl.hostname),
);
assert.ok(
  databaseUrl.pathname.endsWith('_test'),
  'A disposable *_test database is required',
);
assert.equal(process.env.JWT_SECRET, 'qa-local-only-not-a-production-secret');
const base = process.env.QA_API_URL || 'http://127.0.0.1:3000/api';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const db = new PrismaService();
const wallets = new WalletsService(new FinancialLedgerService());
const engine = new CommissionsService(
  db,
  new CommissionCalculatorService(),
  wallets,
);
const rules = new CommissionRulesService(db, wallets);
let checks = 0;
function pass(label) {
  checks++;
  console.log(JSON.stringify({ check: label, result: 'PASS' }));
}
async function request(path, body, token, headers = {}) {
  const response = await fetch(base + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, body: await response.json() };
}
async function main() {
  await db.$connect();
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
    await db.collaboratorProfile.create({
      data: {
        userId: kol.id,
        kycStatus: 'VERIFIED',
        bankName: 'QA Bank',
        bankAccountNumber: '00123456789',
        bankAccountName: 'QA KOL',
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
    const token = jwt.sign(
      { sub: owner.id, role: 'SHOP_MANAGER' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' },
    );
    const makeOrder = (extra = {}, item = {}) =>
      db.order.create({
        data: {
          storeId: store.id,
          externalOrderSn: 'QA-' + randomUUID(),
          customerName: 'QA buyer',
          customerPhone: '0902233445',
          shippingAddress: 'QA private address',
          subtotalAmount: '1000000',
          discountAmount: '0',
          finalAmount: '1000000',
          status: 'DELIVERED',
          completedAt: new Date(),
          orderItems: {
            create: {
              productId: product.id,
              quantity: 1,
              unitPrice: '1000000',
              appliedCommissionRate: '10',
              calculatedCommissionAmount: '100000',
              ...item,
            },
          },
          ...extra,
        },
      });
    const order = await makeOrder();
    assert.equal((await request('/orders/track?phone=0')).status, 400);
    const formatted = await request('/orders/track?phone=%2B84902233445');
    assert.ok(formatted.body.data.orders.some((item) => item.id === order.id));
    assert.ok(
      formatted.body.data.orders.every(
        (item) =>
          item.shippingAddress !== 'QA private address' && !item.reviewToken,
      ),
    );
    pass(
      'short lookup rejected, normalized phone works, single-factor lookup masks PII',
    );
    const reviewBody = {
      productId: product.id,
      rating: 5,
      comment: 'Verified QA review',
    };
    assert.equal(
      (await request('/orders/' + order.id + '/review', reviewBody)).status,
      400,
    );
    const verified = await request(
      '/orders/track?phone=0902233445&orderSn=' + order.externalOrderSn,
    );
    const reviewToken = verified.body.data.orders[0].reviewToken;
    assert.ok(reviewToken);
    assert.equal(
      (
        await request('/orders/not-a-uuid/review', {
          ...reviewBody,
          reviewToken,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('/orders/' + order.id + '/review', {
          ...reviewBody,
          reviewToken,
          comment: '   ',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('/orders/' + order.id + '/review', {
          ...reviewBody,
          reviewToken,
          comment: 'x'.repeat(600),
        })
      ).status,
      400,
    );
    const reviews = await Promise.all(
      Array.from({ length: 8 }, () =>
        request('/orders/' + order.id + '/review', {
          ...reviewBody,
          reviewToken,
        }),
      ),
    );
    assert.equal(reviews.filter((item) => item.status === 201).length, 1);
    assert.equal(
      await db.productReview.count({
        where: { orderId: order.id, productId: product.id },
      }),
      1,
    );
    pass('review proof, UUID/length/whitespace, concurrent single review');
    const manual = {
      storeId: store.id,
      requestId: randomUUID(),
      customerName: 'QA',
      customerPhone: '+84902233445',
      shippingAddress: 'QA',
      items: [{ productId: product.id, quantity: 1, unitPrice: 100000 }],
    };
    const created = await Promise.all([
      request('/orders/manual', manual, token),
      request('/orders/manual', manual, token),
    ]);
    assert.deepEqual(
      created.map((item) => item.status),
      [201, 201],
    );
    assert.equal(created[0].body.data.order.id, created[1].body.data.order.id);
    assert.equal(
      await db.orderItem.count({
        where: { orderId: created[0].body.data.order.id },
      }),
      1,
    );
    assert.equal(
      (
        await request(
          '/orders/manual',
          { ...manual, customerName: 'different' },
          token,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await request(
          '/orders/manual',
          { ...manual, requestId: randomUUID(), customerPhone: 'abc' },
          token,
        )
      ).status,
      400,
    );
    for (const items of [
      [{ productId: product.id, quantity: true, unitPrice: true }],
      [{ productId: product.id, quantity: 1, unitPrice: 1e16 }],
    ])
      assert.equal(
        (
          await request(
            '/orders/manual',
            { ...manual, requestId: randomUUID(), items },
            token,
          )
        ).status,
        400,
      );
    pass(
      'manual intent idempotency, conflict payload, phone/type/money bounds',
    );
    const book = new Workbook();
    const sheet = book.addWorksheet('Orders');
    sheet.addRow([
      'order_code',
      'customer_name',
      'customer_phone',
      'shipping_address',
      'sku',
      'quantity',
      'unit_price',
    ]);
    const badCode = 'QA-bad-' + randomUUID();
    const goodCode = 'QA-good-' + randomUUID();
    sheet.addRow([badCode, 'QA', '0902233445', 'QA', product.sku, 1, '1,5']);
    sheet.addRow([goodCode, 'QA', '0902233445', 'QA', product.sku, 1, 100000]);
    const form = new FormData();
    form.append('storeId', store.id);
    form.append(
      'file',
      new Blob([await book.xlsx.writeBuffer()], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      'qa.xlsx',
    );
    const imported = await fetch(base + '/orders/import-excel', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: form,
    });
    assert.equal(imported.status, 200);
    const result = await imported.json();
    assert.equal(result.data.summary.importedOrders, 1);
    assert.ok(result.data.errors.some((item) => item.row === 2));
    assert.equal(
      await db.order.count({
        where: { storeId: store.id, externalOrderSn: badCode },
      }),
      0,
    );
    pass(
      'Excel locale ambiguity is a row error; valid order imports atomically',
    );
    const hookedStore = await db.store.upsert({
      where: { id: '00000000-0000-4000-8000-000000000019' },
      update: {},
      create: {
        id: '00000000-0000-4000-8000-000000000019',
        ownerId: owner.id,
        name: 'QA webhook shop',
        slug: 'qa-webhook-isolated',
      },
    });
    const hookProduct = await db.product.create({
      data: {
        storeId: hookedStore.id,
        sku: 'QA-' + randomUUID(),
        title: 'QA hook',
        price: '100000',
      },
    });
    const now = Date.now();
    const hook = {
      source: 'shopify',
      storeId: hookedStore.id,
      payload: {
        id: 'QA-' + randomUUID(),
        currency: 'VND',
        updated_at: new Date(now - 5000).toISOString(),
        line_items: [
          { sku: hookProduct.sku, title: 'QA', quantity: 1, price: '100000' },
        ],
        total_price: '100000',
      },
    };
    assert.equal((await request('/orders/webhook', hook)).status, 401);
    const header = {
      'x-webhook-secret': 'qa-webhook-secret-at-least-32-characters',
    };
    const hooks = await Promise.all(
      Array.from({ length: 8 }, () =>
        request('/orders/webhook', hook, null, header),
      ),
    );
    assert.ok(hooks.every((item) => item.status === 200));
    assert.equal(hooks.filter((item) => item.body.data.created).length, 1);
    assert.equal(
      await db.order.count({
        where: { storeId: hookedStore.id, externalOrderSn: hook.payload.id },
      }),
      1,
    );
    const shipping = await request(
      '/orders/webhook',
      {
        ...hook,
        payload: {
          ...hook.payload,
          fulfillment_status: 'fulfilled',
          updated_at: new Date(now - 3000).toISOString(),
        },
      },
      null,
      header,
    );
    assert.equal(shipping.body.data.order.status, 'SHIPPING');
    assert.equal(
      (await request('/orders/webhook', hook, null, header)).body.data.order
        .status,
      'SHIPPING',
    );
    const refunded = await request(
      '/orders/webhook',
      {
        ...hook,
        payload: {
          ...hook.payload,
          fulfillment_status: 'fulfilled',
          financial_status: 'refunded',
          updated_at: new Date(now - 1000).toISOString(),
        },
      },
      null,
      header,
    );
    assert.equal(refunded.body.data.order.status, 'RETURNED');
    assert.equal(
      (
        await request(
          '/orders/webhook',
          {
            ...hook,
            payload: {
              ...hook.payload,
              id: 'QA-' + randomUUID(),
              currency: 'USD',
            },
          },
          null,
          header,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          '/orders/webhook',
          {
            ...hook,
            payload: {
              ...hook.payload,
              id: 'QA-' + randomUUID(),
              total_discounts: '50000',
            },
          },
          null,
          header,
        )
      ).status,
      400,
    );
    pass(
      'authenticated webhook, concurrency, versioned transitions/replay, refund/currency/totals',
    );
    const discounted = await makeOrder(
      {
        attributedCollaboratorId: kol.id,
        discountAmount: '500000',
        finalAmount: '500000',
      },
      { appliedCommissionRate: '0', calculatedCommissionAmount: '0' },
    );
    await engine.createPendingCommission(discounted.id);
    assert.equal(
      (
        await db.commission.findFirst({ where: { orderId: discounted.id } })
      ).commissionAmount.toFixed(2),
      '50000.00',
    );
    const snapshotted = await makeOrder(
      { attributedCollaboratorId: kol.id },
      { commissionSnapshotAt: new Date() },
    );
    await db.product.update({
      where: { id: product.id },
      data: { customCommissionRate: '50' },
    });
    await engine.createPendingCommission(snapshotted.id);
    assert.equal(
      (
        await db.commission.findFirst({ where: { orderId: snapshotted.id } })
      ).commissionAmount.toFixed(2),
      '100000.00',
    );
    pass('discount allocation and authoritative commission snapshot');
    const mature = await makeOrder(
      {
        attributedCollaboratorId: kol.id,
        completedAt: new Date(Date.now() - 20 * 86400000),
      },
      { commissionSnapshotAt: new Date() },
    );
    await engine.createPendingCommission(mature.id);
    const commission = await db.commission.findFirst({
      where: { orderId: mature.id },
    });
    assert.ok(commission.availableAt <= new Date());
    assert.equal(await engine.approveMatureCommission(commission.id), true);
    const before = await db.wallet.findUniqueOrThrow({
      where: { collaboratorId: kol.id },
    });
    await rules.handleRefundAdjustment(
      store.id,
      mature.id,
      '1000000',
      'QA full refund',
    );
    const after = await db.wallet.findUniqueOrThrow({
      where: { collaboratorId: kol.id },
    });
    assert.equal(
      before.availableBalance.minus(after.availableBalance).toFixed(2),
      '100000.00',
    );
    assert.equal(
      (await db.commission.findUniqueOrThrow({ where: { id: commission.id } }))
        .status,
      'REVERSED',
    );
    pass('stable receipt escrow and full approved-commission clawback');
    await rules.handleRefundAdjustment(
      store.id,
      snapshotted.id,
      '200000',
      'QA partial 1',
    );
    await rules.handleRefundAdjustment(
      store.id,
      snapshotted.id,
      '200000',
      'QA partial 2',
    );
    assert.equal(
      (
        await db.commission.findFirst({ where: { orderId: snapshotted.id } })
      ).commissionAmount.toFixed(2),
      '60000.00',
    );
    pass('successive partial refunds retain exactly 60 percent commission');
    await db.$transaction((tx) =>
      wallets.creditAvailableBalance(
        tx,
        kol.id,
        new Prisma.Decimal('4000000'),
        { id: randomUUID(), type: 'MONTHLY_BONUS' },
        store.id,
      ),
    );
    const cors = await fetch(base + '/wallets/me', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:5183',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.equal(
      cors.headers.get('access-control-allow-origin'),
      'http://127.0.0.1:5183',
    );
    pass('Docker CORS allows the actual QA frontend');
    console.log(
      JSON.stringify({
        summary: 'Docker API/PG regression passed',
        checks,
        storeId: store.id,
        productId: product.id,
        productSku: product.sku,
        ownerId: owner.id,
        kolId: kol.id,
        deliveredOrderId: order.id,
        apiUrl: base,
      }),
    );
  } finally {
    await db.onModuleDestroy();
  }
}
main().catch((error) => {
  console.error('Docker regression failed:', error.name, error.message);
  process.exitCode = 1;
});
