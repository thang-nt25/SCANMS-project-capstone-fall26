import { Prisma } from '@prisma/client';

export interface ShopResponseRow {
  eligibleCount: bigint | number;
  respondedCount: bigint | number;
  averageMinutes: number | null;
}

/** First customer contact per conversation in the past 30 days. An unanswered
 * contact gets its full 24-hour response window before it affects the rate.
 * KOC negotiations and automatic/system replies do not count as customer care. */
export function shopResponseQuery(storeId: string, now = new Date()) {
  const since = new Date(now.getTime() - 30 * 86400000);
  const cutoff = new Date(now.getTime() - 86400000);
  return Prisma.sql`
    WITH incoming AS (
      SELECT c.id, c.customer_id, MIN(m.created_at) AS first_at
      FROM conversations c JOIN chat_messages m ON m.conversation_id = c.id AND m.sender_id = c.customer_id
      WHERE c.store_id = ${storeId}::uuid AND c.customer_id IS NOT NULL
        AND m.created_at >= ${since} AND m.created_at <= ${now}
      GROUP BY c.id, c.customer_id
    ), replies AS (
      SELECT incoming.first_at, reply.created_at AS replied_at
      FROM incoming LEFT JOIN LATERAL (
        SELECT m.created_at FROM chat_messages m JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = incoming.id AND u.role = 'SHOP_MANAGER'
          AND m.sender_id <> incoming.customer_id
          AND m.created_at >= incoming.first_at AND m.created_at <= ${now}
        ORDER BY m.created_at ASC, m.id ASC LIMIT 1
      ) reply ON true
    )
    SELECT COUNT(*) FILTER (WHERE first_at <= ${cutoff} OR replied_at IS NOT NULL) AS "eligibleCount",
      COUNT(*) FILTER (WHERE replied_at <= first_at + INTERVAL '24 hours') AS "respondedCount",
      AVG(EXTRACT(EPOCH FROM (replied_at - first_at)) / 60)
        FILTER (WHERE replied_at <= first_at + INTERVAL '24 hours')::double precision AS "averageMinutes"
    FROM replies`;
}

export function publicChatPerformance(row?: ShopResponseRow) {
  const count = Number(row?.eligibleCount || 0);
  return {
    conversationCount: count,
    responseRate: count
      ? Math.round((Number(row?.respondedCount || 0) / count) * 1000) / 10
      : null,
    averageResponseMinutes:
      row?.averageMinutes == null
        ? null
        : Math.round(Number(row.averageMinutes)),
    periodDays: 30,
    responseWindowHours: 24,
  };
}
