import { Prisma } from '@prisma/client';
import { catalogSearchScore, catalogSearchSql, normalizedSql } from './catalog-search-engine';

export interface CatalogQueryOptions {
  search?: string; category?: string; storeId?: string;
  minPrice?: number; maxPrice?: number; sortBy?: string; page: number; limit: number;
}

// Shared by suggestions, catalogue ranking and its count: a submitted search
// cannot silently switch to a different matcher or pagination count.
export function catalogEligibleCte(options: CatalogQueryOptions): Prisma.Sql {
  const conditions = [Prisma.sql`p.is_deleted = false AND p.is_active = true AND p.moderation_status = 'APPROVED'
    AND s.is_deleted = false AND s.is_active = true AND s.is_verified = true
    AND s.onboarding_status = 'VERIFIED' AND u.is_active = true AND u.is_deleted = false`];
  if (options.category && options.category !== 'all') conditions.push(Prisma.sql`LOWER(p.category_name) = LOWER(${options.category.trim()})`);
  if (options.storeId && options.storeId !== 'all') conditions.push(Prisma.sql`p.store_id::text = ${options.storeId.trim()}`);
  if (options.minPrice !== undefined && Number.isFinite(options.minPrice)) conditions.push(Prisma.sql`p.price >= ${options.minPrice}`);
  if (options.maxPrice !== undefined && Number.isFinite(options.maxPrice)) conditions.push(Prisma.sql`p.price <= ${options.maxPrice}`);
  const source = Prisma.sql`FROM products p JOIN stores s ON s.id = p.store_id JOIN users u ON u.id = s.owner_id
    WHERE ${Prisma.join(conditions, ' AND ')}`;
  if (!options.search?.trim()) return Prisma.sql`WITH eligible AS (
    SELECT p.id, p.price, p.created_at, 0 AS relevance, 'direct'::text AS match_kind ${source})`;
  const claims = Prisma.sql`concat_ws(' ', p.title,
    regexp_replace(replace(left(coalesce(p.description, ''), 12000), '&nbsp;', ' '), '<[^>]*>', ' ', 'g'),
    left(coalesce(p.ingredients, ''), 4000))`;
  const searchText = Prisma.sql`concat_ws(' ', p.title, p.sku, p.category_name, s.name,
    (SELECT string_agg(concat_ws(' ', v.name, v.sku), ' ') FROM product_variants v
      WHERE v.product_id = p.id AND v.is_active = true), ${claims})`;
  return Prisma.sql`WITH catalog_base AS MATERIALIZED (
    SELECT p.id, p.price, p.created_at,
      ${normalizedSql(searchText)} AS search_text,
      ${normalizedSql(Prisma.sql`p.title`)} AS search_title,
      ${normalizedSql(Prisma.sql`p.sku`)} AS search_sku,
      ${normalizedSql(Prisma.sql`p.category_name`)} AS search_category,
      ${normalizedSql(claims)} AS search_claims
    ${source}
  ), catalog_matches AS MATERIALIZED (
    SELECT b.*, ${catalogSearchSql(options.search)} AS exact_match,
      ${catalogSearchSql(options.search, true)} AS fuzzy_match,
      ${catalogSearchSql(options.search, false, false, false, true)} AS related_match,
      ${catalogSearchScore(options.search)} AS relevance
    FROM catalog_base b
  ), eligible AS (
    SELECT id, price, created_at, relevance,
      CASE WHEN exact_match OR fuzzy_match THEN 'direct' ELSE 'related' END AS match_kind FROM catalog_matches
    WHERE exact_match OR (fuzzy_match AND NOT EXISTS (SELECT 1 FROM catalog_matches WHERE exact_match))
      OR (related_match AND NOT EXISTS (SELECT 1 FROM catalog_matches WHERE exact_match OR fuzzy_match))
  )`;
}

export function catalogCountQuery(options: CatalogQueryOptions): Prisma.Sql {
  return Prisma.sql`${catalogEligibleCte(options)} SELECT COUNT(*) AS total FROM eligible`;
}

export interface CatalogSuggestionRow {
  id: string; sku: string; title: string; imageUrl: string | null;
  storeName: string; price: Prisma.Decimal | number; hasVariants: boolean; inStock: boolean;
  matchKind: 'direct' | 'related';
}
export function catalogSuggestionsQuery(search: string): Prisma.Sql {
  return Prisma.sql`${catalogEligibleCte({ search, page: 1, limit: 6 })}
    SELECT p.id, p.sku, p.title, p.image_url AS "imageUrl", s.name AS "storeName", e.match_kind AS "matchKind",
      COALESCE(v.available_price, v.any_price, p.price) AS price,
      v.total > 0 AS "hasVariants",
      CASE WHEN v.total > 0 THEN v.available > 0 ELSE p.stock_quantity > 0 END AS "inStock"
    FROM eligible e JOIN products p ON p.id = e.id JOIN stores s ON s.id = p.store_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE stock_quantity > 0) AS available,
        MIN(COALESCE(price, p.price)) FILTER (WHERE stock_quantity > 0) AS available_price,
        MIN(COALESCE(price, p.price)) AS any_price
      FROM product_variants WHERE product_id = p.id AND is_active = true
    ) v ON true
    ORDER BY e.relevance DESC, e.created_at DESC, e.id ASC LIMIT 6`;
}
