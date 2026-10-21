import { Prisma } from '@prisma/client';
import { catalogEligibleCte, type CatalogQueryOptions } from './catalog-query';

export interface CatalogRankingRow { id: string; soldCount: bigint | number; viewCount: bigint | number; matchKind?: 'direct' | 'related' }

export function catalogRankingQuery(options: CatalogQueryOptions) {
  const sort = {
    popular: Prisma.sql`"viewCount" DESC, e.created_at DESC, e.id ASC`,
    sales: Prisma.sql`"soldCount" DESC, e.created_at DESC, e.id ASC`,
    price_asc: Prisma.sql`e.price ASC, e.created_at DESC, e.id ASC`,
    price_desc: Prisma.sql`e.price DESC, e.created_at DESC, e.id ASC`,
    relevance: Prisma.sql`e.relevance DESC, e.created_at DESC, e.id ASC`,
  }[options.sortBy || ''] || Prisma.sql`e.created_at DESC, e.id ASC`;
  return Prisma.sql`
    ${catalogEligibleCte(options)}, sold AS (
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
    SELECT e.id, e.match_kind AS "matchKind", COALESCE(sold.quantity, 0) AS "soldCount", COALESCE(views.quantity, 0) AS "viewCount"
    FROM eligible e LEFT JOIN sold ON sold.product_id = e.id LEFT JOIN views ON views.product_id = e.id::text
    ORDER BY ${sort} LIMIT ${options.limit} OFFSET ${(options.page - 1) * options.limit}`;
}
