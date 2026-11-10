import test from "node:test";
import assert from "node:assert/strict";
import { ApiClient, ApiError } from "../src/services/api/client";
import {
  buyNowSelection,
  deliveryAddress,
  PurchaseInput,
} from "../src/features/checkout/checkout-contracts";
import {
  PurchaseCoordinator,
  quotePurchase,
  type AttemptStorage,
} from "../src/features/checkout/checkout-service";

const productId = "755a6327-d6f4-4d3f-9191-467d1c56a7fa";
const variantId = "9f63888a-3078-4055-818b-63271db236bc";
const storeId = "b648fda0-8e4c-43fb-90bd-321341da474a";
const key = "82be1c8f-c2e7-4a79-b8f8-e312b7ed1ebd";
const line = { productId, variantId, quantity: 2 };
const product = {
  id: productId,
  title: "Bàn phím",
  price: "900000",
  stockQuantity: 10,
  variants: [{ id: variantId, name: "Red", stockQuantity: 3, isActive: true }],
};
const payload = PurchaseInput.parse({
  storeId,
  customerName: "Khách kiểm thử",
  customerPhone: "0901234567",
  shippingAddress: "12 Đường A, Phường B, Quận C, Hồ Chí Minh",
  policyAccepted: true,
  paymentMethod: "PAYOS",
  idempotencyKey: key,
  items: [line],
});
const result = {
  publicOrderCode: "DH-TEST-ONLY",
  finalAmount: 1820000,
  subtotalAmount: 1800000,
  discountAmount: 0,
  shippingFee: 20000,
  paymentMethod: "PAYOS",
  paymentStatus: "WAITING_PAYMENT",
  status: "PENDING",
};
function memoryStorage() {
  let saved: string | null = null;
  const storage: AttemptStorage = {
    async get() {
      return saved;
    },
    async set(value) {
      saved = value;
    },
    async remove() {
      saved = null;
    },
  };
  return storage;
}

test("buy now requires a real active variant and quantity within stock", () => {
  assert.deepEqual(buyNowSelection(product, variantId, 2), line);
  assert.throws(() => buyNowSelection(product, undefined, 1), /chọn phân loại/);
  assert.throws(() => buyNowSelection(product, "default", 1));
  assert.throws(() => buyNowSelection(product, variantId, 4), /tồn kho/);
  assert.throws(() => buyNowSelection(product, variantId, 0));
  assert.throws(() =>
    buyNowSelection(
      { ...product, variants: [{ ...product.variants[0], isActive: false }] },
      variantId,
      1,
    ),
  );
});
test("direct purchase permits a product without variants and requires a complete delivery address", () => {
  assert.deepEqual(
    buyNowSelection({ ...product, variants: [] }, undefined, 1),
    { productId, quantity: 1 },
  );
  const address = {
    id: "address",
    fullName: "Khách",
    phoneNumber: "0901234567",
    provinceName: "Hồ Chí Minh",
    districtName: "Quận 1",
    wardName: "Bến Nghé",
    detailAddress: " 12 Đường A ",
    isDefault: true,
  };
  assert.equal(
    deliveryAddress(address),
    "12 Đường A, Bến Nghé, Quận 1, Hồ Chí Minh",
  );
  assert.throws(() => deliveryAddress({ ...address, wardName: "" }), /Địa chỉ/);
  assert.equal(
    deliveryAddress({
      ...address,
      detailAddress: "12 Đường A, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    }),
    "12 Đường A, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
  );
  assert.equal(
    PurchaseInput.safeParse({ ...payload, policyAccepted: false }).success,
    false,
  );
  assert.equal(
    PurchaseInput.safeParse({ ...payload, items: [line, line] }).success,
    false,
  );
});
test("quote uses server price and selected line only, then GHN and a manually entered KOL code", async () => {
  const paths: string[] = [];
  const client = new ApiClient(
    "http://localhost:3000/api",
    { get: () => "test-token", onUnauthorized() {} },
    async (url, options) => {
      const path = new URL(String(url)).pathname.replace("/api", "");
      paths.push(path);
      const body = JSON.parse(String(options?.body));
      assert.deepEqual(body.items, [line]);
      assert.equal("unitPrice" in body.items[0], false);
      if (path === "/orders/validate-cart")
        return Response.json({
          success: true,
          data: {
            isValid: true,
            warnings: [],
            items: [
              {
                productId,
                currentPrice: 800000,
                stockQuantity: 3,
                isAvailable: true,
                store: { id: storeId },
              },
            ],
          },
        });
      if (path === "/shipping/ghn/quote-address") {
        assert.equal(body.storeId, storeId);
        return Response.json({ success: true, data: { totalFee: 25000 } });
      }
      assert.equal(path, "/coupons/validate");
      assert.equal(body.code, "KOL10");
      return Response.json({
        success: true,
        data: { valid: true, code: "KOL10", discountAmount: 160000 },
      });
    },
  );
  assert.deepEqual(
    await quotePurchase(client, {
      line,
      storeId,
      address: payload.shippingAddress,
      phone: payload.customerPhone,
      couponCode: " kol10 ",
    }),
    {
      subtotal: 1600000,
      shippingFee: 25000,
      discount: 160000,
      total: 1465000,
      couponCode: "KOL10",
    },
  );
  assert.deepEqual(paths, [
    "/orders/validate-cart",
    "/shipping/ghn/quote-address",
    "/coupons/validate",
  ]);
});
test("unavailable stock or wrong shop stops the quote before shipping/payment", async () => {
  let calls = 0;
  const client = {
    async request() {
      calls++;
      return {
        isValid: false,
        warnings: ["Đã hết hàng"],
        items: [
          {
            productId,
            currentPrice: 800000,
            stockQuantity: 0,
            isAvailable: false,
            store: { id: storeId },
          },
        ],
      };
    },
  };
  await assert.rejects(
    quotePurchase(client, {
      line,
      storeId,
      address: payload.shippingAddress,
      phone: payload.customerPhone,
      couponCode: "",
    }),
    /hết hàng/,
  );
  assert.equal(calls, 1);
});
test("a timed-out order survives remount and retries the identical key/payload, never the cart API", async () => {
  const storage = memoryStorage();
  const requests: unknown[] = [];
  const client = {
    async request(path: string, options?: { body?: unknown }) {
      assert.equal(path, "/orders");
      assert.deepEqual(JSON.parse((await storage.get())!).payload, payload);
      requests.push(options?.body);
      if (requests.length === 1) throw new ApiError("Timeout", 0, true);
      return { success: true, data: result };
    },
  };
  const first = new PurchaseCoordinator(client, storage);
  await first.restore();
  await assert.rejects(first.submit(payload), /Timeout/);
  const reopened = new PurchaseCoordinator(client, storage);
  assert.deepEqual((await reopened.restore())?.payload, payload);
  assert.deepEqual(
    await reopened.submit({
      ...payload,
      orderNotes: "Changed input is ignored for a pending order",
    }),
    result,
  );
  assert.deepEqual(requests, [payload, payload]);
  assert.deepEqual(await reopened.submit(payload), result);
  assert.equal(requests.length, 2);
});
test("an unsaved recovery key prevents the order POST", async () => {
  let calls = 0;
  const coordinator = new PurchaseCoordinator(
    {
      async request() {
        calls++;
        return result;
      },
    },
    {
      async get() {
        return null;
      },
      async set() {
        throw new Error("Storage unavailable");
      },
      async remove() {},
    },
  );
  await assert.rejects(coordinator.submit(payload), /Storage unavailable/);
  assert.equal(calls, 0);
});
test("the synchronous purchase lock blocks double-taps and clearing an in-flight attempt", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const coordinator = new PurchaseCoordinator(
    {
      async request() {
        calls++;
        await gate;
        return result;
      },
    },
    memoryStorage(),
  );
  const first = coordinator.submit(payload);
  await assert.rejects(coordinator.submit(payload), /Đang xử lý/);
  await assert.rejects(coordinator.clear(), /Đang xử lý/);
  release();
  await first;
  assert.equal(calls, 1);
});
test("receipt storage failure still recovers the server result without a second POST", async () => {
  const storage = memoryStorage();
  let writes = 0,
    calls = 0;
  const save = storage.set;
  storage.set = async (value) => {
    if (++writes === 2) throw new Error("Receipt save failed");
    await save(value);
  };
  const coordinator = new PurchaseCoordinator(
    {
      async request() {
        calls++;
        return result;
      },
    },
    storage,
  );
  await assert.rejects(coordinator.submit(payload), /Receipt save failed/);
  assert.deepEqual(await coordinator.submit(payload), result);
  assert.equal(calls, 1);
  assert.equal(JSON.parse((await storage.get())!).payload.idempotencyKey, key);
});
