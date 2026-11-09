import assert from "node:assert/strict";
import test from "node:test";
import { ProductSchema } from "../src/types/contracts";

const product = { id: "product-1", title: "Sản phẩm của Shop", price: "280000", variants: [{ id: "variant-1", name: "Tiêu chuẩn", stockQuantity: 2, sampleEnabled: null }] };
test("merchant product accepts a variant with unconfigured sample policy", () => {
  const parsed = ProductSchema.parse(product);
  assert.equal(parsed.variants?.[0].sampleEnabled, null);
  assert.equal(parsed.price, "280000");
  assert.equal(parsed.variants?.[0].stockQuantity, 2);
});
test("explicit sample policy stays unchanged and invalid types remain rejected", () => {
  for (const sampleEnabled of [true, false]) assert.equal(ProductSchema.parse({ ...product, variants: [{ ...product.variants[0], sampleEnabled }] }).variants?.[0].sampleEnabled, sampleEnabled);
  assert.equal(ProductSchema.safeParse({ ...product, variants: [{ ...product.variants[0], sampleEnabled: "yes" }] }).success, false);
});
