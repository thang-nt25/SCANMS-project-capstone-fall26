import type { SeedDataset } from './seed.types';

/** There is no stock-movement table yet. Record an opening baseline for auditing seeded history. */
export function inventoryBaseline(data: SeedDataset) {
  return data.variants.map((variant) => {
    const soldOrReserved = data.orderItems
      .filter((item) => item.variantId === variant.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    const grantedSamples = variant.sampleGrantedCount ?? 0;
    const closingStock = variant.stockQuantity ?? 0;
    return {
      variantId: variant.id!,
      productId: variant.productId,
      openingStock: closingStock + soldOrReserved + grantedSamples,
      soldOrReserved,
      grantedSamples,
      closingStock,
    };
  });
}
