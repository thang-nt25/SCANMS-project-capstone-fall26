import { Prisma } from '@prisma/client';

export interface CatalogRankingRow { id: string; soldCount: bigint | number; viewCount: bigint | number }

export function catalogRankingQuery(options: {
  search?: string; category?: string; storeId?: string;
  minPrice?: number; maxPrice?: number; sortBy?: string; page: number; limit: number;
}) {
  const conditions = [Prisma.sql`p.is_deleted = false AND p.is_active = true AND p.moderation_status = 'APPROVED'
    AND s.is_deleted = false AND s.is_active = true AND s.is_verified = true
    AND s.onboarding_status = 'VERIFIED' AND u.is_active = true`];
  if (options.search?.trim()) {
    // Treat user input as a substring, including literal SQL wildcard characters.
    const pattern = `%${options.search.trim().replace(/[\\%_]/g, '\\$&')}%`;
    conditions.push(Prisma.sql`(p.title ILIKE ${pattern} OR p.sku ILIKE ${pattern}
      OR p.category_name ILIKE ${pattern} OR s.name ILIKE ${pattern})`);
  }
  if (options.category && options.category !== 'all') conditions.push(Prisma.sql`LOWER(p.category_name) = LOWER(${options.category.trim()})`);
  if (options.storeId && options.storeId !== 'all') conditions.push(Prisma.sql`p.store_id::text = ${options.storeId.trim()}`);
  if (options.minPrice !== undefined && Number.isFinite(options.minPrice)) conditions.push(Prisma.sql`p.price >= ${options.minPrice}`);
  if (options.maxPrice !== undefined && Number.isFinite(options.maxPrice)) conditions.push(Prisma.sql`p.price <= ${options.maxPrice}`);
  const sort = {
    popular: Prisma.sql`"viewCount" DESC, e.created_at DESC, e.id ASC`,
    sales: Prisma.sql`"soldCount" DESC, e.created_at DESC, e.id ASC`,
    price_asc: Prisma.sql`e.price ASC, e.created_at DESC, e.id ASC`,
    price_desc: Prisma.sql`e.price DESC, e.created_at DESC, e.id ASC`,
  }[options.sortBy || ''] || Prisma.sql`e.created_at DESC, e.id ASC`;
  return Prisma.sql`
    WITH eligible AS (
      SELECT p.id, p.price, p.created_at FROM products p
      JOIN stores s ON s.id = p.store_id JOIN users u ON u.id = s.owner_id
      WHERE ${Prisma.join(conditions, ' AND ')}
    ), sold AS (
      SELECT oi.product_id, SUM(oi.quantity) AS quantity
      FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN eligible e ON e.id = oi.product_id
      WHERE o.status IN ('DELIVERED', 'COMPLETED')
      GROUP BY oi.product_id
    ), views AS (
      SELECT a.details->>'productId' AS product_id, COUNT(*) AS quantity
      FROM audit_logs a JOIN eligible e ON e.id::text = a.details->>'productId'
      WHERE a.action = 'ANALYTICS_PAGE_VIEW'
      GROUP BY a.details->>'productId'
    )
    SELECT e.id, COALESCE(sold.quantity, 0) AS "soldCount", COALESCE(views.quantity, 0) AS "viewCount"
    FROM eligible e LEFT JOIN sold ON sold.product_id = e.id LEFT JOIN views ON views.product_id = e.id::text
    ORDER BY ${sort} LIMIT ${options.limit} OFFSET ${(options.page - 1) * options.limit}`;
}
