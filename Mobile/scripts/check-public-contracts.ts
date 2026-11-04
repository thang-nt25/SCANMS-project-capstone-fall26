import assert from "node:assert/strict";
import { z } from "zod";
import { ProductSchema, StoreSchema } from "../src/types/contracts";
import { unwrapEnvelope } from "../src/services/api/client";
async function main() {
  const base = process.env.SCANMS_TEST_API_URL || "http://127.0.0.1:3000/api";
  const url = new URL(base);
  assert.ok(
    !url.username &&
      !url.password &&
      ["http:", "https:"].includes(url.protocol),
  );
  const read = async (path: string) => {
    const response = await fetch(`${base}${path}`, {
      signal: AbortSignal.timeout(20000),
      redirect: "error",
    });
    assert.equal(
      response.status,
      200,
      `HTTP contract failed: ${path.split("/").slice(0, 3).join("/")}`,
    );
    return unwrapEnvelope(unwrapEnvelope(await response.json()));
  };
  const catalog = z
    .object({
      items: z.array(ProductSchema),
      pagination: z.object({ page: z.number(), totalPages: z.number() }),
    })
    .parse(await read("/public/products?limit=5&page=1"));
  assert.ok(
    catalog.items.length > 0,
    "Cần ít nhất một sản phẩm công khai để kiểm tra landing và gian hàng.",
  );
  const categories = z
    .array(z.object({ name: z.string(), count: z.number() }))
    .parse(await read("/public/products/categories"));
  const storeList = z
    .array(StoreSchema)
    .parse(await read("/public/products/stores"));
  const product = catalog.items[0];
  const landing = z
    .object({
      product: ProductSchema,
      store: z.object({ id: z.string(), name: z.string() }),
      reviews: z.object({
        averageRating: z.number().nullable(),
        totalReviews: z.number(),
        items: z.array(
          z.object({
            id: z.string(),
            customerName: z.string(),
            rating: z.number(),
            images: z.array(z.string()),
          }),
        ),
      }),
    })
    .parse(await read(`/public/products/${product.id}/landing`));
  const shop = z
    .object({
      productCount: z.number(),
      followerCount: z.number(),
      reviewCount: z.number(),
      rating: z.number().nullable(),
      categories: z.array(z.string()),
    })
    .parse(await read(`/stores/public/id/${landing.store.id}`));
  process.stdout.write(
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        readOnly: true,
        checks: [
          "catalog",
          "categories",
          "store_list",
          "landing_reviews",
          "store_profile",
        ],
        catalogRows: catalog.items.length,
        categories: categories.length,
        storeListings: storeList.length,
        shopProducts: shop.productCount,
        result: "PASS",
      },
      null,
      2,
    ) + "\n",
  );
}
void main().catch((error) => {
  process.stderr.write(
    error instanceof Error ? error.message + "\n" : "Contract check failed.\n",
  );
  process.exitCode = 1;
});
