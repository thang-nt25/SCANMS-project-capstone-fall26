import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** Public product writes share locks: a preflight lookup alone races with create. */
export async function assertProductIdentity(
  tx: Prisma.TransactionClient,
  input: { storeId: string; sku: string; barcode?: string | null; id?: string },
) {
  const sku = input.sku.trim().toUpperCase();
  const barcode = input.barcode?.trim() || null;
  const keys = [
    `sku:${input.storeId}:${sku}`,
    ...(barcode ? [`barcode:${barcode}`] : []),
  ].sort();
  for (const key of keys)
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`product-identity:${key}`}, 0))`;
  const duplicate = await tx.product.findFirst({
    where: {
      isDeleted: false,
      deletedAt: null,
      ...(input.id ? { id: { not: input.id } } : {}),
      OR: [
        { storeId: input.storeId, sku: { equals: sku, mode: 'insensitive' } },
        ...(barcode ? [{ barcode }] : []),
      ],
    },
    select: { sku: true, barcode: true },
  });
  if (duplicate)
    throw new ConflictException(
      barcode && duplicate.barcode === barcode
        ? 'Mã vạch đã tồn tại trong danh mục. Vui lòng dùng sản phẩm hiện có hoặc kiểm tra lại mã vạch.'
        : 'Mã SKU đã tồn tại trong cửa hàng. Vui lòng dùng mã khác.',
    );
}

export function productNameTokens(title: string): string[] {
  return [
    ...new Set(
      title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean),
    ),
  ];
}

/** Explainable lexical similarity, not a claim that an embedding/LLM ran. */
export function productNameSimilarity(left: string, right: string): number {
  const a = productNameTokens(left),
    b = productNameTokens(right);
  if (!a.length || !b.length) return 0;
  const overlap = a.filter((token) => b.includes(token)).length;
  return Math.round((200 * overlap) / (a.length + b.length));
}
