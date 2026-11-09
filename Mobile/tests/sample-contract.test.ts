import test from "node:test";
import assert from "node:assert/strict";
import { CreateSample, Sample } from "../src/features/samples/sample-contracts";
import { ProductSchema } from "../src/types/contracts";
const id = "11111111-1111-4111-8111-111111111111";
const request = { productId: id, recipientName: "Người nhận", recipientPhone: "0908123456", recipientPhoneConfirmed: true, shippingAddress: "123 Nguyễn Huệ, Phường Bến Nghé, TP HCM", ghnProvinceId: 202, ghnDistrictId: 1442, ghnWardCode: "20308", socialChannelId: id, contentType: "Video trải nghiệm 60 giây", termsAccepted: true };
test("sample request requires both confirmations and a usable shipping destination", () => {
  assert.equal(CreateSample.safeParse(request).success, true);
  for (const change of [{ recipientPhoneConfirmed: false }, { termsAccepted: false }, { ghnWardCode: "" }, { recipientPhone: "123" }, { contentType: "" }]) assert.equal(CreateSample.safeParse({ ...request, ...change }).success, false);
});
test("sample history preserves the original recipient, channel and product thumbnail", () => {
  const result = Sample.parse({ ...request, id, status: "PENDING", collaboratorId: id, product: { id, title: "Sản phẩm mẫu", imageUrl: "https://example.com/product.png", store: { name: "Gian hàng" } }, socialChannelNameSnapshot: "Kênh review", socialPlatformSnapshot: "TIKTOK", productVariant: { id, name: "Chai 30ml" } });
  assert.equal(result.product.imageUrl, "https://example.com/product.png");
  assert.equal(result.contentType, request.contentType);
  assert.equal(result.ghnDistrictId, 1442);
  assert.equal(result.socialChannelNameSnapshot, "Kênh review");
});
test("landing policy survives parsing for sample-enabled variants", () => {
  const result = ProductSchema.parse({ id, title: "Mẫu", price: 100, sampleEnabled: false, sampleAvailable: false, variants: [{ id, name: "Bản có mẫu", stockQuantity: 1, sampleEnabled: true, sampleAvailable: true, sampleQuotaRemaining: 2 }] });
  assert.equal(result.variants?.[0].sampleAvailable, true);
  assert.equal(result.variants?.[0].sampleQuotaRemaining, 2);
});
