import test from "node:test";
import assert from "node:assert/strict";
import { resolveImageReference } from "../src/services/image-policy";
const assets = {
  "/assets/products/real/keyboard.webp": 10,
  "/assets/shops/shop-sora.png": 20,
};
const origin = "http://10.0.2.2:3000";
test("web catalog relative paths select the exact bundled image, including cache query suffixes", () => {
  assert.equal(
    resolveImageReference(
      "/assets/products/real/keyboard.webp?v=2",
      assets,
      origin,
    ),
    10,
  );
  assert.equal(
    resolveImageReference("/assets/shops/shop-sora.png", assets, origin),
    20,
  );
});
test("unknown catalog paths never substitute another product or require localhost web", () => {
  for (const uri of [
    "/assets/unknown.jpg",
    "__proto__",
    "constructor",
    "//external.example/image.jpg",
  ])
    assert.equal(resolveImageReference(uri, assets, origin), null);
});
test("uploaded server media resolves against the API host on emulator", () => {
  assert.deepEqual(
    resolveImageReference("/uploads/image.jpg", assets, origin),
    { uri: "http://10.0.2.2:3000/uploads/image.jpg" },
  );
  assert.equal(
    resolveImageReference("/uploads/../private/image.jpg", assets, origin),
    null,
  );
});
test("public remote images remain remote while credentials and non-network schemes are rejected", () => {
  assert.deepEqual(
    resolveImageReference("https://cdn.example/photo.jpg", assets, origin),
    { uri: "https://cdn.example/photo.jpg" },
  );
  for (const uri of [
    "file:///private/pic.jpg",
    "data:image/png;base64,abc",
    "javascript:alert(1)",
    "https://user:secret@example.test/pic.jpg",
    undefined,
  ])
    assert.equal(resolveImageReference(uri, assets, origin), null);
});
