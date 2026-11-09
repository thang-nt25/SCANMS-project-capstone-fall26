import test from "node:test";
import assert from "node:assert/strict";
import { ApiClient, ApiError } from "../src/services/api/client";
import { OrderSchema } from "../src/types/contracts";
import { loadCustomerOrder } from "../src/features/orders/customer-order-service";
import {
  canConfirmReceipt,
  latestConfirmedEvent,
  orderLines,
  orderPayment,
  orderSubtotal,
  orderTracking,
  paymentMethodLabel,
  paymentStateLabel,
} from "../src/features/orders/order-presentation";

const fixture = {
  id: "9c294357-ef88-4f5d-bdf5-c49f17ad486c",
  externalOrderSn: "DH-TEST-01",
  status: "PENDING",
  finalAmount: "521001",
  subtotalAmount: "500000",
  shippingFee: "21001",
  discountAmount: "0",
  createdAt: "2026-11-05T10:00:00.000Z",
  customerName: "Khách kiểm thử",
  customerPhone: "0901234567",
  shippingAddress: "12 Đường A, Quận 1, Hồ Chí Minh",
  rawPayload: { paymentMethod: "WALLET", paymentStatus: "PAID" },
  orderItems: [
    {
      id: "line-1",
      productId: "product-1",
      quantity: 1,
      unitPrice: "500000",
      variant: { id: "variant-1", name: "40 ml", sku: "TEST-40" },
      product: {
        id: "product-1",
        title: "Kem dưỡng",
        imageUrl: "/assets/product.jpg",
      },
    },
  ],
};
const order = OrderSchema.parse(fixture);
test("buyer detail retains recipient, stored subtotal, variant and purchased price from the API", () => {
  assert.equal(order.customerPhone, fixture.customerPhone);
  assert.equal(order.subtotalAmount, "500000");
  assert.deepEqual(
    order.orderItems?.[0].variant,
    fixture.orderItems[0].variant,
  );
  assert.equal(orderLines(order)[0].imageUrl, "/assets/product.jpg");
  assert.equal(orderLines(order)[0].unitPrice, "500000");
  assert.equal(orderLines(order)[0].variantName, "40 ml");
});
test("detail renders one item collection and never substitutes current product prices", () => {
  const both = OrderSchema.parse({
    ...fixture,
    items: [
      {
        productId: "product-1",
        title: "Legacy duplicate",
        quantity: 1,
        unitPrice: "700000",
      },
    ],
  });
  assert.equal(orderLines(both).length, 1);
  assert.equal(orderLines(both)[0].title, "Kem dưỡng");
  assert.equal(orderSubtotal(both), "500000");
  assert.equal(
    orderSubtotal({
      ...order,
      subtotalAmount: undefined,
      totalAmount: undefined,
    }),
    500000,
  );
  assert.equal(
    orderSubtotal({
      ...order,
      subtotalAmount: undefined,
      totalAmount: undefined,
      orderItems: [],
    }),
    undefined,
  );
});
test("receipt confirmation is restricted to DELIVERED without a return request", () => {
  assert.equal(canConfirmReceipt({ ...order, status: "DELIVERED" }), true);
  for (const status of [
    "PENDING",
    "SHIPPING",
    "COMPLETED",
    "CANCELLED",
    "RETURN_REQUESTED",
    "DISPUTED",
    "RETURNED",
  ])
    assert.equal(canConfirmReceipt({ ...order, status }), false);
  assert.equal(
    canConfirmReceipt({
      ...order,
      status: "DELIVERED",
      returnRequest: { id: "return", status: "REQUESTED" },
    }),
    false,
  );
});
test("payment and carrier information use normalized fields with legacy payload compatibility", () => {
  assert.deepEqual(orderPayment(order), { method: "WALLET", status: "PAID" });
  assert.equal(paymentMethodLabel("WALLET"), "Ví SCANMS");
  assert.equal(paymentStateLabel("PAID"), "Đã thanh toán");
  assert.equal(
    orderPayment({
      ...order,
      paymentMethod: "PAYOS",
      paymentStatus: "WAITING_PAYMENT",
    }).method,
    "PAYOS",
  );
  assert.deepEqual(
    orderTracking({
      ...order,
      rawPayload: {
        ghnOrderCode: "TEST123",
        carrierName: "GHN",
        ghnEnvironment: "TEST",
      },
    }),
    { code: "TEST123", carrier: "GHN", environment: "TEST" },
  );
});
test("the shipping summary never presents scheduled/unconfirmed events as completed", () => {
  const confirmed = {
    title: "Đã lấy hàng",
    completed: true,
    time: "2026-11-05T10:00:00Z",
  };
  assert.equal(
    latestConfirmedEvent([
      confirmed,
      { title: "Đang giao", completed: false, time: "2026-11-06T10:00:00Z" },
      { title: "Đã giao", completed: true, time: null },
      { title: "Sai thời gian", completed: true, time: "invalid" },
    ]),
    confirmed,
  );
  assert.equal(
    latestConfirmedEvent([{ title: "Chờ giao", time: null }]),
    undefined,
  );
});
test("receipt code lookup uses only the buyer's own endpoint and fetches exact UUID detail", async () => {
  const paths: string[] = [];
  const client = new ApiClient(
    "http://localhost:3000/api",
    { get: () => "buyer-test-token", onUnauthorized() {} },
    async (url, options) => {
      assert.ok(options);
      assert.equal(options.method, "GET");
      assert.equal(
        (options.headers as Record<string, string>).Authorization,
        "Bearer buyer-test-token",
      );
      const path = String(url).replace("http://localhost:3000/api", "");
      paths.push(path);
      return Response.json({
        success: true,
        data: path.includes("?search=")
          ? {
              orders: [
                { ...fixture, id: "other", externalOrderSn: "DH-TEST-010" },
                fixture,
              ],
            }
          : fixture,
      });
    },
  );
  assert.equal(
    (await loadCustomerOrder(client, { publicOrderCode: "DH-TEST-01" })).id,
    order.id,
  );
  assert.deepEqual(paths, [
    "/customer/orders?search=DH-TEST-01",
    `/customer/orders/${order.id}`,
  ]);
});
test("a known UUID skips list lookup but still refreshes detail instead of trusting a snapshot", async () => {
  let calls = 0;
  const client = {
    async request(path: string) {
      calls++;
      assert.equal(path, `/customer/orders/${order.id}`);
      return { ...fixture, status: "SHIPPING" };
    },
  };
  assert.equal((await loadCustomerOrder(client, { order })).status, "SHIPPING");
  assert.equal(calls, 1);
});
test("a prefix-only match and forbidden detail cannot fall back to another buyer's data", async () => {
  let calls = 0;
  await assert.rejects(
    loadCustomerOrder(
      {
        async request() {
          calls++;
          return { orders: [{ ...fixture, externalOrderSn: "DH-TEST-010" }] };
        },
      },
      { publicOrderCode: "DH-TEST-01" },
    ),
    /tài khoản/,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    loadCustomerOrder(
      {
        async request() {
          throw new ApiError("Forbidden", 403);
        },
      },
      { order },
    ),
    (error: unknown) => error instanceof ApiError && error.status === 403,
  );
});
